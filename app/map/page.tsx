'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'

type UserLocation = {
  user_id: string
  latitude: number
  longitude: number
  address: string
  is_active: boolean
  updated_at: string
  profiles: {
    username: string
    avatar_url: string
    dog_name: string
    dog_gender: 'kluk' | 'holka'
  }
}

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function formatDistance(distKm: number) {
  if (distKm < 1) {
    return `${Math.round(distKm * 1000)} m`
  }
  return `${distKm.toFixed(1)} km`
}

export default function RealtimeMapPage() {
  const [mapMode, setMapMode] = useState<'light' | 'dark' | 'satellite'>('light')
  const [isLocationActive, setIsLocationActive] = useState(false)
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [usersLocations, setUsersLocations] = useState<UserLocation[]>([])
  const [maxRadius, setMaxRadius] = useState<number>(5) // 0 az 20 km (step 0.1)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const tileLayerRef = useRef<any>(null)
  const markersRef = useRef<{ [key: string]: any }>({})
  const radiusCircleRef = useRef<any>(null)
  const watchIdRef = useRef<number | null>(null)

  useEffect(() => {
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

        if (loc?.is_active) {
          setIsLocationActive(true)
          if (loc.latitude && loc.longitude) {
            setCurrentCoords({ lat: loc.latitude, lng: loc.longitude })
          }
        }
      }
    }

    fetchCurrentUser()
    fetchLocations()

    const channel = supabase
      .channel('realtime-locations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_locations' }, () => {
        fetchLocations()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
    }
  }, [])

  const fetchLocations = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('user_locations')
      .select('*, profiles(username, avatar_url, dog_name, dog_gender)')
      .eq('is_active', true)

    if (data) {
      setUsersLocations(data as any)
    }
  }

  // Inicializace Leaflet Mapy
  useEffect(() => {
    if (typeof window === 'undefined') return

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    import('leaflet').then((L) => {
      if (!mapContainerRef.current) return

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          zoomControl: false,
          attributionControl: false
        }).setView([50.0755, 14.4378], 13)

        mapInstanceRef.current = map
      }

      if (tileLayerRef.current) {
        mapInstanceRef.current.removeLayer(tileLayerRef.current)
      }

      let tileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
      if (mapMode === 'dark') {
        tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      } else if (mapMode === 'satellite') {
        tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      }

      const newTileLayer = L.tileLayer(tileUrl, { maxZoom: 19 })
      newTileLayer.addTo(mapInstanceRef.current)
      tileLayerRef.current = newTileLayer
    })
  }, [mapMode])

  // Vykreslení kruhu okruhu & Špendlíků
  useEffect(() => {
    if (!mapInstanceRef.current || typeof window === 'undefined') return

    import('leaflet').then((L) => {
      const map = mapInstanceRef.current

      // Promazání starých špendlíků
      Object.values(markersRef.current).forEach((marker: any) => map.removeLayer(marker))
      markersRef.current = {}

      // Nakreslení/Aktualizace VIZUÁLNÍHO KRUHU VZDÁLENOSTI
      if (radiusCircleRef.current) {
        map.removeLayer(radiusCircleRef.current)
        radiusCircleRef.current = null
      }

      if (currentCoords && isLocationActive) {
        radiusCircleRef.current = L.circle([currentCoords.lat, currentCoords.lng], {
          radius: maxRadius * 1000,
          color: '#6366f1',
          fillColor: '#818cf8',
          fillOpacity: 0.15,
          weight: 2,
          dashArray: '6, 8'
        }).addTo(map)
      }

      // Vykreslení uživatelů
      usersLocations.forEach((loc) => {
        const isMe = loc.user_id === currentUserId
        let dist = 0

        if (currentCoords) {
          dist = getDistanceKm(currentCoords.lat, currentCoords.lng, loc.latitude, loc.longitude)
          if (dist > maxRadius && !isMe) return
        }

        const genderSymbol = loc.profiles?.dog_gender === 'holka' ? '♀️' : '♂️'
        const genderBg = loc.profiles?.dog_gender === 'holka' ? 'bg-pink-500' : 'bg-blue-500'

        const customIcon = L.divIcon({
          className: 'custom-map-pin',
          html: `
            <div class="relative group cursor-pointer">
              ${isMe ? `
                <div class="absolute -inset-2 bg-indigo-500 rounded-full blur-sm opacity-60 animate-ping"></div>
              ` : ''}
              <div class="w-12 h-12 rounded-full border-4 ${isMe ? 'border-indigo-600 ring-4 ring-indigo-300' : 'border-white'} shadow-2xl overflow-hidden bg-white relative z-10">
                ${loc.profiles?.avatar_url 
                  ? `<img src="${loc.profiles.avatar_url}" class="w-full h-full object-cover" />`
                  : `<div class="w-full h-full flex items-center justify-center bg-indigo-100 text-lg">🐶</div>`
                }
              </div>
              <div class="absolute -bottom-1 -right-1 ${genderBg} text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold border-2 border-white shadow z-20">
                ${genderSymbol}
              </div>
              ${isMe ? `
                <div class="absolute -top-7 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-md whitespace-nowrap z-20">
                  VY
                </div>
              ` : ''}
            </div>
          `,
          iconSize: [48, 48],
          iconAnchor: [24, 24]
        })

        const popupContent = `
          <div style="font-family: sans-serif; padding: 4px; min-width: 170px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
              <strong style="font-size: 14px; color: #111;">${loc.profiles?.dog_name || 'Pejsek'}</strong>
              <span style="font-size: 13px;">${genderSymbol}</span>
            </div>
            <div style="font-size: 11px; color: #555; line-height: 1.4;">
              👤 <strong>@${loc.profiles?.username || 'uživatel'}</strong><br/>
              📍 ${loc.address || 'Souřadnice vyhledány'}<br/>
              ${currentCoords && !isMe ? `📏 <strong>${formatDistance(dist)}</strong> od vás` : ''}
              ${isMe ? `<span style="color:#6366f1; font-weight:bold;">📍 Vaše aktuální pozice</span>` : ''}
            </div>
          </div>
        `

        const marker = L.marker([loc.latitude, loc.longitude], { icon: customIcon })
          .bindPopup(popupContent)
          .addTo(map)

        markersRef.current[loc.user_id] = marker
      })
    })
  }, [usersLocations, currentCoords, maxRadius, currentUserId, isLocationActive])

  // Zapnutí / Vypnutí Polohy
  const toggleLocation = async () => {
    if (!currentUserId) {
      alert('Pro sdílení polohy musíte být přihlášeni.')
      return
    }

    const supabase = createClient()
    const nextState = !isLocationActive
    setIsLocationActive(nextState)

    if (nextState) {
      if (!navigator.geolocation) {
        alert('Váš prohlížeč nepodporuje geolokaci.')
        return
      }

      watchIdRef.current = navigator.geolocation.watchPosition(
        async (position) => {
          const lat = position.coords.latitude
          const lng = position.coords.longitude
          setCurrentCoords({ lat, lng })

          let addressName = 'Neznámá adresa'
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
            updated_at: new Date().toISOString()
          })

          if (mapInstanceRef.current && !currentCoords) {
            mapInstanceRef.current.flyTo([lat, lng], 15)
          }
        },
        () => {
          alert('Nelze získat vaši polohu. Povolte přístup k GPS.')
          setIsLocationActive(false)
        },
        { enableHighAccuracy: true }
      )
    } else {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
      await supabase.from('user_locations').update({ is_active: false }).eq('user_id', currentUserId)
      if (radiusCircleRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(radiusCircleRef.current)
      }
    }
  }

  const recenterMap = () => {
    if (currentCoords && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([currentCoords.lat, currentCoords.lng], 15)
    } else {
      alert('Nejprve zapněte svoji polohu pro vycentrování.')
    }
  }

  // Filtr a řazení podle nejbližších
  const sortedUsers = [...usersLocations]
    .filter((u) => {
      if (!currentCoords || u.user_id === currentUserId) return true
      const d = getDistanceKm(currentCoords.lat, currentCoords.lng, u.latitude, u.longitude)
      return d <= maxRadius
    })
    .sort((a, b) => {
      if (!currentCoords) return 0
      const dA = getDistanceKm(currentCoords.lat, currentCoords.lng, a.latitude, a.longitude)
      const dB = getDistanceKm(currentCoords.lat, currentCoords.lng, b.latitude, b.longitude)
      return dA - dB
    })

  return (
    <div className="relative w-full h-screen overflow-hidden bg-neutral-900 select-none font-sans">
      
      {/* MAPA */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* HORNÍ REŽIMY MAPY */}
      <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-center pointer-events-none">
        <div className="pointer-events-auto bg-white/90 backdrop-blur-md p-1.5 rounded-2xl shadow-xl flex gap-1 border border-neutral-200/80">
          <button
            onClick={() => setMapMode('light')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              mapMode === 'light' ? 'bg-indigo-600 text-white shadow' : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            ☀️ Světlá
          </button>
          <button
            onClick={() => setMapMode('dark')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              mapMode === 'dark' ? 'bg-indigo-600 text-white shadow' : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            🌙 Tmavá
          </button>
          <button
            onClick={() => setMapMode('satellite')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              mapMode === 'satellite' ? 'bg-indigo-600 text-white shadow' : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            🛰️ Satelit
          </button>
        </div>

        <button
          onClick={recenterMap}
          className="pointer-events-auto bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-neutral-200 text-xl hover:scale-110 active:scale-95 transition-transform"
          title="Vycentrovat na moji polohu"
        >
          🎯
        </button>
      </div>

      {/* TLAČÍTKO ZAPNOUT / VYPNOUT GPS */}
      <div className="absolute top-20 left-4 z-10">
        <button
          onClick={toggleLocation}
          className={`px-4 py-2.5 rounded-2xl font-bold text-xs shadow-2xl flex items-center gap-2 border transition-all ${
            isLocationActive
              ? 'bg-emerald-500 text-white border-emerald-400 animate-pulse'
              : 'bg-white/90 text-neutral-800 border-neutral-200 hover:bg-white'
          }`}
        >
          <span className={`w-2.5 h-2.5 rounded-full ${isLocationActive ? 'bg-white' : 'bg-rose-500'}`} />
          {isLocationActive ? 'Poloha AKTIVNÍ' : 'Zapnout moji polohu'}
        </button>
      </div>

      {/* SPODNÍ ZASOUVACÍ PANEL */}
      <div
        className={`absolute bottom-20 left-0 right-0 z-20 bg-white/95 backdrop-blur-2xl rounded-t-[2.5rem] border-t border-neutral-200/80 shadow-2xl transition-all duration-300 ease-in-out ${
          isDrawerOpen ? 'h-[65vh]' : 'h-24'
        }`}
      >
        <div 
          onClick={() => setIsDrawerOpen(!isDrawerOpen)}
          className="w-full py-3 flex flex-col items-center cursor-pointer group"
        >
          <div className="w-12 h-1.5 bg-neutral-300 rounded-full group-hover:bg-neutral-400 transition-colors" />
          <div className="flex justify-between items-center w-full px-6 pt-2">
            <span className="text-xs font-extrabold text-neutral-800 tracking-tight">
              🐾 Pejskaři v okruhu ({sortedUsers.length})
            </span>
            <span className="text-xs font-bold text-indigo-600">
              {isDrawerOpen ? 'Zavřít ✕' : 'Zobrazit seznam ▲'}
            </span>
          </div>
        </div>

        <div className="px-6 pb-20 overflow-y-auto h-[calc(100%-3rem)] space-y-4">
          
          {/* POSUVNÍK 0.0 km až 20.0 km (krok po 100 m) */}
          <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200/60 shadow-inner">
            <div className="flex justify-between items-center text-xs font-bold mb-2">
              <span className="text-neutral-600">Okruh viditelnosti:</span>
              <span className="text-indigo-600 font-black text-sm">{formatDistance(maxRadius)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="20"
              step="0.1"
              value={maxRadius}
              onChange={(e) => setMaxRadius(parseFloat(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer h-2 bg-neutral-200 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-neutral-400 mt-1 font-semibold">
              <span>0 m</span>
              <span>10 km</span>
              <span>20 km</span>
            </div>
          </div>

          {/* SEZNAM UŽIVATELŮ V OKOLÍ */}
          <div className="space-y-2.5">
            {sortedUsers.length === 0 ? (
              <p className="text-center text-xs text-neutral-400 py-6">V tomto okruhu se nenachází žádný aktivní pejskař. 🐾</p>
            ) : (
              sortedUsers.map((user) => {
                const isMe = user.user_id === currentUserId
                const dist = currentCoords
                  ? getDistanceKm(currentCoords.lat, currentCoords.lng, user.latitude, user.longitude)
                  : null

                return (
                  <div
                    key={user.user_id}
                    onClick={() => {
                      if (mapInstanceRef.current) {
                        mapInstanceRef.current.flyTo([user.latitude, user.longitude], 16)
                        if (markersRef.current[user.user_id]) {
                          markersRef.current[user.user_id].openPopup()
                        }
                      }
                    }}
                    className={`p-3.5 bg-white rounded-2xl border flex items-center justify-between cursor-pointer hover:border-indigo-400 transition-all shadow-sm ${
                      isMe ? 'border-indigo-200 bg-indigo-50/30' : 'border-neutral-200/70'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative w-11 h-11 rounded-full bg-neutral-100 overflow-hidden border border-neutral-200">
                        {user.profiles?.avatar_url ? (
                          <img src={user.profiles.avatar_url} className="w-full h-full object-cover" alt="avatar" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-base">🐶</div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-neutral-900">{user.profiles?.dog_name || 'Pejsek'}</h4>
                          <span className="text-[10px]">
                            {user.profiles?.dog_gender === 'holka' ? '♀️' : '♂️'}
                          </span>
                          {isMe && <span className="text-[9px] bg-indigo-600 text-white font-black px-1.5 py-0.5 rounded-md">VY</span>}
                        </div>
                        <p className="text-[11px] text-neutral-500 font-medium">@{user.profiles?.username || 'uživatel'}</p>
                        <p className="text-[10px] text-neutral-400">📍 {user.address}</p>
                      </div>
                    </div>

                    {dist !== null && !isMe && (
                      <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-xl">
                        {formatDistance(dist)}
                      </span>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* NAVIGACE */}
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-md bg-white/85 backdrop-blur-2xl border border-neutral-200/80 rounded-[2.5rem] px-6 py-3.5 flex justify-around items-center shadow-2xl z-[100]">
        <Link href="/domu" className="text-neutral-400 hover:text-neutral-600 text-2xl hover:scale-110 transition-transform">🏠</Link>
        <Link href="/map" className="text-indigo-600 text-2xl hover:scale-110 transition-transform">🗺️</Link>
        <Link href="/domu" className="bg-gradient-to-r from-indigo-600 to-purple-600 w-12 h-12 rounded-full flex items-center justify-center text-white text-2xl shadow-lg shadow-indigo-500/30 -mt-10 border-4 border-white hover:scale-110 active:scale-95 transition-all">
          ＋
        </Link>
        <Link href="/chat" className="text-neutral-400 hover:text-neutral-600 text-2xl hover:scale-110 transition-transform">🐾</Link>
        <Link href="/profile" className="text-neutral-400 hover:text-neutral-600 text-2xl hover:scale-110 transition-transform">👤</Link>
      </nav>

    </div>
  )
}