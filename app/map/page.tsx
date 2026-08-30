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

  profiles: {

    username: string

    avatar_url: string

    pet_name: string

    pet_type: string

    pet_gender: 'kluk' | 'holka'

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



export default function PetMapPage() {

  const router = useRouter()

  const [hasMounted, setHasMounted] = useState(false)

  const [mapMode, setMapMode] = useState<'map' | 'satellite'>('map')

  const [isLiveTracking, setIsLiveTracking] = useState(false)

  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null)

  const [usersLocations, setUsersLocations] = useState<UserLocation[]>([])

  const [maxRadius, setMaxRadius] = useState<number>(5)

  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)



  const mapContainerRef = useRef<HTMLDivElement>(null)

  const mapInstanceRef = useRef<any>(null)

  const tileLayerRef = useRef<any>(null)

  const labelLayerRef = useRef<any>(null)

  const markersRef = useRef<{ [key: string]: any }>({})

  const myLocationMarkerRef = useRef<any>(null)

  const radiusCircleRef = useRef<any>(null)

  const watchIdRef = useRef<number | null>(null)



  useEffect(() => {

    setHasMounted(true)

  }, [])



  useEffect(() => {

    if (!hasMounted) return



    const supabase = createClient()



    const fetchCurrentUser = async () => {

      const {

        data: { user },

      } = await supabase.auth.getUser()

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

    fetchLocations()



    const channel = supabase

      .channel('realtime-pet-map')

      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_locations' }, () => {

        fetchLocations()

      })

      .subscribe()



    return () => {

      supabase.removeChannel(channel)

      if (watchIdRef.current !== null) {

        navigator.geolocation.clearWatch(watchIdRef.current)

      }

    }

  }, [hasMounted])



  const fetchLocations = async () => {

    const supabase = createClient()

    const { data } = await supabase

      .from('user_locations')

      .select('*, profiles(username, avatar_url, pet_name, pet_type, pet_gender)')

      .eq('is_active', true)



    if (data) {

      setUsersLocations(data as any)

    }

  }



  // Inicializace Leaflet mapy

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

          background-color: #f1f5f9 !important;

          font-family: inherit;

        }

        .leaflet-popup-content-wrapper {

          border-radius: 1.25rem;

          box-shadow: 0 12px 30px -5px rgba(0, 0, 0, 0.18);

          padding: 4px;

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

        }).setView([50.0755, 14.4378], 13)



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



  // Funkce pro zapnutí / vypnutí sdílení polohy

  const toggleLiveTracking = async () => {

    if (!currentUserId) {

      alert('Pro sdílení polohy musíte být přihlášeni.')

      return

    }



    const supabase = createClient()

    const nextState = !isLiveTracking

    setIsLiveTracking(nextState)



    if (nextState) {

      // Zapnutí polohy

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

            addressName =

              geoData.address?.suburb || geoData.address?.city || geoData.address?.road || 'Aktuální poloha'

          } catch (e) {}



          await supabase.from('user_locations').upsert({

            user_id: currentUserId,

            latitude: lat,

            longitude: lng,

            address: addressName,

            is_active: true,

            updated_at: new Date().toISOString(),

          })



          if (mapInstanceRef.current && !currentCoords) {

            mapInstanceRef.current.flyTo([lat, lng], 15, { duration: 1.2 })

          }

        },

        () => {

          alert('Nelze získat GPS polohu. Zkontrolujte oprávnění v prohlížeči.')

          setIsLiveTracking(false)

        },

        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }

      )

    } else {

      // Vypnutí polohy

      if (watchIdRef.current !== null) {

        navigator.geolocation.clearWatch(watchIdRef.current)

        watchIdRef.current = null

      }



      setCurrentCoords(null)



      // Aktualizace stavu v databázi (is_active = false)

      await supabase.from('user_locations').update({ is_active: false }).eq('user_id', currentUserId)



      // Odstranění mé modré tečky a okruhu z mapy

      if (mapInstanceRef.current) {

        if (myLocationMarkerRef.current) {

          mapInstanceRef.current.removeLayer(myLocationMarkerRef.current)

          myLocationMarkerRef.current = null

        }

        if (radiusCircleRef.current) {

          mapInstanceRef.current.removeLayer(radiusCircleRef.current)

          radiusCircleRef.current = null

        }

      }

    }

  }



  // Vykreslení modré tečky uživatele a ostatních na mapě

  useEffect(() => {

    if (!mapInstanceRef.current || !hasMounted || typeof window === 'undefined') return



    import('leaflet').then((L) => {

      const map = mapInstanceRef.current



      // Odstranění starých markerů ostatních uživatelů

      Object.values(markersRef.current).forEach((marker: any) => map.removeLayer(marker))

      markersRef.current = {}



      // Odstranění vlastního indikátoru

      if (myLocationMarkerRef.current) {

        map.removeLayer(myLocationMarkerRef.current)

        myLocationMarkerRef.current = null

      }

      if (radiusCircleRef.current) {

        map.removeLayer(radiusCircleRef.current)

        radiusCircleRef.current = null

      }



      // 1. Vaše živá pozice (modrá tečka s pulzujícím efektem)

      if (currentCoords && isLiveTracking) {

        radiusCircleRef.current = L.circle([currentCoords.lat, currentCoords.lng], {

          radius: maxRadius * 1000,

          color: '#2563eb',

          fillColor: '#3b82f6',

          fillOpacity: 0.1,

          weight: 1.5,

          dashArray: '4, 6',

        }).addTo(map)



        const myDotIcon = L.divIcon({

          className: 'my-gps-dot',

          html: `

            <div class="relative flex items-center justify-center w-8 h-8">

              <div class="absolute w-8 h-8 bg-blue-500/40 rounded-full gps-pulse-ring"></div>

              <div class="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg"></div>

            </div>

          `,

          iconSize: [32, 32],

          iconAnchor: [16, 16],

        })



        myLocationMarkerRef.current = L.marker([currentCoords.lat, currentCoords.lng], {

          icon: myDotIcon,

          zIndexOffset: 1000,

        })

          .bindPopup(`

            <div style="font-family: sans-serif; padding: 4px; text-align: center;">

              <strong style="font-size: 13px; color: #2563eb;">📍 Vaše aktuální poloha</strong>

              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Sdílení polohy je aktivní</div>

            </div>

          `)

          .addTo(map)

      }



      // 2. Vykreslení ostatních aktivních uživatelů a jejich mazlíčků

      usersLocations.forEach((loc) => {

        if (loc.user_id === currentUserId) return



        let dist = 0

        if (currentCoords) {

          dist = getDistanceKm(currentCoords.lat, currentCoords.lng, loc.latitude, loc.longitude)

          if (dist > maxRadius) return

        }



        const genderSymbol = loc.profiles?.pet_gender === 'holka' ? '♀️ Holka' : '♂️ Kluk'

        const genderBg = loc.profiles?.pet_gender === 'holka' ? 'bg-pink-500' : 'bg-blue-500'

        const petType = loc.profiles?.pet_type || 'Mazlíček'



        const customIcon = L.divIcon({

          className: 'other-user-pin',

          html: `

            <div class="relative flex items-center justify-center cursor-pointer">

              <div class="relative w-11 h-11 rounded-full p-0.5 bg-white shadow-md border border-slate-200 hover:scale-110 transition-transform">

                <div class="w-full h-full rounded-full overflow-hidden bg-slate-100 flex items-center justify-center">

                  ${

                    loc.profiles?.avatar_url

                      ? `<img src="${loc.profiles.avatar_url}" class="w-full h-full object-cover" />`

                      : `<span class="text-base">🐾</span>`

                  }

                </div>

              </div>

              <div class="absolute -bottom-1 -right-1 ${genderBg} text-white text-[9px] px-1 rounded-full flex items-center justify-center font-bold border border-white shadow">

                ${loc.profiles?.pet_gender === 'holka' ? '♀' : '♂'}

              </div>

            </div>

          `,

          iconSize: [44, 44],

          iconAnchor: [22, 22],

        })



        const popupContent = document.createElement('div')

        popupContent.className = 'p-2 font-sans'

        popupContent.innerHTML = `

          <div class="flex items-center gap-3 mb-2">

            <div class="w-12 h-12 rounded-full overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0">

              ${

                loc.profiles?.avatar_url

                  ? `<img src="${loc.profiles.avatar_url}" class="w-full h-full object-cover" />`

                  : `<div class="w-full h-full flex items-center justify-center text-xl">🐾</div>`

              }

            </div>

            <div>

              <h3 class="font-bold text-sm text-slate-900 leading-tight">${loc.profiles?.pet_name || 'Bez jména'}</h3>

              <p class="text-xs text-slate-500 font-medium">Páníček: <span class="text-slate-800 font-semibold">@${

                loc.profiles?.username || 'uživatel'

              }</span></p>

            </div>

          </div>



          <div class="space-y-1 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-3">

            <div>🐾 <strong>Druh:</strong> ${petType}</div>

            <div><span>${genderSymbol}</span></div>

            ${currentCoords ? `<div>📏 <strong>Vzdálenost:</strong> ${formatDistance(dist)}</div>` : ''}

          </div>



          <button id="btn-profile-${loc.user_id}" class="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors text-center block">

            Zobrazit profil ➔

          </button>

        `



        const marker = L.marker([loc.latitude, loc.longitude], { icon: customIcon })

          .bindPopup(popupContent)

          .addTo(map)



        marker.on('popupopen', () => {

          const btn = document.getElementById(`btn-profile-${loc.user_id}`)

          if (btn) {

            btn.onclick = () => router.push(`/profile/${loc.user_id}`)

          }

        })



        marker.on('click', () => {

          if (marker.isPopupOpen()) {

            router.push(`/profile/${loc.user_id}`)

          }

        })



        markersRef.current[loc.user_id] = marker

      })

    })

  }, [usersLocations, currentCoords, maxRadius, currentUserId, isLiveTracking, hasMounted, router])



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



  const sortedUsers = [...usersLocations]

    .filter((u) => {

      if (u.user_id === currentUserId) return false

      if (!currentCoords) return true

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

    <div className="relative w-full h-screen overflow-hidden bg-slate-100 select-none font-sans">

      <div ref={mapContainerRef} className="w-full h-full z-0" />



      {/* HORNÍ LIŠTA – VLEVO MAPA/SATELIT, VPRAVO TLAČÍTKO POLOHY A VYCENTROVÁNÍ */}

      <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-center pointer-events-none">

        {/* Přepínač vrstev vlevo */}

        <div className="pointer-events-auto bg-white/90 backdrop-blur-md p-1 rounded-2xl border border-slate-200 shadow-lg flex gap-1">

          <button

            onClick={() => setMapMode('map')}

            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${

              mapMode === 'map' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'

            }`}

          >

            🗺️ Mapa

          </button>

          <button

            onClick={() => setMapMode('satellite')}

            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${

              mapMode === 'satellite' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'

            }`}

          >

            🛰️ Satelit

          </button>

        </div>



        {/* Ovládací prvky polohy vpravo (Přepínač ON/OFF + Vycentrování) */}

        <div className="flex items-center gap-2 pointer-events-auto">

          <button

            onClick={toggleLiveTracking}

            className={`h-10 px-3.5 rounded-2xl font-bold text-xs shadow-lg flex items-center gap-2.5 border backdrop-blur-md transition-all active:scale-95 ${

              isLiveTracking

                ? 'bg-emerald-600 text-white border-emerald-500'

                : 'bg-white/90 text-slate-700 border-slate-200 hover:bg-white'

            }`}

          >

            <div

              className={`w-7 h-4 rounded-full p-0.5 transition-colors relative flex items-center ${

                isLiveTracking ? 'bg-emerald-800' : 'bg-slate-300'

              }`}

            >

              <div

                className={`w-3 h-3 rounded-full bg-white shadow-md transition-transform duration-200 ${

                  isLiveTracking ? 'translate-x-3' : 'translate-x-0'

                }`}

              />

            </div>

            <span>{isLiveTracking ? 'Poloha ZAP' : 'Poloha VYP'}</span>

          </button>



          <button

            onClick={recenterMap}

            className="bg-white/90 backdrop-blur-md w-10 h-10 rounded-2xl border border-slate-200 shadow-lg flex items-center justify-center text-slate-700 hover:bg-white active:scale-95 transition-all"

            title="Vycentrovat na moji polohu"

          >

            🎯

          </button>

        </div>

      </div>



      {/* VYSUVACÍ LIST SEZNAMU */}

      <div

        className={`absolute bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-xl rounded-t-[2rem] border-t border-slate-200 shadow-2xl transition-all duration-300 ease-out ${

          isDrawerOpen ? 'h-[60vh]' : 'h-20'

        }`}

      >

        <div

          onClick={() => setIsDrawerOpen(!isDrawerOpen)}

          className="w-full py-2.5 flex flex-col items-center cursor-pointer group"

        >

          <div className="w-10 h-1 bg-slate-300 rounded-full group-hover:bg-slate-400 transition-colors" />

          <div className="flex justify-between items-center w-full px-6 pt-2">

            <div className="flex items-center gap-2">

              <span className="text-xs font-bold text-slate-900">Uživatelé a zvířata v okolí</span>

              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-extrabold text-[10px]">

                {sortedUsers.length}

              </span>

            </div>

            <span className="text-xs font-semibold text-slate-500">

              {isDrawerOpen ? 'Skrýt ✕' : 'Zobrazit seznam ▲'}

            </span>

          </div>

        </div>



        <div className="px-6 pb-20 overflow-y-auto h-[calc(100%-3rem)] space-y-4">

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">

            <div className="flex justify-between items-center text-xs font-semibold mb-1.5 text-slate-600">

              <span>Okruh vyhledávání:</span>

              <span className="text-blue-600 font-bold">{formatDistance(maxRadius)}</span>

            </div>

            <input

              type="range"

              min="0.5"

              max="20"

              step="0.5"

              value={maxRadius}

              onChange={(e) => setMaxRadius(parseFloat(e.target.value))}

              className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"

            />

          </div>



          <div className="space-y-2">

            {sortedUsers.length === 0 ? (

              <p className="text-center text-xs text-slate-400 py-6">V tomto okruhu nikdo další není. 🐾</p>

            ) : (

              sortedUsers.map((user) => {

                const dist = currentCoords

                  ? getDistanceKm(currentCoords.lat, currentCoords.lng, user.latitude, user.longitude)

                  : null



                return (

                  <div

                    key={user.user_id}

                    onClick={() => {

                      if (mapInstanceRef.current) {

                        mapInstanceRef.current.flyTo([user.latitude, user.longitude], 16, { duration: 1 })

                        if (markersRef.current[user.user_id]) {

                          markersRef.current[user.user_id].openPopup()

                        }

                      }

                    }}

                    className="p-3 bg-white rounded-2xl border border-slate-200 flex items-center justify-between cursor-pointer hover:border-blue-300 transition-all shadow-sm"

                  >

                    <div className="flex items-center gap-3">

                      <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden border border-slate-200 flex-shrink-0">

                        {user.profiles?.avatar_url ? (

                          <img src={user.profiles.avatar_url} className="w-full h-full object-cover" alt="avatar" />

                        ) : (

                          <div className="w-full h-full flex items-center justify-center text-sm">🐾</div>

                        )}

                      </div>

                      <div>

                        <div className="flex items-center gap-1.5">

                          <h4 className="text-xs font-bold text-slate-900">{user.profiles?.pet_name || 'Bez jména'}</h4>

                          <span className="text-[10px]">

                            {user.profiles?.pet_gender === 'holka' ? '♀️' : '♂️'}

                          </span>

                        </div>

                        <p className="text-[11px] text-slate-500 font-medium">

                          Páníček: @{user.profiles?.username} • {user.profiles?.pet_type || 'Zvíře'}

                        </p>

                      </div>

                    </div>



                    <div className="flex items-center gap-2">

                      {dist !== null && (

                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-xl">

                          {formatDistance(dist)}

                        </span>

                      )}

                      <button

                        onClick={(e) => {

                          e.stopPropagation()

                          router.push(`/profile/${user.user_id}`)

                        }}

                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"

                      >

                        Profil

                      </button>

                    </div>

                  </div>

                )

              })

            )}

          </div>

        </div>

      </div>

    </div>

  )

} 

