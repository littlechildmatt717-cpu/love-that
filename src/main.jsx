import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Heart, Users, UsersRound, Flame, MessageCircle, UserRound, Settings, ArrowLeft, Shield, Send, X, Trash2, Sparkles, LogIn, Flag, Lock, Play, Video, Image as ImageIcon, Smile, Link as LinkIcon, FileVideo, RefreshCw, Phone, PhoneOff, Mic, MicOff, Camera, CameraOff, Timer, Zap, CalendarDays, MapPin, CheckCircle2, HeartHandshake, Download, Bell } from 'lucide-react'
import { supabase } from './lib/supabase'
import './styles.css'

const APP_NAME='love that'
const P={singles:['Meet someone new','One-to-one dating','#E8654F',Heart],couples:['Find a double date','Meet people together','#E3AC3E',UsersRound],friends:['No romance, just people','Make genuine connections','#3FB9A8',Users],after:['18+ chat only','Consenting adults only','#B85AC4',Flame]}
const identities=['Woman','Man','Non-binary','Trans woman','Trans man']
const seeking=['Men','Women','Men & women','Double dates','Non-binary people','Everyone']
const goals=['A relationship','Casual dating','New friends','Flirty chat','Not sure yet']
const bodyTypes=['Slim','Average','Curvy','Overweight','Muscular','Athletic','Plus size']
const religions=['Atheist','Hindu','Buddhist','Christian','Muslim','None religious','Other','Prefer not to say']
const maritalStatuses=['Single','Married','Separated','Divorced','Widowed','It’s complicated','Prefer not to say']
const attractiveTraits=['Smile','Body','Personality','Funny','Smart','Good teeth','Nice butt','Flirty','Cute face','Kind','Confident','Eyes','Sense of humour','Ambitious']
const identityDb={Woman:'woman',Man:'man','Non-binary':'non_binary','Trans woman':'trans_woman','Trans man':'trans_man'}
const goalDb={'A relationship':'relationship','Casual dating':'casual_dating','New friends':'new_friends','Flirty chat':'flirty_chat','Not sure yet':'not_sure'}
const seekingDb={'Men':'men','Women':'women','Men & women':'men_women','Double dates':'double_dates','Non-binary people':'non_binary','Everyone':'everyone'}

function normalizeDateForDatabase(value){
 const v=String(value??'').trim()
 if(!v)return null
 const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(v)
 if(!m)return null
 const d=new Date(`${v}T00:00:00`)
 if(Number.isNaN(d.getTime()))return null
 if(d.getFullYear()!==Number(m[1])||d.getMonth()+1!==Number(m[2])||d.getDate()!==Number(m[3]))return null
 return v
}

