import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Heart, Users, UsersRound, Flame, MessageCircle, UserRound, Settings, ArrowLeft, Shield, Send, X, Trash2, Sparkles, LogIn, Flag, Lock, Play, Video, Image as ImageIcon, Smile, Link as LinkIcon, FileVideo, RefreshCw, Phone, PhoneOff, Mic, MicOff, Camera, CameraOff, Timer, Zap, CalendarDays, MapPin, CheckCircle2, HeartHandshake } from 'lucide-react'
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
 const[session,setSession]=useState(null),[profile,setProfile]=useState(null),[isNewUser,setIsNewUser]=useState(false),[gate,setGate]=useState(localStorage.getItem('love_that_gate')==='1'),[authMode,setAuthMode]=useState('signup'),[loading,setLoading]=useState(true),[page,setPage]=useState('home'),[platform,setPlatform]=useState('singles'),[discover,setDiscover]=useState([]),[matches,setMatches]=useState([]),[chat,setChat]=useState(null),[error,setError]=useState(''),[isAdmin,setIsAdmin]=useState(false),[call,setCall]=useState(null),[incoming,setIncoming]=useState(null)

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
  const{data:{subscription}}=supabase.auth.onAuthStateChange(async (event,s)=>{
   if(!alive)return
   setSession(s)
   if(!s){setProfile(null);setMatches([]);return}
   // Detect NEW account vs EXISTING: only new = full onboarding
   // 'SIGNED_IN' after 'SIGNED_UP' = new account flow
   if(event === 'SIGNED_IN') {
     const wasJustCreated = localStorage.getItem('love_that_new_account') === 'just_created'
     setIsNewUser(wasJustCreated)
     if(!wasJustCreated) {
       // Existing user: mark as onboarded so they skip
       localStorage.setItem('love_that_onboarded', 'true')
     }
   }
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
      if(age>=18&&age<=120){
        const payload={id:uid,display_name:meta.display_name||user.email?.split('@')[0]||'Member',age,identity:meta.identity||'prefer_not_to_say',location:meta.location||'',headline:meta.headline||'',bio:meta.bio||'',goal:meta.goal||null,seeking:Array.isArray(meta.seeking)?meta.seeking:[],platform:meta.platform||'singles',date_of_birth:dob,body_type:meta.body_type||null,religion:meta.religion||null,height_cm:meta.height_cm?Number(meta.height_cm):null,interested_body_types:Array.isArray(meta.interested_body_types)?meta.interested_body_types:[],attractive_traits:Array.isArray(meta.attractive_traits)?meta.attractive_traits:[]}
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

 async function loadDiscover(nextPlatform=platform){setError('');const{data,error}=await supabase.from('profiles').select('*').eq('is_active',true).neq('id',session.user.id).eq('platform',nextPlatform).limit(30);if(error){setError(error.message);return}const enriched=[];for(const p of data||[]){try{const r=await supabase.functions.invoke('profile-photo-url',{body:{user_id:p.id}});enriched.push({...p,photo:r.data?.photos?.[0]?.url||null})}catch{enriched.push({...p,photo:null})}}setDiscover(enriched)}
 async function openDiscover(p){setPlatform(p);setPage('discover');if(session)await loadDiscover(p)}
 async function loadMatches(){if(!session)return;const{data,error}=await supabase.from('matches').select('*').or(`user_a.eq.${session.user.id},user_b.eq.${session.user.id}`).order('created_at',{ascending:false});if(error){setError(error.message);return}const ids=(data||[]).map(m=>m.user_a===session.user.id?m.user_b:m.user_a);if(!ids.length){setMatches([]);return}const{data:ps}=await supabase.from('profiles').select('*').in('id',ids);const out=[];for(const p of ps||[]){const r=await supabase.functions.invoke('profile-photo-url',{body:{user_id:p.id}});out.push({...p,photo:r.data?.photos?.[0]?.url||null})}setMatches(out)}
 async function openPrivateChat(person){const r=await supabase.functions.invoke('start-conversation',{body:{other_user_id:person.id}});if(r.error){setError(r.error.message);return}setChat({...person,conversation:r.data.conversation});setPage('chat')}
 async function startCall(person,conversation,mode='video',speedPair=null){setCall({person,conversation,mode,speedPair});}
 async function signOut(){
  localStorage.removeItem('love_that_new_account')
  // Keep 'onboarded' so returning users skip
  await supabase.auth.signOut()
  setPage('home')
 }

 if(loading)return <div className="gate"><h1>Loading {APP_NAME}…</h1></div>
 if(!gate)return <Gate go={()=>{localStorage.setItem('love_that_gate','1');setGate(true)}}/>
 if(!session||!profile)return <Auth mode={authMode} setMode={setAuthMode} error={error} setError={setError} onReady={async s=>{
  if(!s){setSession(null);setProfile(null);return}
  setSession(s);setLoading(true);await loadProfile(s.user.id);setLoading(false);setPage('home')
 }}/>

 // --- NEW LOGIC ---
 // Only show onboarding if: brand new account AND not yet completed it
 const hasCompletedOnboarding = localStorage.getItem('love_that_onboarded') === 'true'
 const needsOnboarding = isNewUser && !hasCompletedOnboarding && !profile.gender

 // Mark onboarded when finished
 const finishOnboarding = () => {
   localStorage.setItem('love_that_onboarded', 'true')
   localStorage.removeItem('love_that_new_account')
   setPage('home')
 }

 if(needsOnboarding) {
   return <Onboarding me={profile} setProfile={setProfile} setPage={finishOnboarding}/>
 }

 // Existing user OR onboarded: go straight to Home
 return <div className="app"><header><b><img src="/icon.png" alt=""/> {APP_NAME}</b><button onClick={()=>setPage('settings')}><Settings/></button></header>
  {error&&<div className="error">{error}</div>}
  {page==='home'&&<Home me={profile} choose={openDiscover} openShorts={()=>setPage('shorts')} openRoom={()=>setPage('room')} openSpeed={()=>setPage('speed')} openDateNight={()=>setPage('dateNight')}/>} 
  {page==='room'&&<ChatRoom me={profile} back={()=>setPage('home')}/>} 
  {page==='discover'&&<Discover profile={profile} platform={platform} people={discover} like={async p=>{const r=await supabase.functions.invoke('like-user',{body:{to_user_id:p.id}});if(r.error){setError(r.error.message);return}if(r.data?.match){await loadMatches()}setDiscover(v=>v.filter(x=>x.id!==p.id))}} back={()=>setPage('home')}/>} 
  {page==='shorts'&&<Shorts me={profile} openChat={openPrivateChat} back={()=>setPage('home')}/>} 
  {page==='matches'&&<Matches people={matches} open={openPrivateChat}/>} 
  {page==='chat'&&<Chat me={profile} p={chat} startCall={(mode)=>startCall(chat,chat.conversation,mode)} back={()=>{setPage('matches');loadMatches()}}/>}
  {incoming&&<IncomingCall me={profile} incoming={incoming} accept={()=>{setCall({person:incoming.person,conversation:incoming.conversation,mode:incoming.call.mode||'video',incoming:incoming.call});setIncoming(null)}} decline={async()=>{await supabase.from('private_call_sessions').update({status:'declined',ended_at:new Date().toISOString()}).eq('id',incoming.call.id);setIncoming(null)}}/>}
  {call&&<CallOverlay me={profile} call={call} close={()=>setCall(null)}/>}
  {page==='speed'&&<SpeedDating me={profile} startCall={(person,pair)=>startCall(person,pair,'video')} back={()=>setPage('home')}/>}
  {page==='dateNight'&&<DateNight me={profile} openChat={openPrivateChat} startCall={(person,conversation)=>startCall(person,conversation,'video')} back={()=>setPage('home')}/>} 
  {page==='profile'&&<Profile me={profile} refresh={loadProfile} signOut={signOut}/>} 
  {page==='admin'&&isAdmin?<AdminPage back={()=>setPage('settings')}/>:null}
  {page==='settings'&&<SettingsPage me={profile} isAdmin={isAdmin} openAdmin={()=>setPage('admin')} signOut={signOut} deleteAccount={async()=>{if(!confirm(`Delete your ${APP_NAME} account and associated data? This cannot be undone.`))return;const r=await supabase.functions.invoke('delete-account',{body:{}});if(r.error){setError(r.error.message);return}await supabase.auth.signOut();localStorage.clear();location.reload()}}/>}
  <nav><button onClick={()=>setPage('home')}><Sparkles/>Discover</button><button onClick={()=>setPage('shorts')}><Play/>Shorts</button><button onClick={()=>{setPage('matches');loadMatches()}}><MessageCircle/>Matches</button><button onClick={()=>setPage('profile')}><UserRound/>Profile</button></nav>
 </div>
}

function Gate({go}){return <div className="gate"><div className="heart"><img src="/icon.png" alt="love that logo"/></div><h1>Welcome to {APP_NAME}</h1><p>Meet people, make friends, share moments and find genuine connections.</p><div className="notice"><Shield/> <span><b>18+ only</b><br/>{APP_NAME} is for adults aged 18 and over. Your date of birth is checked again when you create an account.</span></div><button className="primary" onClick={go}>Continue — I am 18 or older</button><small>By continuing, you agree to our Terms, Privacy Policy and Community Standards.</small></div>}

function Auth({mode,setMode,error,setError,onReady}){
 const[email,setEmail]=useState(''),[password,setPassword]=useState(''),[p,setP]=useState({name:'',dob:'',identity:'',location:'',goal:'',seeking:['Everyone'],headline:'',bio:'',platform:'singles',body_type:'',religion:'',height_cm:'',interested_body_types:[],attractive_traits:[]}),[busy,setBusy]=useState(false)
 function ageFromDob(d){if(!d)return 0;const dob=new Date(d+'T00:00:00');const now=new Date();let age=now.getFullYear()-dob.getFullYear();const m=now.getMonth()-dob.getMonth();if(m<0||(m===0&&now.getDate()<dob.getDate()))age--;return age}
 async function submit(e){e.preventDefault();setBusy(true);setError('');try{
  if(mode==='login'){
    const{data,error}=await supabase.auth.signInWithPassword({email,password})
    if(error)throw error
    if(!data.session)throw new Error('Sign in completed but no active session was returned. Please try again.')
    // Existing login: NOT a new account
    localStorage.removeItem('love_that_new_account')
    onReady(data.session)
    return
  }
  const dob=normalizeDateForDatabase(p.dob)
  const age=ageFromDob(dob)
  if(!dob||!p.name||age<18||age>120||!p.identity||!p.goal||!(p.seeking||[]).length)throw new Error('Please complete your name, date of birth, identity, what you are looking for and your main goal.')
  // Mark as NEW account so onboarding triggers
  localStorage.setItem('love_that_new_account', 'just_created')
  localStorage.removeItem('love_that_onboarded')
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
 </>} {error&&<div className="error">{error}</div>}<button className="primary" disabled={busy}>{busy?'Please wait…':mode==='login'?'Sign in':'Create account'}</button></form><button className="linkBtn" onClick={()=>{setError('');setMode(mode==='login'?'signup':'login')}}>{mode==='login'?'Create a new account':'Already have an account? Sign in'}</button></main></div>}

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
   if(step<8)setStep(step+1);else setPage()
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
  const allIds=[...new Set([...sent,...mutualIds])];const profileMap={};if(allIds.length){const{data:ps}=await supabase.from('profiles').select('*').in('id',allIds);for(const p of ps||[]){try{const u=await supabase.functions.invoke('profile-photo-url',{body:{user_id:p.id}});profileMap[p.id]={...p,photo:u.data?.photos?.[0]?.url||null}}catch{profileMap[p.id]={...p,photo:null}}}}
  setMutuals(mutualIds.map(id=>profileMap[id]).filter(Boolean));
  const skipped=new Set(sent);const out=[];for(const p of r.data||[]){if(skipped.has(p.id)||mutualIds.includes(p.id))continue;out.push(profileMap[p.id]||p)}setPeople(out);
  const dr=await supabase.from('date_night_dates').select('*').or(`user_a.eq.${me.id},user_b.eq.${me.id}`).order('scheduled_at',{ascending:true});if(!dr.error){const future=(dr.data||[]).filter(x=>x.status!=='cancelled'&&new Date(x.scheduled_at)>=new Date());setDates(future)}
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
 {stage==='browse'&&<>{!enabled?<div className="dateNightIntro"><HeartHandshake/><h2>Make tonight a Date Night</h2><p>Turn Date Night on to meet people in your area who also want a video date.</p><button className="primary" onClick={optIn}>Turn on Date Night</button></div>:<><div className="dateNightNotice"><MapPin/><span><b>Local matches</b><br/>Showing people who have chosen the same location on their profile.</span></div>{mutuals.length>0&&<div className="mutualDateMatches"><h2>❤️ Your Date Night matches</h2>{mutuals.map(p=><button className="mutualMatch" key={p.id} onClick={()=>chooseMutual(p)}>{p.photo?<img src={p.photo}/>:<div className="miniAvatar">{p.display_name?.[0]}</div>}<span><b>{p.display_name}, {p.age}</b><small>Choose your Date Night availability</small></span><CalendarDays/></button>)}</div>}{people[idx]?<div className="dateCard">{people[idx].photo?<div className="datePhoto" style={{backgroundImage:`url(${people[idx].photo})`}}><div><h2>{people[idx].display_name}, {people[idx].age}</h2><span>{people[idx].location}</span></div></div>:<div className="datePhoto placeholder"><UserRound/></div>}<section><h3>{people[idx].headline||'Nice to meet you.'}</h3><p>{people[idx].bio}</p></section><div className="swipes"><button disabled={busy} onClick={()=>swipe(people[idx],false)}><X/></button><button className="yes" disabled={busy} onClick={()=>swipe(people[idx],true)}><Heart fill="currentColor"/></button></div></div>:<div className="empty"><Heart/><h2>No more local profiles</h2><p>New Date Night members will appear here.</p><button className="primary" onClick={load}>Refresh</button></div>}</>}
 {dates.length>0&&<div className="upcomingDates"><h2>Upcoming Dates</h2>{dates.map(d=>{const pid=d.user_a===me.id?d.user_b:d.user_a;const p=mutuals.find(x=>x.id===pid);return <div className="upcomingDate" key={d.id}><CalendarDays/><span><b>{p?.display_name?'Date with '+p.display_name:'Date Night'}</b><small>{new Date(d.scheduled_at).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})} · 8:00 PM UK time</small></span>{d.status==='confirmed'&&<button className="joinDateBtn" onClick={()=>joinVideoDate(d)}>Join video date</button>}</div>})}</div>}</>}
 {stage==='calendar'&&partner&&<div className="calendarPanel"><button className="back" onClick={()=>setStage('browse')}><ArrowLeft/> Date Night</button><div className="partnerMini">{partner.photo?<img src={partner.photo}/>:<div className="miniAvatar">{partner.display_name?.[0]}</div>}<span><b>{partner.display_name}, {partner.age}</b><small>{partner.location}</small></span></div><h2>When are you available?</h2><p className="muted">Select the dates you can do. Your date is always at <b>8:00 PM UK time</b>.</p><div className="calendarGrid">{days.map(d=>{const k=key(d),sel=selected.includes(k),com=common.includes(k);return <button key={k} className={`${sel?'calendarSel ':''}${com?'calendarCommon':''}`} onClick={()=>{setSelected(v=>sel?v.filter(x=>x!==k):[...v,k])}}><b>{d.getDate()}</b><small>{label(d)}</small>{com&&<CheckCircle2/>}</button>})}</div><button className="primary" disabled={busy||!selected.length} onClick={saveAvailability}>{busy?'Saving…':'Save my availability'}</button>{common.length>0&&<div className="commonDates"><h3>❤️ You both are available</h3><p>Choose one of these dates to propose for your video date.</p>{common.map(d=><button className="commonDateBtn" key={d} onClick={()=>confirmDate(d)}><CalendarDays/><span><b>{new Date(`${d}T12:00:00`).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}</b><small>8:00 PM UK time</small></span><CheckCircle2/></button>)}</div>}<p className="statusText">{msg}</p></div>}
 </div></main>
}

