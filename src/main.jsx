import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { 
  Heart, Users, Flame, MessageCircle, UserRound, 
  Settings as SettingsIcon, ChevronRight, ChevronLeft, 
  CalendarDays, LogOut
} from 'lucide-react'
import { supabase } from './lib/supabase'
import './styles.css'

const APP_NAME = 'love that'
const BRAND_RED = '#E50000'

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
            setPage(data?.gender ? 'home' : 'onboarding')
          } catch {
            setPage('onboarding')
          }
        } else {
          setPage('splash')
        }
      } catch (e) {
        console.log('Init error:', e)
        setPage('splash')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      if (cancelled) return
      setLoading(true)
      if (session?.user) {
        setMe(session.user)
        try {
          const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
          setProfile(data)
          setPage(data?.gender ? 'home' : 'onboarding')
        } catch {
          setPage('onboarding')
        }
      } else {
        setMe(null)
        setProfile(null)
        setPage('splash')
      }
      setLoading(false)
    })

    init()
    return () => { cancelled = true; subscription?.unsubscribe() }
  }, [])

  if (loading) {
    return (
      <div style={{ background: BRAND_RED, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
        <p style={{ fontSize: 18 }}>Loading…</p>
      </div>
    )
  }

  if (!me) return <Splash setPage={setPage} />
  if (page === 'onboarding') return <Onboarding me={me} setProfile={setProfile} setPage={setPage} />

  return <Home profile={profile} setPage={setPage} me={me} />
}

// ==================================================
// ✅ SPLASH — RED BACKGROUND + YOUR LOGO
// ==================================================
function Splash({ setPage }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [mode, setMode] = useState('welcome')
  const [err, setErr] = useState('')
  const [working, setWorking] = useState(false)

  async function signUp() {
    setErr('')
    if (!name.trim()) return setErr('Please enter your name')
    if (!email.trim()) return setErr('Please enter your email')
    if (!pass.trim() || pass.length < 6) return setErr('Password needs at least 6 characters')
    setWorking(true)
    try {
      const { data, error } = await supabase.auth.signUp({ email, password: pass })
      if (error) throw error
      if (!data?.user) return setErr('Check your email to confirm your account')
      await supabase.from('profiles').upsert({ id: data.user.id, display_name: name.trim() })
      setPage('onboarding')
    } catch (e) {
      setErr(e?.message || 'Something went wrong')
    } finally {
      setWorking(false)
    }
  }

  async function signIn() {
    setErr('')
    setWorking(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pass })
      if (error) throw error
    } catch (e) {
      setErr(e?.message || 'Login failed')
    } finally {
      setWorking(false)
    }
  }

  return (
    <div style={{ background: BRAND_RED, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <img 
        src="/logo-love-that.png" 
        alt="love that"
        style={{ width: 220, height: 220, borderRadius: 24, marginBottom: 10, objectFit: 'contain' }}
      />
      <h1 style={{ fontSize: 42, margin: 0, color: '#fff', fontWeight: 'bold' }}>{APP_NAME}</h1>
      <p style={{ marginBottom: 40, color: 'rgba(255,255,255,0.8)', fontSize: 18 }}>Connect with people near you</p>
      
      {mode === 'welcome' && <>
        <button onClick={() => setMode('login')} style={{ width: 320, padding: 16, background: '#fff', color: BRAND_RED, border: 'none', borderRadius: 12, fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>Log in</button>
        <button onClick={() => setMode('signup')} style={{ width: 320, padding: 16, background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 18 }}>Create account</button>
      </>}

      {mode === 'login' && <>
        <h2 style={{ color: '#fff', fontSize: 24, marginBottom: 24 }}>Welcome back</h2>
        {err && <p style={{ color: '#ffb3b3', marginBottom: 16 }}>{err}</p>}
        <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} type="email" style={{ width: 320, padding: 16, marginBottom: 12, background: 'rgba(0,0,0,0.25)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 16 }} />
        <input placeholder="Password" value={pass} onChange={e=>setPass(e.target.value)} type="password" style={{ width: 320, padding: 16, marginBottom: 20, background: 'rgba(0,0,0,0.25)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 16 }} />
        <button onClick={signIn} disabled={working} style={{ width: 320, padding: 16, background: '#fff', color: BRAND_RED, border: 'none', borderRadius: 12, fontSize: 18, fontWeight: 'bold' }}>{working ? 'Signing in…' : 'Sign in'}</button>
        <button onClick={() => setMode('welcome')} style={{ color: '#fff', marginTop: 20, background: 'none', border: 'none', fontSize: 16, textDecoration: 'underline' }}>← Back</button>
      </>}

      {mode === 'signup' && <>
        <h2 style={{ color: '#fff', fontSize: 28, marginBottom: 24 }}>Join {APP_NAME}</h2>
        {err && <p style={{ color: '#ffb3b3', marginBottom: 16, textAlign: 'center' }}>{err}</p>}
        <input placeholder="Your name" value={name} onChange={e=>setName(e.target.value)} style={{ width: 320, padding: 16, marginBottom: 12, background: 'rgba(0,0,0,0.25)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 16 }} />
        <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} type="email" style={{ width: 320, padding: 16, marginBottom: 12, background: 'rgba(0,0,0,0.25)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 16 }} />
        <input placeholder="Password" value={pass} onChange={e=>setPass(e.target.value)} type="password" style={{ width: 320, padding: 16, marginBottom: 24, background: 'rgba(0,0,0,0.25)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 16 }} />
        <button onClick={signUp} disabled={working} style={{ width: 320, padding: 16, background: '#fff', color: BRAND_RED, border: 'none', borderRadius: 12, fontSize: 18, fontWeight: 'bold' }}>{working ? 'Creating account…' : 'Create account'}</button>
        <button onClick={() => setMode('welcome')} style={{ color: '#fff', marginTop: 20, background: 'none', border: 'none', fontSize: 16, textDecoration: 'underline' }}>← Back</button>
      </>}
    </div>
  )
}

// ==================================================
// ✅ ONBOARDING — 8 STEPS
// ==================================================
function Onboarding({ me, setProfile, setPage }) {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [profileData, setProfileData] = useState({
    display_name: '', gender: '', marital_status: '', sexuality: '',
    date_of_birth: '', height_ft: '', height_in: '', job: '', bio: '',
    hobbies: '', music: '', quote: '', looking_for: []
  })

  const update = (field, val) => setProfileData(p => ({...p, [field]: val}))

  async function saveAndNext() {
    setSaving(true)
    try {
      const age = calculateAge(profileData.date_of_birth)
      const { error } = await supabase.from('profiles').upsert({
        id: me.id, ...profileData, age
      })
      if (error) { alert(`Error: ${error.message}`); return }
      
      if (step < 8) {
        setStep(step + 1)
      } else {
        const { data } = await supabase.from('profiles').select('*').eq('id', me.id).single()
        setProfile(data)
        setPage('home')
      }
    } catch (e) {
      console.log('Save error:', e)
      if (step < 8) setStep(step + 1)
      else setPage('home')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', padding: 25 }}>
      <div style={{ height: 4, background: '#222', borderRadius: 2, marginBottom: 30 }}>
        <div style={{ height: '100%', width: `${(step/8)*100}%`, background: BRAND_RED, borderRadius: 2, transition: 'width 0.3s' }} />
      </div>
      <p style={{ textAlign: 'center', color: '#888', marginBottom: 20 }}>Step {step} of 8</p>

      {step > 1 && (
        <button onClick={() => setStep(step - 1)} style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#888', background: 'none', border: 'none', marginBottom: 20 }}>
          <ChevronLeft size={16} /> Back
        </button>
      )}

      {step === 1 && <>
        <h2 style={{ fontSize: 28, marginBottom: 5 }}>What should we call you?</h2>
        <p style={{ color: '#888', marginBottom: 25 }}>Your name or nickname</p>
        <input placeholder="Your name" value={profileData.display_name} onChange={e=>update('display_name', e.target.value)} style={{ width: '100%', padding: 16, background: '#1a1a1a', border: 'none', borderRadius: 10, color: '#fff', fontSize: 16, marginBottom: 20 }} />
      </>}

      {step === 2 && <>
        <h2 style={{ fontSize: 28, marginBottom: 25 }}>I identify as…</h2>
        {['Man','Woman','Non-binary','Trans man','Trans woman','Other'].map(g => (
          <button key={g} onClick={() => update('gender', g)} style={{ width: '100%', padding: 16, marginBottom: 10, background: profileData.gender === g ? BRAND_RED : '#1a1a1a', border: 'none', borderRadius: 10, color: '#fff', fontSize: 16 }}>{g}</button>
        ))}
      </>}

      {step === 3 && <>
        <h2 style={{ fontSize: 28, marginBottom: 25 }}>Relationship status</h2>
        {['Single','In a relationship','Married','Separated','Divorced','It’s complicated'].map(s => (
          <button key={s} onClick={() => update('marital_status', s)} style={{ width: '100%', padding: 16, marginBottom: 10, background: profileData.marital_status === s ? BRAND_RED : '#1a1a1a', border: 'none', borderRadius: 10, color: '#fff', fontSize: 16 }}>{s}</button>
        ))}
      </>}

      {step === 4 && <>
        <h2 style={{ fontSize: 28, marginBottom: 25 }}>Your sexuality</h2>
        {['Straight','Gay','Lesbian','Bisexual','Pansexual','Queer','Prefer not to say'].map(s => (
          <button key={s} onClick={() => update('sexuality', s)} style={{ width: '100%', padding: 16, marginBottom: 10, background: profileData.sexuality === s ? BRAND_RED : '#1a1a1a', border: 'none', borderRadius: 10, color: '#fff', fontSize: 16 }}>{s}</button>
        ))}
      </>}

      {step === 5 && <>
        <h2 style={{ fontSize: 28, marginBottom: 10 }}><CalendarDays size={24} style={{ display: 'inline', marginRight: 8 }} />Date of birth</h2>
        <p style={{ color: '#888', marginBottom: 25 }}>Your age will be shown — not your full birthday</p>
        <input type="date" value={profileData.date_of_birth} onChange={e=>update('date_of_birth', e.target.value)} style={{ width: '100%', padding: 16, background: '#1a1a1a', border: 'none', borderRadius: 10, color: '#fff', fontSize: 18 }} />
        {calculateAge(profileData.date_of_birth) && <p style={{ color: BRAND_RED, marginTop: 15 }}>✅ Age: {calculateAge(profileData.date_of_birth)}</p>}
      </>}

      {step === 6 && <>
        <h2 style={{ fontSize: 28, marginBottom: 25 }}>Your height</h2>
        <div style={{ display: 'flex', gap: 15 }}>
          <input type="number" placeholder="Feet" value={profileData.height_ft} onChange={e=>update('height_ft', e.target.value)} style={{ flex: 1, padding: 16, background: '#1a1a1a', border: 'none', borderRadius: 10, color: '#fff', fontSize: 16 }} />
          <input type="number" placeholder="Inches" value={profileData.height_in} onChange={e=>update('height_in', e.target.value)} style={{ flex: 1, padding: 16, background: '#1a1a1a', border: 'none', borderRadius: 10, color: '#fff', fontSize: 16 }} />
        </div>
      </>}

      {step === 7 && <>
        <h2 style={{ fontSize: 28, marginBottom: 25 }}>A bit more about you</h2>
        <input placeholder="What do you do? (Job / Role)" value={profileData.job} onChange={e=>update('job', e.target.value)} style={{ width: '100%', padding: 16, marginBottom: 12, background: '#1a1a1a', border: 'none', borderRadius: 10, color: '#fff', fontSize: 16 }} />
        <textarea placeholder="Short bio — tell us about yourself" value={profileData.bio} onChange={e=>update('bio', e.target.value)} rows={3} style={{ width: '100%', padding: 16, marginBottom: 12, background: '#1a1a1a', border: 'none', borderRadius: 10, color: '#fff', fontSize: 16 }} />
        <input placeholder="Hobbies & interests" value={profileData.hobbies} onChange={e=>update('hobbies', e.target.value)} style={{ width: '100%', padding: 16, marginBottom: 12, background: '#1a1a1a', border: 'none', borderRadius: 10, color: '#fff', fontSize: 16 }} />
        <input placeholder="Favourite music / artists" value={profileData.music} onChange={e=>update('music', e.target.value)} style={{ width: '100%', padding: 16, marginBottom: 12, background: '#1a1a1a', border: 'none', borderRadius: 10, color: '#fff', fontSize: 16 }} />
        <input placeholder="Favourite quote or motto" value={profileData.quote} onChange={e=>update('quote', e.target.value)} style={{ width: '100%', padding: 16, background: '#1a1a1a', border: 'none', borderRadius: 10, color: '#fff', fontSize: 16 }} />
      </>}

      {step === 8 && <>
        <h2 style={{ fontSize: 28, marginBottom: 25 }}>What are you looking for?</h2>
        {['Singles dating','Couples / double dates','Just friends','Community chat'].map(opt => (
          <button key={opt} onClick={() => {
            const arr = profileData.looking_for
            update('looking_for', arr.includes(opt) ? arr.filter(x => x !== opt) : [...arr, opt])
    