function App(){
 const[session,setSession]=useState(null),[profile,setProfile]=useState(null),[gate,setGate]=useState(localStorage.getItem('love_that_gate')==='1'),[authMode,setAuthMode]=useState(localStorage.getItem('love_that_gate')==='1'?'login':'signup'),[loading,setLoading]=useState(true),[page,setPage]=useState('home'),[platform,setPlatform]=useState('singles'),[discover,setDiscover]=useState([]),[matches,setMatches]=useState([]),[chat,setChat]=useState(null),[error,setError]=useState(''),[isAdmin,setIsAdmin]=useState(false),[call,setCall]=useState(null),[incoming,setIncoming]=useState(null)
 useEffect(()=>{
  let alive=true
  let profileLoadTimer=null
  async function restoreSession(){
   try{
    const{data,error}=await supabase.auth.getSession()
    if(error)throw error
    if(!alive)return
    setSession(data.session)
    if(data.session)await loadProfile(data.session.user.id)
   }catch(e){if(alive)setError(e.message||'Could not restore your sign-in session.')}
   finally{if(alive)setLoading(false)}
  }
  const{data:{subscription}}=supabase.auth.onAuthStateChange((_event,s)=>{
   if(!alive)return
   setSession(s)
   if(!s){setProfile(null);setMatches([]);knownMatches.current=null;mutualSeen.current=new Set();return}
   profileLoadTimer=setTimeout(async()=>{
    if(!alive)return
    await loadProfile(s.user.id)
    if(alive)setLoading(false)
   },0)
  })
  restoreSession()
  return()=>{alive=false;if(profileLoadTimer)clearTimeout(profileLoadTimer);subscription.unsubscribe()}
 },[])
 useEffect(()=>{if(!session)return;const ch=supabase.channel('incoming-calls-'+session.user.id).on('postgres_changes',{event:'INSERT',schema:'public',table:'private_call_sessions',filter:`callee_id=eq.${session.user.id}`},async payload=>{if(payload.new.status==='ringing'&&payload.new.offer){const{data:ps}=await supabase.from('profiles').select('id,display_name,age').eq('id',payload.new.caller_id).maybeSingle();const{data:conv}=await supabase.from('conversations').select('*').eq('id',payload.new.conversation_id).maybeSingle();setIncoming({call:payload.new,conversation:conv,person:ps||{id:payload.new.caller_id,display_name:'Member'}})}}).subscribe();return()=>{supabase.removeChannel(ch)}},[session?.user?.id])
 const mutualSeen=React.useRef(new Set()),[mutual,setMutual]=useState(null),[convos,setConvos]=useState([]),[reminder,setReminder]=useState(null),knownMatches=React.useRef(null),pollRef=React.useRef(null)
 useEffect(()=>{if(!session)return;const uid=session.user.id;const handle=payload=>{const row=payload.new;const other=row.user_a===uid?row.user_b:row.user_a;showMutual({id:other})};const ch=supabase.channel('my-matches-'+uid).on('postgres_changes',{event:'INSERT',schema:'public',table:'matches',filter:`user_a=eq.${uid}`},handle).on('postgres_changes',{event:'INSERT',schema:'public',table:'matches',filter:`user_b=eq.${uid}`},handle).subscribe();return()=>{supabase.removeChannel(ch)}},[session?.user?.id])
 useEffect(()=>{if(session&&profile)loadMatches()},[session?.user?.id,!!profile])
 pollRef.current=pollMatches
 useEffect(()=>{if(!session||!profile)return;const t=setInterval(()=>pollRef.current&&pollRef.current(),8000);const vis=()=>{if(!document.hidden&&pollRef.current)pollRef.current()};document.addEventListener('visibilitychange',vis);return()=>{clearInterval(t);document.removeEventListener('visibilitychange',vis)}},[session?.user?.id,!!profile])
 useEffect(()=>{if(!profile?.id)return;syncDateReminders(profile.id);checkReminders();const t=setInterval(checkReminders,20000);const h=e=>setReminder(e.detail);window.addEventListener('love-that-reminder',h);return()=>{clearInterval(t);window.removeEventListener('love-that-reminder',h)}},[profile?.id])
 useEffect(()=>{if(page==='messages'&&session&&profile){loadConvos();const t=setInterval(loadConvos,15000);return()=>clearInterval(t)}},[page,session?.user?.id,!!profile])
 async function showMutual(person){
  if(!person?.id||mutualSeen.current.has(person.id))return
  mutualSeen.current.add(person.id)
  let full=person
  if(person.photo===undefined||!person.display_name){
   const{data:ps}=await supabase.from('profiles').select('*').eq('id',person.id).maybeSingle()
   full={...(ps||person),photo:await photoFor(person.id)}
  }
  setMutual(full)
  loadMatches()
 }
 async function likeUser(p){
  setDiscover(v=>v.filter(x=>x.id!==p.id))
  try{
   const r=await supabase.functions.invoke('like-user',{body:{to_user_id:p.id}})
   if(r.error){setError(friendly(r.error));return}
   let isMatch=!!(r.data?.match||r.data?.matched||r.data?.mutual||r.data?.is_match)
   if(!isMatch){
    const uid=session.user.id
    const chk=await supabase.from('matches').select('user_a').or(`and(user_a.eq.${uid},user_b.eq.${p.id}),and(user_a.eq.${p.id},user_b.eq.${uid})`).limit(1)
    isMatch=!chk.error&&(chk.data||[]).length>0
   }
   await loadMatches()
   if(isMatch)await showMutual(p)
  }catch(e){setError(friendly(e))}
 }
 async function loadProfile(uid){
  const{data,error}=await supabase.from('profiles').select('*').eq('id',uid).maybeSingle()
  if(error){console.error(error);setProfile(null)}
  let profile=data||null
  try{
    const{data:{user}}=await supabase.auth.getUser()
    const meta=user?.user_metadata||{}
    if(!profile && user){
      const dob=normalizeDateForDatabase(meta.date_of_birth)
      const age=Number(meta.age||0)
      const identity=meta.identity||'prefer_not_to_say'
      if(age>=18&&age<=120){
        const payload={id:uid,display_name:meta.display_name||user.email?.split('@')[0]||'Member',age,identity,location:meta.location||'',headline:meta.headline||'',bio:meta.bio||'',goal:meta.goal||null,seeking:Array.isArray(meta.seeking)?meta.seeking:[],platform:meta.platform||'singles',date_of_birth:dob,body_type:meta.body_type||null,religion:meta.religion||null,height_cm:meta.height_cm?Number(meta.height_cm):null,interested_body_types:Array.isArray(meta.interested_body_types)?meta.interested_body_types:[],attractive_traits:Array.isArray(meta.attractive_traits)?meta.attractive_traits:[]}
        const created=await supabase.from('profiles').upsert(payload).select('*').single()
        if(!created.error)profile=created.data
      }
    }
    if(profile && (!profile.display_name||!profile.display_name.trim())){
      const name=meta.display_name||user?.email?.split('@')[0]||'Member'
      const fixed=await supabase.from('profiles').update({display_name:name}).eq('id',uid).select('*').single()
      if(!fixed.error)profile=fixed.data
    }
  }catch(e){console.error(e)}
  setProfile(profile)
  try{const r=await supabase.functions.invoke('admin-console',{body:{action:'dashboard'}});setIsAdmin(!r.error&&r.data?.ok===true)}catch{setIsAdmin(false)}
}
 async function loadDiscover(nextPlatform=platform){setError('');const{data,error}=await supabase.from('profiles').select('*').eq('is_active',true).neq('id',session.user.id).eq('platform',nextPlatform).limit(30);if(error){setError(error.message);return}const enriched=[];for(const p of data||[]){enriched.push({...p,photo:await photoFor(p.id)})}setDiscover(enriched)}
 async function openDiscover(p){setPlatform(p);setPage('discover');if(session)await loadDiscover(p)}
 async function loadMatches(quiet){if(!session)return;const{data,error}=await supabase.from('matches').select('*').or(`user_a.eq.${session.user.id},user_b.eq.${session.user.id}`).order('created_at',{ascending:false});if(error){if(!quiet)setError(error.message);return}const ids=(data||[]).map(m=>m.user_a===session.user.id?m.user_b:m.user_a);if(!ids.length){setMatches([]);if(knownMatches.current===null)knownMatches.current=new Set();return}const{data:ps}=await supabase.from('profiles').select('*').in('id',ids);const out=[];for(const p of ps||[]){out.push({...p,photo:await photoFor(p.id)})}setMatches(out);if(knownMatches.current===null)knownMatches.current=new Set(out.map(p=>p.id));else for(const p of out){if(!knownMatches.current.has(p.id)){knownMatches.current.add(p.id);showMutual(p)}}}
 async function pollMatches(){if(!session)return;const uid=session.user.id;const{data,error}=await supabase.from('matches').select('user_a,user_b').or(`user_a.eq.${uid},user_b.eq.${uid}`);if(error||!data)return;const known=knownMatches.current;if(known===null||data.some(m=>!known.has(m.user_a===uid?m.user_b:m.user_a)))loadMatches(true)}
 async function loadConvos(){if(!session)return;const uid=session.user.id;const{data,error}=await supabase.from('conversations').select('*').or(`user_a.eq.${uid},user_b.eq.${uid}`);if(error){return}const rows=data||[];if(!rows.length){setConvos([]);return}const otherIds=rows.map(c=>c.user_a===uid?c.user_b:c.user_a);const{data:ps}=await supabase.from('profiles').select('*').in('id',otherIds);const pm=new Map((ps||[]).map(p=>[p.id,p]));const out=await Promise.all(rows.map(async c=>{const oid=c.user_a===uid?c.user_b:c.user_a;const p=pm.get(oid);if(!p)return null;const{data:last}=await supabase.from('messages').select('body,media_type,created_at,sender_id').eq('conversation_id',c.id).order('created_at',{ascending:false}).limit(1);return{...p,photo:await photoFor(oid),conversation:c,last:last?.[0]||null}}));setConvos(out.filter(Boolean).sort((a,b)=>String(b.last?.created_at||b.conversation?.created_at||'').localeCompare(String(a.last?.created_at||a.conversation?.created_at||''))))}
 async function openPrivateChat(person){const r=await supabase.functions.invoke('start-conversation',{body:{other_user_id:person.id}});if(r.error){const m=(await fnErrorMessage(r.error))||friendly(r.error);setError(m);return m}setChat({...person,conversation:r.data.conversation});setPage('chat')}
 async function startCall(person,conversation,mode='video',speedPair=null){setCall({person,conversation,mode,speedPair});}
 async function signOut(){await supabase.auth.signOut();setPage('home');setAuthMode('login')}
 if(loading)return <div className="gate"><h1>Loading {APP_NAME}…</h1></div>
 if(!gate)return <Gate go={()=>{localStorage.setItem('love_that_gate','1');setGate(true)}} signedIn={async s=>{localStorage.setItem('love_that_gate','1');setGate(true);setSession(s);setLoading(true);await loadProfile(s.user.id);setLoading(false);setPage('home')}}/>
 if(!session||!profile)return <Auth mode={authMode} setMode={setAuthMode} error={error} setError={setError} onReady={async s=>{
  if(!s){setSession(null);setProfile(null);return}
  setSession(s);setLoading(true);await loadProfile(s.user.id);setLoading(false);setPage('home')
 }}/>
 return <div className="app"><header><b onClick={()=>setPage('home')} style={{cursor:'pointer'}}><img src="/icon.png" alt=""/> {APP_NAME}</b><span style={{display:'flex',gap:8}}>{page!=='home'&&<button onClick={()=>setPage('home')} aria-label="Home" title="Home"><Sparkles/></button>}<button onClick={()=>setPage('settings')}><Settings/></button></span></header>
  {reminder&&<div role="alert" onClick={()=>setReminder(null)} style={{position:'fixed',top:'calc(env(safe-area-inset-top,0px) + 10px)',left:12,right:12,zIndex:3000,display:'flex',alignItems:'center',gap:12,padding:'12px 14px',borderRadius:16,background:'#17161b',border:'1px solid #E8654F',color:'#fff',boxShadow:'0 8px 30px rgba(0,0,0,.5)'}}><Bell/><span style={{flex:1}}><b>{reminder.title}</b><br/><small>{reminder.body}</small></span><X/></div>}
  {error&&<div className="error">{error}</div>}
  {page==='home'&&<Home me={profile} choose={openDiscover} openShorts={()=>setPage('shorts')} openRoom={()=>setPage('room')} openSpeed={()=>setPage('speed')} openDateNight={()=>setPage('dateNight')}/>} 
  {page==='room'&&<ChatRoom me={profile} back={()=>setPage('home')}/>} 
  {page==='discover'&&<Discover profile={profile} platform={platform} people={discover} like={likeUser} skip={p=>setDiscover(v=>v.filter(x=>x.id!==p.id))} back={()=>setPage('home')}/>} 
  {page==='shorts'&&<Shorts me={profile} openChat={openPrivateChat} back={()=>setPage('home')}/>} 
  {page==='matches'&&<Matches people={matches} open={openPrivateChat}/>}
  {page==='messages'&&<Messages me={profile} people={[...convos,...matches.filter(m=>!convos.some(c=>c.id===m.id))]} open={openPrivateChat}/>} 
  {page==='chat'&&<Chat me={profile} p={chat} startCall={(mode)=>startCall(chat,chat.conversation,mode)} back={()=>{setPage('messages');loadMatches()}}/>}
  {incoming&&<IncomingCall me={profile} incoming={incoming} accept={()=>{setCall({person:incoming.person,conversation:incoming.conversation,mode:incoming.call.mode||'video',incoming:incoming.call});setIncoming(null)}} decline={async()=>{await supabase.from('private_call_sessions').update({status:'declined',ended_at:new Date().toISOString()}).eq('id',incoming.call.id);setIncoming(null)}}/>}
  {call&&<CallOverlay me={profile} call={call} close={()=>setCall(null)}/>}
  {mutual&&<MutualOverlay person={mutual} close={()=>setMutual(null)} chat={()=>{const p=mutual;setMutual(null);openPrivateChat(p)}}/>}
  {page==='speed'&&<SpeedDating me={profile} startCall={(person,pair)=>startCall(person,pair,'video')} back={()=>setPage('home')}/>}
  {page==='dateNight'&&<DateNight me={profile} openChat={openPrivateChat} startCall={(person,conversation)=>startCall(person,conversation,'video')} back={()=>setPage('home')}/>} 
  {page==='profile'&&<Profile me={profile} refresh={loadProfile} signOut={signOut}/>} 
  {page==='admin'&&isAdmin?<AdminPage back={()=>setPage('settings')}/>:null}
  {page==='settings'&&<SettingsPage me={profile} isAdmin={isAdmin} openAdmin={()=>setPage('admin')} signOut={signOut} deleteAccount={async()=>{if(!confirm(`Delete your ${APP_NAME} account and associated data? This cannot be undone.`))return;const r=await supabase.functions.invoke('delete-account',{body:{}});if(r.error){setError(friendly(r.error));return}await supabase.auth.signOut();localStorage.clear();location.reload()}}/>}
  <nav style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)'}}><button onClick={()=>setPage('home')}><Sparkles/>Home</button><button onClick={()=>setPage('shorts')}><Play/>Shorts</button><button onClick={()=>{setPage('matches');loadMatches()}}><Heart/>Matches</button><button onClick={()=>{setPage('messages');loadConvos()}}><MessageCircle/>Messages</button><button onClick={()=>setPage('profile')}><UserRound/>Profile</button></nav>
 </div>
}
function MutualOverlay({person,close,chat}){
 const css=`
 .mutualOverlay{position:fixed;inset:0;z-index:2000;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(8,8,10,.94);animation:mutualFade .25s ease}
 .mutualCard{width:100%;max-width:360px;display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center}
 .mutualPhoto{width:200px;height:200px;border-radius:50%;object-fit:cover;border:4px solid #E8654F;box-shadow:0 0 40px rgba(232,101,79,.55);background:#2a292f;display:flex;align-items:center;justify-content:center;font-size:72px;font-weight:800;color:#fff;animation:mutualPop .45s cubic-bezier(.2,1.4,.4,1)}
 .mutualCard h1{margin:6px 0 0;font-size:34px;letter-spacing:1px;color:#fff}
 .mutualCard p{margin:0;opacity:.8}
 .mutualCard button{width:100%;margin:0}
 @keyframes mutualFade{from{opacity:0}to{opacity:1}}
 @keyframes mutualPop{from{transform:scale(.6);opacity:0}to{transform:scale(1);opacity:1}}
 `
 return <div className="mutualOverlay" role="dialog" aria-label="It's mutual"><style>{css}</style><div className="mutualCard">{person.photo?<img className="mutualPhoto" src={person.photo} alt={person.display_name||'Your match'}/>:<div className="mutualPhoto">{(person.display_name||'?')[0]}</div>}<Heart size={34} color="#E8654F" fill="#E8654F"/><h1>IT'S MUTUAL</h1><p>You and <b>{person.display_name||'your match'}</b> liked each other.</p><button className="primary" onClick={chat}><MessageCircle/> Send a message</button><button onClick={close}>Keep swiping</button></div></div>}
function Gate({go,signedIn}){
 const[open,setOpen]=useState(false),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[err,setErr]=useState('')
 async function signIn(e){e.preventDefault();setBusy(true);setErr('');try{const{data,error}=await supabase.auth.signInWithPassword({email:email.trim(),password});if(error)throw error;if(!data.session)throw new Error('Sign in completed but no active session was returned. Please try again.');await signedIn(data.session)}catch(x){setErr(x.message||'Could not sign in.');setBusy(false)}}
 const wrap={minHeight:'100dvh',height:'auto',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12,padding:'22px 18px',boxSizing:'border-box',textAlign:'center',overflow:'visible'}
 const input={width:'100%',boxSizing:'border-box'}
 return <div className="gate" style={wrap}><h1 style={{margin:0,fontSize:24,lineHeight:1.2}}>Welcome to {APP_NAME}</h1><p style={{margin:0,fontSize:15,lineHeight:1.45,maxWidth:'32ch',opacity:.75}}>Meet people, make friends, share moments and find genuine connections.</p><div className="notice" style={{maxWidth:'34ch',margin:'2px 0'}}><Shield/> <span><b>18+ only</b><br/>{APP_NAME} is for adults aged 18 and over. Your date of birth is checked again when you create an account.</span></div><img src="/icon.png" alt="love that logo" style={{width:60,height:60,minWidth:60,minHeight:60,objectFit:'contain',margin:'12px 0 0'}}/><button className="primary" onClick={go} style={{width:'100%',maxWidth:320,margin:0}}>Continue — I am 18 or older</button>
  <div style={{width:'100%',maxWidth:320,display:'flex',flexDirection:'column',gap:10,alignItems:'center'}}>
   <button type="button" className="linkBtn" onClick={()=>{setOpen(v=>!v);setErr('')}} aria-expanded={open}>Already have an account? <b>Sign in</b></button>
   {open&&<form onSubmit={signIn} style={{width:'100%',display:'flex',flexDirection:'column',gap:10}}><input style={input} type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email"/><input style={input} type="password" required minLength="8" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password"/>{err&&<div className="error">{err}</div>}<button className="primary" style={{width:'100%',margin:0}} disabled={busy}>{busy?'Signing in…':'Sign in'}</button></form>}
  </div>
  <small style={{opacity:.6,fontSize:12}}>By continuing, you agree to our Terms, Privacy Policy and Community Standards.</small></div>}
function Auth({mode,setMode,error,setError,onReady}){
 const[email,setEmail]=useState(''),[password,setPassword]=useState(''),[p,setP]=useState({name:'',dob:'',identity:'',location:'',goal:'',seeking:['Everyone'],headline:'',bio:'',platform:'singles',body_type:'',religion:'',height_cm:'',interested_body_types:[],attractive_traits:[]}),[busy,setBusy]=useState(false)
 function ageFromDob(d){if(!d)return 0;const dob=new Date(d+'T00:00:00');const now=new Date();let age=now.getFullYear()-dob.getFullYear();const m=now.getMonth()-dob.getMonth();if(m<0||(m===0&&now.getDate()<dob.getDate()))age--;return age}
 async function submit(e){e.preventDefault();setBusy(true);setError('');try{
  if(mode==='login'){const{data,error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;if(!data.session)throw new Error('Sign in completed but no active session was returned. Please try again.');onReady(data.session);return}
  const dob=normalizeDateForDatabase(p.dob)
  const age=ageFromDob(dob)
  if(!dob||!p.name||age<18||age>120||!p.identity||!p.goal||!(p.seeking||[]).length)throw new Error('Please complete your name, date of birth, identity, what you are looking for and your main goal.')
  const{data,error}=await supabase.auth.signUp({email,password,data:{display_name:p.name.trim(),age,date_of_birth:dob,identity:identityDb[p.identity],location:p.location.trim(),headline:p.headline.trim(),bio:p.bio.trim(),goal:goalDb[p.goal],seeking:(p.seeking||[]).map(x=>seekingDb[x]).filter(Boolean),platform:p.platform,body_type:p.body_type||null,religion:p.religion||null,height_cm:p.height_cm?Number(p.height_cm):null,interested_body_types:p.interested_body_types||[],attractive_traits:p.attractive_traits||[]}})
  if(error)throw error
  if(!data.session){alert(`Account created. Please confirm your email, then sign in to ${APP_NAME}.`);setMode('login')}else onReady(data.session)
 }catch(err){setError(err.message)}finally{setBusy(false)}}
 return <div className="signup"><main><div className="authIcon"><img src="/icon.png" alt="love that logo"/></div><h1>{mode==='login'?'Welcome back':`Create your ${APP_NAME} account`}</h1><p className="muted">Real accounts, secure sessions and cloud profiles.</p><form onSubmit={submit}><Field t="Email"><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></Field><Field t="Password"><input type="password" minLength="8" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters"/></Field>{mode==='signup'&&<>
  <Field t="Name"><input required maxLength="80" value={p.name} onChange={e=>setP({...p,name:e.target.value})} placeholder="Your name"/></Field>
  <Field t="Date of birth"><input type="date" required value={p.dob} onChange={e=>setP({...p,dob:e.target.value})}/></Field>
  <Choice t="I identify as" a={identities} v={p.identity} set={v=>setP({...p,identity:v})}/>
  <Field t="Town or city"><input value={p.location} onChange={e=>setP({...p,location:e.target.value})} placeholder="Where you live"/></Field>
  <ChoiceMulti t="What are you looking for?" a={seeking} v={p.seeking} set={v=>setP({...p,seeking:v})} help="You can choose more than one."/>
  <Choice t="Main goal" a={goals} v={p.goal} set={v=>setP({...p,goal:v})}/>
  <Choice t="Your body type" a={bodyTypes} v={p.body_type} set={v=>setP({...p,body_type:v})}/>
  <ChoiceMulti t="Body types you are interested in" a={bodyTypes} v={p.interested_body_types} set={v=>setP({...p,interested_body_types:v})} help="Choose as many as you like."/>
  <ChoiceMulti t="What is most attractive to you in a partner?" a={attractiveTraits} v={p.attractive_traits} set={v=>setP({...p,attractive_traits:v})} help="Multiple choices are allowed."/>
  <Choice t="Religion" a={religions} v={p.religion} set={v=>setP({...p,religion:v})}/>
  <Field t="Height (cm)"><input type="number" min="100" max="250" inputMode="numeric" value={p.height_cm} onChange={e=>setP({...p,height_cm:e.target.value})} placeholder="e.g. 175"/></Field>
  <Field t="Headline"><input maxLength="120" value={p.headline} onChange={e=>setP({...p,headline:e.target.value})} placeholder="A short line about you"/></Field>
  <Field t="Bio"><textarea maxLength="2000" value={p.bio} onChange={e=>setP({...p,bio:e.target.value})} placeholder="Tell people about yourself"/></Field>
 </>} {error&&<div className="error">{error}</div>}<button className="primary" disabled={busy}>{busy?'Please wait…':mode==='login'?'Sign in':'Create account'}</button></form>{mode==='login'&&<button className="linkBtn" onClick={()=>{setError('');setMode('signup')}}>Create a new account</button>}</main></div>}
function calculateAge(dobString){
 if(!dobString)return null
 const dob=new Date(dobString+'T00:00:00'),today=new Date()
 let age=today.getFullYear()-dob.getFullYear()
 const m=today.getMonth()-dob.getMonth()
 if(m<0||(m===0&&today.getDate()<dob.getDate()))age--
 return age
}

// Extended 8-step profile onboarding merged into the current app.
function Onboarding({me,setProfile,setPage}){
 const [step,setStep]=useState(1),[saving,setSaving]=useState(false),[error,setError]=useState('')
 const [d,setD]=useState({
  display_name:me.display_name||'',gender:me.gender||'',marital_status:me.marital_status||'',sexuality:me.sexuality||'',date_of_birth:normalizeDateForDatabase(me.date_of_birth)||'',
  height_ft:'',height_in:'',body_type:me.body_type||'',job_title:me.job_title||'',goals:me.goals||'',headline:me.headline||'',bio:me.bio||'',hobbies:me.hobbies||'',interests:me.interests||'',
  drive:me.drive??null,drink:me.drink??null,smoke:me.smoke??null,drugs:me.drugs??null,have_children:me.have_children??null,want_children:me.want_children??null,
  seeking:Array.isArray(me.seeking)?me.seeking:[],religion:me.religion||'',embarrassing_moment:me.embarrassing_moment||'',most_romantic:me.most_romantic||'',favourite_quote:me.favourite_quote||'',favourite_film:me.favourite_film||'',music_tastes:Array.isArray(me.music_tastes)?me.music_tastes:[],
  looking_for_gender:Array.isArray(me.looking_for_gender)?me.looking_for_gender:[],attracted_to:Array.isArray(me.attracted_to)?me.attracted_to:[],ideal_first_date:Array.isArray(me.ideal_first_date)?me.ideal_first_date:[],
  partner_drink:me.partner_drink??null,partner_drugs:me.partner_drugs??null,partner_drive:me.partner_drive??null,partner_smoke:me.partner_smoke??null,partner_children:me.partner_children??null
 })
 const set=(k,v)=>setD(x=>({...x,[k]:v}))
 const toggle=(k,v)=>setD(x=>({...x,[k]:(x[k]||[]).includes(v)?x[k].filter(y=>y!==v):[...(x[k]||[]),v]}))
 const Option=({value,label,multi=false})=><button type="button" className={(multi?(d.looking_for_gender||[]).includes(value):(d.gender===value||d.marital_status===value||d.sexuality===value||d.body_type===value||d.religion===value)?'sel':'')} onClick={()=>multi?toggle('looking_for_gender',value):null}>{label}</button>
 const Choice=({field,items,multi=false})=><div className="choice"><b>{field.replaceAll('_',' ')}</b><div>{items.map(x=>{const selected=multi?(d[field]||[]).includes(x):d[field]===x;return <button type="button" className={selected?'sel':''} key={x} onClick={()=>multi?toggle(field,x):set(field,x)}>{selected?'✓ ':''}{x}</button>})}</div></div>
 const YesNo=({field,label})=><div className="choice"><b>{label}</b><div><button type="button" className={d[field]===true?'sel':''} onClick={()=>set(field,true)}>Yes</button><button type="button" className={d[field]===false?'sel':''} onClick={()=>set(field,false)}>No</button></div></div>
 const can=()=>{
  if(step===1)return d.gender&&d.marital_status&&d.sexuality
  if(step===2)return d.looking_for_gender.length&&d.attracted_to.length&&d.ideal_first_date.length&&d.partner_drink!==null
  if(step===3)return d.date_of_birth&&calculateAge(d.date_of_birth)>=18
  if(step===4)return d.body_type&&d.job_title&&d.headline&&d.bio
  if(step===5)return d.drive!==null&&d.drink!==null&&d.smoke!==null
  if(step===6)return d.seeking.length&&d.religion
  if(step===7)return true
  return d.favourite_film&&d.music_tastes.length
 }
 async function save(){if(!can()||saving)return;setSaving(true);setError('');try{
   const dob=normalizeDateForDatabase(d.date_of_birth)
   const age=calculateAge(dob)
   if(!dob||age<18||age>120)throw new Error('Please enter a valid date of birth. You must be 18 or older.')
   const payload={...d,date_of_birth:dob,age,height:d.height_ft&&d.height_in?`${d.height_ft}' ${d.height_in}"`:me.height,identity:identityDb[d.gender]||me.identity,goal:goalDb[d.goals]||me.goal,seeking:d.seeking.map(x=>seekingDb[x]||x)}
   delete payload.height_ft;delete payload.height_in
   const {data,error}=await supabase.from('profiles').update(payload).eq('id',me.id).select('*').single()
   if(error)throw error
   setProfile(data||{...me,...payload})
   if(step<8)setStep(step+1);else setPage('home')
  }catch(e){setError(e.message||'Could not save your profile.')}finally{setSaving(false)}}
 return <main className="scroll onboardingPage"><div className="onboardingProgress"><div style={{width:`${step/8*100}%`}}/></div><p className="eyebrow">PROFILE SETUP · STEP {step} OF 8</p><h1>{['About you','What you are looking for','Your details','About yourself','Your lifestyle','What you want','A little more about you','Your music'][step-1]}</h1>
  {step===1&&<><Choice field="gender" items={['Man','Woman','Couple','Non-binary','Trans man','Trans woman']}/><Choice field="marital_status" items={['Single','In a relationship','Married','Divorced','Widowed','Separated']}/><Choice field="sexuality" items={['Gay','Straight','Bisexual','Undecided']}/></>}
  {step===2&&<><Choice field="looking_for_gender" items={['Man','Woman','Non-binary','Trans man','Trans woman','Just making friends','Friends to double date with']} multi/><Choice field="attracted_to" items={['Hair','Face','Eyes','Lips','Personality',"Someone who's funny",'Nice body','Nice butt','A kind person','Flirty']} multi/><Choice field="ideal_first_date" items={['Bar scene','Restaurant','Beach walk','Watch a film on the sofa','Arcade','Bowling','Ice skating','Dancing','Zoo trip','Karaoke']} multi/><YesNo field="partner_drink" label="Would you like your partner to drink?"/><YesNo field="partner_drugs" label="Would you like your partner to do drugs?"/><YesNo field="partner_drive" label="Would you like your partner to drive?"/><YesNo field="partner_smoke" label="Would you like your partner to smoke?"/><YesNo field="partner_children" label="Would you like your partner to have children?"/></>}
  {step===3&&<><Field t="Date of birth"><input type="date" value={d.date_of_birth} onChange={e=>set('date_of_birth',e.target.value)}/></Field>{d.date_of_birth&&<p className="muted">Age: {calculateAge(d.date_of_birth)}</p>}<Field t="Height"><div style={{display:'flex',gap:8}}><select value={d.height_ft} onChange={e=>set('height_ft',e.target.value)}><option value="">Feet</option>{[4,5,6,7].map(n=><option key={n} value={n}>{n} ft</option>)}</select><select value={d.height_in} onChange={e=>set('height_in',e.target.value)}><option value="">Inches</option>{Array.from({length:12},(_,i)=><option key={i} value={i}>{i} in</option>)}</select></div></Field></>}
  {step===4&&<><Choice field="body_type" items={bodyTypes}/><Field t="Job title"><input value={d.job_title} onChange={e=>set('job_title',e.target.value)} placeholder="e.g. Teacher, Engineer"/></Field><Field t="Headline"><input maxLength="120" value={d.headline} onChange={e=>set('headline',e.target.value)}/></Field><Field t="Bio"><textarea maxLength="2000" value={d.bio} onChange={e=>set('bio',e.target.value)}/></Field><Field t="Hobbies"><input value={d.hobbies} onChange={e=>set('hobbies',e.target.value)}/></Field><Field t="Interests"><input value={d.interests} onChange={e=>set('interests',e.target.value)}/></Field></>}
  {step===5&&<><YesNo field="drive" label="Do you drive?"/><YesNo field="drink" label="Do you drink?"/><YesNo field="smoke" label="Do you smoke?"/><YesNo field="drugs" label="Do you do drugs?"/><YesNo field="have_children" label="Do you have children?"/><YesNo field="want_children" label="Do you want children?"/></>}
  {step===6&&<><Choice field="seeking" items={['Relationship','Marriage','Casual','Dating','Friends','Double dating']} multi/><Choice field="religion" items={religions}/></>}
  {step===7&&<><Field t="Most embarrassing moment"><textarea value={d.embarrassing_moment} onChange={e=>set('embarrassing_moment',e.target.value)}/></Field><Field t="Most romantic thing you've done"><textarea value={d.most_romantic} onChange={e=>set('most_romantic',e.target.value)}/></Field><Field t="Favourite movie quote"><input value={d.favourite_quote} onChange={e=>set('favourite_quote',e.target.value)}/></Field><Field t="Favourite film"><input value={d.favourite_film} onChange={e=>set('favourite_film',e.target.value)}/></Field></>}
  {step===8&&<><Choice field="music_tastes" items={['Pop','Rock','Classical','80s/90s','Heavy Metal','Drum & Bass','R&B','Rap']} multi/><p className="notice"><CheckCircle2/> You're all set. Submit your profile to join {APP_NAME}.</p></>}
  {error&&<div className="error">{error}</div>}<div style={{display:'flex',justifyContent:'space-between',gap:12,marginTop:24}}>{step>1?<button className="back" onClick={()=>setStep(step-1)}><ArrowLeft/> Back</button>:<span/>}<button className="primary" disabled={!can()||saving} onClick={save}>{saving?'Saving…':step===8?'Submit':'Continue'}</button></div>
 </main>
}
function Field({t,children}){return <label><b>{t}</b>{children}</label>}
function Choice({t,a,v,set}){return <div className="choice"><b>{t}</b><div>{a.map(x=><button type="button" className={v===x?'sel':''} onClick={()=>set(x)} key={x}>{x}</button>)}</div></div>}
function ChoiceMulti({t,a,v,set,help}){return <div className="choice multiChoice"><b>{t}</b>{help&&<small className="muted">{help}</small>}<div>{a.map(x=>{const selected=(v||[]).includes(x);return <button type="button" className={selected?'sel':''} onClick={()=>set(selected?(v||[]).filter(y=>y!==x):[...(v||[]),x])} key={x}>{selected?'✓ ':''}{x}</button>})}</div></div>}
function Home({me,choose,openShorts,openRoom,openSpeed,openDateNight}){return <main className="scroll"><p className="eyebrow">HELLO, {me.display_name.toUpperCase()}</p><h1>Who are you<br/><em>looking for?</em></h1><p className="muted">Choose how you want to connect today.</p><button className="dateNightHero" onClick={openDateNight}><span className="dateNightIcon"><HeartHandshake fill="currentColor"/></span><span><b>Date Night</b><small>Meet someone local, match, choose a date and meet on video at 8pm UK time.</small></span><CalendarDays/></button><button className="shortsHero" onClick={openShorts}><span className="shortsIcon"><Play fill="currentColor"/></span><span><b>Shorts</b><small>Watch up to 60-second videos from people on {APP_NAME}.</small></span><Video/></button><button className="speedHero" onClick={openSpeed}><span className="speedIcon"><Zap fill="currentColor"/></span><span><b>Speed dating</b><small>2-minute video dates on Saturday & Sunday, 8:00–8:30pm.</small></span><Timer/></button><button className="roomHero" onClick={openRoom}><span className="roomIcon"><MessageCircle fill="currentColor"/></span><span><b>Chat room</b><small>Join the live community chat — messages, emojis, GIFs, links, photos and videos.</small></span><Users/></button>{Object.entries(P).map(([k,x])=>{let I=x[3];const locked=k==='after'&&me.age_verification_status!=='verified';return <button className="platform" style={{'--a':x[2],opacity:locked?.65:1}} onClick={()=>locked?alert('After Dark is locked until stronger age verification is completed.'):choose(k)} key={k}><I/><span><b>{x[0]}</b><small>{locked?'18+ verified adults only':x[1]}</small></span>{locked?<Lock/>:<>›</>}</button>})}</main>}
function DateNight({me,openChat,startCall,back}){
 const[enabled,setEnabled]=useState(!!me.date_night_enabled),[people,setPeople]=useState([]),[idx,setIdx]=useState(0),[partner,setPartner]=useState(null),[selected,setSelected]=useState([]),[common,setCommon]=useState([]),[dates,setDates]=useState([]),[mutuals,setMutuals]=useState([]),[busy,setBusy]=useState(false),[stage,setStage]=useState('browse'),[msg,setMsg]=useState('');
 const today=new Date();
 const days=Array.from({length:30},(_,i)=>{const d=new Date(today);d.setHours(0,0,0,0);d.setDate(today.getDate()+i);return d});
 function key(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
 function label(d){return d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})}
 async function load(){setBusy(true);setMsg('');try{if(!me.location?.trim()){setPeople([]);setMsg('Add your town or city to your profile to find local Date Night matches.');setBusy(false);return}
  const r=await supabase.from('profiles').select('*').eq('is_active',true).eq('date_night_enabled',true).eq('location',me.location||'').neq('id',me.id).limit(40);if(r.error)throw r.error;
  const liked=await supabase.from('date_night_likes').select('to_user').eq('from_user',me.id);const sent=(liked.data||[]).map(x=>x.to_user);const reciprocal=sent.length?await supabase.from('date_night_likes').select('from_user').eq('to_user',me.id).in('from_user',sent):{data:[]};const mutualIds=(reciprocal.data||[]).map(x=>x.from_user);
  const allIds=[...new Set([...sent,...mutualIds])];const profileMap={};if(allIds.length){const{data:ps}=await supabase.from('profiles').select('*').in('id',allIds);for(const p of ps||[]){try{profileMap[p.id]={...p,photo:await photoFor(p.id)}}catch{profileMap[p.id]={...p,photo:null}}}}
  setMutuals(mutualIds.map(id=>profileMap[id]).filter(Boolean));
  const skipped=new Set(sent);const out=[];for(const p of r.data||[]){if(skipped.has(p.id)||mutualIds.includes(p.id))continue;out.push(profileMap[p.id]||p)}setPeople(out);
  const dr=await supabase.from('date_night_dates').select('*').or(`user_a.eq.${me.id},user_b.eq.${me.id}`).order('scheduled_at',{ascending:true});if(!dr.error){const future=(dr.data||[]).filter(x=>x.status!=='cancelled'&&new Date(x.scheduled_at)>=new Date());setDates(future)}syncDateReminders(me.id)
 }catch(e){setMsg(e.message||'Could not load Date Night.')}finally{setBusy(false)}}
 useEffect(()=>{load()},[]);
 async function optIn(){const r=await supabase.from('profiles').update({date_night_enabled:true}).eq('id',me.id);if(r.error){setMsg(r.error.message);return}setEnabled(true);setMsg('Date Night is now on.');load()}
 async function swipe(p,like){setBusy(true);setMsg('');const r=await supabase.rpc('date_night_swipe',{p_to_user:p.id,p_like:like});if(r.error){setMsg(r.error.message);setBusy(false);return}setPeople(v=>v.filter(x=>x.id!==p.id));if(r.data?.mutual){setPartner(p);setSelected([]);setCommon([]);setStage('calendar');setMsg(`It's a mutual match with ${p.display_name}! Choose the dates you are available.`)}setBusy(false)}
 async function saveAvailability(){setBusy(true);const r=await supabase.rpc('date_night_set_availability',{p_dates:selected});if(r.error){setMsg(r.error.message);setBusy(false);return}if(!partner){setBusy(false);return}const c=await supabase.rpc('date_night_common_dates',{p_partner:partner.id});if(c.error){setMsg(c.error.message)}else setCommon(c.data||[]);setMsg((c.data||[]).length?'These dates work for both of you.':'Your availability is saved. Your match needs to select their availability too.');setBusy(false)}
 async function confirmDate(d){setBusy(true);const r=await supabase.rpc('date_night_confirm',{p_partner:partner.id,p_date:d});if(r.error){setMsg(r.error.message);setBusy(false);return}setMsg(r.data?.both_confirmed?'🎉 Date Night confirmed for 8:00 PM UK time!':'Your date choice is waiting for your match to confirm.');setStage('calendar');setBusy(false);load()}
 async function loadCommon(){if(!partner)return;const c=await supabase.rpc('date_night_common_dates',{p_partner:partner.id});if(!c.error)setCommon(c.data||[])}
 async function chooseMutual(p){setPartner(p);setStage('calendar');setSelected([]);setCommon([]);setMsg('Select the dates you are available.')}
 async function joinVideoDate(d){if(d.status!=='confirmed'){setMsg('This Date Night is waiting for both people to confirm.');return}const partnerId=d.user_a===me.id?d.user_b:d.user_a;const p=mutuals.find(x=>x.id===partnerId);if(!p){setMsg('Your date partner is no longer available.');return}const r=await supabase.functions.invoke('start-conversation',{body:{other_user_id:partnerId}});if(r.error){setMsg(r.error.message);return}startCall(p,r.data.conversation)}
 return <main className="dateNightPage"><div className="dateNightHeader"><button onClick={back}><ArrowLeft/></button><div><h1>Date Night</h1><small>Local matches · 8:00 PM UK time</small></div><CalendarDays/></div><div className="dateNightBody">
 {stage==='browse'&&<>{!enabled?<div className="dateNightIntro"><HeartHandshake/><h2>Make tonight a Date Night</h2><p>Turn Date Night on to meet people in your area who also want a video date.</p><button className="primary" onClick={optIn}>Turn on Date Night</button></div>:<><div className="dateNightNotice"><MapPin/><span><b>Local matches</b><br/>Showing people who have chosen the same location on their profile.</span></div>{mutuals.length>0&&<div className="mutualDateMatches"><h2>❤️ Your Date Night matches</h2>{mutuals.map(p=><button className="mutualMatch" key={p.id} onClick={()=>chooseMutual(p)}>{p.photo?<img src={p.photo}/>:<div className="miniAvatar">{p.display_name?.[0]}</div>}<span><b>{p.display_name}, {p.age}</b><small>Choose your Date Night availability</small></span><CalendarDays/></button>)}</div>}{people[idx]?<SwipeCard key={people[idx].id} disabled={busy} onLike={()=>swipe(people[idx],true)} onNope={()=>swipe(people[idx],false)}><div className="dateCard">{people[idx].photo?<div className="datePhoto" style={{backgroundImage:`url(${people[idx].photo})`}}><div><h2>{people[idx].display_name}, {people[idx].age}</h2><span>{people[idx].location}</span></div></div>:<div className="datePhoto placeholder"><UserRound/></div>}<section><h3>{people[idx].headline||'Nice to meet you.'}</h3><p>{people[idx].bio}</p></section><div className="swipes"><button disabled={busy} onClick={()=>swipe(people[idx],false)}><X/></button><button className="yes" disabled={busy} onClick={()=>swipe(people[idx],true)}><Heart fill="currentColor"/></button></div></div></SwipeCard>:<div className="empty"><Heart/><h2>No more local profiles</h2><p>New Date Night members will appear here.</p><button className="primary" onClick={load}>Refresh</button></div>}</>}
 {dates.length>0&&<div className="upcomingDates"><h2>Upcoming Dates</h2>{dates.map(d=>{const pid=d.user_a===me.id?d.user_b:d.user_a;const p=mutuals.find(x=>x.id===pid);return <div className="upcomingDate" key={d.id}><CalendarDays/><span><b>{p?.display_name?'Date with '+p.display_name:'Date Night'}</b><small>{new Date(d.scheduled_at).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})} · 8:00 PM UK time</small></span>{d.status==='confirmed'&&<button className="joinDateBtn" onClick={()=>joinVideoDate(d)}>Join video date</button>}</div>})}</div>}</>}
 {stage==='calendar'&&partner&&<div className="calendarPanel"><button className="back" onClick={()=>setStage('browse')}><ArrowLeft/> Date Night</button><div className="partnerMini">{partner.photo?<img src={partner.photo}/>:<div className="miniAvatar">{partner.display_name?.[0]}</div>}<span><b>{partner.display_name}, {partner.age}</b><small>{partner.location}</small></span></div><h2>When are you available?</h2><p className="muted">Select the dates you can do. Your date is always at <b>8:00 PM UK time</b>.</p><div className="calendarGrid">{days.map(d=>{const k=key(d),sel=selected.includes(k),com=common.includes(k);return <button key={k} className={`${sel?'calendarSel ':''}${com?'calendarCommon':''}`} onClick={()=>{setSelected(v=>sel?v.filter(x=>x!==k):[...v,k])}}><b>{d.getDate()}</b><small>{label(d)}</small>{com&&<CheckCircle2/>}</button>})}</div><button className="primary" disabled={busy||!selected.length} onClick={saveAvailability}>{busy?'Saving…':'Save my availability'}</button>{common.length>0&&<div className="commonDates"><h3>❤️ You both are available</h3><p>Choose one of these dates to propose for your video date.</p>{common.map(d=><button className="commonDateBtn" key={d} onClick={()=>confirmDate(d)}><CalendarDays/><span><b>{new Date(`${d}T12:00:00`).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}</b><small>8:00 PM UK time</small></span><CheckCircle2/></button>)}</div>}<p className="statusText">{msg}</p></div>}
 </div></main>
}