function Discover({platform,people,like,back}){const x=P[platform],p=people[0];async function safety(action){if(!p)return;if(action==='report'){const reason=prompt('Why are you reporting this person?');if(!reason)return;const r=await supabase.functions.invoke('report-user',{body:{reported_id:p.id,reason,block:true}});if(r.error)alert(r.error.message);else{alert('Thank you. Your report has been submitted.');back()}}else{const r=await supabase.from('blocks').insert({blocker_id:(await supabase.auth.getUser()).data.user.id,blocked_id:p.id});if(r.error)alert(r.error.message);else{alert('Profile blocked.');back()}}}return <main className="scroll"><button className="back" onClick={back}><ArrowLeft/> {x[0]}</button>{p?<div className="card">{p.photo?<div className="photo" style={{backgroundImage:`url(${p.photo})`}}><div><h2>{p.display_name}, {p.age}</h2><span>{p.location}</span></div></div>:<div className="photo placeholder"><UserRound/></div>}<section><h3>{p.headline||'Nice to meet you.'}</h3><p className="muted">{p.bio}</p><p className="muted">Looking for {Object.keys(goalDb).find(k=>goalDb[k]===p.goal)||'connections'}.</p></section><div className="safetyRow"><button onClick={()=>safety('report')}><Flag/> Report</button><button onClick={()=>safety('block')}><Lock/> Block</button></div><div className
