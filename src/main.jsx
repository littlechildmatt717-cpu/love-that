import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { 
  Heart, Users, UsersRound, Flame, MessageCircle, UserRound, 
  Settings as SettingsIcon, ChevronRight, ChevronLeft, CalendarDays,
  Search, MapPin, Star, Shield, Bell, LogOut
} from 'lucide-react'
import { supabase } from './lib/supabase'
import './styles.css'

const APP_NAME = 'love that'

function calculateAge(dobString) {
  if (!dobString) return null
  const dob = new Date(dobString)
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
  return age
}

function App() {
  const [page, setPage] = useState('splash')
  const [me, setMe] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setMe(session.user)
          try {
            const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
            setProfile(data)
            if (!data?.gender) setPage('onboarding')
            else setPage('home')
          } catch { setPage('onboarding') }
        } else { setPage('splash') }
      } catch { setPage('splash') }
      finally { if (!cancelled) setLoading(false) }
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      if (cancelled) return
      setLoading(true)
      if (session?.user) {
        setMe(session.user)
        try {
          const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
          setProfile(data)
          if (!data?.gender) setPage('onboarding')
          else setPage('home')
        } catch { setPage('onboarding') }
      } else { setMe(null); setProfile(null); setPage('splash') }
      setLoading(false)
    })
    init()
    return () => { cancelled = true; subscription?.unsubscribe() }
  }, [])

  if (loading) return <div style={centerStyle}><p>Loading…</p></div>
  if (!me) return <Splash setPage={setPage} />
  if (page === 'onboarding' || !profile?.gender) return <Onboarding me={me} setProfile={setProfile} setPage={setPage} />
  
  return (
    <div style={{minHeight:'100vh', background:'#000', color:'#fff', paddingBottom:80}}>
      <header style={{
        display:'flex', justifyContent:'space-between', alignItems:'center',
        padding:'16px 20px', borderBottom:'1px solid #222'
      }}>
        <h1 style={{fontSize:22, margin:0, color:'#E8654F'}}>{APP_NAME}</h1>
        <button 
          onClick={() => supabase.auth.signOut().then(() => setPage('splash'))}
          style={{display:'flex', alignItems:'center', gap:6, background:'none', border:'none', color:'#888'}}
        >
          <LogOut size={16} /> Sign Out
        </button>
      </header>

      <main style={{padding:20}}>
        {page === 'home' && <Home profile={profile} setPage={setPage} />}
        {page === 'discover' && <Discover />}
        {page === 'matches' && <Matches />}
        {page === 'messages' && <Messages />}
        {page === 'profile' && <MyProfile profile={profile} setProfile={setProfile} />}
      </main>

      <nav style={{
        position:'fixed', bottom:0, left:0, right:0,
        background:'#111', borderTop:'1px solid #222',
        display:'flex', justifyContent:'space-around', padding:'10px 0'
      }}>
        {[
          {id:'home', icon:<Heart size={22} />, label:'Home'},
          {id:'discover', icon:<Search size={22} />, label:'Discover'},
          {id:'matches', icon:<Flame size={22} />, label:'Matches'},
          {id:'messages', icon:<MessageCircle size={22} />, label:'Chat'},
          {id:'profile', icon:<UserRound size={22} />, label:'Profile'},
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setPage(tab.id)}
            style={{
              display:'flex', flexDirection:'column', alignItems:'center', gap:2,
              background:'none', border:'none',
              color: page === tab.id ? '#E8654F' : '#777'
            }}
          >
            {tab.icon}
            <span style={{fontSize:10}}>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

// === HOME SCREEN ===
function Home({ profile, setPage }) {
  const displayName = profile?.display_name || 'Friend'
  const age = calculateAge(profile?.date_of_birth)

  return (
    <div>
      <div style={{textAlign:'center', margin:'20px 0 40px'}}>
        <h2 style={{fontSize:28, marginBottom:8}}>Welcome, {displayName}! 👋</h2>
        <p style={{color:'#888'}}>You're all set up and ready to go ✨</p>
        {age && <p style={{color:'#E8654F', marginTop:5}}>Age: {age} • {profile?.gender || ''}</p>}
      </div>

      <h3 style={{color:'#888', marginBottom:15}}>Quick Actions</h3>
      <div style={{display:'flex', flexDirection:'column', gap:12}}>
        {[
          {title:'Find People', desc:'Discover matches near you', icon:<Search size={20} />, page:'discover'},
          {title:'Your Matches', desc:'See who likes you back', icon:<Flame size={20} />, page:'matches'},
          {title:'Messages', desc:'Start chatting', icon:<MessageCircle size={20} />, page:'messages'},
          {title:'Edit Profile', desc:'Update your details', icon:<UserRound size={20} />, page:'profile'},
        ].map(item => (
          <button
            key={item.page}
            onClick={() => setPage(item.page)}
            style={{
              display:'flex', alignItems:'center', gap:15,
              padding:18, background:'#1a1a1a', borderRadius:12, border:'none', color:'#fff',
              justifyContent:'space-between'
            }}
          >
            <div style={{display:'flex', alignItems:'center', gap:15}}>
              <span style={{color:'#E8654F'}}>{item.icon}</span>
              <div style={{textAlign:'left'}}>
                <div style={{fontWeight:'bold'}}>{item.title}</div>
                <div style={{fontSize:12, color:'#777'}}>{item.desc}</div>
              </div>
            </div>
            <ChevronRight size={18} color="#666" />
          </button>
        ))}
      </div>
    </div>
  )
}

function Discover() {
  return (
    <div style={{textAlign:'center', paddingTop:40}}>
      <Search size={50} color="#E8654F" style={{margin:'0 auto 20px'}} />
      <h2>Discover People</h2>
      <p style={{color:'#888'}}>Search & filter coming soon…</p>
    </div>
  )
}

function Matches() {
  return (
    <div style={{textAlign:'center', paddingTop:40}}>
      <Flame size={50} color="#E8654F" style={{margin:'0 auto 20px'}} />
      <h2>Your Matches</h2>
      <p style={{color:'#888'}}>No matches yet — keep exploring! 💛</p>
    </div>
  )
}

function Messages() {
  return (
    <div style={{textAlign:'center', paddingTop:40}}>
      <MessageCircle size={50} color="#E8654F" style={{margin:'0 auto 20px'}} />
      <h2>Messages</h2>
      <p style={{color:'#888'}}>Start matching to chat ✨</p>
    </div>
  )
}

function MyProfile({ profile }) {
  const age = calculateAge(profile?.date_of_birth)
  return (
    <div>
      <h2 style={{textAlign:'center', marginBottom:30}}>Your Profile</h2>
      
      <div style={{
        background:'#1a1a1a', borderRadius:16, padding:25, textAlign:'center', marginBottom:25
      }}>
        <div style={{
          width:80, height:80, borderRadius:'50%', background:'linear-gradient(135deg, #E8654F, #E3AC6C)',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, margin:'0 auto 15px'
        }}>
          {(profile?.display_name || 'F')[0].toUpperCase()}
        </div>
        <h3 style={{fontSize:22, margin:0}}>{profile?.display_name || 'Friend'}</h3>
        {age && <p style={{color:'#E8654F', margin:'5px 0'}}>{age} years old</p>}
        <p style={{color:'#888'}}>{profile?.gender || ''} • {profile?.sexuality || ''}</p>
      </div>

      <div style={{display:'flex', flexDirection:'column', gap:10}}>
        {[
          {label:'Status', value:profile?.marital_status || 'Not set'},
          {label:'Height', value:profile?.height || 'Not set'},
        ].map(i => (
          <div key={i.label} style={{
            display:'flex', justifyContent:'space-between', padding:'14px 16px',
            background:'#1a1a1a', borderRadius:10
          }}>
            <span style={{color:'#888'}}>{i.label}</span>
            <span>{i.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// === SPLASH SCREEN — YOUR LOGO HERE ===
function Splash({ setPage }) {
  const [mode, setMode] = useState('welcome')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')
  const [working, setWorking] = useState(false)

  async function signUp() {
    setErr('')
    if (!name.trim()) return setErr('Please enter your name')
    if (!email.trim()) return setErr('Please enter your email')
    if (pass.length < 6) return setErr('Password needs at least 6 characters')
    setWorking(true)
    try {
      const { data, error } = await supabase.auth.signUp({ email, password: pass })
      if (error) throw error
      if (!data?.user) { setErr('Check your email to confirm'); return }
      await supabase.from('profiles').upsert({ 
        id: data.user.id, 
        display_name: name.trim()
      })
      setPage('onboarding')
    } catch (e) { setErr(e.message || 'Something went wrong') }
    finally { setWorking(false) }
  }

  async function signIn() {
    setErr(''); setWorking(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pass })
      if (error) throw error
    } catch (e) { setErr(e.message || 'Login failed') }
    finally { setWorking(false) }
  }

  return (
    <div style={{...centerStyle, background:'#D62890'}}>
      {/* 🔥 YOUR CUSTOM LOGO 🔥 */}
      <img 
        src="/logo-love-that.png" 
        alt="love that"
        style={{
          width: 220,
          height: 220,
          borderRadius: 24,
          marginBottom: 10,
          objectFit: 'contain'
        }}
      />
      <h1 style={{fontSize:42, margin:0, color:'#fff', textShadow:'0 2px 4px rgba(0,0,0,0.2)'}}>{APP_NAME}</h1>
      <p style={{color:'#fff', opacity:0.8, margin:'10px 0 40px'}}>Connect with people near you</p>
      
      {mode === 'welcome' && <>
        <button onClick={() => setMode('login')} style={primaryBtn}>Log in</button>
        <button onClick={() => setMode('signup')} style={secondaryBtn}>Create account</button>
      </>}
      {mode === 'signup' && <>
        <h2 style={{color:'#fff'}}>Join {APP_NAME}</h2>
        {err && <p style={{color:'#ffb3b3'}}>{err}</p>}
        <input placeholder="Your name" value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
        <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} type="email" style={inputStyle} />
        <input placeholder="Password" value={pass} onChange={e => setPass(e.target.value)} type="password" style={inputStyle} />
        <button onClick={signUp} disabled={working} style={primaryBtn}>
          {working ? 'Creating…' : 'Create account'}
        </button>
        <button onClick={() => setMode('welcome')} style={linkBtn}>← Back</button>
      </>}
      {mode === 'login' && <>
        <h2 style={{color:'#fff'}}>Welcome back</h2>
        {err && <p style={{color:'#ffb3b3'}}>{err}</p>}
        <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} type="email" style={inputStyle} />
        <input placeholder="Password" value={pass} onChange={e => setPass(e.target.value)} type="password" style={inputStyle} />
        <button onClick={signIn} disabled={working} style={primaryBtn}>
          {working ? 'Signing in…' : 'Sign in'}
        </button>
        <button onClick={() => setMode('welcome')} style={linkBtn}>← Back</button>
      </>}
    </div>
  )
}

// === ONBOARDING ===
function Onboarding({ me, setProfile, setPage }) {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [profileData, setProfileData] = useState({
    display_name: '', gender: '', marital_status: '', sexuality: '',
    date_of_birth: '', height_ft: '', height_in: '',
    looking_for_gender: [], seeking: []
  })

  const update = (field, value) => setProfileData(p => ({...p, [field]: value}))
  const toggleMulti = (field, value) => setProfileData(p => ({
    ...p, [field]: p[field].includes(value) ? p[field].filter(x=>x!==value) : [...p[field], value]
  }))

  async function saveAndContinue() {
    setSaving(true)
    try {
      const age = calculateAge(profileData.date_of_birth)
      const { error } = await supabase.from('profiles').upsert({
        id: me.id,
        display_name: profileData.display_name || 'Friend',
        ...profileData,
        date_of_birth: profileData.date_of_birth || null,
        age: age,
        height: profileData.height_ft && profileData.height_in 
          ? `${profileData.height_ft}' ${profileData.height_in}"` : null
      })
      if (error) throw error
      setProfile(p => ({...p, ...profileData, age}))
      if (step < 3) setStep(step + 1)
      else setPage('home')
    } catch (err) { alert(`Could not save: ${err.message}`) }
    finally { setSaving(false) }
  }

  const OptionBtn = ({selected, onClick, children}) => (
    <button onClick={onClick} style={{
      padding:'12px 16px', margin:4, borderRadius:10, border:'none',
      background: selected ? '#E8654F' : '#2a2a2a', color:'#fff', fontSize:15
    }}>{children}</button>
  )

  const MultiBtn = ({selected, onClick, children}) => (
    <button onClick={onClick} style={{
      padding:'10px 14px', margin:4, borderRadius:20, border:'none',
      background: selected ? '#E8654F' : '#2a2a2a', color:'#fff', fontSize:14
    }}>{selected && '✓ '}{children}</button>
  )

  return (
    <div style={{padding:20, minHeight:'100vh', background:'#000', color:'#fff'}}>
      <div style={{height:4, background:'#333', borderRadius:2, marginBottom:20}}>
        <div style={{width:`${(step/3)*100}%`, height:'100%', background:'#E8654F'}} />
      </div>
      <p style={{textAlign:'center', color:'#888'}}>Step {step} of 3</p>

      {step === 1 && <>
        <h2>About You</h2>
        <h3 style={{color:'#ccc'}}>I am a…</h3>
        <div style={{display:'flex', flexWrap:'wrap'}}>
          {['Man','Woman','Couple','Non-binary','Trans man','Trans woman'].map(g =>
            <OptionBtn key={g} selected={profileData.gender===g} onClick={()=>update('gender',g)}>{g}</OptionBtn>
          )}
        </div>
        <h3 style={{color:'#ccc', marginTop:20}}>Marital status</h3>
        <div style={{display:'flex', flexWrap:'wrap'}}>
          {['Single','In a relationship','Divorced','Widowed','Separated'].map(s =>
            <OptionBtn key={s} selected={profileData.marital_status===s} onClick={()=>update('marital_status',s)}>{s}</OptionBtn>
          )}
        </div>
        <h3 style={{color:'#ccc', marginTop:20}}>Sexuality</h3>
        <div style={{display:'flex', flexWrap:'wrap'}}>
          {['Gay','Straight','Bisexual','Undecided'].map(s =>
            <OptionBtn key={s} selected={profileData.sexuality===s} onClick={()=>update('sexuality',s)}>{s}</OptionBtn>
          )}
        </div>
      </>}

      {step === 2 && <>
        <h2>Your Details</h2>
        <h3 style={{color:'#ccc'}}><CalendarDays size={20} style={{display:'inline', marginRight:8}} />Date of Birth</h3>
        <input 
          type="date" 
          value={profileData.date_of_birth} 
          onChange={e => update('date_of_birth', e.target.value)}
          style={{
            width: '100%', padding: 18, marginBottom: 12,
            background: '#1a1a1a', border: '2px solid #333',
            borderRadius: 12, color: '#fff', fontSize: 18
          }}
        />
        {profileData.date_of_birth && (
          <p style={{color:'#4ade4a', fontWeight:'bold'}}>
            ✅ You are {calculateAge(profileData.date_of_birth)} years old
          </p>
        )}
        <h3 style={{color:'#ccc', marginTop:30}}>Height</h3>
        <div style={{display:'flex', gap:12}}>
          <select value={profileData.height_ft} onChange={e=>update('height_ft',e.target.value)} style={selectStyle}>
            <option value="">Feet</option>
            {[4,5,6,7].map(n=><option key={n} value={n}>{n} ft</option>)}
          </select>
          <select value={profileData.height_in} onChange={e=>update('height_in',e.target.value)} style={selectStyle}>
            <option value="">Inches</option>
            {Array.from({length:12}, (_,i)=>i).map(n=><option key={n} value={n}>{n} in</option>)}
          </select>
        </div>
      </>}

      {step === 3 && <>
        <h2>What Are You Looking For?</h2>
        <h3 style={{color:'#ccc'}}>Who are you interested in?</h3>
        <div style={{display:'flex', flexWrap:'wrap'}}>
          {['Man','Woman','Non-binary','Just friends'].map(g =>
            <MultiBtn key={g} selected={profileData.looking_for_gender.includes(g)} onClick={()=>toggleMulti('looking_for_gender',g)}>{g}</MultiBtn>
          )}
        </div>
        <h3 style={{color:'#ccc', marginTop:20}}>What kind of relationship?</h3>
        <div style={{display:'flex', flexWrap:'wrap'}}>
          {['Relationship','Marriage','Casual','Dating','Friends'].map(s =>
            <MultiBtn key={s} selected={profileData.seeking.includes(s)} onClick={()=>toggleMulti('seeking',s)}>{s}</MultiBtn>
          )}
        </div>
      </>}

      <div style={{display:'flex', justifyContent:'space-between', marginTop:40}}>
        {step>1 ? (
          <button onClick={()=>setStep(step-1)} style={backBtn}>
            <ChevronLeft size={18} /> Back
          </button>
        ) : <div />}
        <button 
          onClick={saveAndContinue}
          disabled={saving}
          style={{
            padding:'14px 28px', background:'#E8654F', color:'#fff',
            border:'none', borderRadius:10, fontSize:16, fontWeight:'bold'
          }}
        >
          {saving ? 'Saving…' : step===3 ? '🎉 Finish' : 'Continue'}
        </button>
      </div>
    </div>
  )
}

// === STYLES ===
const centerStyle = {
  minHeight: '100vh', display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center', color: '#fff', padding: 20
}

const inputStyle = {
  width: 280, padding: 16, marginBottom: 12,
  background: 'rgba(0,0,0,0.25)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 16
}

const primaryBtn = {
  width: 280, padding: 16, background: '#fff', color: '#D62890',
  border: 'none', borderRadius: 12, fontSize: 18, fontWeight:'bold', marginTop: 10
}

const secondaryBtn = {
  width: 280, padding: 16, background: 'rgba(255,255,255,0.2)', color: '#fff',
  border: 'none', borderRadius: 12, fontSize: 18, marginTop: 12
}

const linkBtn = { color: '#fff', background: 'none', border: 'none', marginTop: 20, fontSize: 16, textDecoration:'underline' }
const backBtn = { color: '#fff', background: 'none', border: 'none', display: 'flex', alignItems: 'center', fontSize: 16 }
const selectStyle = { flex: 1, padding: 16, background: '#1a1a1a', color: '#fff', border: '2px solid #333', borderRadius: 10, fontSize: 16 }

createRoot(document.getElementById('root')).render(<App />)