function Discover({platform,people,like,skip,back}){const x=P[platform],p=people[0];async function safety(action){if(!p)return;if(action==='report'){const reason=prompt('Why are you reporting this person?');if(!reason)return;const r=await supabase.functions.invoke('report-user',{body:{reported_id:p.id,reason,block:true}});if(r.error)alert(friendly(r.error));else{alert('Thank you. Your report has been submitted.');back()}}else{const r=await supabase.from('blocks').insert({blocker_id:(await supabase.auth.getUser()).data.user.id,blocked_id:p.id});if(r.error)alert(friendly(r.error));else{alert('Profile blocked.');back()}}}return <main className="scroll"><button className="back" onClick={back}><ArrowLeft/> {x[0]}</button>{p?<SwipeCard key={p.id} onLike={()=>like(p)} onNope={()=>skip(p)}><div className="card">{p.photo?<div className="photo" style={{backgroundImage:`url(${p.photo})`}}><div><h2>{p.display_name}, {p.age}</h2><span>{p.location}</span></div></div>:<div className="photo placeholder"><UserRound/></div>}<section><h3>{p.headline||'Nice to meet you.'}</h3><p className="muted">{p.bio}</p><p className="muted">Looking for {Object.keys(goalDb).find(k=>goalDb[k]===p.goal)||'connections'}.</p></section><div className="safetyRow"><button onClick={()=>safety('report')}><Flag/> Report</button><button onClick={()=>safety('block')}><Lock/> Block</button></div><div className="swipes"><button onClick={()=>skip(p)}><X/></button><button className="yes" onClick={()=>like(p)}><Heart fill="currentColor"/></button></div></div></SwipeCard>:<div className="empty"><Heart/><h2>No more profiles right now</h2><p>Check back soon as new people join {APP_NAME}.</p></div>}</main>}
function Matches({people,open}){return <main className="scroll"><h1>Your matches</h1>{people.length?people.map(p=><button className="match" key={p.id} onClick={()=>open(p)}>{p.photo?<img src={p.photo}/>:<div className="miniAvatar">{p.display_name?.[0]}</div>}<span><b>{p.display_name}, {p.age}</b><small>{p.headline}</small></span><MessageCircle/></button>):<div className="empty"><MessageCircle/><h2>No matches yet</h2><p>When you both like each other, they'll appear here.</p></div>}</main>}
function ChatRoom({me,back}){
 const[m,setM]=useState([]),[text,setText]=useState(''),[gif,setGif]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[showGif,setShowGif]=useState(false),[emojiOpen,setEmojiOpen]=useState(false)
 const emojis=['❤️','😂','😍','😊','🔥','👍','🎉','😘','🥰','😎','👏','🙌','✨','🤣','💯','😉','😢','😮']
 async function hydrate(rows){
  const ids=[...new Set((rows||[]).map(x=>x.user_id).filter(Boolean))];
  const {data:profiles}=ids.length?await supabase.from('profiles').select('id,display_name,age').in('id',ids):{data:[]};
  const names=new Map((profiles||[]).map(x=>[x.id,x]));
  const out=await Promise.all((rows||[]).map(async x=>{const p=names.get(x.user_id);let media_url=null;if(x.media_path){media_url=await signedUrl('chat-room',x.media_path)}return {...x,media_url,display_name:p?.display_name||'Member',age:p?.age||null}}));return out
 }
 async function load(){setLoading(true);const{data,error}=await supabase.from('chat_room_messages').select('*').order('created_at',{ascending:true}).limit(200);if(error){setError(error.message)}else setM(await hydrate(data));setLoading(false)}
 useEffect(()=>{load();const ch=supabase.channel('public-chat-room').on('postgres_changes',{event:'INSERT',schema:'public',table:'chat_room_messages'},async payload=>{const row=(await hydrate([payload.new]))[0];setM(v=>v.some(x=>x.id===row.id)?v:[...v,row])}).on('postgres_changes',{event:'UPDATE',schema:'public',table:'chat_room_messages'},async payload=>{const row=(await hydrate([payload.new]))[0];setM(v=>{const i=v.findIndex(x=>x.id===row.id);if(i<0)return [...v,row];const n=[...v];n[i]=row;return n})}).subscribe();return()=>{supabase.removeChannel(ch)}},[])
 async function sendMessage(e){e?.preventDefault();const body=text.trim();if(!body)return;setBusy(true);const{data,error}=await supabase.from('chat_room_messages').insert({user_id:me.id,body}).select('*').single();if(error)setError(error.message);else{setM(v=>v.some(x=>x.id===data.id)?v:[...v,data]);setText('')}setBusy(false)}
 async function sendGif(){const url=gif.trim();if(!/^https?:\/\//i.test(url)){setError('Please enter a valid GIF or image link.');return}setBusy(true);const{data,error}=await supabase.from('chat_room_messages').insert({user_id:me.id,body:'',media_type:'gif',media_url_external:url}).select('*').single();if(error)setError(error.message);else{setM(v=>v.some(x=>x.id===data.id)?v:[...v,data]);setGif('');setShowGif(false)}setBusy(false)}
 async function uploadMedia(file){if(!file)return;setError('');const mime=mediaMime(file);const isImage=mime.startsWith('image/');const isVideo=mime.startsWith('video/');if(!isImage&&!isVideo){setError('Please choose a photo, GIF image or video.');return}if(file.size>50*1024*1024){setError('Photos and videos must be 50MB or smaller.');return}if(isVideo){try{const d=await getVideoDuration(file);if(!Number.isFinite(d)||d<=0||d>60.01){setError('Chat room videos must be 60 seconds or shorter.');return}}catch(e){setError(e.message||'Could not read this video.');return}}setBusy(true);const ext=mediaExtension(file,mime);const path=`${me.id}/${makeUploadId()}.${ext}`;try{const up=await supabase.storage.from('chat-room').upload(path,file,{contentType:mime,cacheControl:'3600',upsert:false});if(up.error)throw up.error;const type=isVideo?'video':mime==='image/gif'?'gif':'image';const{data,error}=await supabase.from('chat_room_messages').insert({user_id:me.id,body:'',media_type:type,media_path:path}).select('*').single();if(error){await supabase.storage.from('chat-room').remove([path]);throw error}const row=(await hydrate([data]))[0];setM(v=>v.some(x=>x.id===row.id)?v:[...v,row])}catch(e){await supabase.storage.from('chat-room').remove([path]).catch(()=>{});setError(e.message||'Media upload failed.')}finally{setBusy(false)}}
 async function reportMessage(x){const reason=prompt('Why are you reporting this message?');if(!reason)return;const r=await supabase.functions.invoke('report-user',{body:{reported_id:x.user_id,reason:`Chat room: ${reason}`,details:`Reported chat room message ${x.id}`}});if(r.error)setError(friendly(r.error));else alert('Thank you. The message has been reported.')}
 function addEmoji(e){setText(v=>v+e);setEmojiOpen(false)}
 return <main className="roomPage"><div className="roomHeader"><button onClick={back}><ArrowLeft/></button><div><h1>Chat room</h1><small>Everyone in the room · update 4</small></div><button onClick={load}><RefreshCw/></button></div><div className="roomNotice"><Shield/><span>Be respectful. This is a public 18+ community room. You can report messages or block users from profiles.</span></div><div className="roomFeed">{loading?<p className="centerText muted">Loading the room…</p>:!m.length?<div className="empty"><MessageCircle/><h2>Be the first to say hello</h2><p>Start the conversation.</p></div>:m.map(x=><div className={'roomMsg '+(x.user_id===me.id?'roomMine':'')} key={x.id}><div className="roomMsgHead"><b>{x.user_id===me.id?'You':x.display_name||'Member'}{x.user_id!==me.id&&x.age?`, ${x.age}`:''}</b><button onClick={()=>reportMessage(x)} title="Report"><Flag/></button></div>{x.body&&<p>{linkify(x.body)}</p>}{x.media_type==='gif'&&!x.media_path&&<img className="roomMedia" src={x.media_url_external||x.media_url} alt="GIF shared in chat"/>}{(x.media_path||x.storage_path||x.media_type==='image'||x.media_type==='video')&&<RoomMedia key={x.id} x={x}/>}<small className="roomTime">{new Date(x.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</small></div>)}</div><form className="roomComposer" onSubmit={sendMessage}><div className="roomTools"><label title="Add photo, GIF or video" style={{cursor:'pointer',position:'relative'}}><input style={{position:'absolute',inset:0,opacity:0,width:'100%',height:'100%',cursor:'pointer'}} type="file" accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime,video/x-m4v" onChange={e=>{const f=e.target.files?.[0];e.target.value='';uploadMedia(f)}}/><ImageIcon/></label><button type="button" onClick={()=>setShowGif(v=>!v)} title="Add GIF link" style={{background:'#17161b',color:'#fff',border:'1px solid rgba(255,255,255,.16)',borderRadius:16,display:'grid',placeItems:'center',minHeight:56,minWidth:56,padding:0}}><LinkIcon/></button><button type="button" onClick={()=>setEmojiOpen(v=>!v)} title="Emoji" style={{background:'#17161b',color:'#fff',border:'1px solid rgba(255,255,255,.16)',borderRadius:16,display:'grid',placeItems:'center',minHeight:56,minWidth:56,padding:0}}><span style={{fontSize:28,lineHeight:1}}>🔥</span></button></div>{showGif&&<div className="gifRow"><input value={gif} onChange={e=>setGif(e.target.value)} placeholder="Paste a GIF link…"/><button type="button" onClick={sendGif}>Add</button></div>}{emojiOpen&&<div className="emojiRow">{emojis.map(e=><button type="button" key={e} onClick={()=>addEmoji(e)}>{e}</button>)}</div>}<div className="roomInput" style={{display:'flex',flexDirection:'row',alignItems:'center',gap:8}}><input style={{flex:1,minWidth:0,order:0}} value={text} onChange={e=>setText(e.target.value)} placeholder="Say something to everyone…" disabled={busy}/><button className="primary" style={{order:1,flex:'0 0 auto',width:48,height:44,margin:0,display:'grid',placeItems:'center',padding:0}} type="submit" disabled={busy||!text.trim()}><Send/></button></div></form>{error&&<div className="roomError">{error}</div>}</main>}
function linkify(text){return text.split(/(https?:\/\/[^\s]+)/g).map((part,i)=>/^https?:\/\//i.test(part)?<a key={i} href={part} target="_blank" rel="noreferrer">{part}</a>:part)}

function Chat({me,p,back,startCall}){const[m,setM]=useState([]),[k,setK]=useState(''),[busy,setBusy]=useState(false),[emojiOpen,setEmojiOpen]=useState(false);const emojis=['❤️','😂','😍','😊','🔥','👍','🎉','😘','🥰','😎','👏','🙌','✨','🤣','💯','😉','😢','😮'];
 useEffect(()=>{let active=true;(async()=>{const{data}=await supabase.from('messages').select('*').eq('conversation_id',p.conversation.id).order('created_at');if(active)setM(data||[])})();const ch=supabase.channel('conversation-'+p.conversation.id).on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:`conversation_id=eq.${p.conversation.id}`},payload=>setM(v=>v.some(x=>x.id===payload.new.id)?v:[...v,payload.new])).subscribe();return()=>{active=false;supabase.removeChannel(ch)}},[p.conversation.id]);
 async function send(){if(!k.trim())return;const text=k;setK('');const r=await supabase.functions.invoke('send-message',{body:{conversation_id:p.conversation.id,body:text}});if(r.error)setK(text)}
 async function upload(file){if(!file)return;if(!/^image\/(jpeg|png|gif|webp)$/i.test(file.type)&&!/^video\/(mp4|webm|quicktime|x-m4v)$/i.test(file.type)){alert('Choose a photo, GIF or supported video.');return}if(file.size>50*1024*1024){alert('Media must be 50MB or smaller.');return}if(file.type.startsWith('video/')){const d=await getVideoDuration(file);if(d>60){alert('Videos must be 60 seconds or shorter.');return}}setBusy(true);const ext=(file.name.split('.').pop()||'bin').toLowerCase(),path=`${me.id}/${p.conversation.id}/${crypto.randomUUID()}.${ext}`;const up=await supabase.storage.from('private-chat').upload(path,file,{contentType:file.type,upsert:false});if(up.error){alert(up.error.message);setBusy(false);return}const type=file.type==='image/gif'?'gif':file.type.startsWith('video/')?'video':'image';const{data,error}=await supabase.from('messages').insert({conversation_id:p.conversation.id,sender_id:me.id,body:'',media_type:type,media_path:path,media_status:'pending'}).select('*').single();if(error){await supabase.storage.from('private-chat').remove([path]);alert(error.message)}else setM(v=>[...v,data]);setBusy(false)}
 async function hydrate(x){if(!x.media_path)return x;const r=await supabase.storage.from('private-chat').createSignedUrl(x.media_path,3600);return {...x,url:r.data?.signedUrl||null}}
 useEffect(()=>{setM(v=>v.map(x=>x));},[])
 return <main className="chat"><div className="chatHead"><button onClick={back}><ArrowLeft/></button>{p.photo?<img src={p.photo}/>:<div className="miniAvatar">{p.display_name?.[0]}</div>}<b>{p.display_name}</b><span className="chatCalls"><button onClick={()=>startCall('audio')} title="Audio call"><Phone/></button><button onClick={()=>startCall('video')} title="Video call"><Video/></button></span></div><div className="messages">{m.map(x=><PrivateMessage key={x.id} x={x} me={me}/>)}</div>{emojiOpen&&<div className="emojiRow chatEmoji">{emojis.map(e=><button key={e} onClick={()=>setK(v=>v+e)}>{e}</button>)}</div>}<div className="composer"><label className="chatAttach" title="Photo, GIF or video"><input type="file" accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime,video/x-m4v" onChange={e=>upload(e.target.files?.[0])}/><ImageIcon/></label><button className="chatTool" onClick={()=>setEmojiOpen(v=>!v)}><Smile/></button><input value={k} onChange={e=>setK(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Write a message…" disabled={busy}/><button onClick={send}><Send/></button></div></main>}
function PrivateMessage({x,me}){const[url,setUrl]=useState(null);useEffect(()=>{if(x.media_path)supabase.storage.from('private-chat').createSignedUrl(x.media_path,3600).then(r=>setUrl(r.data?.signedUrl||null))},[x.media_path]);return <div className={'bubbleWrap '+(x.sender_id===me.id?'mine':'')}><div className={'bubble '+(x.sender_id===me.id?'mine':'')}>{x.body}{url&&x.media_status==='approved'&&x.media_type==='image'&&<img className="privateMedia" src={url}/>} {url&&x.media_status==='approved'&&x.media_type==='gif'&&<img className="privateMedia" src={url}/>} {url&&x.media_status==='approved'&&x.media_type==='video'&&<video className="privateMedia" src={url} controls playsInline/>}{url&&x.media_status==='pending'&&x.sender_id===me.id&&x.media_type!=='video'&&<img className="privateMedia" src={url}/>}{x.media_path&&x.media_status==='pending'&&x.sender_id===me.id&&<small>Media awaiting safety review…</small>}</div></div>}
function IncomingCall({incoming,accept,decline}){return <div className="incomingCall"><div><Phone/><h2>Incoming video call</h2><p><b>{incoming.person?.display_name||'Member'}</b> is calling you.</p><div className="incomingActions"><button className="primary" onClick={accept}><Video/> Answer</button><button className="danger" onClick={decline}><PhoneOff/> Decline</button></div></div></div>}
function CallOverlay({me,call,close}){return <WebRTCCall me={me} call={call} close={close}/>}
function WebRTCCall({me,call,close}){const[status,setStatus]=useState('Connecting…'),[muted,setMuted]=useState(false),[cameraOff,setCameraOff]=useState(call.mode==='audio'),[remote,setRemote]=useState(null);const localRef=React.useRef(null),remoteRef=React.useRef(null),pcRef=React.useRef(null),callIdRef=React.useRef(null),seenRef=React.useRef(new Set());
 useEffect(()=>{let dead=false;async function run(){try{const conv=call.conversation;let mine=call.incoming;if(!mine){const other=conv.user_a===me.id?conv.user_b:conv.user_a;const r=await supabase.from('private_call_sessions').insert({conversation_id:conv.id,caller_id:me.id,callee_id:other,offer:null,call_type:call.mode}).select('*').single();mine=r.data;if(r.error||!mine)throw r.error||new Error('Could not start call')}callIdRef.current=mine.id;const turnRes=await supabase.functions.invoke('turn-credentials',{body:{}}); const iceServers=turnRes.data?.ice_servers?.length?turnRes.data.ice_servers:[{urls:'stun:stun.l.google.com:19302'}]; const pc=new RTCPeerConnection({iceServers});pcRef.current=pc;const stream=await navigator.mediaDevices.getUserMedia({audio:true,video:(mine.call_type||call.mode)==='video'});localRef.current.srcObject=stream;stream.getTracks().forEach(t=>pc.addTrack(t,stream));pc.ontrack=e=>{setRemote(e.streams[0]);if(remoteRef.current)remoteRef.current.srcObject=e.streams[0]};pc.onicecandidate=e=>{if(e.candidate)supabase.from('private_call_ice').insert({call_id:mine.id,sender_id:me.id,candidate:e.candidate.toJSON()})};if(call.incoming){await pc.setRemoteDescription(mine.offer);const answer=await pc.createAnswer();await pc.setLocalDescription(answer);await supabase.from('private_call_sessions').update({answer,status:'connected'}).eq('id',mine.id);setStatus('Connected')}else{const offer=await pc.createOffer();await pc.setLocalDescription(offer);await supabase.from('private_call_sessions').update({offer}).eq('id',mine.id);setStatus('Calling…')}const ch=supabase.channel('call-'+mine.id).on('postgres_changes',{event:'UPDATE',schema:'public',table:'private_call_sessions',filter:`id=eq.${mine.id}`},async payload=>{const row=payload.new;if(row.answer&&!pc.currentRemoteDescription){await pc.setRemoteDescription(row.answer);setStatus('Connected')}if(row.status==='ended'||row.status==='declined')setStatus(row.status==='ended'?'Call ended':'Call declined')}).on('postgres_changes',{event:'INSERT',schema:'public',table:'private_call_ice',filter:`call_id=eq.${mine.id}`},async payload=>{if(payload.new.sender_id!==me.id&&!seenRef.current.has(payload.new.id)){seenRef.current.add(payload.new.id);try{await pc.addIceCandidate(payload.new.candidate)}catch{}}}).subscribe();const {data:existingIce}=await supabase.from('private_call_ice').select('id,sender_id,candidate').eq('call_id',mine.id).neq('sender_id',me.id);for(const c of existingIce||[]){seenRef.current.add(c.id);try{await pc.addIceCandidate(c.candidate)}catch{}}if(!dead){const timer=setInterval(async()=>{const{data:c}=await supabase.from('private_call_sessions').select('*').eq('id',mine.id).maybeSingle();if(c?.answer&&!pc.currentRemoteDescription){await pc.setRemoteDescription(c.answer);setStatus('Connected')}},1000);return()=>clearInterval(timer)}return()=>{};}catch(e){if(!dead)setStatus(e.message||'Call unavailable')}}run();return()=>{dead=true;const pc=pcRef.current;pc?.getSenders().forEach(s=>s.track?.stop());if(callIdRef.current)supabase.from('private_call_sessions').update({status:'ended',ended_at:new Date().toISOString()}).eq('id',callIdRef.current);pc?.close()}},[]);
 useEffect(()=>{if(remote&&remoteRef.current)remoteRef.current.srcObject=remote},[remote]);return <div className="callOverlay"><div className="callTop"><button onClick={close}><PhoneOff/></button><b>{call.person.display_name}</b><span>{status}</span></div><video className="remoteVideo" ref={remoteRef} autoPlay playsInline/><video className="localVideo" ref={localRef} autoPlay muted playsInline style={{display:cameraOff?'none':'block'}}/><div className="callControls">{call.speedPair&&<button className="callHeart" onClick={async()=>{const r=await supabase.rpc('speed_dating_like',{p_pair_id:call.speedPair});if(r.data?.mutual)alert('It’s a mutual like! You can continue chatting after the date.')}}><Heart fill="currentColor"/></button>}<button onClick={()=>{const s=localRef.current?.srcObject?.getAudioTracks()?.[0];if(s){s.enabled=!s.enabled;setMuted(!s.enabled)}}}>{muted?<MicOff/>:<Mic/>}</button>{call.mode==='video'&&<button onClick={()=>{const s=localRef.current?.srcObject?.getVideoTracks()?.[0];if(s){s.enabled=!s.enabled;setCameraOff(!s.enabled)}}}>{cameraOff?<CameraOff/>:<Camera/>}</button>}<button className="hangup" onClick={close}><PhoneOff/></button></div></div>}
function SpeedDating({me,startCall,back}){const[state,setState]=useState('idle'),[partner,setPartner]=useState(null),[pair,setPair]=useState(null),[ends,setEnds]=useState(null),[confirm,setConfirm]=useState(false),[error,setError]=useState(''),[seconds,setSeconds]=useState(120);function london(){const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',weekday:'short',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(new Date()).map(x=>[x.type,x.value]));const d=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(p.weekday);return {active:(d===0||d===6)&&Number(p.hour)*60+Number(p.minute)>=1200&&Number(p.hour)*60+Number(p.minute)<1230}}async function join(mode='join'){setError('');const{data,error}=await supabase.rpc('speed_dating_join',{p_mode:mode});if(error){setError(error.message);return}setState(data.state);if(data.partner_id){const{data:p}=await supabase.from('profiles').select('id,display_name,age').eq('id',data.partner_id).single();setPartner(p);setPair(data.pair_id);setEnds(data.round_ends_at);setSeconds(Math.max(0,Math.ceil((new Date(data.round_ends_at)-Date.now())/1000)));const cr=await supabase.functions.invoke('start-conversation',{body:{other_user_id:data.partner_id}});if(!cr.error&&cr.data?.conversation&&data.initiator_id===me.id)startCall({...p},cr.data.conversation,'video',data.pair_id)}else if(mode==='leave')back()}useEffect(()=>{const t=setInterval(()=>{setSeconds(v=>{if(state==='paired'&&v<=1){join('next');return 120}return Math.max(0,v-1)});},1000);return()=>clearInterval(t)},[state]);useEffect(()=>{if(state==='waiting'){const t=setInterval(()=>join('join'),3000);return()=>clearInterval(t)}},[state]);const active=london().active;return <main className="speedPage"><div className="speedHeader"><button onClick={back}><ArrowLeft/></button><div><h1>Speed dating</h1><small>2-minute video dates</small></div></div><div className="speedBody">{state==='idle'&&<div className="speedIntro"><Zap/><h2>Ready for a quick date?</h2><p>Every Saturday and Sunday from <b>8:00pm to 8:30pm</b> (UK time), you'll meet someone new on video every two minutes.</p><button className="primary" onClick={()=>setConfirm(true)}>Enter speed dating</button><button className="walkBtn" onClick={back}>Walk away</button></div>}{confirm&&<div className="speedModal"><div><h2>Join Speed Dating?</h2><p>{active?'The session is live now.':'You can enter the waiting queue now. The dates begin at 8:00pm UK time.'}</p><button className="primary" onClick={()=>{setConfirm(false);if(!active)queueSpeedDatingReminder();join()}}>Enter</button><button className="walkBtn" onClick={()=>setConfirm(false)}>Walk away</button></div></div>}{(state==='waiting'||state==='paired')&&<div className="speedLive">{state==='waiting'?<><Timer size={50}/><h2>You're in the queue</h2><p>{active?'Finding your next date…':'Waiting for Saturday/Sunday at 8:00pm UK time.'}</p></>:<><div className="dateTimer">{Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')}</div><div className="speedVideo"><video autoPlay playsInline/><div className="speedPlaceholder">{partner?.display_name}, {partner?.age}</div></div><button className="heartDate" onClick={async()=>{if(pair){const r=await supabase.rpc('speed_dating_like',{p_pair_id:pair});if(r.error)setError(friendly(r.error));else if(r.data?.mutual)alert('It’s a mutual like! You can continue chatting after the date.')}}}><Heart fill="currentColor"/></button><p>You can heart them if you'd like to connect after the date.</p><button className="walkBtn" onClick={()=>join('leave')}>Leave speed dating</button></>}</div>}{error&&<div className="error">{error}</div>}</div></main>}

function makeUploadId(){try{if(globalThis.crypto?.randomUUID)return globalThis.crypto.randomUUID()}catch{}return `${Date.now()}-${Math.random().toString(36).slice(2)}`}
function mediaMime(file){
 const type=(file?.type||'').toLowerCase().trim();
 if(type)return type;
 const ext=(file?.name||'').split('.').pop()?.toLowerCase();
 const map={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',heic:'image/heic',heif:'image/heif',mp4:'video/mp4',m4v:'video/x-m4v',mov:'video/quicktime',webm:'video/webm','3gp':'video/3gpp'};
 return map[ext]||'application/octet-stream';
}
function mediaExtension(file,mime){
 const ext=(file?.name||'').split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g,'');
 if(ext)return ext;
 const map={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif','image/heic':'heic','image/heif':'heif','video/mp4':'mp4','video/x-m4v':'m4v','video/quicktime':'mov','video/webm':'webm','video/3gpp':'3gp'};
 return map[mime]||'bin';
}
function getVideoDuration(file){return new Promise((resolve,reject)=>{const url=URL.createObjectURL(file),v=document.createElement('video');let done=false;const finish=(fn,value)=>{if(done)return;done=true;URL.revokeObjectURL(url);v.removeAttribute('src');v.load();fn(value)};const timer=setTimeout(()=>finish(reject,new Error('Your phone could not read this video. Please try an MP4, MOV or WebM video.')),12000);v.preload='metadata';v.onloadedmetadata=()=>{clearTimeout(timer);finish(resolve,v.duration)};v.onerror=()=>{clearTimeout(timer);finish(reject,new Error('Could not read this video on your device. Please try an MP4, MOV or WebM video.'))};v.src=url})}
async function uploadStorageWithXHR(bucket,path,file,mime,onProgress){
 const {data:{session}}=await supabase.auth.getSession()
 if(!session?.access_token)throw new Error('Your sign-in session has expired. Please sign in again.')
 const base=(supabase.supabaseUrl||'').replace(/\/$/,'')
 if(!base)throw new Error('Supabase storage URL is not configured.')
 const encodedPath=path.split('/').map(encodeURIComponent).join('/')
 const url=`${base}/storage/v1/object/${encodeURIComponent(bucket)}/${encodedPath}`
 return await new Promise((resolve,reject)=>{
  const xhr=new XMLHttpRequest()
  xhr.open('POST',url,true)
  xhr.setRequestHeader('Authorization',`Bearer ${session.access_token}`)
  xhr.setRequestHeader('apikey',session.access_token ? (supabase.supabaseKey||'') : '')
  xhr.setRequestHeader('Content-Type',mime)
  xhr.setRequestHeader('x-upsert','false')
  xhr.upload.onprogress=e=>{if(e.lengthComputable&&onProgress)onProgress(Math.round((e.loaded/e.total)*100))}
  xhr.onerror=()=>reject(new Error('The phone could not connect to video storage. Please check your internet connection and try again.'))
  xhr.ontimeout=()=>reject(new Error('The video upload timed out. Please try again on a stable Wi-Fi/mobile connection.'))
  xhr.onload=()=>{
   if(xhr.status>=200&&xhr.status<300){
    let data={}
    try{data=JSON.parse(xhr.responseText||'{}')}catch{}
    resolve({data,error:null})
   }else{
    let message=`Video storage returned HTTP ${xhr.status}.`
    try{const body=JSON.parse(xhr.responseText||'{}');message=body.message||body.error||message}catch{}
    reject(new Error(message))
   }
  }
  xhr.timeout=180000
  xhr.send(file)
 })
}

async function uploadShortVideoToStorage(path,file,mime,setMsg){
 const bucket='short-videos'
 let signedError=null
 try{
  // Mobile WebViews can be unreliable with the multipart upload used by
  // storage.upload(). Use a signed upload URL first: the actual file upload
  // then does not need an Authorization header and is much friendlier to
  // Android/Capacitor networking.
  setMsg('Preparing secure video upload…')
  const signed=await supabase.storage.from(bucket).createSignedUploadUrl(path,{upsert:false})
  if(signed.error)throw signed.error
  if(!signed.data?.token)throw new Error('Storage did not return a signed upload token.')
  setMsg('Uploading video… 0%')
  const up=await supabase.storage.from(bucket).uploadToSignedUrl(path,signed.data.token,file,{contentType:mime,cacheControl:'3600'})
  if(!up.error)return up
  throw up.error
 }catch(e){
  signedError=e
  const message=String(e?.message||e||'')
  // If the signed upload is unavailable, retain the original upload path as
  // a compatibility fallback for projects using older Storage settings.
  if(!/failed to fetch|network|fetch|cors|signed|upload/i.test(message))throw e
 }

 try{
  setMsg('Retrying the video upload…')
  const up=await supabase.storage.from(bucket).upload(path,file,{contentType:mime,cacheControl:'3600',upsert:false})
  if(!up.error)return up
  throw up.error
 }catch(e){
  const directMessage=String(e?.message||e||'')
  try{
   setMsg('Trying a direct storage connection…')
   return await uploadStorageWithXHR(bucket,path,file,mime,p=>setMsg(`Uploading video… ${p}%`))
  }catch(xhrError){
   const details=String(xhrError?.message||xhrError||directMessage)
   if(/failed to fetch|network|fetch|connection/i.test(details)){
    throw new Error('The phone could not connect to video storage. Please check your internet connection. If you are connected, the Supabase short-videos storage bucket or its upload policy needs checking.')
   }
   throw xhrError
  }
 }
}

async function uploadVideoFile(me,file,type,caption,setMsg,setBusy){
 if(!file)return false
 const mime=mediaMime(file)
 if(!mime.startsWith('video/')){setMsg('Please choose a video file (MP4, MOV or WebM).');return false}
 if(file.size>100*1024*1024){setMsg('Videos must be 100MB or smaller. For the most reliable upload, MP4 videos under 50MB are recommended.');return false}
 setBusy(true);setMsg('Checking video…');let path=''
 try{
  const duration=await getVideoDuration(file)
  if(!Number.isFinite(duration)||duration<=0||duration>60.01)throw new Error('Videos must be no longer than 60 seconds.')
  const ext=mediaExtension(file,mime)
  path=`${me.id}/${makeUploadId()}.${ext}`
  setMsg('Uploading video… 0%')
  await uploadShortVideoToStorage(path,file,mime,setMsg)
  const{error:dbError}=await supabase.from('short_videos').insert({user_id:me.id,video_type:type,storage_path:path,duration_seconds:Math.round(duration*100)/100,caption:(caption||'').trim()})
  if(dbError){await supabase.storage.from('short-videos').remove([path]).catch(()=>{});throw dbError}
  setMsg(type==='bio'?'Video uploaded and sent for safety review.':'Short uploaded and sent for safety review.')
  return true
 }catch(e){
  if(path)await supabase.storage.from('short-videos').remove([path]).catch(()=>{})
  const message=String(e?.message||e||'Video upload failed.')
  setMsg(message==='Failed to fetch'?'Video upload could not connect to storage. Please try again on Wi-Fi or mobile data.':message)
  return false
 }finally{setBusy(false)}
}
async function photoFor(uid){try{const r=await supabase.from('profile_photos').select('storage_path,is_primary,sort_order').eq('user_id',uid).order('is_primary',{ascending:false}).order('sort_order',{ascending:true}).limit(1);const p=r.data?.[0]?.storage_path;if(p)return await signedUrl('profile-photos',p)}catch{}try{const r=await supabase.functions.invoke('profile-photo-url',{body:{user_id:uid}});return r.data?.photos?.[0]?.url||null}catch{return null}}
function friendly(e){const m=String(e?.message||e||'');return /non-2xx|Edge Function|FunctionsHttpError|Failed to send a request/i.test(m)?'Something went wrong, please try again in a moment.':m}
async function signedUrl(bucket,path){if(!path)return null;try{const r=await supabase.storage.from(bucket).createSignedUrl(path,3600);if(r.data?.signedUrl)return r.data.signedUrl}catch{}try{return supabase.storage.from(bucket).getPublicUrl(path).data?.publicUrl||null}catch{return null}}
async function loadOwnPhotosDirect(uid){const r=await supabase.from('profile_photos').select('*').eq('user_id',uid).order('sort_order',{ascending:true});if(r.error)return [];return Promise.all((r.data||[]).map(async x=>({...x,path:x.storage_path,url:await signedUrl('profile-photos',x.storage_path)})))}
async function loadVideosDirect(filter){let q=supabase.from('short_videos').select('*');q=filter(q);const r=await q.limit(50);if(r.error)return [];const rows=r.data||[];const ids=[...new Set(rows.map(x=>x.user_id))];let names=new Map();if(ids.length){const pr=await supabase.from('profiles').select('id,display_name,age').in('id',ids);(pr.data||[]).forEach(p=>names.set(p.id,p))}const out=await Promise.all(rows.map(async x=>({...x,url:await signedUrl('short-videos',x.storage_path),display_name:names.get(x.user_id)?.display_name||'Member',age:names.get(x.user_id)?.age||''})));return out.filter(x=>x.url).sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')))}

function Profile({me,refresh,signOut}){
 const[file,setFile]=useState(null),[video,setVideo]=useState(null),[clip,setClip]=useState(null),[clipCaption,setClipCaption]=useState(''),[busy,setBusy]=useState(false),[vBusy,setVBusy]=useState(false),[cBusy,setCBusy]=useState(false),[saving,setSaving]=useState(false),[msg,setMsg]=useState(''),[photos,setPhotos]=useState([]),[detailsOpen,setDetailsOpen]=useState(false),[form,setForm]=useState({display_name:me.display_name||'',age:me.age||'',location:me.location||'',identity:me.identity||'',height_cm:me.height_cm||'',body_type:me.body_type||'',religion:me.religion||'',marital_status:me.marital_status||'',job_title:me.job_title||'',bio:me.bio||'',headline:me.headline||'',interests:me.interests||'',hobbies:me.hobbies||'',interested_body_types:me.interested_body_types||[],attractive_traits:me.attractive_traits||[],seeking:me.seeking||[],goal:me.goal||''});
 useEffect(()=>{setForm({display_name:me.display_name||'',age:me.age||'',location:me.location||'',identity:me.identity||'',height_cm:me.height_cm||'',body_type:me.body_type||'',religion:me.religion||'',marital_status:me.marital_status||'',job_title:me.job_title||'',bio:me.bio||'',headline:me.headline||'',interests:me.interests||'',hobbies:me.hobbies||'',interested_body_types:me.interested_body_types||[],attractive_traits:me.attractive_traits||[],seeking:me.seeking||[],goal:me.goal||''})},[me.id,me.updated_at]);
 useEffect(()=>{loadPhotos()},[me.id]);
 async function loadPhotos(){let list=[];try{const r=await supabase.functions.invoke('profile-photo-url',{body:{user_id:me.id}});if(!r.error)list=(r.data?.photos||[]).filter(x=>x.url)}catch{}if(!list.length)list=await loadOwnPhotosDirect(me.id);setPhotos(list)}
 const[bioVideo,setBioVideo]=useState(null);useEffect(()=>{loadBio()},[me.id]);async function loadBio(){const v=await loadVideosDirect(q=>q.eq('user_id',me.id).eq('video_type','bio'));setBioVideo(v[0]||null)}
 function setF(k,v){setForm(x=>({...x,[k]:v}))}
 async function saveProfile(){setSaving(true);setMsg('Saving profile…');try{const payload={display_name:form.display_name.trim(),location:form.location.trim(),identity:form.identity,age:form.age!==''&&form.age!=null?Number(form.age):null,height_cm:form.height_cm!==''&&form.height_cm!=null?Number(form.height_cm):null,body_type:form.body_type||null,religion:form.religion||null,marital_status:form.marital_status||null,job_title:form.job_title.trim(),bio:form.bio.trim(),headline:form.headline.trim(),interests:form.interests.trim(),hobbies:form.hobbies.trim(),interested_body_types:form.interested_body_types||[],attractive_traits:form.attractive_traits||[],seeking:form.seeking||[],goal:form.goal||null};if(!payload.display_name||payload.age<18||payload.age>120)throw new Error('Please enter a valid name and age.');const r=await supabase.from('profiles').update(payload).eq('id',me.id);if(r.error)throw r.error;setMsg('Profile saved.');await refresh(me.id)}catch(e){setMsg(e.message||'Could not save profile.')}finally{setSaving(false)}}
 async function upload(){if(!file)return;const mime=mediaMime(file);if(!mime.startsWith('image/')){setMsg('Please choose a photo. JPG, PNG, WebP or a supported phone image is accepted.');return}if(file.size>10*1024*1024){setMsg('Images must be 10MB or smaller.');return}setBusy(true);setMsg('Uploading photo…');let path='';try{const ext=mediaExtension(file,mime);path=`${me.id}/${makeUploadId()}.${ext}`;const up=await supabase.storage.from('profile-photos').upload(path,file,{contentType:mime,cacheControl:'3600',upsert:false});if(up.error)throw up.error;const existing=await supabase.from('profile_photos').select('sort_order,is_primary').eq('user_id',me.id).order('sort_order',{ascending:false}).limit(1);if(existing.error)throw existing.error;const maxOrder=existing.data?.[0]?.sort_order??-1;const pe=await supabase.from('profile_photos').insert({user_id:me.id,storage_path:path,sort_order:maxOrder+1,is_primary:maxOrder<0});if(pe.error){await supabase.storage.from('profile-photos').remove([path]);throw pe.error}setMsg('Photo uploaded successfully.');setFile(null);await loadPhotos()}catch(e){if(path){await supabase.storage.from('profile-photos').remove([path]).catch(()=>{})}setMsg(e.message||'Photo upload failed.')}finally{setBusy(false)}}
 async function removePhoto(photo){if(!confirm('Delete this photo?'))return;const path=photo.storage_path||photo.path;if(!path)return;const r=await supabase.storage.from('profile-photos').remove([path]);if(r.error){setMsg(r.error.message);return}await supabase.from('profile_photos').delete().eq('user_id',me.id).eq('storage_path',path);setMsg('Photo deleted.');await loadPhotos()}
 async function doVideo(type){const f=type==='bio'?video:clip;if(!f)return;const ok=await uploadVideoFile(me,f,type,type==='clip'?clipCaption:'',setMsg,type==='bio'?setVBusy:setCBusy);if(ok){if(type==='bio'){setVideo(null);loadBio()}else{setClip(null);setClipCaption('')}}}
 async function removeBioVideo(){if(!bioVideo||!confirm('Delete your bio video?'))return;setVBusy(true);setMsg('Deleting bio video…');try{const r=await supabase.from('short_videos').delete().eq('id',bioVideo.id).eq('user_id',me.id);if(r.error)throw r.error;if(bioVideo.storage_path){const storage=await supabase.storage.from('short-videos').remove([bioVideo.storage_path]);if(storage.error)console.warn(storage.error)}setBioVideo(null);setMsg('Bio video deleted.')}catch(e){setMsg(e.message||'Could not delete your bio video.')}finally{setVBusy(false)}}
 const primaryPhoto=photos.find(x=>x.is_primary&&x.url)||photos.find(x=>x.url)||null;
 const toggleMulti=(key,value)=>setF(key,(form[key]||[]).includes(value)?(form[key]||[]).filter(x=>x!==value):[...(form[key]||[]),value]);
 const profileStyles=`
 .profileTopAvatar{width:132px;height:132px;border-radius:50%;overflow:hidden;margin:8px auto 18px;background:#2a292f;display:flex;align-items:center;justify-content:center;font-size:48px;font-weight:800;color:#fff;border:2px solid rgba(255,255,255,.12)}
 .profileTopAvatar img{width:100%;height:100%;display:block;object-fit:cover}
 .profileDetailsToggle{width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;text-align:left;margin:0 0 12px;padding:16px 18px;border:1px solid rgba(255,255,255,.16);border-radius:16px;background:#17161b;color:inherit;font:inherit;font-weight:700}
 .profileDetailsPanel{padding:4px 0 0}
 .profileDetailsHint{margin:0 0 14px}
 .profilePhotoGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
 .profilePhotoItem{min-width:0}
 .profilePhotoItem img{display:block;width:100%;height:190px;object-fit:cover;border-radius:14px;background:#202026}
 .profilePhotoItem .danger{margin-top:8px;width:100%}
 .profileMediaNote{margin:0 0 12px}
 @media(max-width:480px){.profilePhotoItem img{height:160px}.profileTopAvatar{width:120px;height:120px}}
 `;
 return <main className="scroll profilePage"><style>{profileStyles}</style><div className="profileTopAvatar">{primaryPhoto?<img src={primaryPhoto.url} alt="Your profile"/>:<span>{(form.display_name||'?')[0].toUpperCase()}</span>}</div><h1>{form.display_name||'Your profile'}{form.age?`, ${form.age}`:''}</h1>{bioVideo&&<div style={{margin:"12px auto",maxWidth:320,width:"100%"}}><video src={bioVideo.url} controls playsInline preload="metadata" style={{width:"100%",maxHeight:"52vh",objectFit:"contain",borderRadius:16,display:"block",background:"#000"}}/><button className="danger" disabled={vBusy} onClick={removeBioVideo} style={{width:"100%",marginTop:8}}><Trash2/> {vBusy?'Deleting…':'Delete bio video'}</button></div>}<p className="muted">Keep your profile up to date so people know who they are meeting.</p>
  <button type="button" className="profileDetailsToggle" onClick={()=>setDetailsOpen(v=>!v)} aria-expanded={detailsOpen}><span>Profile details</span><span>{detailsOpen?'▲ Hide':'▼ Edit profile information'}</span></button>
  {detailsOpen&&<div className="photoBox profileDetailsPanel"><p className="muted profileDetailsHint">Add or change your name, age, location, job, height, body type, relationship status, religion, bio, interests and dating preferences.</p><Field t="Name"><input value={form.display_name} maxLength="80" onChange={e=>setF('display_name',e.target.value)}/></Field><Field t="Age"><input type="number" min="18" max="120" value={form.age} onChange={e=>setF('age',e.target.value)}/></Field><Field t="Town or city"><input value={form.location} onChange={e=>setF('location',e.target.value)}/></Field><Field t="Job title"><input value={form.job_title} maxLength="100" onChange={e=>setF('job_title',e.target.value)} placeholder="e.g. Builder, Teacher, Nurse"/></Field><Field t="Height (cm)"><input type="number" min="100" max="250" value={form.height_cm} onChange={e=>setF('height_cm',e.target.value)} placeholder="e.g. 175"/></Field><Choice t="Body type" a={bodyTypes} v={form.body_type} set={v=>setF('body_type',v)}/><Choice t="Marital status" a={maritalStatuses} v={form.marital_status} set={v=>setF('marital_status',v)}/><Choice t="Religion" a={religions} v={form.religion} set={v=>setF('religion',v)}/><Field t="Headline"><input value={form.headline} maxLength="120" onChange={e=>setF('headline',e.target.value)}/></Field><Field t="Bio"><textarea value={form.bio} maxLength="2000" onChange={e=>setF('bio',e.target.value)}/></Field><Field t="Interests"><textarea value={form.interests} maxLength="1500" onChange={e=>setF('interests',e.target.value)} placeholder="Music, travel, football, films…"/></Field><Field t="Hobbies"><textarea value={form.hobbies} maxLength="1500" onChange={e=>setF('hobbies',e.target.value)} placeholder="What do you enjoy doing?"/></Field><ChoiceMulti t="What are you looking for?" a={seeking} v={form.seeking.map(x=>Object.keys(seekingDb).find(k=>seekingDb[k]===x)||x)} set={vals=>setF('seeking',vals.map(x=>seekingDb[x]||x))}/><ChoiceMulti t="Body types you are interested in" a={bodyTypes} v={form.interested_body_types||[]} set={v=>setF('interested_body_types',v)}/><ChoiceMulti t="What is most attractive to you?" a={attractiveTraits} v={form.attractive_traits||[]} set={v=>setF('attractive_traits',v)}/><button className="primary" disabled={saving} onClick={saveProfile}>{saving?'Saving…':'Save profile'}</button></div>}
  <div className="photoBox"><h2>Profile photos</h2><p className="muted profileMediaNote">Your saved photos stay visible here and the primary photo is shown above your name.</p>{photos.length?<div className="profilePhotoGrid">{photos.map((photo,i)=><div className="profilePhotoItem" key={photo.path||photo.storage_path||i}><img src={photo.url} alt={`Profile photo ${i+1}`}/><button className="danger" onClick={()=>removePhoto(photo)}>Delete</button></div>)}</div>:<p className="muted">No photos uploaded yet.</p>}<input type="file" accept="image/jpeg,image/png,image/webp,image/*" onChange={e=>setFile(e.target.files?.[0]||null)}/><button className="primary" disabled={!file||busy} onClick={upload}>{busy?'Uploading…':'Upload photo'}</button></div>
  <div className="videoBox"><div className="videoTitle"><Video/><b>Video in your bio</b></div><p className="muted">Upload an MP4/WebM/MOV video up to 60 seconds. Approved bio videos can appear in Shorts.</p><input type="file" accept="video/mp4,video/webm,video/quicktime,video/x-m4v,video/*" onChange={e=>setVideo(e.target.files?.[0]||null)}/><button className="primary" disabled={!video||vBusy} onClick={()=>doVideo('bio')}>{vBusy?'Uploading…':'Add bio video'}</button></div>
  <div className="videoBox"><div className="videoTitle"><Play/><b>Post a Short</b></div><p className="muted">Share a public video up to 60 seconds. It goes through safety review before appearing publicly.</p><input type="file" accept="video/mp4,video/webm,video/quicktime,video/x-m4v,video/*" onChange={e=>setClip(e.target.files?.[0]||null)}/><input value={clipCaption} onChange={e=>setClipCaption(e.target.value)} maxLength={500} placeholder="Add a caption (optional)"/><button className="primary" disabled={!clip||cBusy} onClick={()=>doVideo('clip')}>{cBusy?'Uploading…':'Post Short'}</button></div>{msg&&<small className="statusText">{msg}</small>}<button onClick={signOut}>Sign out</button></main>}
// ---------- Reminders (30 minutes before timed events) ----------
const REM_KEY='love_that_reminders'
function readRem(){try{return JSON.parse(localStorage.getItem(REM_KEY)||'[]')}catch{return []}}
function writeRem(list){try{localStorage.setItem(REM_KEY,JSON.stringify(list.filter(r=>r.eventAt>Date.now()-6*3600*1000)))}catch{}}
function hashId(s){let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return Math.abs(h)%2000000000+1}
function londonToTimestamp(y,m,d,h,mi){const guess=Date.UTC(y,m-1,d,h,mi);const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(new Date(guess)).map(x=>[x.type,x.value]));const asUtc=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour%24,+p.minute);return guess-(asUtc-guess)}
function dateNightTimestamp(scheduled){const s=String(scheduled||'');const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(s);if(!m)return null;const dateOnly=s.length<=10||/T00:00:00(\.0+)?(Z|\+00:00)?$/.test(s);if(dateOnly)return londonToTimestamp(+m[1],+m[2],+m[3],20,0);const t=new Date(s).getTime();return Number.isNaN(t)?null:t}
function nextSpeedDatingStart(){const now=Date.now();for(let i=0;i<9;i++){const t=new Date(now+i*86400000);const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',weekday:'short',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(t).map(x=>[x.type,x.value]));if(p.weekday==='Sat'||p.weekday==='Sun'){const start=londonToTimestamp(+p.year,+p.month,+p.day,20,0);if(start>now)return start}}return null}
async function nativeSchedule(id,fireAt,title,body){try{const LN=window.Capacitor?.Plugins?.LocalNotifications;if(!LN||fireAt<=Date.now())return;const perm=await LN.requestPermissions();if(perm?.display&&perm.display!=='granted')return;await LN.schedule({notifications:[{id:hashId(id),title,body,schedule:{at:new Date(fireAt),allowWhileIdle:true}}]})}catch{}}
async function nativeCancel(id){try{const LN=window.Capacitor?.Plugins?.LocalNotifications;if(LN)await LN.cancel({notifications:[{id:hashId(id)}]})}catch{}}
function askNotifyPermission(){try{if(typeof Notification!=='undefined'&&Notification.permission==='default')Notification.requestPermission()}catch{}}
function scheduleReminder(id,eventAt,title,body){
 if(!eventAt||eventAt<=Date.now())return
 const list=readRem(),old=list.find(r=>r.id===id)
 if(old&&old.eventAt===eventAt)return
 writeRem([...list.filter(r=>r.id!==id),{id,eventAt,title,body,fired:false}])
 askNotifyPermission()
 nativeSchedule(id,eventAt-30*60000,title,body)
}
function cancelReminder(id){const list=readRem();if(list.some(r=>r.id===id)){writeRem(list.filter(r=>r.id!==id));nativeCancel(id)}}
function checkReminders(){
 const now=Date.now(),list=readRem();let changed=false
 for(const r of list){if(!r.fired&&now>=r.eventAt-30*60000&&now<r.eventAt){r.fired=true;changed=true
  try{if(typeof Notification!=='undefined'&&Notification.permission==='granted')new Notification(r.title,{body:r.body,icon:'/icon.png'})}catch{}
  window.dispatchEvent(new CustomEvent('love-that-reminder',{detail:r}))}}
 if(changed)writeRem(list)
}
async function syncDateReminders(uid){
 try{const r=await supabase.from('date_night_dates').select('*').or(`user_a.eq.${uid},user_b.eq.${uid}`);if(r.error)return
  for(const x of r.data||[]){const id='datenight-'+x.id;if(x.status==='confirmed'){const at=dateNightTimestamp(x.scheduled_at);if(at)scheduleReminder(id,at,'Video date at 8:00 PM','Your Date Night video date starts in 30 minutes. Get ready!')}else if(x.status==='cancelled')cancelReminder(id)}
 }catch{}
}
function queueSpeedDatingReminder(){const at=nextSpeedDatingStart();if(at)scheduleReminder('speeddating-'+at,at,'Speed dating starts at 8:00 PM','Speed dating starts in 30 minutes. Stay ready — you are in the queue!')}

async function fnErrorMessage(e){try{if(e?.context&&typeof e.context.text==='function'){const t=await e.context.text();try{const b=JSON.parse(t);return b.error||b.message||t}catch{return t}}}catch{}return e?.message||''}

// ---------- Swipe card (drag right = like, drag left = pass) ----------
function SwipeCard({onLike,onNope,disabled,children}){
 const[dx,setDx]=useState(0),[drag,setDrag]=useState(false),start=React.useRef(null),dxRef=React.useRef(0)
 function setX(v){dxRef.current=v;setDx(v)}
 function down(e){if(disabled||e.target.closest('button,a,input,textarea,select,video'))return;start.current={x:e.clientX,y:e.clientY,lock:null,id:e.pointerId};setDrag(true)}
 function move(e){const s=start.current;if(!s)return;const mx=e.clientX-s.x,my=e.clientY-s.y;if(s.lock===null&&(Math.abs(mx)>8||Math.abs(my)>8)){s.lock=Math.abs(mx)>Math.abs(my)?'x':'y';if(s.lock==='x'){try{e.currentTarget.setPointerCapture(s.id)}catch{}}}if(s.lock==='x')setX(mx)}
 function up(){const s=start.current;start.current=null;setDrag(false);const v=dxRef.current;if(s?.lock==='x'&&Math.abs(v)>90){const dir=v>0?1:-1;setX(dir*700);setTimeout(()=>{dir>0?onLike():onNope()},200)}else setX(0)}
 const like=Math.min(1,Math.max(0,dx/90)),nope=Math.min(1,Math.max(0,-dx/90))
 return <div onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} style={{position:'relative',touchAction:'pan-y',userSelect:'none',transform:`translateX(${dx}px) rotate(${dx/25}deg)`,transition:drag?'none':'transform .2s ease',opacity:Math.abs(dx)>400?0:1}}>
  {children}
  <div style={{position:'absolute',top:22,left:18,padding:'6px 14px',border:'4px solid #3FB9A8',color:'#3FB9A8',borderRadius:10,fontWeight:900,fontSize:26,letterSpacing:2,transform:'rotate(-14deg)',opacity:like,pointerEvents:'none',background:'rgba(0,0,0,.35)'}}>LIKE</div>
  <div style={{position:'absolute',top:22,right:18,padding:'6px 14px',border:'4px solid #E8654F',color:'#E8654F',borderRadius:10,fontWeight:900,fontSize:26,letterSpacing:2,transform:'rotate(14deg)',opacity:nope,pointerEvents:'none',background:'rgba(0,0,0,.35)'}}>NOPE</div>
 </div>
}

// ---------- Messages tab (private chats with matches) ----------
function Messages({me,people,open}){
 const preview=p=>{const l=p.last;if(!l)return 'Say hello 👋';const mine=l.sender_id===me.id?'You: ':'';if(l.media_type)return mine+(l.media_type==='video'?'🎥 Video':l.media_type==='gif'?'GIF':'📷 Photo');return mine+(l.body||'')}
 return <main className="scroll"><h1>Messages</h1><p className="muted">Private chats with your matches — send messages, photos and emojis, or start a video or audio call.</p>{people.length?people.map(p=><button className="match" key={p.id} onClick={()=>open(p)}>{p.photo?<img src={p.photo}/>:<div className="miniAvatar">{p.display_name?.[0]}</div>}<span><b>{p.display_name}</b><small>{preview(p)}</small></span><MessageCircle/></button>):<div className="empty"><MessageCircle/><h2>No messages yet</h2><p>When you match with someone, your private chat will appear here.</p></div>}</main>
}

// ---------- Chat room media (re-signs the link if it fails to load) ----------
function RoomMedia({x}){
 const path=x.media_path||x.storage_path||x.file_path||x.path||null
 const direct=x.media_url_external||(path?null:x.media_url)||null
 const[url,setUrl]=useState(direct),[err,setErr]=useState(''),triedBlob=React.useRef(false)
 const isVideo=x.media_type==='video'||/\.(mp4|mov|webm|m4v|3gp)$/i.test(path||'')
 async function viaDownload(){if(!path||triedBlob.current)return false;triedBlob.current=true;try{const d=await supabase.storage.from('chat-room').download(path);if(d.data){setUrl(URL.createObjectURL(d.data));return true}setErr(d.error?.message||'Could not download this file.')}catch(e){setErr(e?.message||'Could not download this file.')}return false}
 useEffect(()=>{if(!path)return;let alive=true;(async()=>{try{const s=await supabase.storage.from('chat-room').createSignedUrl(path,3600);if(!alive)return;if(s.data?.signedUrl){setUrl(s.data.signedUrl);return}if(await viaDownload())return;if(alive&&x.media_url)setUrl(x.media_url)}catch(e){if(alive)setErr(e?.message||'Could not load.')}})();return()=>{alive=false}},[path])
 const note={fontSize:13,color:'#c9c5cc',display:'block',padding:'8px 0'}
 if(!path&&!direct)return <small style={note}>Photo missing from this message (type: {String(x.media_type)}). Fields: {Object.keys(x).filter(k=>x[k]!=null&&x[k]!=='').join(', ')}</small>
 if(err&&!url)return <small style={note}>Photo or video unavailable: {err}</small>
 if(!url)return <small style={note}>Loading photo…</small>
 const onErr=async()=>{if(!(await viaDownload()))setErr(prev=>prev||'The file could not be displayed.')}
 return isVideo?<video className="roomMedia" style={{maxWidth:'100%',display:'block'}} src={url} controls playsInline onError={onErr}/>:<img className="roomMedia" style={{maxWidth:'100%',display:'block'}} src={url} alt="Photo shared in chat" onError={onErr}/>
}

// ---------- Shorts comments ----------
function CommentsSheet({video,me,close,bump}){
 const[list,setList]=useState([]),[text,setText]=useState(''),[busy,setBusy]=useState(false),[err,setErr]=useState('')
 async function load(){const r=await supabase.from('short_comments').select('*').eq('video_id',video.id).order('created_at',{ascending:true}).limit(200);if(r.error){setErr(r.error.message);return}const ids=[...new Set((r.data||[]).map(x=>x.user_id))];const names=new Map();if(ids.length){const pr=await supabase.from('profiles').select('id,display_name').in('id',ids);(pr.data||[]).forEach(p=>names.set(p.id,p.display_name))}setList((r.data||[]).map(x=>({...x,name:names.get(x.user_id)||'Member'})))}
 useEffect(()=>{load();const ch=supabase.channel('short-comments-'+video.id).on('postgres_changes',{event:'INSERT',schema:'public',table:'short_comments',filter:`video_id=eq.${video.id}`},()=>load()).subscribe();return()=>{supabase.removeChannel(ch)}},[video.id])
 async function send(e){e?.preventDefault();const body=text.trim();if(!body||busy)return;setBusy(true);setErr('');const r=await supabase.from('short_comments').insert({video_id:video.id,user_id:me.id,body}).select('*').single();if(r.error)setErr(r.error.message);else{setText('');setList(v=>v.some(x=>x.id===r.data.id)?v:[...v,{...r.data,name:'You'}]);bump(1)}setBusy(false)}
 async function remove(c){const r=await supabase.from('short_comments').delete().eq('id',c.id).eq('user_id',me.id);if(r.error){setErr(r.error.message);return}setList(v=>v.filter(x=>x.id!==c.id));bump(-1)}
 return <div className="cmBack" onClick={close}><div className="cmSheet" onClick={e=>e.stopPropagation()}><div className="cmHead"><b>Comments</b><button className="cmClose" onClick={close} aria-label="Close comments"><X/></button></div><div className="cmList">{list.length?list.map(c=><div className="cmItem" key={c.id}><span><b>{c.user_id===me.id?'You':c.name}</b><br/>{c.body}</span>{c.user_id===me.id&&<button className="cmDel" onClick={()=>remove(c)} aria-label="Delete comment"><Trash2 size={16}/></button>}</div>):<p className="muted" style={{textAlign:'center',padding:'24px 0'}}>No comments yet. Be the first!</p>}</div>{err&&<small className="statusText" style={{padding:'0 16px'}}>{err}</small>}<form className="cmForm" onSubmit={send}><input value={text} onChange={e=>setText(e.target.value)} maxLength={500} placeholder="Add a comment…"/><button className="primary" type="submit" disabled={busy||!text.trim()} aria-label="Send comment"><Send/></button></form></div></div>
}

function ShortVideo({v,onDouble}){
 const ref=React.useRef(null),tried=React.useRef(false),[playing,setPlaying]=useState(false),[err,setErr]=useState(''),[src,setSrc]=useState(v.url)
 async function recover(){
  if(tried.current){setErr(p=>p||'This video could not be played on your device.');return}
  tried.current=true
  try{
   if(v.storage_path){
    const sg=await supabase.storage.from('short-videos').createSignedUrl(v.storage_path,3600)
    if(sg.data?.signedUrl&&sg.data.signedUrl!==src){setSrc(sg.data.signedUrl);return}
    const d=await supabase.storage.from('short-videos').download(v.storage_path)
    if(d.data){setSrc(URL.createObjectURL(d.data));return}
    setErr(sg.error?.message||d.error?.message||'The video file is not available.')
   }else setErr('The video file is not available.')
  }catch(e){setErr(e?.message||'Could not load this video.')}
 }
 function toggle(){const el=ref.current;if(!el)return;if(el.paused){const p=el.play();if(p&&p.catch)p.catch(()=>{el.muted=true;el.play().catch(()=>setErr('Your phone blocked playback. Tap again.'))})}else el.pause()}
 return <>
  <video ref={ref} src={src+'#t=0.001'} playsInline loop preload="auto" onPlay={()=>{setPlaying(true);setErr('')}} onPause={()=>setPlaying(false)} onError={recover}/>
  <div onClick={toggle} onDoubleClick={onDouble} style={{position:'absolute',inset:0,zIndex:2,display:'grid',placeItems:'center'}}>
   {err?<div style={{background:'rgba(0,0,0,.75)',color:'#fff',padding:'10px 14px',borderRadius:14,maxWidth:'70%',textAlign:'center',fontSize:13}}>{err}</div>
   :!playing?<div style={{width:76,height:76,borderRadius:'50%',background:'rgba(0,0,0,.5)',display:'grid',placeItems:'center',color:'#fff'}}><Play size={38} fill="currentColor"/></div>:null}
  </div>
 </>
}
function Shorts({me,openChat,back}){
 const[videos,setVideos]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[deleting,setDeleting]=useState(null),[liked,setLiked]=useState(new Set()),[likeCounts,setLikeCounts]=useState({}),[commentCounts,setCommentCounts]=useState({}),[commentsFor,setCommentsFor]=useState(null),[note,setNote]=useState('')
 const feedRef=React.useRef(null)
 useEffect(()=>{load()},[])
 useEffect(()=>{const root=feedRef.current;if(!root)return;const vids=[...root.querySelectorAll('video')];const play=v=>{const p=v.play();if(p&&p.catch)p.catch(()=>{v.muted=true;v.play().catch(()=>{})})};const io=new IntersectionObserver(es=>{es.forEach(en=>{const v=en.target;if(en.isIntersecting&&en.intersectionRatio>=0.6){vids.forEach(o=>{if(o!==v)o.pause()});play(v)}else{v.pause()}})},{root,threshold:[0,0.6]});vids.forEach(v=>io.observe(v));return()=>{io.disconnect();vids.forEach(v=>v.pause())}},[videos,loading])
 function showNote(m){setNote(m);setTimeout(()=>setNote(''),6000)}
 async function loadReactions(list){const ids=list.map(v=>v.id);if(!ids.length)return;try{const[l,c]=await Promise.all([supabase.from('short_likes').select('video_id,user_id').in('video_id',ids),supabase.from('short_comments').select('video_id').in('video_id',ids)]);if(!l.error){const counts={},mine=new Set();for(const x of l.data||[]){counts[x.video_id]=(counts[x.video_id]||0)+1;if(x.user_id===me.id)mine.add(x.video_id)}setLikeCounts(counts);setLiked(mine)}if(!c.error){const cc={};for(const x of c.data||[])cc[x.video_id]=(cc[x.video_id]||0)+1;setCommentCounts(cc)}}catch{}}
 async function load(){setLoading(true);setError('');let feed=[],failed=null;try{const r=await supabase.functions.invoke('short-video-feed',{body:{limit:30}});if(r.error)throw r.error;feed=r.data?.videos||[]}catch(e){failed=e}try{const direct=await loadVideosDirect(q=>q);const seen=new Set(feed.map(x=>x.id));feed=[...feed,...direct.filter(x=>!seen.has(x.id))]}catch{}feed.sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')));if(feed.length){setVideos(feed);loadReactions(feed)}else if(failed)setError(failed.message||'Could not load Shorts.');else setVideos([]);setLoading(false)}
 async function toggleLike(v){const was=liked.has(v.id);const apply=add=>{setLiked(s=>{const n=new Set(s);add?n.add(v.id):n.delete(v.id);return n});setLikeCounts(c=>({...c,[v.id]:Math.max(0,(c[v.id]||0)+(add?1:-1))}))};apply(!was);const r=was?await supabase.from('short_likes').delete().eq('video_id',v.id).eq('user_id',me.id):await supabase.from('short_likes').insert({video_id:v.id,user_id:me.id});if(r.error){apply(was);showNote(r.error.message)}}
 async function download(v){try{showNote('Downloading…');const res=await fetch(v.url);if(!res.ok)throw new Error('download failed');const blob=await res.blob();const ext=((v.storage_path||'').split('.').pop()||'mp4').toLowerCase();const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=`love-that-${v.id}.${ext}`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),10000);showNote('Saved to your device.')}catch{try{window.open(v.url,'_blank')}catch{}showNote('If the video opened in a new tab, press and hold it to save.')}}
 async function removeVideo(v){if(v.user_id!==me.id||!confirm(`Delete your ${v.video_type==='bio'?'bio video':'Short'}?`))return;setDeleting(v.id);setError('');try{const r=await supabase.from('short_videos').delete().eq('id',v.id).eq('user_id',me.id);if(r.error)throw r.error;if(v.storage_path){const storage=await supabase.storage.from('short-videos').remove([v.storage_path]);if(storage.error)console.warn(storage.error)}setVideos(list=>list.filter(x=>x.id!==v.id))}catch(e){showNote(e.message||'Could not delete your video.')}finally{setDeleting(null)}}
 const styles=`
 .shortsPage{position:fixed!important;inset:0;z-index:900;background:#000;overflow:hidden;display:block!important;padding:0!important;margin:0!important;height:100%!important}
 .shortsPage .shortsTop{position:absolute;top:0;left:0;right:0;z-index:5;display:flex;justify-content:space-between;align-items:center;padding:calc(env(safe-area-inset-top,0px) + 10px) 12px 14px;background:linear-gradient(rgba(0,0,0,.55),transparent);pointer-events:none}
 .shortsPage .shortsTop button{pointer-events:auto;width:42px;height:42px;display:grid;place-items:center;padding:0;margin:0;border-radius:50%;background:rgba(0,0,0,.45)!important;border:0;color:#fff;font-size:20px}
 .shortsPage .shortsTop h1{margin:0;font-size:18px;color:#fff}
 .shortsPage .shortsFeed{height:100%;overflow-y:auto;scroll-snap-type:y mandatory;overscroll-behavior-y:contain;-webkit-overflow-scrolling:touch;scrollbar-width:none}
 .shortsPage .shortsFeed::-webkit-scrollbar{display:none}
 .shortsPage .shortCard{position:relative;height:100%;width:100%;margin:0!important;border-radius:0!important;scroll-snap-align:start;scroll-snap-stop:always;background:#000;overflow:hidden;display:block}
 .shortsPage .shortCard>video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#000}
 .shortsPage .shortShade{position:absolute;left:0;right:0;bottom:0;height:45%;background:linear-gradient(transparent,rgba(0,0,0,.75));pointer-events:none}
 .shortsPage .shortSide{position:absolute;right:10px;bottom:calc(env(safe-area-inset-bottom,0px) + 90px);z-index:4;display:flex;flex-direction:column;align-items:center;gap:18px}
 .shortsPage .sideBtn{width:52px;height:auto;display:flex;flex-direction:column;align-items:center;gap:2px;padding:0;margin:0;background:none!important;border:0;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,.7)}
 .shortsPage .sideBtn svg{width:34px;height:34px;filter:drop-shadow(0 1px 4px rgba(0,0,0,.6))}
 .shortsPage .sideBtn small{font-size:12px;font-weight:700}
 .shortsPage .sideBtn.on{color:#ff4d6d}
 .shortsPage .sideBtn.del{color:#ff6b6b}
 .shortsPage .shortMeta{position:absolute;left:0;right:78px;bottom:0;z-index:3;padding:0 14px calc(env(safe-area-inset-bottom,0px) + 18px);color:#fff}
 .shortsPage .shortMeta p{margin:8px 0;line-height:1.35;font-size:14px;text-shadow:0 1px 4px rgba(0,0,0,.7)}
 .shortsPage .shortPerson{display:flex;align-items:center;gap:10px}
 .shortsPage .shortPerson b,.shortsPage .shortPerson small{display:block}
 .shortsPage .chatBtn{margin:4px 0 0;width:auto;padding:8px 14px}
 .shortsPage .shortNote{position:absolute;top:calc(env(safe-area-inset-top,0px) + 64px);left:50%;transform:translateX(-50%);z-index:6;background:rgba(0,0,0,.8);color:#fff;padding:8px 14px;border-radius:14px;font-size:13px;max-width:86%;text-align:center}
 .shortsPage .shortsEmpty{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;gap:10px;padding:24px;text-align:center}
 .cmBack{position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.55);display:flex;align-items:flex-end}
 .cmSheet{width:100%;max-height:72dvh;min-height:46dvh;background:#17161b;color:#fff;border-radius:18px 18px 0 0;display:flex;flex-direction:column;padding-bottom:env(safe-area-inset-bottom,0px)}
 .cmHead{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.1)}
 .cmHead button,.cmItem button{background:none!important;border:0;color:#fff;padding:4px;margin:0;width:auto;height:auto}
 .cmList{flex:1;overflow-y:auto;padding:6px 16px}
 .cmItem{display:flex;gap:8px;justify-content:space-between;align-items:flex-start;padding:8px 0;font-size:14px;line-height:1.35}
 .cmForm{display:flex;gap:8px;padding:10px 12px;border-top:1px solid rgba(255,255,255,.1);align-items:center}
 .cmForm input{flex:1;min-width:0;margin:0}
 .cmForm button{margin:0;width:48px;height:44px;display:grid;place-items:center;padding:0;flex:0 0 auto}
 `
 return <main className="shortsPage"><style>{styles}</style>
  <div className="shortsTop"><button onClick={back} aria-label="Back"><ArrowLeft/></button><h1>Shorts</h1><button onClick={load} aria-label="Refresh Shorts">↻</button></div>
  {note&&<div className="shortNote">{note}</div>}
  {loading?<div className="shortsEmpty"><Play/><p>Loading Shorts…</p></div>:error&&!videos.length?<div className="shortsEmpty"><p>{error}</p><button className="primary" onClick={load}>Try again</button></div>:videos.length?<div className="shortsFeed" ref={feedRef}>{videos.map(v=><article className="shortCard" key={v.id}>
   <ShortVideo key={v.id} v={v} onDouble={()=>{if(!liked.has(v.id))toggleLike(v)}}/>
   <div className="shortShade"/>
   <div className="shortSide">
    <button className={'sideBtn'+(liked.has(v.id)?' on':'')} onClick={()=>toggleLike(v)} aria-label="Love this video"><Heart fill={liked.has(v.id)?'currentColor':'none'}/><small>{likeCounts[v.id]||0}</small></button>
    <button className="sideBtn" onClick={()=>setCommentsFor(v)} aria-label="Comments"><MessageCircle/><small>{commentCounts[v.id]||0}</small></button>
    <button className="sideBtn" onClick={()=>download(v)} aria-label="Download video"><Download/></button>
    {v.user_id===me.id&&<button className="sideBtn del" disabled={deleting===v.id} onClick={()=>removeVideo(v)} aria-label="Delete your video"><X/></button>}
   </div>
   <div className="shortMeta"><div className="shortPerson"><div className="miniAvatar">{v.display_name?.[0]}</div><span><b>{v.user_id===me.id?'You':`${v.display_name}${v.age?`, ${v.age}`:''}`}</b><small>{v.video_type==='bio'?'Bio video':'Short'} · {Math.round(Number(v.duration_seconds))}s</small></span></div><p>{v.caption||`Hi, I'm ${v.display_name}.`}</p>{v.user_id!==me.id&&<button className="primary chatBtn" onClick={async()=>{const m=await openChat({id:v.user_id,display_name:v.display_name,age:v.age,photo:v.photo});if(m)showNote(m)}}><MessageCircle/> Chat privately</button>}</div>
  </article>)}</div>:<div className="shortsEmpty"><Play/><h2>No Shorts yet</h2><p>Be one of the first people to post a video.</p></div>}
  {commentsFor&&<CommentsSheet video={commentsFor} me={me} close={()=>setCommentsFor(null)} bump={d=>setCommentCounts(c=>({...c,[commentsFor.id]:Math.max(0,(c[commentsFor.id]||0)+d)}))}/>}
 </main>
}
function SettingsPage({me,signOut,deleteAccount,isAdmin,openAdmin}){const[feedback,setFeedback]=useState('');const[busy,setBusy]=useState(false);const[ageBusy,setAgeBusy]=useState(false);async function verifyAge(){setAgeBusy(true);try{const r=await supabase.functions.invoke('start-age-verification',{body:{}});if(r.error)throw r.error;if(r.data?.verified){alert('Your age is already verified.');return}if(r.data?.redirect_url){window.open(r.data.redirect_url,'_blank','noopener,noreferrer');return}alert('Age verification has been started.')}catch(e){let msg=e?.message||'Age verification is not available yet.';try{if(e?.context&&typeof e.context.text==='function'){const t=await e.context.text();let d=t;try{const b=JSON.parse(t);d=b.error||b.message||t}catch{}msg=`${e.context.status?'('+e.context.status+') ':''}${d||msg}`}}catch{}alert(msg)}finally{setAgeBusy(false)}}async function sendFeedback(){if(feedback.trim().length<3)return;setBusy(true);const{error}=await supabase.from('safety_feedback').insert({user_id:me.id,category:'safety',details:feedback.trim()});setBusy(false);if(error)alert(error.message);else{setFeedback('');alert('Safety feedback sent. Thank you.')}}return <main className="scroll"><h1>Settings & safety</h1><div className="notice"><Shield/><span><b>Safety first</b><br/>{APP_NAME} prohibits child sexual exploitation, harassment, threats, scams and non-consensual sexual content. Use Report or Block whenever you feel unsafe.</span></div><button onClick={()=>window.open('/community-standards.html','_blank')}><Shield/> Community Standards</button><button onClick={()=>window.open('/child-safety.html','_blank')}><Shield/> Child Safety Standards</button><div className="notice"><Shield/><span><b>Age verification</b><br/>{me.age_verification_status==='verified'?'Your age is verified. After Dark can be used subject to the platform rules.':'After Dark requires stronger age verification than a self-declared date of birth.'}</span><button className="primary" disabled={ageBusy||me.age_verification_status==='verified'} onClick={verifyAge}>{ageBusy?'Starting…':'Verify my age'}</button></div>{isAdmin&&<button onClick={openAdmin}><Shield/> Moderator dashboard</button>}<div className="photoBox"><b>Safety feedback</b><textarea value={feedback} onChange={e=>setFeedback(e.target.value)} maxLength={4000} placeholder="Tell us about a safety concern…"/><button className="primary" disabled={busy||feedback.trim().length<3} onClick={sendFeedback}>{busy?'Sending…':'Send feedback'}</button></div><button className="danger" onClick={deleteAccount}><Trash2/> Delete account</button><button onClick={signOut}><LogIn/> Sign out</button></main>}
function AdminPage({back}){const[data,setData]=useState(null),[busy,setBusy]=useState(true);async function load(){setBusy(true);const r=await supabase.functions.invoke('admin-console',{body:{action:'dashboard'}});if(r.error){alert(friendly(r.error));back();return}setData(r.data);setBusy(false)}useEffect(()=>{load()},[]);async function act(body){const r=await supabase.functions.invoke('admin-console',{body});if(r.error)alert(friendly(r.error));else await load()}if(busy)return <main className="scroll"><button className="back" onClick={back}><ArrowLeft/> Settings</button><h1>Moderator dashboard</h1><p>Loading safety queues…</p></main>;return <main className="scroll"><button className="back" onClick={back}><ArrowLeft/> Settings</button><h1>Moderator dashboard</h1><div className="notice"><Shield/><span><b>Restricted safety area</b><br/>Only authorised moderators can access this screen. Every review action is audit logged.</span></div><h2>Age verification</h2>{data.age_requests?.length?data.age_requests.map(x=><div className="photoBox" key={x.id}><b>{x.method}</b><small>User: {x.user_id}</small><div className="safetyRow"><button onClick={()=>act({action:'age_review',request_id:x.id,status:'verified'})}>Verify</button><button onClick={()=>act({action:'age_review',request_id:x.id,status:'rejected'})}>Reject</button></div></div>):<p className="muted">No pending age-verification requests.</p>}<h2>Reports</h2>{data.reports?.length?data.reports.map(x=><div className="photoBox" key={x.id}><b>{x.reason}</b><p>{x.details}</p><small>{x.reported_id}</small><div className="safetyRow"><button onClick={()=>act({action:'report_review',report_id:x.id,status:'reviewing'})}>Reviewing</button><button onClick={()=>act({action:'report_review',report_id:x.id,status:'resolved'})}>Resolve</button><button onClick={()=>act({action:'report_review',report_id:x.id,status:'dismissed'})}>Dismiss</button></div></div>):<p className="muted">No open reports.</p>}<h2>Moderation queue</h2>{data.queue?.length?data.queue.map(x=><div className="photoBox" key={x.id}><b>{x.content_type} · {x.risk_level}</b><p>{x.reason||'No reason supplied.'}</p><small>{x.user_id||x.content_id}</small><div className="safetyRow"><button onClick={()=>act({action:'moderate',queue_id:x.id,status:'approved'})}>Approve</button><button onClick={()=>act({action:'moderate',queue_id:x.id,status:'rejected'})}>Reject</button><button onClick={()=>act({action:'moderate',queue_id:x.id,status:'escalated'})}>Escalate</button></div></div>):<p className="muted">Moderation queue is clear.</p>}<h2>Child safety incidents</h2>{data.child_safety?.length?data.child_safety.map(x=><div className="photoBox" key={x.id}><b>{x.status}</b><p>{x.details}</p></div>):<p className="muted">No open child-safety incidents.</p>}</main>}
createRoot(document.getElementById('root')).render(<App/>)
