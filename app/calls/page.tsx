'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'

const supabase = createClient()
type Signal = { from: string; to?: string; kind: 'join'|'offer'|'answer'|'ice'|'leave'; description?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit; name?: string }

export default function CallsPage() {
  const [userId,setUserId] = useState('')
  const [room,setRoom] = useState('')
  const [active,setActive] = useState(false)
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  const [micOn,setMicOn] = useState(true)
  const [cameraOn,setCameraOn] = useState(true)
  const [participants,setParticipants] = useState<string[]>([])
  const localVideo = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream|null>(null)
  const channelRef = useRef<any>(null)
  const peersRef = useRef<Map<string,RTCPeerConnection>>(new Map())
  const videosRef = useRef<Map<string,HTMLVideoElement>>(new Map())
  const [remoteStreams,setRemoteStreams] = useState<{id:string;stream:MediaStream}[]>([])

  useEffect(()=>{
    void supabase.auth.getUser().then(({data})=>setUserId(data.user?.id||''))
    const initialRoom = new URLSearchParams(window.location.search).get('room')
    if (initialRoom) setRoom(initialRoom)
  },[])
  useEffect(()=>()=>{ void leaveCall() },[])

  const send = async (payload:Signal) => {
    if (channelRef.current) await channelRef.current.send({type:'broadcast',event:'signal',payload})
  }
  const getPeer = (id:string) => {
    let pc=peersRef.current.get(id)
    if (pc) return pc
    pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun.cloudflare.com:3478'}]})
    streamRef.current?.getTracks().forEach(track=>pc!.addTrack(track,streamRef.current!))
    pc.onicecandidate=e=>{if(e.candidate) void send({from:userId,to:id,kind:'ice',candidate:e.candidate.toJSON()})}
    pc.ontrack=e=>{
      const stream=e.streams[0]
      setRemoteStreams(old=>old.some(x=>x.id===id)?old.map(x=>x.id===id?{id,stream}:x):[...old,{id,stream}])
    }
    pc.onconnectionstatechange=()=>{if(pc!.connectionState==='failed'||pc!.connectionState==='closed'||pc!.connectionState==='disconnected'){setParticipants(old=>old.filter(x=>x!==id))}}
    peersRef.current.set(id,pc)
    setParticipants(old=>old.includes(id)?old:[...old,id])
    return pc
  }

  const handleSignal = async (signal:Signal) => {
    if(!userId||signal.from===userId||(signal.to&&signal.to!==userId)) return
    if(signal.kind==='join') {
      if(userId.localeCompare(signal.from)>0) {
        const pc=getPeer(signal.from)
        try { const offer=await pc.createOffer(); await pc.setLocalDescription(offer); await send({from:userId,to:signal.from,kind:'offer',description:pc.localDescription?.toJSON()}) } catch(e){console.error('Call offer failed',e)}
      }
      return
    }
    if(signal.kind==='leave') {
      peersRef.current.get(signal.from)?.close();peersRef.current.delete(signal.from)
      setParticipants(old=>old.filter(x=>x!==signal.from));setRemoteStreams(old=>old.filter(x=>x.id!==signal.from));return
    }
    const pc=getPeer(signal.from)
    try {
      if(signal.kind==='offer'&&signal.description) {
        await pc.setRemoteDescription(signal.description)
        const answer=await pc.createAnswer();await pc.setLocalDescription(answer)
        await send({from:userId,to:signal.from,kind:'answer',description:pc.localDescription?.toJSON()})
      } else if(signal.kind==='answer'&&signal.description) {
        if(pc.signalingState==='have-local-offer') await pc.setRemoteDescription(signal.description)
      } else if(signal.kind==='ice'&&signal.candidate) {
        await pc.addIceCandidate(signal.candidate)
      }
    } catch(e) { console.warn('Call signaling issue',e) }
  }

  const joinCall = async () => {
    setError('')
    if(!userId){setError('Pro hovory se nejprve přihlas.');return}
    if(!room.trim()) {setError('Zadej kód místnosti nebo vytvoř novou.');return}
    setBusy(true)
    try {
      if(!navigator.mediaDevices?.getUserMedia) throw new Error('Prohlížeč nepodporuje kameru a mikrofon nebo stránka není zabezpečená (HTTPS).')
      const stream=await navigator.mediaDevices.getUserMedia({audio:true,video:true})
      streamRef.current=stream
      if(localVideo.current) localVideo.current.srcObject=stream
      const channel=supabase.channel('pawmeet-call-'+room.trim(),{config:{broadcast:{self:false},presence:{key:userId}}})
      channel.on('broadcast',{event:'signal'},({payload}: {payload:Signal})=>{void handleSignal(payload)})
      channel.on('presence',{event:'sync'},()=>{const state=channel.presenceState();setParticipants(Object.keys(state).filter(id=>id!==userId))})
      await new Promise<void>((resolve,reject)=>{
        channel.subscribe((status:string)=>{if(status==='SUBSCRIBED')resolve();if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')reject(new Error('Nepodařilo se připojit signalizaci hovoru. Zkus to znovu.'))})
      })
      channelRef.current=channel
      await channel.track({user_id:userId,joined_at:new Date().toISOString()})
      setActive(true)
      await send({from:userId,kind:'join'})
    } catch(e) {
      streamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current=null
      setError(e instanceof Error?e.message:'Hovor se nepodařilo spustit.')
    } finally {setBusy(false)}
  }

  const leaveCall = async () => {
    if(channelRef.current) {
      await channelRef.current.send({type:'broadcast',event:'signal',payload:{from:userId,kind:'leave'}}).catch(()=>{})
      await supabase.removeChannel(channelRef.current).catch(()=>{})
      channelRef.current=null
    }
    peersRef.current.forEach(pc=>pc.close());peersRef.current.clear()
    streamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current=null
    setRemoteStreams([]);setParticipants([]);setActive(false)
  }
  const toggleMic=()=>{const next=!micOn;streamRef.current?.getAudioTracks().forEach(t=>t.enabled=next);setMicOn(next)}
  const toggleCamera=()=>{const next=!cameraOn;streamRef.current?.getVideoTracks().forEach(t=>t.enabled=next);setCameraOn(next)}
  const createRoom=()=>{const code=crypto.randomUUID().replace(/-/g,'').slice(0,16);setRoom(code);history.replaceState(null,'','/calls?room='+code)}

  return <main className="min-h-screen bg-[#f7f5ec] px-4 py-8 text-[#183d2c] md:px-8"><div className="mx-auto max-w-6xl">
    <header className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#65856b]">PawMeet komunikace</p><h1 className="mt-2 text-4xl font-extrabold">Hovory a videohovory</h1><p className="mt-2 text-sm text-slate-600">Skupinový hovor přes WebRTC. Hovory se nenahrávají.</p></div><Link href="/chat" className="rounded-xl border border-[#d5e1d1] bg-white px-4 py-3 text-sm font-semibold">Zpět do chatu</Link></header>
    {error&&<p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {!active?<section className="mt-8 grid gap-6 rounded-3xl border border-[#dce6d8] bg-white/85 p-6 shadow-sm md:grid-cols-2 md:p-8"><div><h2 className="text-xl font-bold">Připojit se ke skupinovému hovoru</h2><p className="mt-2 text-sm leading-6 text-slate-600">Vytvoř novou místnost a pošli kód ostatním, nebo vlož kód od někoho jiného.</p><label className="mt-5 block text-sm font-semibold">Kód místnosti<input value={room} onChange={e=>setRoom(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-normal" placeholder="Kód hovoru"/></label><button onClick={joinCall} disabled={busy} className="mt-4 w-full rounded-xl bg-[#24563b] p-3 font-bold text-white disabled:opacity-60">{busy?'Připojuji…':'Připojit se a povolit kameru'}</button><button onClick={createRoom} className="mt-3 w-full rounded-xl border border-[#cbdac6] p-3 font-semibold">Vytvořit novou místnost</button></div><aside className="rounded-2xl bg-[#f1f5ec] p-5"><h3 className="font-bold">Než začneš</h3><ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600"><li>Prohlížeč se zeptá na přístup ke kameře a mikrofonu.</li><li>Pošli kód místnosti jen lidem, které chceš pozvat.</li><li>Skupinový hovor propojuje zařízení přímo; kvalita závisí na síti a výkonu zařízení.</li><li>Nahrávání není součástí hovoru.</li></ul></aside></section>:<section className="mt-8"><div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#dce6d8] bg-white p-4"><div><p className="text-xs text-slate-500">Kód místnosti</p><strong className="font-mono">{room}</strong></div><button onClick={()=>void navigator.clipboard?.writeText(location.href)} className="rounded-xl border px-3 py-2 text-sm">Kopírovat pozvánku</button></div><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><div className="relative aspect-video overflow-hidden rounded-2xl bg-[#183d2c]"><video ref={localVideo} autoPlay muted playsInline className="h-full w-full object-cover"/><span className="absolute bottom-3 left-3 rounded-lg bg-black/50 px-2 py-1 text-xs text-white">Ty {userId.slice(0,6)}</span></div>{remoteStreams.map(({id,stream})=><RemoteVideo key={id} id={id} stream={stream}/>)}</div><div className="mt-5 flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-[#dce6d8] bg-white p-4"><button onClick={toggleMic} className="rounded-xl border px-4 py-3 text-sm font-semibold">{micOn?'Vypnout mikrofon':'Zapnout mikrofon'}</button><button onClick={toggleCamera} className="rounded-xl border px-4 py-3 text-sm font-semibold">{cameraOn?'Vypnout kameru':'Zapnout kameru'}</button><span className="px-2 text-sm text-slate-500">Další účastníci: {participants.length}</span><button onClick={()=>void leaveCall()} className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white">Ukončit hovor</button></div></section>}
    <p className="mt-8 text-xs leading-5 text-slate-500">Skupinové hovory používají přímé spojení WebRTC a signalizaci Supabase Realtime. Pro některé sítě za přísným NAT/firewallem může být nutný TURN server; jeho bezplatná dostupnost není zaručena.</p>
  </div></main>
}
function RemoteVideo({id,stream}:{id:string;stream:MediaStream}) {
  const ref=useRef<HTMLVideoElement>(null)
  useEffect(()=>{if(ref.current)ref.current.srcObject=stream},[stream])
  return <div className="relative aspect-video overflow-hidden rounded-2xl bg-[#183d2c]"><video ref={ref} autoPlay playsInline className="h-full w-full object-cover"/><span className="absolute bottom-3 left-3 rounded-lg bg-black/50 px-2 py-1 text-xs text-white">Účastník {id.slice(0,6)}</span></div>
}
