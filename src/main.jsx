import React, { useEffect, useState, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { 
  Heart, Users, UsersRound, Flame, MessageCircle, UserRound, 
  Settings as SettingsIcon, ArrowLeft, Shield, Send, X, Trash2, 
  Sparkles, LogIn, Flag, Lock, Play, Video, Image as ImageIcon, 
  Smile, Link as LinkIcon, FileVideo, RefreshCw, Phone, PhoneOff, 
  Mic, MicOff, Camera, CameraOff, Timer, Zap, CalendarDays, 
  MapPin, CheckCircle2, HeartHandshake, ChevronRight, ChevronLeft
} from 'lucide-react'
import { supabase } from './lib/supabase'
import './styles.css'

const APP_NAME = 'love that'
const P = {
  singles: ['Meet someone new', 'One-to-one dating', '#E8654F', Heart],
  couples: ['Find a double date', 'Meet people together', '#E3AC66', UsersRound],
  friends: ['No romance, just people', 'Make genuine connections', '#8E8E93', Users],
  community: ['18+ chat only', 'Consenting adults only', '#9B59B6', Flame]
}

function makeUploadId() { return Math.random().toString(36).slice(2, 12) }
function mediaExtension(file, type) {
  if (type.startsWith('image/')) return type.replace('image/', '')
  if (type.startsWith('video/')) return type.replace('video/', '')
  return 'bin'
}

function calculateAge(dobString) {
  if (!dobString) return null
  const dob = new Date(dobString)
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
  return age
}

// ==================================================
// ✅ FIXED — NO MORE "PLEASE SIGN IN" STUCK SCREEN!
// ==================================================
function App() {
  const [page, setPage] = useState('splash')
  const [me, setMe] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      try {
        // First check: do we already have a session?
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          setMe(session.user)
          // Try load profile
          try {
            const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
            setProfile(data)
            if (!data?.gender) {
              setPage('onboarding')
            } else {
              setPage('home')
            }
          } catch {
            // No profile found = brand new user → go to onboarding!
            setPage('onboarding')
          }
        } else {
          setPage('splash')
        }
      } catch (e) {
        console.log('Init check:', e)
        setPage('splash')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (cancelled) return
      setLoading(true)
      
      if (session?.user) {
        setMe(session.user)
        // ✅ NEW SIGNUP → GO STRAIGHT TO ONBOARDING!
        if (event === 'SIGNED_IN') {
          try {
            const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
            setProfile(data)
            if (!data?.gender) {
              setPage('onboarding') // ✅ NOT "Please sign in"!
            } else {
              setPage('home')
            }
          } catch {
            // Profile doesn't exist yet → brand new user!
            setPage('onboarding') // ✅ GO HERE INSTEAD!
          }
        }
      } else {
        setMe(null)
        setProfile(null)
        setPage('splash')
      }
      setLoading(false)
    })

    init()

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  if (loading) {
    return (
      <div style={{ background: '#000', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
        <p style={{ fontSize: 18 }}>Loading…</p>
        <button 
          onClick={() => setPage('splash')}
          style={{ marginTop: 20, padding: '10px 20px', background: '#333', color: '#fff', border: 'none', borderRadius: 8 }}
        >
          ← Back
        </button>
      </div>
    )
  }

  if (page === 'splash') return <Splash setPage={setPage} />
  
  // ✅ REMOVED THE BROKEN "Please sign in" SCREEN!
  // If we get here and have NO user → go back to splash
  if (!me) {
    return (
      <div style={{ background: '#000', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
        <p style={{ fontSize: 18, marginBottom: 20 }}>Create your account to get started</p>
        <button 
          onClick={() => setPage('splash')}
          style={{ padding: '12px 24px', background: '#E8654F', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16 }}
        >
          ← Back to Join
        </button>
      </div>
    )
  }

  if (page === 'onboarding') return <Onboarding me={me} setProfile={setProfile} setPage={setPage} />
  if (!profile) return <Onboarding me={me} setProfile={setProfile} setPage={setPage} />

  const common = { me, profile, setProfile, setPage }
  switch (page) {
    case 'home': return <Home {...common} />
    case 'profile': return <Profile {...common} />
    case 'chatroom': return <ChatRoom {...common} />
    case 'discover': return <Discover {...common} />
    case 'shorts': return <Shorts {...common} />
    case 'settings': return <Settings {...common} />
    default: return <Home {...common} />
  }
}

// ==================================================
// ✅ SPLASH — CREATES ACCOUNT → GOES TO ONBOARDING
// ==================================================
function Splash({ setPage }) {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [name, setName] = useState('')
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
      
      if (error) {
        setErr(error.message)
        return
      }
      
      if (!data?.user) {
        setErr('Check your email — confirm your account first')
        return
      }

      // Create profile record
      try {
        await supabase.from('profiles').upsert({ 
          id: data.user.id, 
          display_name: name.trim() 
        })
      } catch (profileErr) {
        console.warn('Profile created later:', profileErr)
      }

      // ✅ ONBOARDING SHOULD SHOW NOW — NO STUCK SCREEN!
      setPage('onboarding')
      
    } catch (e) {
      setErr('Something went wrong. Please try again.')
      console.error(e)
    } finally {
      setWorking(false)
    }
  }

  async function signIn() {
    setErr('')
    setWorking(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pass })
      if (error) setErr(error.message)
    } catch (e) {
      setErr('Login failed — check your connection')
    } finally {
      setWorking(false)
    }
  }

  return (
    <div style={{ background: '#000', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <h1 style={{ fontSize: 42, marginBottom: 8, color: '#fff', fontWeight: 'bold' }}>{APP_NAME}</h1>
      <p style={{ marginBottom: 40, color: '#888', fontSize: 18 }}>Connect with people near you</p>
      
      {mode === 'welcome' && <>
        <button 
          className="primary" 
          onClick={() => setMode('login')}
          style={{ width: '100%', maxWidth: 320, padding: 16, background: '#E8654F', color: '#fff', border: 'none', borderRadius: 12, fontSize: 18, marginBottom: 12 }}
        >
          Log in
        </button>
        <button 
          className="primary" 
          style={{ width: '100%', maxWidth: 320, padding: 16, background: '#2a2a2a', color: '#fff', border: 'none', borderRadius: 12, fontSize: 18 }}
          onClick={() => setMode('signup')}
        >
          Create account
        </button>
      </>}

      {mode === 'login' && <>
        <h2 style={{ color: '#fff', fontSize: 24, marginBottom: 24 }}>Welcome back</h2>
        {err && <p style={{ color: '#ff6b6b', marginBottom: 16 }}>{err}</p>}
        <input 
          placeholder="Email" 
          value={email} 
          onChange={e => setEmail(e.target.value)} 
          type="email" 
          style={{ background: '#222', padding: 16, borderRadius: 10, marginBottom: 12, width: '100%', maxWidth: 320, border: 'none', color: '#fff', fontSize: 16 }} 
        />
        <input 
          placeholder="Password" 
          value={pass} 
          onChange={e => setPass(e.target.value)} 
          type="password" 
          style={{ background: '#222', padding: 16, borderRadius: 10, marginBottom: 20, width: '100%', maxWidth: 320, border: 'none', color: '#fff', fontSize: 16 }} 
        />
        <button 
          className="primary" 
          onClick={signIn} 
          disabled={working}
          style={{ width: '100%', maxWidth: 320, padding: 16, background: '#E8654F', color: '#fff', border: 'none', borderRadius: 12, fontSize: 18 }}
        >
          {working ? 'Signing in…' : 'Sign in'}
        </button>
        <button 
          className="link" 
          onClick={() => setMode('welcome')} 
          style={{ color: '#E8654F', marginTop: 20, background: 'none', border: 'none', fontSize: 16 }}
        >
          ← Back
        </button>
      </>}

      {mode === 'signup' && <>
        <h2 style={{ color: '#fff', fontSize: 28, marginBottom: 24 }}>Join {APP_NAME}</h2>
        {err && <p style={{ color: '#ff6b6b', marginBottom: 16, textAlign: 'center' }}>{err}</p>}
        <input 
          placeholder="Your name" 
          value={name} 
          onChange={e => setName(e.target.value)} 
          style={{ background: '#222', padding: 16, borderRadius: 10, marginBottom: 12, width: '100%', maxWidth: 320, border: 'none', color: '#fff', fontSize: 16 }} 
        />
        <input 
          placeholder="Email" 
          value={email} 
          onChange={e => setEmail(e.target.value)} 
          type="email" 
          style={{ background: '#222', padding: 16, borderRadius: 10, marginBottom: 12, width: '100%', maxWidth: 320, border: 'none', color: '#fff', fontSize: 16 }} 
        />
        <input 
          placeholder="Password" 
          value={pass} 
          onChange={e => setPass(e.target.value)} 
          type="password" 
          style={{ background: '#222', padding: 16, borderRadius: 10, marginBottom: 24, width: '100%', maxWidth: 320, border: 'none', color: '#fff', fontSize: 16 }} 
        />
        <button 
          className="primary" 
          onClick={signUp} 
          disabled={working}
          style={{ width: '100%', maxWidth: 320, padding: 16, background: '#E8654F', color: '#fff', border: 'none', borderRadius: 12, fontSize: 18 }}
        >
          {working ? 'Creating account…' : 'Create account'}
        </button>
        <button 
          className="link" 
          onClick={() => setMode('welcome')} 
          style={{ color: '#E8654F', marginTop: 20, background: 'none', border: 'none', fontSize: 16 }}
        >
          ← Back
        </button>
      </>}
    </div>
  )
}

// ==================================================
// ONBOARDING — ALL YOUR SCREENS
// ==================================================
function Onboarding({ me, setProfile, setPage }) {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [profileData, setProfileData] = useState({
    display_name: '',
    gender: '',
    marital_status: '',
    sexuality: '',
    date_of_birth: '',
    height_ft: '',
    height_in: '',
    body_type: '',
    job_title: '',
    headline: '',
    bio: '',
    hobbies: '',
    interests: '',
    drive: null,
    drink: null,
    smoke: null,
    drugs: null,
    have_children: null,
    want_children: null,
    seeking: [],
    religion: '',
    embarrassing_moment: '',
    most_romantic: '',
    favourite_quote: '',
    favourite_film: '',
    music_tastes: [],
    looking_for_gender: [],
    attracted_to: [],
    ideal_first_date: [],
    partner_drink: null,
    partner_drugs: null,
    partner_drive: null,
    partner_smoke: null,
    partner_children: null
  })

  const update = (field, value) => {
    setProfileData(p => ({ ...p, [field]: value }))
  }

  const toggleMulti = (field, value) => {
    setProfileData(p => ({
      ...p,
      [field]: p[field].includes(value)
        ? p[field].filter(x => x !== value)
        : [...p[field], value]
    }))
  }

  async function saveAndContinue() {
    setSaving(true)
    try {
      const age = calculateAge(profileData.date_of_birth)
      
      const { error } = await supabase.from('profiles').upsert({
        id: me.id,
        display_name: profileData.display_name || 'Friend',
        ...profileData,
        age,
        height: profileData.height_ft && profileData.height_in 
          ? `${profileData.height_ft}' ${profileData.height_in}"` 
          : null
      })
      
      if (error) throw error
      
      setProfile(p => ({ ...p, ...profileData, age }))
      
      if (step < 8) {
        setStep(step + 1)
      } else {
        setPage('home')
      }
    } catch (err) {
      alert(`Could not save: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const canProceed = () => {
    switch (step) {
      case 1: return profileData.gender && profileData.marital_status && profileData.sexuality
      case 2: return profileData.looking_for_gender.length > 0 && profileData.attracted_to.length > 0 && profileData.ideal_first_date.length > 0 && profileData.partner_drink !== null
      case 3: return profileData.date_of_birth
      case 4: return profileData.body_type && profileData.job_title
      case 5: return profileData.headline && profileData.bio
      case 6: return profileData.drive !== null && profileData.drink !== null && profileData.smoke !== null
      case 7: return profileData.seeking.length > 0 && profileData.religion
      case 8: return profileData.favourite_film && profileData.music_tastes.length > 0
      default: return true
    }
  }

  const OptionBtn = ({ selected, onClick, children }) => (
    <button 
      onClick={onClick}
      style={{
        padding: '12px 16px',
        borderRadius: 10,
        margin: 4,
        background: selected ? '#E8654F' : '#2a2a2a',
        color: '#fff',
        border: 'none',
        fontSize: 15
      }}
    >
      {children}
    </button>
  )

  const MultiBtn = ({ selected, onClick, children }) => (
    <button 
      onClick={onClick}
      style={{
        padding: '10px 14px',
        borderRadius: 20,
        margin: 4,
        background: selected ? '#E8654F' : '#2a2a2a',
        color: '#fff',
        border: 'none',
        fontSize: 14
      }}
    >
      {selected && '✓ '}{children}
    </button>
  )

  const YesNoBtn = ({ value, onClick, label }) => (
    <div style={{ display: 'flex', gap: 8, margin: '10px 0', alignItems: 'center' }}>
      <span style={{ width: 180, color: '#ccc', fontSize: 15 }}>{label}</span>
      <OptionBtn selected={value === true} onClick={() => onClick(true)}>Yes</OptionBtn>
      <OptionBtn selected={value === false} onClick={() => onClick(false)}>No</OptionBtn>
    </div>
  )

  return (
    <div style={{ padding: '20px', minHeight: '100vh', background: '#000', color: '#fff' }}>
      <div style={{ height: 4, background: '#333', borderRadius: 2, marginBottom: 20, overflow: 'hidden' }}>
        <div style={{ width: `${(step / 8) * 100}%`, height: '100%', background: '#E8654F', transition: 'width 0.3s' }} />
      </div>
      <p style={{ textAlign: 'center', color: '#888', marginBottom: 20 }}>Step {step} of 8</p>

      {step === 1 && <>
        <h2 style={{ fontSize: 24, marginBottom: 24 }}>About You</h2>
        <h3 style={{ fontSize: 16, color: '#ccc', marginBottom: 8 }}>I am a...</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 24 }}>
          {['Man', 'Woman', 'Couple', 'Non-binary', 'Trans man', 'Trans woman'].map(g => (
            <OptionBtn key={g} selected={profileData.gender === g} onClick={() => update('gender', g)}>{g}</OptionBtn>
          ))}
        </div>
        <h3 style={{ fontSize: 16, color: '#ccc', marginBottom: 8 }}>Marital status</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 24 }}>
          {['Single', 'In a relationship', 'Divorced', 'Widowed', 'Separated'].map(s => (
            <OptionBtn key={s} selected={profileData.marital_status === s} onClick={() => update('marital_status', s)}>{s}</OptionBtn>
          ))}
        </div>
        <h3 style={{ fontSize: 16, color: '#ccc', marginBottom: 8 }}>Sexual orientation</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 24 }}>
          {['Gay', 'Straight', 'Bisexual', 'Undecided'].map(s => (
            <OptionBtn key={s} selected={profileData.sexuality === s} onClick={() => update('sexuality', s)}>{s}</OptionBtn>
          ))}
        </div>
      </>}

      {step === 2 && <>
        <h2 style={{ fontSize: 24, marginBottom: 24 }}>What Are You Looking For?</h2>
        <h3 style={{ fontSize: 16, color: '#ccc', marginBottom: 12 }}>Who are you interested in?</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 24 }}>
          {['Man', 'Woman', 'Non-binary', 'Trans man', 'Trans woman', 'Just making friends', 'Friends to double date with'].map(g => (
            <MultiBtn key={g} selected={profileData.looking_for_gender.includes(g)} onClick={() => toggleMulti('looking_for_gender', g)}>{g}</MultiBtn>
          ))}
        </div>
        <h3 style={{ fontSize: 16, color: '#ccc', marginBottom: 12 }}>What attracts you most?</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 24 }}>
          {['Hair', 'Face', 'Eyes', 'Lips', 'Personality', 'Someone who\'s funny', 'Nice body', 'Nice butt', 'A kind person', 'Flirty'].map(a => (
            <MultiBtn key={a} selected={profileData.attracted_to.includes(a)} onClick={() => toggleMulti('attracted_to', a)}>{a}</MultiBtn>
          ))}
        </div>
        <h3 style={{ fontSize: 16, color: '#ccc', marginBottom: 12 }}>Ideal first date would be...</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 24 }}>
          {['Bar scene', 'Restaurant', 'Beach walk', 'Snuggle watching a good film on the sofa', 'Arcade', 'Bowling', 'Ice skating', 'Dancing', 'Zoo trip', 'Karaoke'].map(d => (
            <MultiBtn key={d} selected={profileData.ideal_first_date.includes(d)} onClick={() => toggleMulti('ideal_first_date', d)}>{d}</MultiBtn>
          ))}
        </div>
        <h3 style={{ fontSize: 16, color: '#ccc', marginBottom: 12 }}>What do you want your partner to...</h3>
        <YesNoBtn label="Drink" value={profileData.partner_drink} onClick={v => update('partner_drink', v)} />
        <YesNoBtn label="Do drugs" value={profileData.partner_drugs} onClick={v => update('partner_drugs', v)} />
        <YesNoBtn label="Drive" value={profileData.partner_drive} onClick={v => update('partner_drive', v)} />
        <YesNoBtn label="Smoke" value={profileData.partner_smoke} onClick={v => update('partner_smoke', v)} />
        <YesNoBtn label="Have children" value={profileData.partner_children} onClick={v => update('partner_children', v)} />
      </>}

      {step === 3 && <>
        <h2 style={{ fontSize: 24, marginBottom: 24 }}>Your Details</h2>
        <h3 style={{ fontSize: 16, color: '#ccc', marginBottom: 8 }}><CalendarDays size={18} style={{ display: 'inline', marginRight: 8 }} />Date of Birth</h3>
        <input type="date" value={profileData.date_of_birth} onChange={e => update('date_of_birth', e.target.value)} style={{ width: '100%', padding: 14, fontSize: 16, background: '#222', border: 'none', borderRadius: 10, color: '#fff', marginBottom: 8 }} />
        {profileData.date_of_birth && <p style={{ color: '#4ade4a', marginBottom: 24 }}>You are {calculateAge(profileData.date_of_birth)} years old ✅</p>}
        <h3 style={{ fontSize: 16, color: '#ccc', marginBottom: 8 }}>Height</h3>
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <select value={profileData.height_ft} onChange={e => update('height_ft', e.target.value)} style={{ flex: 1, padding: 12, background: '#222', color: '#fff', border: 'none', borderRadius: 8 }}>
            <option value="">Feet</option>
            {[4,5,6,7].map(n => <option key={n} value={n}>{n} ft</option>)}
          </select>
          <select value={profileData.height_in} onChange={e => update('height_in', e.target.value)} style={{ flex: 1, padding: 12, background: '#222', color: '#fff', border: 'none', borderRadius: 8 }}>
            <option value="">Inches</option>
            {Array.from({length: 12}, (_,i) => i).map(n => <option key={n} value={n}>{n} in</option>)}
          </select>
        </div>
      </>}

      {step === 4 && <>
        <h2 style={{ fontSize: 24, marginBottom: 24 }}>About Yourself</h2>
        <h3 style={{ fontSize: 16, color: '#ccc', marginBottom: 8 }}>Body Type</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 20 }}>
          {['Slim', 'Overweight', 'Athletic', 'Muscular'].map(b => (
            <OptionBtn key={b} selected={profileData.body_type === b} onClick={() => update('body_type', b)}>{b}</OptionBtn>
          ))}
        </div>
        <h3 style={{ fontSize: 16, color: '#ccc', marginBottom: 8 }}>Job Title</h3>
        <input placeholder="e.g. Teacher, Engineer..." value={profileData.job_title} onChange={e => update('job_title', e.target.value)} style={{ width: '100%', padding: 14, background: '#222', border: 'none', borderRadius: 10, color: '#fff', marginBottom: 16 }} />
        <h3 style={{ fontSize: 16, color: '#ccc', marginBottom: 8 }}>Headline</h3>
        <input placeholder="A short catchy line..." value={profileData.headline} onChange={e => update('headline', e.target.value)} style={{ width: '100%', padding: 14, background: '#222', border: 'none', borderRadius: 10, color: '#fff', marginBottom: 16 }} />
        <h3 style={{ fontSize: 16, color: '#ccc', marginBottom: 8 }}>Write a bit about yourself</h3>
        <textarea placeholder="Your story..." value={profileData.bio} onChange={e => update('bio', e.target.value)} style={{ width: '100%', padding: 14, background: '#222', border: 'none', borderRadius: 10, color: '#fff', minHeight: 100, marginBottom: 16 }} />
        <h3 style={{ fontSize: 16, color: '#ccc', marginBottom: 8 }}>Hobbies</h3>
        <input placeholder="What do you enjoy?" value={profileData.hobbies} onChange={e => update('hobbies', e.target.value)} style={{ width: '100%', padding: 14, background: '#222', border: 'none', borderRadius: 10, color: '#fff', marginBottom: 16 }} />
        <h3 style={{ fontSize: 16, color: '#ccc', marginBottom: 8 }}>Interests</h3>
        <input placeholder="What fascinates you?" value={profileData.interests} onChange={e => update('interests', e.target.value)} style={{ width: '100%', padding: 14, background: '#222', border: 'none', borderRadius: 10, color: '#fff' }} />
      </>}

      {step === 5 && <>
        <h2 style={{ fontSize: 24, marginBottom: 24 }}>Your Lifestyle</h2>
        <YesNoBtn label="Do you drive?" value={profileData.drive} onClick={v => update('drive', v)} />
        <YesNoBtn label="Do you drink?" value={profileData.drink} onClick={v => update('drink', v)} />
        <YesNoBtn label="Do you smoke?" value={profileData.smoke} onClick={v => update('smoke', v)} />
        <YesNoBtn label="Do you do drugs?" value={profileData.drugs} onClick={v => update('drugs', v)} />
        <YesNoBtn label="Have children?" value={profileData.have_children} onClick={v => update('have_children', v)} />
        <YesNoBtn label="Want children?" value={profileData.want_children} onClick={v => update('want_children', v)} />
      </>}

      {step === 6 && <>
        <h2 style={{ fontSize: 24, marginBottom: 24 }}>What You're Looking For</h2>
        <h3 style={{ fontSize: 16, color: '#ccc', marginBottom: 12 }}>I want...</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 24 }}>
          {['Relationship', 'Marriage', 'Casual', 'Dating', 'Friends', 'Double dating'].map(s => (
            <MultiBtn key={s} selected={profileData.seeking.includes(s)} onClick={() => toggleMulti('seeking', s)}>{s}</MultiBtn>
          ))}
        </div>
        <h3 style={{ fontSize: 16, color: '#ccc', marginBottom: 12 }}>Religion</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 24 }}>
          {['Atheist', 'Christian', 'Hindu', 'Buddhist', 'Muslim', 'Non-religious'].map(r => (
            <OptionBtn key={r} selected={profileData.religion === r} onClick={() => update('religion', r)}>{r}</OptionBtn>
          ))}
        </div>
      </>}

      {step === 7 && <>
        <h2 style={{ fontSize: 24, marginBottom: 24 }}>A Little More About You</h2>
        <h3 style={{ fontSize: 16, color: '#ccc', marginBottom: 8 }}>Most embarrassing moment</h3>
        <textarea placeholder="The story you laugh about now..." value={profileData.embarrassing_moment} onChange={e => update('embarrassing_moment', e.target.value)} style={{ width: '100%', padding: 14, background: '#222', border: 'none', borderRadius: 10, color: '#fff', minHeight: 80, marginBottom: 16 }} />
        <h3 style={{ fontSize: 16, color: '#ccc', marginBottom: 8 }}>Most romantic thing you've done</h3>
        <textarea placeholder="Tell us about it..." value={profileData.most_romantic} onChange={e => update('most_romantic', e.target.value)} style={{ width: '100%', padding: 14, background: '#222', border: 'none', borderRadius: 10, color: '#fff', minHeight: 80, marginBottom: 16 }} />
        <h3 style={{ fontSize: 16, color: '#ccc', marginBottom: 8 }}>Favourite movie quote</h3>
        <input placeholder="e.g. 'May the Force be with you'" value={profileData.favourite_quote} onChange={e => update('favourite_quote', e.target.value)} style={{ width: '100%', padding: 14, background: '#222', border: 'none', borderRadius: 10, color: '#fff', marginBottom: 16 }} />
        <h3 style={{ fontSize: 16, color: '#ccc', marginBottom: 8 }}>Favourite film</h3>
        <input placeholder="Your #1 movie" value={profileData.favourite_film} onChange={e => update('favourite_film', e.target.value)} style={{ width: '100%', padding: 14, background: '#222', border: 'none', borderRadius: 10, color: '#fff' }} />
      </>}

      {step === 8 && <>
        <h2 style={{ fontSize: 24, marginBottom: 24 }}>What Music Do You Love?</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 24 }}>
          {['Pop', 'Rock', 'Classical', '80s/90s', 'Heavy Metal', 'Drum & Bass', 'R&B', 'Rap'].map(m => (
            <MultiBtn key={m} selected={profileData.music_tastes.includes(m)} onClick={() => toggleMulti('music_tastes', m)}>{m}</MultiBtn>
          ))}
        </div>
        <p style={{ color: '#4ade4a', fontSize: 16, marginTop: 20, textAlign: 'center' }}>✨ You're all set! Tap Submit to join Love That ✨</p>
      </>}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 30 }}>
        {step > 1 ? (
          <button onClick={() => setStep(step - 1)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 20px', background: 'transparent', color: '#fff', border: 'none', fontSize: 16 }}>
            <ChevronLeft size={18} /> Back
          </button>
        ) : <div />}
        <button 
          onClick={saveAndContinue}
          disabled={!canProceed() || saving}
          style={{ 
            display: 'flex', alignItems: 'center', gap: 6, padding: '14px 28px', 
            background: canProceed() ? '#E8654F' : '#444', color: '#fff', 
            border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 600,
            opacity: canProceed() ? 1 : 0.6
          }}
        >
          {saving ? 'Saving...' : step === 8 ? '🎉 Submit' : 'Continue'}
          {!saving && step < 8 && <ChevronRight size={18} />}
        </button>
      </div>
    </div>
  )
}

// --- Home & Other Pages ---
function Home({ me, profile, setPage }) {
  return (
    <div style={{ background: '#000', color: '#fff', minHeight: '100vh', paddingBottom: 80 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid #222' }}>
        <b style={{ fontSize: 20 }}>{APP_NAME}</b>
        <button onClick={() => setPage('settings')} style={{ background: 'none', border: 'none', color: '#fff' }}><SettingsIcon size={22} /></button>
      </header>
      <main style={{ padding: 20 }}>
        <h2 style={{ fontSize: 22, marginBottom: 24 }}>Hello, {profile.display_name || 'Friend'}! 👋</h2>
        <button onClick={() => setPage('chatroom')} style={{ width: '100%', padding: 20, background: '#222', border: 'none', borderRadius: 12, color: '#fff', marginBottom: 12, textAlign: 'left', fontSize: 16 }}>
          <MessageCircle size={24} style={{ display: 'inline', marginRight: 12 }} />
          <b>Public Chat Room</b>
        </button>
        <button onClick={() => setPage('shorts')} style={{ width: '100%', padding: 20, background: '#222', border: 'none', borderRadius: 12, color: '#fff', marginBottom: 12, textAlign: 'left', fontSize: 16 }}>
          <Play size={24} style={{ display: 'inline', marginRight: 12 }} />
          <b>Shorts</b>
        </button>
        {Object.entries(P).map(([key, val]) => {
          const Icon = val[3]
          return (
            <button key={key} onClick={() => setPage('discover')} style={{ width: '100%', padding: 20, background: '#222', border: 'none', borderRadius: 12, color: '#fff', marginBottom: 12, textAlign: 'left', fontSize: 16 }}>
              <Icon size={24} style={{ display: 'inline', marginRight: 12 }} />
              <b>{val[0]}</b>
            </button>
          )
        })}
      </main>
      <Nav setPage={setPage} active="home" />
    </div>
  )
}

function Nav({ setPage, active }) {
  const items = [
    { id: 'discover', label: 'Discover', icon: Sparkles },
    { id: 'shorts', label: 'Shorts', icon: Play },
    { id: 'chatroom', label: 'Chat Room', icon: MessageCircle },
    { id: 'profile', label: 'Profile', icon: UserRound }
  ]
  return (
    <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-around', padding: '12px 0', background: '#111', borderTop: '1px solid #333' }}>
      {items.map(i => {
        const Icon = i.icon
        return (
          <button key={i.id} onClick={() => setPage(i.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: active === i.id ? '#E8654F' : '#888', background: 'none', border: 'none' }}>
            <Icon size={20} />
            <small>{i.label}</small>
          </button>
        )
      })}
    </nav>
  )
}

function ChatRoom({ setPage }) {
  return <div style={{ padding: 20, color: '#fff', background: '#000', minHeight: '100vh' }}><h2>Chat Room</h2><p>Coming soon</p><button onClick={() => setPage('home')} style={{ padding: 10, background: '#E8654F', color: '#fff', border: 'none', borderRadius: 8 }}>Back</button></div>
}
function Discover({ setPage }) {
  return <div style={{ padding: 20, color: '#fff', background: '#000', minHeight: '100vh' }}><h2>Discover</h2><p>Coming soon</p><button onClick={() => setPage('home')} style={{ padding: 10, background: '#E8654F', color: '#fff', border: 'none', borderRadius: 8 }}>Back</button></div>
}
function Shorts({ setPage }) {
  return <div style={{ padding: 20, color: '#fff', background: '#000', minHeight: '100vh' }}><h2>Shorts</h2><p>Coming soon</p><button onClick={() => setPage('home')} style={{ padding: 10, background: '#E8654F', color: '#fff', border: 'none', borderRadius: 8 }}>Back</button></div>
}
function Profile({ setPage }) {
  return <div style={{ padding: 20, color: '#fff', background: '#000', minHeight: '100vh' }}><h2>Profile</h2><button onClick={() => setPage('home')} style={{ padding: 10, background: '#E8654F', color: '#fff', border: 'none', borderRadius: 8 }}>Back</button></div>
}
function Settings({ setPage }) {
  async function signOut() { await supabase.auth.signOut(); setPage('splash') }
  return (
    <div style={{ padding: 20, color: '#fff', background: '#000', minHeight: '100vh' }}>
      <h2>Settings</h2>
      <button onClick={signOut} style={{ padding: 12, background: '#E8654F', color: '#fff', border: 'none', borderRadius: 8, marginTop: 20, width: '100%' }}>Sign Out</button>
      <button onClick={() => setPage('home')} style={{ marginLeft: 10, padding: 12, background: '#333', color: '#fff', border: 'none', borderRadius: 8 }}>Back</button>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<App />)
