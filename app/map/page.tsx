'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Map as MapIcon, Satellite, LocateFixed, PawPrint, MapPin, Camera, UserRound } from 'lucide-react'

type UserLocation = {
  user_id: string
  latitude: number
  longitude: number
  address: string | null
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
    bio?: string
    age?: string | number
    instagram?: string
    [key: string]: any
  }
}

export default function PetMapPage() {
  const router = useRouter()
  const [hasMounted, setHasMounted] = useState(false)
  const [mapMode, setMapMode] = useState<'map' | 'satellite'>('map')
  const [isLiveTracking, setIsLiveTracking] = useState(false)
  const [sharingAudience, setSharingAudience] = useState<'nobody' | 'contacts' | 'public'>('nobody')
  const [sharingPrecision, setSharingPrecision] = useState<'approximate' | 'exact'>('approximate')
  const [sharingDuration, setSharingDuration] = useState<'1h' | '8h' | '24h' | 'forever'>('8h')
  const [showSharingSettings, setShowSharingSettings] = useState(false)
  const [sharingNotice, setSharingNotice] = useState('')
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [usersLocations, setUsersLocations] = useState<UserLocation[]>([])
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [locationSearch, setLocationSearch] = useState('')
  const [isSearchingPlace, setIsSearchingPlace] = useState(false)
  const [searchedPlace, setSearchedPlace] = useState('')
  const [placeSearchError, setPlaceSearchError] = useState('')
  const [placesMessage, setPlacesMessage] = useState('')
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false)

  const [selectedUser, setSelectedUser] = useState<UserLocation | null>(null)
  const [hasFittedBounds, setHasFittedBounds] = useState(false)

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const tileLayerRef = useRef<any>(null)
  const labelLayerRef = useRef<any>(null)
  const markersRef = useRef<{ [key: string]: any }>({})
  const placesMarkersRef = useRef<any[]>([])
  const myLocationMarkerRef = useRef<any>(null)
  const watchIdRef = useRef<number | null>(null)
  const sharingTimeoutRef = useRef<number | null>(null)
  const resolvedAddressRef = useRef(false)

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
          .select('is_active, latitude, longitude, sharing_audience, sharing_precision, sharing_expires_at')
          .eq('user_id', user.id)
          .maybeSingle()

        setSharingAudience(loc?.sharing_audience || 'nobody')
        setSharingPrecision(loc?.sharing_precision || 'approximate')
        const expired = Boolean(loc?.sharing_expires_at && new Date(loc.sharing_expires_at).getTime() <= Date.now())
        if (loc?.is_active && !expired && loc.sharing_audience !== 'nobody' && Number.isFinite(loc.latitude) && Number.isFinite(loc.longitude)) {
          setCurrentCoords({ lat: loc.latitude, lng: loc.longitude })
          setIsLiveTracking(true)
          if (loc.sharing_expires_at) {
            const remaining = new Date(loc.sharing_expires_at).getTime() - Date.now()
            sharingTimeoutRef.current = window.setTimeout(async () => {
              await supabase.from('user_locations').update({ is_active: false }).eq('user_id', user.id)
              setIsLiveTracking(false)
              setCurrentCoords(null)
            }, Math.max(0, remaining))
          }
        } else if (expired) {
          await supabase.from('user_locations').update({ is_active: false }).eq('user_id', user.id)
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
      if (sharingTimeoutRef.current !== null) window.clearTimeout(sharingTimeoutRef.current)
    }
  }, [hasMounted])

  const fetchGlobalLocations = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('public_map_locations')
      .select('user_id, latitude, longitude, address, is_active, updated_at, username, avatar_url, bio, display_name, full_name')
      .eq('is_active', true)

    if (error) {
      console.error('Chyba Supabase:', error.message)
    }

    if (data) {
      const userIds = data.map((location: any) => location.user_id).filter(Boolean)
      let petsByUser = new Map<string, { name?: string; type?: string; breed?: string; gender?: string }>()
      if (userIds.length > 0) {
        const { data: pets } = await supabase
          .from('pets')
          .select('user_id, name, type, breed, gender')
          .in('user_id', userIds)
        petsByUser = new Map((pets || []).map((pet: any) => [pet.user_id, pet]))
      }

      setUsersLocations(data.map((location: any) => {
        const pet = petsByUser.get(location.user_id)
        return {
          ...location,
          profiles: {
            username: location.username,
            avatar_url: location.avatar_url,
            bio: location.bio,
            display_name: location.display_name,
            full_name: location.full_name,
            pet_name: pet?.name,
            dog_name: pet?.name,
            pet_type: pet?.breed || pet?.type,
            dog_breed: pet?.breed || pet?.type,
            pet_gender: pet?.gender,
            dog_gender: pet?.gender,
          },
        }
      }) as UserLocation[])
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
          attributionControl: true,
        }).setView([20, 0], 2)

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
        tileLayerRef.current = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
        }).addTo(mapInstanceRef.current)
      } else {
        tileLayerRef.current = L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          { maxZoom: 19, attribution: 'Tiles &copy; Esri and its data providers' }
        ).addTo(mapInstanceRef.current)

        labelLayerRef.current = L.tileLayer(
          'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png',
          { maxZoom: 19, subdomains: 'abcd', attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>' }
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
    if (nextState && sharingAudience === 'nobody') {
      setSharingNotice('Nejdřív vyber, kdo smí polohu vidět. Dokud je zvoleno „Nikdo“, poloha se nesdílí.')
      setShowSharingSettings(true)
      return
    }
    setSharingNotice('')
    setIsLiveTracking(nextState)

    if (nextState) {
      const durationMs = sharingDuration === '1h' ? 60 * 60 * 1000 : sharingDuration === '8h' ? 8 * 60 * 60 * 1000 : sharingDuration === '24h' ? 24 * 60 * 60 * 1000 : null
      const expiresAt = durationMs === null ? null : new Date(Date.now() + durationMs).toISOString()
      resolvedAddressRef.current = false
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
          if (!resolvedAddressRef.current) {
            resolvedAddressRef.current = true
            try {
              const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`)
              if (res.ok) {
                const geoData = await res.json()
                addressName = geoData.address?.suburb || geoData.address?.city || geoData.address?.town || geoData.address?.village || geoData.address?.road || 'Aktuální poloha'
              }
            } catch {
              // GPS coordinates are still saved if reverse geocoding is unavailable.
            }
          } else {
            addressName = 'Sdílená živá poloha'
          }

          await supabase.from('user_locations').upsert({
            user_id: currentUserId,
            latitude: lat,
            longitude: lng,
            address: addressName,
            is_active: true,
            sharing_audience: sharingAudience,
            sharing_precision: sharingPrecision,
            sharing_expires_at: expiresAt,
            updated_at: new Date().toISOString(),
          })
        },
        () => {
          alert('Nelze získat GPS polohu.')
          setIsLiveTracking(false)
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      )
      if (durationMs !== null) {
        sharingTimeoutRef.current = window.setTimeout(async () => {
          if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current)
            watchIdRef.current = null
          }
          await supabase.from('user_locations').update({ is_active: false }).eq('user_id', currentUserId)
          setIsLiveTracking(false)
          setCurrentCoords(null)
          setSharingNotice('Čas sdílení polohy vypršel. Poloha už není sdílena.')
          sharingTimeoutRef.current = null
        }, durationMs)
      }
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

      usersLocations.filter((loc) => { const q=locationSearch.trim().toLowerCase(); return !q || [loc.address,loc.profiles?.username,loc.profiles?.pet_name,loc.profiles?.dog_name,loc.profiles?.pet_type,loc.profiles?.dog_breed].some(value=>String(value||'').toLowerCase().includes(q)) }).forEach((loc) => {
        if (!Number.isFinite(loc.latitude) || !Number.isFinite(loc.longitude)) return

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
                      : `<span class="text-base font-bold">P</span>`
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
  }, [usersLocations, currentCoords, currentUserId, isLiveTracking, hasMounted, hasFittedBounds, locationSearch])

  const loadNearbyPlaces = async (category: 'dog_park' | 'veterinary' | 'pet_shop' | 'dog_friendly') => {
    const map = mapInstanceRef.current
    if (!map || isLoadingPlaces) return
    const center = map.getCenter()
    const lat = Number(center.lat).toFixed(5)
    const lon = Number(center.lng).toFixed(5)
    const selectors: Record<typeof category, string> = {
      dog_park: 'nwr["leisure"="dog_park"](around:10000,LAT,LON);',
      veterinary: 'nwr["amenity"="veterinary"](around:10000,LAT,LON);',
      pet_shop: 'nwr["shop"="pet"](around:10000,LAT,LON);',
      dog_friendly: 'nwr["dog"~"yes|leashed|designated",i](around:10000,LAT,LON);',
    }
    const query = `[out:json][timeout:20];(${selectors[category].replaceAll('LAT', lat).replaceAll('LON', lon)});out center tags 50;`
    const categoryNames = { dog_park: 'psí parky', veterinary: 'veterináře', pet_shop: 'obchody pro zvířata', dog_friendly: 'místa označená jako vhodná pro psy' }
    setIsLoadingPlaces(true)
    setPlacesMessage(`Hledám ${categoryNames[category]} v okruhu 10 km…`)
    try {
      // Overpass is queried only after a user action; no background scanning or bulk requests.
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: `data=${encodeURIComponent(query)}`,
      })
      if (!response.ok) throw new Error('Veřejné vyhledávání míst je dočasně přetížené.')
      const result = await response.json()
      const elements = Array.isArray(result?.elements) ? result.elements : []
      const L = await import('leaflet')
      placesMarkersRef.current.forEach(marker => map.removeLayer(marker))
      placesMarkersRef.current = []
      for (const element of elements) {
        const placeLat = Number(element.lat ?? element.center?.lat)
        const placeLon = Number(element.lon ?? element.center?.lon)
        if (!Number.isFinite(placeLat) || !Number.isFinite(placeLon)) continue
        const name = typeof element.tags?.name === 'string' ? element.tags.name : categoryNames[category]
        const popup = document.createElement('div')
        const title = document.createElement('strong')
        title.textContent = name
        popup.appendChild(title)
        const detail = document.createElement('div')
        detail.textContent = [element.tags?.['addr:street'], element.tags?.['addr:housenumber'], element.tags?.['addr:city']].filter(Boolean).join(' ')
        if (detail.textContent) popup.appendChild(detail)
        const marker = L.circleMarker([placeLat, placeLon], { radius: 7, color: '#5B5BF7', fillColor: '#5B5BF7', fillOpacity: 0.9, weight: 2 }).addTo(map)
        marker.bindPopup(popup)
        placesMarkersRef.current.push(marker)
      }
      setPlacesMessage(elements.length ? `Nalezeno ${placesMarkersRef.current.length} míst v okruhu 10 km. Zdroj: OpenStreetMap.` : 'V okruhu 10 km jsme nenašli žádná odpovídající místa. Zkus přesunout mapu nebo jinou kategorii.')
    } catch (error) {
      setPlacesMessage(error instanceof Error ? error.message : 'Místa se nepodařilo načíst. Zkus to za chvíli.')
    } finally {
      setIsLoadingPlaces(false)
    }
  }

  const searchMapPlace = async () => {
    const query = locationSearch.trim()
    if (!query || !mapInstanceRef.current || isSearchingPlace) return
    setIsSearchingPlace(true)
    setPlaceSearchError('')
    try {
      // Nominatim is queried only after an explicit submit, never on each keystroke.
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`)
      if (!response.ok) throw new Error('Vyhledávání místa není právě dostupné.')
      const results = await response.json()
      const place = Array.isArray(results) ? results[0] : null
      if (!place || !Number.isFinite(Number(place.lat)) || !Number.isFinite(Number(place.lon))) {
        setPlaceSearchError('Místo se nepodařilo najít. Zkus upřesnit název nebo adresu.')
        return
      }
      mapInstanceRef.current.flyTo([Number(place.lat), Number(place.lon)], 13, { duration: 1 })
      setSearchedPlace(String(place.display_name || query))
      setLocationSearch('')
    } catch (error) {
      setPlaceSearchError(error instanceof Error ? error.message : 'Vyhledávání místa selhalo.')
    } finally {
      setIsSearchingPlace(false)
    }
  }

  const recenterMap = () => {
    if (currentCoords && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([currentCoords.lat, currentCoords.lng], 16, { duration: 1 })
    } else {
      alert('Nejprve zapněte sdílení polohy.')
    }
  }

  if (!hasMounted) {
    return <div className="w-full h-screen bg-[var(--pm-page)]" />
  }

  const selectedPetName = selectedUser?.profiles?.pet_name || selectedUser?.profiles?.dog_name || 'Bez jména'
  const selectedGender = selectedUser?.profiles?.pet_gender || selectedUser?.profiles?.dog_gender
  const selectedAvatarUrl = selectedUser?.profiles?.avatar_url || selectedUser?.profiles?.avatar
  const selectedBreed = selectedUser?.profiles?.pet_type || selectedUser?.profiles?.dog_breed || 'Zvíře'
  const selectedBio = selectedUser?.profiles?.bio
  const selectedAge = selectedUser?.profiles?.age
  const selectedUsername = selectedUser?.profiles?.username
  const selectedInstagram = selectedUser?.profiles?.instagram

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[var(--pm-page)] select-none font-sans">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* HORNÍ PANEL */}
      <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-center pointer-events-none">
        <div className="pointer-events-auto bg-white/90 backdrop-blur-xl p-1.5 rounded-2xl border border-slate-200/80 shadow-xl flex gap-1">
          <button
            onClick={() => setMapMode('map')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              mapMode === 'map' ? 'bg-[#5B5BF7] text-white shadow-md' : 'text-[var(--pm-muted)] hover:bg-[#EEF0FF]'
            }`}
          >
            <MapIcon size={14} aria-hidden="true" /> Mapa
          </button>
          <button
            onClick={() => setMapMode('satellite')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              mapMode === 'satellite' ? 'bg-[#5B5BF7] text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Satellite size={14} aria-hidden="true" /> Satelit
          </button>
        </div>

        <div className="flex items-center gap-2.5 pointer-events-auto">
          <button
            onClick={toggleLiveTracking}
            className={`h-11 px-4 rounded-2xl font-bold text-xs shadow-xl flex items-center gap-2.5 border backdrop-blur-xl transition-all active:scale-95 ${
              isLiveTracking
                ? 'bg-[#5B5BF7] text-white border-[#5B5BF7] shadow-[#5B5BF7]/20'
                : 'bg-white/90 text-slate-700 border-slate-200/80 hover:bg-white'
            }`}
          >
            <div className={`w-7 h-4 rounded-full p-0.5 transition-colors relative flex items-center ${isLiveTracking ? 'bg-[#4F46E5]' : 'bg-slate-300'}`}>
              <div className={`w-3 h-3 rounded-full bg-white shadow-md transition-transform duration-200 ${isLiveTracking ? 'translate-x-3' : 'translate-x-0'}`} />
            </div>
            <span>{isLiveTracking ? 'Poloha ZAP' : 'Poloha VYP'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSharingSettings(value => !value)}
            aria-expanded={showSharingSettings}
            className="h-11 rounded-2xl border border-slate-200/80 bg-white/90 px-3 text-xs font-bold text-slate-700 shadow-xl backdrop-blur-xl transition hover:bg-white"
          >
            Sdílení
          </button>
          <button
            onClick={recenterMap}
            aria-label="Znovu vystředit mapu"
            className="bg-white/90 backdrop-blur-xl w-11 h-11 rounded-2xl border border-slate-200/80 shadow-xl flex items-center justify-center text-slate-700 hover:bg-white active:scale-95 transition-all text-sm"
          >
            <LocateFixed size={17} aria-hidden="true" />
          </button>
        </div>
      </div>

      {showSharingSettings && (
        <section aria-label="Nastavení sdílení polohy" className="absolute right-4 top-[4.25rem] z-40 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-[var(--pm-line)] bg-[var(--pm-card)] p-4 text-[var(--pm-forest)] shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <div><h2 className="text-sm font-bold">Soukromí polohy</h2><p className="mt-1 text-xs leading-5 text-[var(--pm-muted)]">Sdílení je ve výchozím stavu vypnuté. Vyber publikum, přesnost a dobu.</p></div>
            <button type="button" onClick={() => setShowSharingSettings(false)} aria-label="Zavřít nastavení sdílení" className="rounded-lg px-2 py-1 text-[var(--pm-muted)] hover:bg-[var(--pm-hover)]">×</button>
          </div>
          <label className="mt-4 block text-xs font-semibold">Kdo může polohu vidět?
            <select value={sharingAudience} disabled={isLiveTracking} onChange={event => setSharingAudience(event.target.value as 'nobody' | 'contacts' | 'public')} className="mt-1.5 w-full rounded-xl border border-[var(--pm-line)] bg-[var(--pm-page)] p-2.5 text-sm disabled:opacity-60">
              <option value="nobody">Nikdo</option>
              <option value="contacts">Vzájemně se sledujeme</option>
              <option value="public">Veřejně</option>
            </select>
          </label>
          <label className="mt-3 block text-xs font-semibold">Přesnost polohy
            <select value={sharingPrecision} disabled={isLiveTracking} onChange={event => setSharingPrecision(event.target.value as 'approximate' | 'exact')} className="mt-1.5 w-full rounded-xl border border-[var(--pm-line)] bg-[var(--pm-page)] p-2.5 text-sm disabled:opacity-60">
              <option value="approximate">Přibližná (zaokrouhlení na zhruba 1 km)</option>
              <option value="exact">Přesná poloha a adresa</option>
            </select>
          </label>
          <label className="mt-3 block text-xs font-semibold">Doba sdílení
            <select value={sharingDuration} disabled={isLiveTracking} onChange={event => setSharingDuration(event.target.value as '1h' | '8h' | '24h' | 'forever')} className="mt-1.5 w-full rounded-xl border border-[var(--pm-line)] bg-[var(--pm-page)] p-2.5 text-sm disabled:opacity-60">
              <option value="1h">1 hodina</option><option value="8h">8 hodin</option><option value="24h">24 hodin</option><option value="forever">Dokud sdílení nevypnu</option>
            </select>
          </label>
          {sharingAudience === 'contacts' && <p className="mt-3 text-[11px] leading-5 text-[var(--pm-muted)]">Tuto volbu uvidí pouze přihlášení uživatelé, kteří se s tebou vzájemně sledují.</p>}
          {sharingPrecision === 'exact' && <p className="mt-2 text-[11px] leading-5 text-amber-700">Přesná poloha se zobrazí jen vybranému publiku. Používej ji pouze tehdy, pokud to opravdu chceš.</p>}
          {isLiveTracking && <p className="mt-3 text-[11px] text-[var(--pm-muted)]">Nejdřív sdílení vypni, pokud chceš změnit nastavení.</p>}
          {sharingNotice && <p role="status" className="mt-3 rounded-lg bg-[var(--pm-hover)] p-2 text-xs">{sharingNotice}</p>}
          <button type="button" onClick={() => setShowSharingSettings(false)} className="mt-4 w-full rounded-xl bg-[var(--pm-accent)] px-3 py-2.5 text-xs font-bold text-white hover:opacity-90">Hotovo</button>
        </section>
      )}

      <div className="absolute left-4 right-4 top-[5.25rem] z-20 max-w-md pointer-events-auto">
        <div className="rounded-2xl border border-[#D8DDFE] bg-[var(--pm-card)]/95 p-2 shadow-xl backdrop-blur-2xl">
          <div className="flex items-center gap-2 px-2"><span className="text-[#5B5BF7]" aria-hidden="true">⌕</span><input value={locationSearch} onChange={e=>setLocationSearch(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();void searchMapPlace()}}} placeholder="Hledat pejskaře, psa nebo místo…" aria-label="Hledat na mapě" className="min-w-0 flex-1 border-0 bg-transparent py-2 text-sm text-[#0F172A] outline-none placeholder:text-slate-400"/><button type="button" onClick={()=>void searchMapPlace()} disabled={!locationSearch.trim()||isSearchingPlace} className="rounded-xl bg-[#5B5BF7] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{isSearchingPlace?'Hledám…':'Najít místo'}</button></div>
          {searchedPlace&&<div className="px-3 pb-2 text-[11px] text-[#5B5BF7]">Mapa: {searchedPlace}</div>}
          {placeSearchError&&<p role="status" className="px-3 pb-2 text-xs text-red-700">{placeSearchError}</p>}
          <div className="flex flex-wrap gap-1.5 border-t border-[#E5E7EB] px-2 pt-2">
            <button type="button" disabled={isLoadingPlaces} onClick={()=>void loadNearbyPlaces('dog_park')} className="rounded-lg border border-[#D8DDFE] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#5B5BF7] disabled:opacity-50">Psí parky</button>
            <button type="button" disabled={isLoadingPlaces} onClick={()=>void loadNearbyPlaces('veterinary')} className="rounded-lg border border-[#D8DDFE] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#5B5BF7] disabled:opacity-50">Veterináři</button>
            <button type="button" disabled={isLoadingPlaces} onClick={()=>void loadNearbyPlaces('pet_shop')} className="rounded-lg border border-[#D8DDFE] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#5B5BF7] disabled:opacity-50">Obchody</button>
            <button type="button" disabled={isLoadingPlaces} onClick={()=>void loadNearbyPlaces('dog_friendly')} className="rounded-lg border border-[#D8DDFE] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#5B5BF7] disabled:opacity-50">Dog-friendly</button>
          </div>
          {placesMessage&&<p role="status" className="px-3 pt-2 text-[11px] text-slate-600">{placesMessage}</p>}
          {locationSearch.trim()&&<div className="max-h-48 overflow-y-auto border-t border-[#E5E7EB] pt-1">{usersLocations.filter(loc=>[loc.address,loc.profiles?.username,loc.profiles?.pet_name,loc.profiles?.dog_name,loc.profiles?.pet_type,loc.profiles?.dog_breed].some(value=>String(value||'').toLowerCase().includes(locationSearch.trim().toLowerCase()))).slice(0,6).map(loc=><button key={loc.user_id} onClick={()=>{setSelectedUser(loc);if(mapInstanceRef.current)mapInstanceRef.current.flyTo([loc.latitude,loc.longitude],15,{duration:1})}} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-[#EEF0FF]"><span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[var(--pm-active)] text-xs font-bold text-[#5B5BF7]">{loc.profiles?.avatar_url||loc.profiles?.avatar?<img src={loc.profiles?.avatar_url||loc.profiles?.avatar} alt="" className="h-full w-full object-cover"/>:(loc.profiles?.username||loc.profiles?.pet_name||'P').slice(0,1).toUpperCase()}</span><span className="min-w-0"><span className="block truncate text-xs font-bold text-[#0F172A]">{loc.profiles?.pet_name||loc.profiles?.dog_name||loc.profiles?.username||'Pejskař'}</span><span className="block truncate text-[11px] text-slate-500">{loc.profiles?.username?'@'+loc.profiles.username+' · ':''}{loc.address||'Poloha sdílena'}</span></span></button>)}{usersLocations.filter(loc=>[loc.address,loc.profiles?.username,loc.profiles?.pet_name,loc.profiles?.dog_name,loc.profiles?.pet_type,loc.profiles?.dog_breed].some(value=>String(value||'').toLowerCase().includes(locationSearch.trim().toLowerCase()))).length===0&&<p className="px-3 py-3 text-xs text-slate-500">Nic jsme nenašli.</p>}</div>}
        </div>
      </div>

      {/* DETAILNÍ KARTA PROFILU (VÍCE INFORMACÍ, ČISTÝ DESIGN BEZ NAVIGACE) */}
      {selectedUser && (
        <div className="absolute bottom-28 left-4 right-4 z-30 bg-white/95 backdrop-blur-2xl rounded-3xl p-5 border border-slate-200/90 shadow-2xl animate-in fade-in slide-in-from-bottom-5 max-w-md mx-auto">
          <div className="flex items-start justify-between mb-3.5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden border-2 border-slate-200 shadow-sm flex-shrink-0">
                {selectedAvatarUrl ? (
                  <img src={selectedAvatarUrl} className="w-full h-full object-cover" alt="avatar" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl"><PawPrint size={19} aria-hidden="true" /></div>
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-slate-900">{selectedPetName}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold text-white ${selectedGender === 'holka' ? 'bg-pink-500' : 'bg-blue-500'}`}>
                    {selectedGender === 'holka' ? '♀ Holka' : '♂ Kluk'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  {selectedUsername ? `@${selectedUsername}` : 'Pejskař'}
                </p>
                <p className="text-xs text-[var(--pm-accent)] font-bold flex items-center gap-1">
                  <MapPin size={12} aria-hidden="true" /> {selectedUser.address || 'Aktivní poloha'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedUser(null)}
              className="p-2 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-xl transition"
            >
              ✕
            </button>
          </div>

          {/* Rozšířené detailní informace */}
          <div className="grid grid-cols-2 gap-2 mb-3.5">
            <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Plemeno / Druh</p>
              <p className="text-xs font-bold text-slate-800 mt-0.5 truncate">{selectedBreed}</p>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Věk</p>
              <p className="text-xs font-bold text-slate-800 mt-0.5">{selectedAge ? `${selectedAge} let` : 'Neuvedeno'}</p>
            </div>
          </div>

          {selectedBio && (
            <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl mb-3.5 border border-slate-100">
              <p className="font-bold text-slate-700 mb-0.5">O nás:</p>
              <p className="italic">"{selectedBio}"</p>
            </div>
          )}

          {selectedInstagram && (
            <div className="text-xs text-slate-600 bg-pink-50/50 p-2.5 rounded-2xl mb-3.5 border border-pink-100 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-pink-600 font-bold"><Camera size={13} aria-hidden="true" /> Instagram:</span>
              <span className="font-semibold text-slate-700">@{selectedInstagram.replace('@', '')}</span>
            </div>
          )}

          {/* Akční tlačítka */}
          <div className="flex gap-2 pt-2 border-t border-slate-100">
            {selectedUsername && (
              <button
                onClick={() => router.push(`/profile/${selectedUsername}`)}
                className="flex-1 bg-blue-600 hover:bg-[#4F46E5] text-white text-xs font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-[#5B5BF7]/20"
              >
                <UserRound size={14} aria-hidden="true" /> Zobrazit profil
              </button>
            )}
            <button
              onClick={() => {
                setSelectedUser(null)
                if (mapInstanceRef.current) {
                  mapInstanceRef.current.flyTo([selectedUser.latitude, selectedUser.longitude], 17, { duration: 1 })
                }
              }}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-1.5"
            >
              <MapPin size={14} aria-hidden="true" /> Ukázat na mapě
            </button>
          </div>
        </div>
      )}

      {/* SPODNÍ LIST SEZNAMU PEJKAŘŮ */}
      <div className={`absolute bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-2xl rounded-t-[2.5rem] border-t border-slate-200/80 shadow-[0_-10px_30px_rgba(0,0,0,0.1)] transition-all duration-300 ease-out ${isDrawerOpen ? 'h-[55vh]' : 'h-20'}`}>
        <div onClick={() => setIsDrawerOpen(!isDrawerOpen)} className="w-full py-3 flex flex-col items-center cursor-pointer group">
          <div className="w-12 h-1.5 bg-slate-300 rounded-full group-hover:bg-slate-400 transition-colors" />
          <div className="flex justify-between items-center w-full px-6 pt-2">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-extrabold text-slate-900 tracking-tight">Všichni aktivní pejskaři</span>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#5B5BF7] font-extrabold text-[11px]">
                {usersLocations.length}
              </span>
            </div>
            <span className="text-xs font-bold text-blue-600 group-hover:underline">
              {isDrawerOpen ? 'Skrýt seznam' : 'Zobrazit seznam'}
            </span>
          </div>
        </div>

        <div className="px-6 pb-24 overflow-y-auto h-[calc(100%-3.5rem)] space-y-2.5">
          {usersLocations.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <PawPrint size={28} className="mx-auto" aria-hidden="true" />
              <p className="text-xs text-slate-400 font-medium">Nikdo v okolí teď nemá zapnutou polohu.</p>
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
                  className="p-3.5 bg-white rounded-2xl border border-slate-200/80 flex items-center justify-between cursor-pointer hover:border-[#C7C9FF] hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-slate-100 overflow-hidden border border-slate-200 flex-shrink-0 shadow-inner">
                      {avatarUrl ? (
                        <img src={avatarUrl} className="w-full h-full object-cover" alt="avatar" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-base font-bold">P</div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-extrabold text-slate-900 group-hover:text-[#5B5BF7] transition-colors">
                          {petName}
                        </h4>
                        <span className="text-[10px]">{gender === 'holka' ? '♀' : '♂'}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">
                        @{user.profiles?.username || 'uzivatel'} • {user.profiles?.pet_type || user.profiles?.dog_breed || 'Zvíře'}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-emerald-600 bg-[var(--pm-active)] px-2.5 py-1.5 rounded-xl">
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
