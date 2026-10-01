import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { 
  Heart, Users, UsersRound, Flame, MessageCircle, UserRound, 
  Settings as SettingsIcon, ChevronRight, ChevronLeft, CalendarDays
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
    <div style={{background:'#000', color:'#fff', minHeight:'100vh', paddingBottom:80}}>
      <header style={{display:'flex', justifyContent:'space-between', padding:16, borderBottom:'1px solid #222'}}>
        <b style={{fontSize:20}}>{APP_NAME}</b>
        <button onClick={() => supabase.auth.signOut().then(() => setPage('splash'))} style={{background:'none', border:'none', color:'#fff'}}>Sign Out</button>
      </header>
      <main style={{padding:20}}>
        <h2>Welcome, {profile.display_name || 'Friend'}! 👋</h2>
        <p>You're all set up! ✨</p>
      </main>
    </div>
  )
}

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
      await supabase.from('profiles').upsert({ id: data.user.id, display_name: name.trim() })
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
    <div style={centerStyle}>
      <h1 style={{fontSize:42, margin:0}}>{APP_NAME}</h1>
      <p style={{color:'#888', margin:'10px 0 40px'}}>Connect with people near you</p>
      {mode === 'welcome' && <>
        <button onClick={() => setMode('login')} style={primaryBtn}>Log in</button>
        <button onClick={() => setMode('signup')} style={secondaryBtn}>Create account</button>
      </>}
      {mode === 'signup' && <>
        <h2>Join {APP_NAME}</h2>
        {err && <p style={{color:'#ff6b6b'}}>{err}</p>}
        <input placeholder="Your name" value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
        <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} type="email" style={inputStyle} />
        <input placeholder="Password" value={pass} onChange={e => setPass(e.target.value)} type="password" style={inputStyle} />
        <button onClick={signUp} disabled={working} style={primaryBtn}>
          {working ? 'Creating…' : 'Create account'}
        </button>
        <button onClick={() => setMode('welcome')} style={linkBtn}>← Back</button>
      </>}
      {mode === 'login' && <>
        <h2>Welcome back</h2>
        {err && <p style={{color:'#ff6b6b'}}>{err}</p>}
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

function Onboarding({ me, setProfile, setPage }) {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [profileData, setProfileData] = useState({
    display_name: '', gender: '', marital_status: '', sexuality: '',
    date_of_birth: '', height_ft: '', height_in: '', body_type: '',
    job_title: '', headline: '', bio: '', hobbies: '', interests: '',
    drive: null, drink: null, smoke: null, drugs: null,
    have_children: null, want_children: null, seeking: [],
    religion: '', music_tastes: [], favourite_film: '',
    looking_for_gender: [], attracted_to: [], ideal_first_date: []
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
        age: age, // ✅ Will be null if no birthday — database allows this now
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
        <h3 style={{color:'#ccc'}}>
          <CalendarDays size={20} style={{display:'inline', marginRight:8, verticalAlign:'middle'}} />
          Date of Birth
        </h3>
        
        {/* ✅ FULL CALENDAR PICKER — YEAR/MONTH/DAY ALL VISIBLE */}
        <input 
          type="date" 
          value={profileData.date_of_birth} 
          onChange={e => update('date_of_birth', e.target.value)}
          style={{
            width: '100%', 
            padding: 18, 
            marginBottom: 12,
            background: '#1a1a1a', 
            border: '2px solid #333',
            borderRadius: 12, 
            color: '#fff', 
            fontSize: 18,
            minHeight: '60px'
          }}
        />
        
        <p style={{color:'#888', fontSize:14, margin:'-6px 0 16px'}}>
          Tap above to open calendar — select year, month & day 📅
        </p>
        
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
        <p style={{color:'#4ade4a', marginTop:30, textAlign:'center', fontSize:16}}>
          ✨ You're all set! Tap Submit to finish ✨
        </p>
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
            padding:'14px 28px', 
            background:'#E8654F', 
            color:'#fff', 
            border:'none', 
            borderRadius:10, 
            fontSize:16,
            fontWeight:'bold'
          }}
        >
          {saving ? 'Saving…' : step===3 ? '🎉 Submit' : 'Continue'}
          {!saving && step<3 && <ChevronRight size={18} style={{marginLeft:6}} />}
        </button>
      </div>
    </div>
  )
}

const centerStyle = {
  background: '#000', 
  minHeight: '100vh', 
  display: 'flex', 
  flexDirection: 'column',
  alignItems: 'center', 
  justifyContent: 'center', 
  color: '#fff',
  padding: 20
}

const inputStyle = {
  width: 280, 
  padding: 16, 
  marginBottom: 12,
  background: '#222', 
  border: 'none', 
  borderRadius: 10, 
  color: '#fff', 
  fontSize: 16
}

const primaryBtn = {
  width: 280, 
  padding: 16, 
  background: '#E8654F', 
  color: '#fff',
  border: 'none', 
  borderRadius: 12, 
  fontSize: 18, 
  marginTop: 10
}

const secondaryBtn = {
  width: 280, 
  padding: 16, 
  background: '#2a2a2a', 
  color: '#fff',
  border: 'none', 
  borderRadius: 12, 
  fontSize: 18, 
  marginTop: 12
}

const linkBtn = {
  color: '#E8654F', 
  background: 'none', 
  border: 'none', 
  marginTop: 20,
  fontSize: 16
}

const backBtn = {
  color: '#fff', 
  background: 'none', 
  border: 'none', 
  display: 'flex', 
  alignItems: 'center',
  fontSize: 16
}

const selectStyle = {
  flex: 1, 
  padding: 16, 
  background: '#1a1a1a', 
  color: '#fff', 
  border: '2px solid #333', 
  borderRadius: 10,
  fontSize: 16
}

createRoot(document.getElementById('root')).render(<App />)
