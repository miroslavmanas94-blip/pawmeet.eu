'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

type UserLocation = {
  user_id: string
  latitude: number
  longitude: number
  address: string
  is_active: boolean
  updated_at: string
  profiles?: {
    username?: string
    avatar_url?: string
    avatar?: string
    pet_name?: string
    dog_name?: string
    pet_type?: string
    dog_breed?: string
    pet_gender?: 'kluk' | 'holka'
    dog_gender?: 'kluk' | 'holka'
    [key: string]: any
  }
}

export default function PetMapPage() {
  const router = useRouter()
  const [hasMounted, setHasMounted] = useState(false)
  const [mapMode, setMapMode] = useState<'map' | 'satellite'>('map')
  const [isLiveTracking, setIsLiveTracking] = useState(false)
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [usersLocations, setUsersLocations] = useState<UserLocation[]>([])
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const [navigatingTo, setNavigatingTo] = useState<{ name: string; coords: [number, number] } | null>(null)
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([])
  const [routeInfo, setRouteInfo] = useState({ distance: '', duration: '' })

  const [selectedUser, setSelectedUser] = useState<UserLocation | null>(null)
  const [copied, setCopied] = useState(false)
  const [hasFittedBounds, setHasFittedBounds] = useState(false)

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const tileLayerRef = useRef<any>(null)
  const labelLayerRef = useRef<any>(null)
  const markersRef = useRef<{ [key: string]: any }>({})
  const myLocationMarkerRef = useRef<any>(null)
  const routePolylineRef = useRef<any>(null)
  const watchIdRef = useRef<number | null>(null)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  useEffect(() => {
    if (!hasMounted) return

    const supabase = createClient()

    const fetchCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
        const { data: loc } = await supabase
          .from('user_locations')
          .select('is_active, latitude, longitude')
          .eq('user_id', user.id)
          .single()

        if (loc?.is_active && loc.latitude && loc.longitude) {
          setCurrentCoords({ lat: loc.latitude, lng: loc.longitude })
          setIsLiveTracking(true)
        }
      }
    }

    fetchCurrentUser()
    fetchGlobalLocations()

    const channel = supabase
      .channel('global-pet-map-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_locations' }, () => {
        fetchGlobalLocations()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [hasMounted])

  const fetchGlobalLocations = async () => {
    const supabase = createClient()
    // Používáme profiles(*) místo vyjmenovávání sloupců, aby dotaz nikdy neselhal na chybějící sloupec
    const { data, error } = await supabase
      .from('user_locations')
      .select('*, profiles(*)')
      .eq('is_active', true)

    if (error) {
      console.error('Chyba Supabase:', error.message)
    }

    if (data) {
      console.log('Stažená data ze Supabase:', data)
      setUsersLocations(data as any)
    }
  }

  useEffect(() => {
    if (!hasMounted || typeof window === 'undefined') return

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    if (!document.getElementById('map-pet-styles')) {
      const style = document.createElement('style')
      style.id = 'map-pet-styles'
      style.innerHTML = `
        @keyframes gps-pulse {
          0% { transform: scale(0.6); opacity: 0.9; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        .gps-pulse-ring {
          animation: gps-pulse 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
        }
        .leaflet-container {
          background-color: #f8fafc !important;
          font-family: inherit;
        }
      `
      document.head.appendChild(style)
    }

    import('leaflet').then((L) => {
      if (!mapContainerRef.current) return

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          zoomControl: false,
          attributionControl: false,
        }).setView([50.0755, 14.4378], 4)

        mapInstanceRef.current = map
      }

      if (tileLayerRef.current) {
        mapInstanceRef.current.removeLayer(tileLayerRef.current)
      }
      if (labelLayerRef.current) {
        mapInstanceRef.current.removeLayer(labelLayerRef.current)
        labelLayerRef.current = null
      }

      if (mapMode === 'map') {
        tileLayerRef.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
        }).addTo(mapInstanceRef.current)
      } else {
        tileLayerRef.current = L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          { maxZoom: 19 }
        ).addTo(mapInstanceRef.current)

        labelLayerRef.current = L.tileLayer(
          'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png',
          { maxZoom: 19, subdomains: 'abcd' }
        ).addTo(mapInstanceRef.current)
      }
    })
  }, [mapMode, hasMounted])

  const toggleLiveTracking = async () => {
    if (!currentUserId) {
      alert('Pro sdílení polohy musíte být přihlášeni.')
      return
    }

    const supabase = createClient()
    const nextState = !isLiveTracking
    setIsLiveTracking(nextState)

    if (nextState) {
      if (!navigator.geolocation) {
        alert('Váš prohlížeč nepodporuje geolokaci.')
        setIsLiveTracking(false)
        return
      }

      watchIdRef.current = navigator.geolocation.watchPosition(
        async (position) => {
          const lat = position.coords.latitude
          const lng = position.coords.longitude
          setCurrentCoords({ lat, lng })

          let addressName = 'Živá poloha'
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
            const geoData = await res.json()
            addressName = geoData.address?.suburb || geoData.address?.city || geoData.address?.road || 'Aktuální poloha'
          } catch (e) {}

          await supabase.from('user_locations').upsert({
            user_id: currentUserId,
            latitude: lat,
            longitude: lng,
            address: addressName,
            is_active: true,
            updated_at: new Date().toISOString(),
          })
        },
        () => {
          alert('Nelze získat GPS polohu.')
          setIsLiveTracking(false)
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      )
    } else {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      setCurrentCoords(null)
      await supabase.from('user_locations').update({ is_active: false }).eq('user_id', currentUserId)
    }
  }

  useEffect(() => {
    if (!mapInstanceRef.current || !hasMounted || typeof window === 'undefined') return

    import('leaflet').then((L) => {
      const map = mapInstanceRef.current

      Object.values(markersRef.current).forEach((marker: any) => map.removeLayer(marker))
      markersRef.current = {}

      if (myLocationMarkerRef.current) {
        map.removeLayer(myLocationMarkerRef.current)
        myLocationMarkerRef.current = null
      }

      if (currentCoords && isLiveTracking) {
        const myDotIcon = L.divIcon({
          className: 'my-gps-dot',
          html: `
            <div class="relative flex items-center justify-center w-8 h-8">
              <div class="absolute w-10 h-10 bg-blue-400/40 rounded-full gps-pulse-ring"></div>
              <div class="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-md"></div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        })

        myLocationMarkerRef.current = L.marker([currentCoords.lat, currentCoords.lng], {
          icon: myDotIcon,
          zIndexOffset: 1000,
        }).addTo(map)
      }

      const markerList: any[] = []

      usersLocations.forEach((loc) => {
        if (!loc.latitude || !loc.longitude) return

        const gender = loc.profiles?.pet_gender || loc.profiles?.dog_gender
        const genderBg = gender === 'holka' ? 'bg-pink-500' : 'bg-blue-500'
        const avatarUrl = loc.profiles?.avatar_url || loc.profiles?.avatar

        const customIcon = L.divIcon({
          className: 'other-user-pin',
          html: `
            <div class="relative flex items-center justify-center cursor-pointer group">
              <div class="relative w-12 h-12 rounded-full p-0.5 bg-white shadow-lg border-2 border-slate-100 hover:scale-105 transition-transform duration-200">
                <div class="w-full h-full rounded-full overflow-hidden bg-slate-100 flex items-center justify-center">
                  ${
                    avatarUrl
                      ? `<img src="${avatarUrl}" class="w-full h-full object-cover" />`
                      : `<span class="text-base">🐾</span>`
                  }
                </div>
              </div>
              <div class="absolute -bottom-0.5 -right-0.5 ${genderBg} text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold border-2 border-white shadow">
                ${gender === 'holka' ? '♀' : '♂'}
              </div>
            </div>
          `,
          iconSize: [48, 48],
          iconAnchor: [24, 24],
        })

        const marker = L.marker([loc.latitude, loc.longitude], { icon: customIcon }).addTo(map)

        marker.on('click', () => {
          setSelectedUser(loc)
          map.flyTo([loc.latitude, loc.longitude], 15, { duration: 1 })
        })

        markersRef.current[loc.user_id] = marker
        markerList.push([loc.latitude, loc.longitude])
      })

      if (!hasFittedBounds && markerList.length > 0) {
        const bounds = L.latLngBounds(markerList)
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 })
        setHasFittedBounds(true)
      }
    })
  }, [usersLocations, currentCoords, currentUserId, isLiveTracking, hasMounted, hasFittedBounds])

  const recenterMap = () => {
    if (currentCoords && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([currentCoords.lat, currentCoords.lng], 16, { duration: 1 })
    } else {
      alert('Nejprve zapněte sdílení polohy.')
    }
  }

  if (!hasMounted) {
    return <div className="w-full h-screen bg-slate-100" />
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-100 select-none font-sans">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* HORNÍ PANEL */}
      <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-center pointer-events-none">
        <div className="pointer-events-auto bg-white/90 backdrop-blur-xl p-1.5 rounded-2xl border border-slate-200/80 shadow-xl flex gap-1">
          <button
            onClick={() => setMapMode('map')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              mapMode === 'map' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            🗺️ Mapa
          </button>
          <button
            onClick={() => setMapMode('satellite')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              mapMode === 'satellite' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            🛰️ Satelit
          </button>
        </div>

        <div className="flex items-center gap-2.5 pointer-events-auto">
          <button
            onClick={toggleLiveTracking}
            className={`h-11 px-4 rounded-2xl font-bold text-xs shadow-xl flex items-center gap-2.5 border backdrop-blur-xl transition-all active:scale-95 ${
              isLiveTracking
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-500/20'
                : 'bg-white/90 text-slate-700 border-slate-200/80 hover:bg-white'
            }`}
          >
            <div className={`w-7 h-4 rounded-full p-0.5 transition-colors relative flex items-center ${isLiveTracking ? 'bg-emerald-800' : 'bg-slate-300'}`}>
              <div className={`w-3 h-3 rounded-full bg-white shadow-md transition-transform duration-200 ${isLiveTracking ? 'translate-x-3' : 'translate-x-0'}`} />
            </div>
            <span>{isLiveTracking ? 'Poloha ZAP' : 'Poloha VYP'}</span>
          </button>

          <button
            onClick={recenterMap}
            className="bg-white/90 backdrop-blur-xl w-11 h-11 rounded-2xl border border-slate-200/80 shadow-xl flex items-center justify-center text-slate-700 hover:bg-white active:scale-95 transition-all text-sm"
          >
            🎯
          </button>
        </div>
      </div>

      {/* SPODNÍ LIST SEZNAMU GLOBÁLNÍCH PEJKAŘŮ */}
      <div className={`absolute bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-2xl rounded-t-[2.5rem] border-t border-slate-200/80 shadow-[0_-10px_30px_rgba(0,0,0,0.1)] transition-all duration-300 ease-out ${isDrawerOpen ? 'h-[55vh]' : 'h-20'}`}>
        <div onClick={() => setIsDrawerOpen(!isDrawerOpen)} className="w-full py-3 flex flex-col items-center cursor-pointer group">
          <div className="w-12 h-1.5 bg-slate-300 rounded-full group-hover:bg-slate-400 transition-colors" />
          <div className="flex justify-between items-center w-full px-6 pt-2">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-extrabold text-slate-900 tracking-tight">Všichni aktivní pejskaři</span>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-extrabold text-[11px]">
                {usersLocations.length}
              </span>
            </div>
            <span className="text-xs font-bold text-blue-600 group-hover:underline">
              {isDrawerOpen ? 'Skrýt seznam ✕' : 'Zobrazit seznam ▲'}
            </span>
          </div>
        </div>

        <div className="px-6 pb-24 overflow-y-auto h-[calc(100%-3.5rem)] space-y-2.5">
          {usersLocations.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <span className="text-3xl">🐾</span>
              <p className="text-xs text-slate-400 font-medium">Nikdo na světě teď nemá zapnutou polohu.</p>
            </div>
          ) : (
            usersLocations.map((user) => {
              const petName = user.profiles?.pet_name || user.profiles?.dog_name || 'Bez jména'
              const gender = user.profiles?.pet_gender || user.profiles?.dog_gender
              const avatarUrl = user.profiles?.avatar_url || user.profiles?.avatar

              return (
                <div
                  key={user.user_id}
                  onClick={() => {
                    setSelectedUser(user)
                    setIsDrawerOpen(false)
                    if (mapInstanceRef.current) {
                      mapInstanceRef.current.flyTo([user.latitude, user.longitude], 16, { duration: 1 })
                    }
                  }}
                  className="p-3.5 bg-white rounded-2xl border border-slate-200/80 flex items-center justify-between cursor-pointer hover:border-blue-300 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-slate-100 overflow-hidden border border-slate-200 flex-shrink-0 shadow-inner">
                      {avatarUrl ? (
                        <img src={avatarUrl} className="w-full h-full object-cover" alt="avatar" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-base">🐾</div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {petName}
                        </h4>
                        <span className="text-[10px]">{gender === 'holka' ? '♀️' : '♂️'}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">
                        @{user.profiles?.username || 'uzivatel'} • {user.profiles?.pet_type || user.profiles?.dog_breed || 'Zvíře'}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-xl">
                    Aktivní
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}