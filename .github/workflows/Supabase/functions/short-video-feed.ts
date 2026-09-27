import { createClient } from 'npm:@supabase/supabase-js@2.116.0'
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST,OPTIONS"}
const json=(body:any,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}})
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS') return new Response('ok',{headers:cors})
 try{
  const auth=req.headers.get('Authorization'); if(!auth)return json({error:'Unauthorized'},401)
  const token=auth.replace(/^Bearer\s+/,'')
  const anon=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!,{global:{headers:{Authorization:auth}}})
  const {data:{user},error:ue}=await anon.auth.getUser(token); if(ue||!user)return json({error:'Unauthorized'},401)
  const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const body=await req.json().catch(()=>({})); const limit=Math.min(Math.max(Number(body?.limit)||20,1),50)
  const [{data:rows,error:e},{data:blocks,error:be}]=await Promise.all([
    admin.from('short_videos').select('id,user_id,video_type,storage_path,caption,duration_seconds,created_at').eq('status','approved').order('created_at',{ascending:false}).limit(limit*3),
    admin.from('blocks').select('blocker_id,blocked_id').or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`)
  ])
  if(e)throw e; if(be)throw be
  const blocked=new Set((blocks||[]).map(b=>b.blocker_id===user.id?b.blocked_id:b.blocker_id))
  const filtered=(rows||[]).filter(v=>v.user_id!==user.id&&!blocked.has(v.user_id)).slice(0,limit)
  const ids=[...new Set(filtered.map(v=>v.user_id))]
  const {data:profiles}=ids.length?await admin.from('profiles').select('id,display_name,age,is_active,moderation_status').in('id',ids):{data:[]}
  const byId=new Map((profiles||[]).map(p=>[p.id,p]))
  const videos=[]
  for(const v of filtered){const p=byId.get(v.user_id);if(!p?.is_active||p.moderation_status!=='active')continue;const {data:signed,error:se}=await admin.storage.from('short-videos').createSignedUrl(v.storage_path,3600);if(se||!signed?.signedUrl)continue;videos.push({...v,url:signed.signedUrl,display_name:p.display_name,age:p.age})}
  return json({videos})
 }catch(e){return json({error:e instanceof Error?e.message:'Request failed'},400)}
})
