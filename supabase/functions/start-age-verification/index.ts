import { createClient } from 'npm:@supabase/supabase-js@2.116.0'

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST,OPTIONS"}

Deno.serve(async(req)=>{if(req.method==='OPTIONS')return new Response('ok',{headers:cors});try{
  const auth=req.headers.get('Authorization'); if(!auth)throw new Error('Unauthorized')
  const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!,{global:{headers:{Authorization:auth}}})
  const token=auth.replace(/^Bearer\s+/,''); const {data:{user},error}=await client.auth.getUser(token); if(error||!user)throw new Error('Unauthorized')
  const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const {data:p}=await admin.from('profiles').select('id,date_of_birth,age_verification_status').eq('id',user.id).maybeSingle(); if(!p)throw new Error('Profile unavailable')
  if(p.age_verification_status==='verified') return json({verified:true})

  const provider=(Deno.env.get('AGE_ASSURANCE_PROVIDER')||'yoti').toLowerCase()
  if(provider!=='yoti') throw new Error('Meet is configured for Yoti age verification')

  const apiKey=Deno.env.get('YOTI_AGE_API_KEY')||Deno.env.get('AGE_ASSURANCE_API_KEY')
  const sdkId=Deno.env.get('YOTI_SDK_ID')
  const notificationUrl=Deno.env.get('YOTI_NOTIFICATION_URL')||Deno.env.get('AGE_ASSURANCE_WEBHOOK_URL')
  const returnUrl=Deno.env.get('AGE_ASSURANCE_RETURN_URL')
  if(!apiKey||!sdkId||!notificationUrl||!returnUrl) throw new Error('Yoti age verification is not fully configured')

  const {data:reqRow,error:re}=await admin.from('age_verification_requests').insert({user_id:user.id,method:'third_party',provider:'yoti',status:'pending'}).select('id').single(); if(re)throw re

  const payload={
    type:'OVER', ttl:900,
    age_estimation:{allowed:true,threshold:21,level:'PASSIVE',retry_limit:3},
    digital_id:{allowed:true,threshold:18,age_estimation_allowed:true,age_estimation_threshold:21,retry_limit:3},
    doc_scan:{allowed:true,threshold:18,authenticity:'AUTO',preset_issuing_country:'GBR',level:'PASSIVE',retry_limit:3},
    credit_card:{allowed:false,retry_limit:3}, mobile:{allowed:false,retry_limit:3},
    reference_id:reqRow.id,
    callback:{auto:true,url:returnUrl}, notification_url:notificationUrl,
    cancel_url:returnUrl, retry_enabled:true, resume_enabled:true, synchronous_checks:true
  }

  const r=await fetch('https://age.yoti.com/api/v1/sessions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${apiKey}`,'Yoti-SDK-Id':sdkId},body:JSON.stringify(payload)})
  if(!r.ok){const detail=await r.text();throw new Error(`Yoti returned ${r.status}: ${detail.slice(0,300)}`)}
  const data=await r.json()
  if(!data.id)throw new Error('Yoti did not return a session ID')
  const redirect=`https://age.yoti.com?sessionId=${encodeURIComponent(data.id)}&sdkId=${encodeURIComponent(sdkId)}`
  await admin.from('age_verification_requests').update({redirect_url:redirect,provider_status:data.status||'PENDING',provider_reference:data.id,expires_at:data.expires_at||null}).eq('id',reqRow.id)
  return json({verified:false,request_id:reqRow.id,redirect_url:redirect,expires_at:data.expires_at||null})
}catch(e){return new Response(JSON.stringify({error:e instanceof Error?e.message:'Request failed'}),{status:400,headers:{...cors,'Content-Type':'application/json'}})}})

function json(data:unknown){return new Response(JSON.stringify(data),{headers:{...cors,'Content-Type':'application/json'}})}
