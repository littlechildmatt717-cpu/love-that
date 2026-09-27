import { createClient } from 'npm:@supabase/supabase-js@2.116.0'
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST,OPTIONS"}
const json=(body:any,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}})
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS') return new Response('ok',{headers:cors})
 try{
  const auth=req.headers.get('Authorization'); if(!auth) return json({error:'Unauthorized'},401)
  const token=auth.replace(/^Bearer\s+/,'')
  const anon=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!,{global:{headers:{Authorization:auth}}})
  const {data:{user},error:ue}=await anon.auth.getUser(token); if(ue||!user) return json({error:'Unauthorized'},401)
  const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const {data:role}=await admin.from('admin_users').select('role,active').eq('user_id',user.id).maybeSingle()
  if(!role?.active) return json({error:'Forbidden'},403)
  const body=await req.json().catch(()=>({}))
  const action=body?.action||'dashboard'
  if(action==='dashboard'){
   const [q,r,a,s,c]=await Promise.all([
    admin.from('moderation_queue').select('id,content_type,content_id,user_id,risk_level,status,reason,created_at').in('status',['pending','reviewing']).order('created_at',{ascending:false}).limit(100),
    admin.from('reports').select('id,reporter_id,reported_id,reason,details,status,created_at').in('status',['open','reviewing']).order('created_at',{ascending:false}).limit(100),
    admin.from('age_verification_requests').select('id,user_id,method,provider,status,requested_at,verified_at,expires_at,provider_reference').eq('status','pending').order('requested_at',{ascending:false}).limit(100),
    admin.from('safety_feedback').select('id,user_id,category,details,created_at').order('created_at',{ascending:false}).limit(100),
    admin.from('child_safety_incidents').select('*').in('status',['open','escalated']).order('created_at',{ascending:false}).limit(100)
   ])
   return json({ok:true,role:role.role,queue:q.data||[],reports:r.data||[],age_requests:a.data||[],feedback:s.data||[],child_safety:c.data||[]})
  }
  if(action==='age_review'){
   const id=body?.request_id,status=body?.status
   if(!id||!['verified','rejected'].includes(status)) return json({error:'Invalid age review'},400)
   const {data:reqRow}=await admin.from('age_verification_requests').select('*').eq('id',id).maybeSingle(); if(!reqRow) return json({error:'Request not found'},404)
   const now=new Date().toISOString(); const expires=new Date(Date.now()+1000*60*60*24*365).toISOString()
   await admin.from('age_verification_requests').update({status,verified_at:status==='verified'?now:null,expires_at:status==='verified'?expires:null}).eq('id',id)
   await admin.from('profiles').update({age_verification_status:status,age_verified_at:status==='verified'?now:null,age_verification_method:reqRow.method}).eq('id',reqRow.user_id)
   await admin.from('moderation_audit_log').insert({moderator_id:user.id,action:status==='verified'?'verify_age':'reject_age',target_type:'age_verification',target_id:id})
   return json({ok:true})
  }
  if(action==='moderate'){
   const id=body?.queue_id,status=body?.status,notes=typeof body?.notes==='string'?body.notes.slice(0,1000):null
   if(!id||!['approved','rejected','escalated','reviewing'].includes(status)) return json({error:'Invalid moderation action'},400)
   const {data:item}=await admin.from('moderation_queue').select('*').eq('id',id).maybeSingle(); if(!item) return json({error:'Queue item not found'},404)
   await admin.from('moderation_queue').update({status,reviewed_at:['approved','rejected','escalated'].includes(status)?new Date().toISOString():null,reviewer_id:user.id}).eq('id',id)
   let audit='approve'; if(status==='rejected')audit='reject'; if(status==='escalated')audit='escalate'
   if(item.content_type==='profile' && item.user_id && status==='rejected') await admin.from('profiles').update({moderation_status:'review'}).eq('id',item.user_id)
   if(item.content_type==='video' && item.content_id){ const videoStatus=status==='approved'?'approved':status==='rejected'?'rejected':status==='escalated'?'hidden':'pending'; await admin.from('short_videos').update({status:videoStatus}).eq('id',item.content_id) }
   if(item.content_type==='chat_media' && item.content_id){ const mediaStatus=status==='approved'?'approved':status==='rejected'?'rejected':status==='escalated'?'hidden':'pending'; await admin.from('chat_room_messages').update({media_status:mediaStatus}).eq('id',item.content_id) }
   await admin.from('moderation_audit_log').insert({moderator_id:user.id,action:audit,target_type:'moderation_queue',target_id:id,notes})
   return json({ok:true})
  }
  if(action==='report_review'){
   const id=body?.report_id,status=body?.status
   if(!id||!['reviewing','resolved','dismissed'].includes(status)) return json({error:'Invalid report action'},400)
   await admin.from('reports').update({status}).eq('id',id)
   const audit=status==='resolved'?'resolve_report':'dismiss_report'
   await admin.from('moderation_audit_log').insert({moderator_id:user.id,action:audit,target_type:'report',target_id:id})
   return json({ok:true})
  }
  return json({error:'Unknown action'},400)
 }catch(e){return json({error:e instanceof Error?e.message:'Request failed'},400)}
})
