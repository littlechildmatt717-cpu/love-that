import { createClient } from 'npm:@supabase/supabase-js@2.116.0'

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type","Access-Control-Allow-Methods":"POST,OPTIONS"}
const YOTI_PUBLIC_KEY=`-----BEGIN PUBLIC KEY-----
MIIBojANBgkqhkiG9w0BAQEFAAOCAY8AMIIBigKCAYEAune8+8vPz/pQD6IzdWvX
Q66nh/RcywopCI01Wjo6i7vlH2iVOP1oCkgbObe12iMmVXKRiXgMNT6aXIGe6Ggw
dodzAmt3vT1fmrgub7Of6MgJ56ri2uH1O54DTjbnEbEcLXX13teOusZavntrkNpp
x1c8L0Ol41mRvImJeMHM6I16rLhqB/w1m7USMvof/K6GaP+VmmciZTPyZ6IsXxvB
k0ZoqWqrt2xENlg4O6LXMo7eHEiG+edm9uDpbZK1RhiCd6hyDZ/t4bBQNg4misFF
WezQSiUlPwBLRg1AJ3CNrtBzs49BZ30U7WSPUS0Gsq1lhhDtUtJUt4CdkDAfkVY6
2C6aaqKV940GcPFN7MjOeFus3VNJE3zyHVLT8DStuLMXHY+gQBGFOyxN6heZbm7a
Sl9fi7VXlDTlv1jpk4DFMQYF2fpAyomm95GavhllJnDxC2t8ebu0O23B88hPGI3K
kyLtPA8ie6UNmwNqLYpOEN/pwayYw75FcENBDxnWhoe9AgMBAAE=
-----END PUBLIC KEY-----`

function pemBytes(pem:string){const b64=pem.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\s/g,'');return Uint8Array.from(atob(b64),c=>c.charCodeAt(0))}
async function verifyYotiSignature(event:Record<string,unknown>){
  const signature=String(event.signature||''); if(!signature)return false
  const payload={...event}; delete payload.signature; delete payload.sequence_number
  const message=JSON.stringify(payload).replace(/\s/g,'')
  const key=await crypto.subtle.importKey('spki',pemBytes(YOTI_PUBLIC_KEY),{name:'RSA-PSS',hash:'SHA-256'},false,['verify'])
  const sig=Uint8Array.from(atob(signature),c=>c.charCodeAt(0))
  const saltLength=sig.length-32-2
  return saltLength>0 && await crypto.subtle.verify({name:'RSA-PSS',saltLength},key,sig,new TextEncoder().encode(message))
}

Deno.serve(async(req)=>{if(req.method==='OPTIONS')return new Response('ok',{headers:cors});try{
  const body=await req.text(); const event=JSON.parse(body)
  const provider=(Deno.env.get('AGE_ASSURANCE_PROVIDER')||'yoti').toLowerCase()
  if(provider!=='yoti')throw new Error('Unsupported age verification provider')
  if(!(await verifyYotiSignature(event)))return new Response('Invalid signature',{status:401,headers:cors})

  const reference=String(event.reference_id||''); const state=String(event.state||'').toUpperCase(); if(!reference)throw new Error('Missing reference_id')
  const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const verified=state==='COMPLETE' && event.result!==false
  const finalStatus=verified?'verified':state==='FAIL'?'rejected':state==='ERROR'?'expired':'pending'
  const now=new Date().toISOString()
  const {data:r,error:re}=await admin.from('age_verification_requests').update({status:finalStatus,provider_status:state,verified_at:verified?now:null,expires_at:verified?new Date(Date.now()+365*24*60*60*1000).toISOString():null,provider_reference:event.session_key||event.id||null}).eq('id',reference).select('user_id').maybeSingle(); if(re)throw re
  if(!r)throw new Error('Verification request not found')
  await admin.from('profiles').update({age_verification_status:finalStatus,age_verification_method:'third_party',age_verified_at:verified?now:null}).eq('id',r.user_id)
  return new Response(JSON.stringify({ok:true}),{headers:{...cors,'Content-Type':'application/json'}})
}catch(e){return new Response(JSON.stringify({error:e instanceof Error?e.message:'Request failed'}),{status:400,headers:{...cors,'Content-Type':'application/json'}})}})
