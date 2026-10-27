import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function POST(req:Request){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,service=process.env.SUPABASE_SERVICE_ROLE_KEY
 if(!url||!anon||!service)return NextResponse.json({error:'Server není nakonfigurován.'},{status:503})
 const header=req.headers.get('authorization')||'';const token=header.startsWith('Bearer ')?header.slice(7):''
 if(!token)return NextResponse.json({error:'Přihlášení je povinné.'},{status:401})
 const authClient=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
 const {data:{user}}=await authClient.auth.getUser(token)
 if(!user)return NextResponse.json({error:'Přihlášení vypršelo.'},{status:401})
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}})
 const {data:profile}=await admin.from('profiles').select('role').eq('id',user.id).maybeSingle()
 if(profile?.role!=='admin')return NextResponse.json({error:'Tuto akci může provést jen administrátor.'},{status:403})
 const body=await req.json().catch(()=>({}));if(typeof body.requestId!=='string'||!['approve','reject'].includes(body.action))return NextResponse.json({error:'Neplatná žádost.'},{status:400})
 const {data:item,error:loadError}=await admin.from('role_requests').select('*').eq('id',body.requestId).eq('status','pending').maybeSingle()
 if(loadError||!item)return NextResponse.json({error:'Žádost už neexistuje nebo byla vyřízena.'},{status:404})
 const nextStatus=body.action==='approve'?'approved':'rejected'
 const {error:updateError}=await admin.from('role_requests').update({status:nextStatus,reviewed_by:user.id,reviewed_at:new Date().toISOString()}).eq('id',item.id)
 if(updateError)return NextResponse.json({error:'Stav žádosti se nepodařilo uložit.'},{status:500})
 if(body.action==='approve'){
  const role=item.requested_role==='event_organizer'?'event_organizer':'trainer'
  const {error:roleError}=await admin.from('profiles').update({role}).eq('id',item.user_id)
  if(roleError)return NextResponse.json({error:'Žádost byla zaznamenána, ale roli se nepodařilo přidělit. Zkontroluj profil.'},{status:500})
 }
 return NextResponse.json({success:true,status:nextStatus})
}
