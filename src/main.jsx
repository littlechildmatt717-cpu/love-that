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

function App() {
  const [page, setPage] = useState('splash')
  const [me, setMe] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setLoading(true)
      if (session?.user) {
        setMe(session.user)
        const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
        setProfile(data)
        if (!data?.gender) {
          setPage('onboarding')
        } else {
          setPage('home')
        }
      } else {
        setMe(null); setProfile(null); setPage('splash')
      }
      setLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <div className="gate"><p>Loading...</p></div>
  if (page === 'splash') return <Splash setPage={setPage} />
  if (!me) return <div className="gate"><p>Loading…</p></div>
  if (page === 'onboarding') return <Onboarding me={me} setProfile={setProfile} setPage={setPage} />
  if (!profile) return <div className="gate"><p>Loading profile…</p></div>

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

function Splash({ setPage }) {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [name, setName] = useState('')
  const [mode, setMode] = useState('welcome')
  const [err, setErr] = useState('')

  async function signUp() {
    setErr('')
    if (!name.trim()) return setErr('Please enter your name')
    const { data, error } = await supabase.auth.signUp({ email, password: pass })
    if (error) return setErr(error.message)
    if (data.user) {
      await supabase.from('profiles').upsert({ 
        id: data.user.id, 
        display_name: name.trim() 
      })
      setPage('onboarding')
    }
  }
  async function signIn() {
    setErr('')
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass })
    if (error) setErr(error.message)
  }

  return (
    <div className="gate">
      <h1 style={{ fontSize: 36, marginBottom: 8 }}>{APP_NAME}</h1>
      <p style={{ marginBottom: 32 }}>Connect with people near you</p>
      
      {mode === 'welcome' && <>
        <button className="primary" onClick={() => setMode('login')}>Log in</button>
        <button className="primary" style={{ marginTop: 12, background: 'var(--card-bg, #222)' }} onClick={() => setMode('signup')}>Create account</button>
      </>}

      {mode === 'login' && <>
        <h2>Welcome back</h2>
        {err && <p className="error">{err}</p>}
        <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} type="email" style={{ background: 'var(--card-bg, #222)', padding: 14, borderRadius: 10, marginBottom: 12, width: '100%', maxWidth: 320 }} />
        <input placeholder="Password" value={pass} onChange={e => setPass(e.target.value)} type="password" style={{ background: 'var(--card-bg, #222)', padding: 14, borderRadius: 10, marginBottom: 16, width: '100%', maxWidth: 320 }} />
        <button className="primary" onClick={signIn}>Sign in</button>
        <button className="link" onClick={() => setMode('welcome')}>← Back</button>
      </>}

      {mode === 'signup' && <>
        <h2>Join {APP_NAME}</h2>
        {err && <p className="error">{err}</p>}
        <input placeholder="Your name" value={name} onChange={e => setName(e.target.value)} style={{ background: 'var(--card-bg, #222)', padding: 14, borderRadius: 10, marginBottom: 12, width: '100%', maxWidth: 320 }} />
        <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} type="email" style={{ background: 'var(--card-bg, #222)', padding: 14, borderRadius: 10, marginBottom: 12, width: '100%', maxWidth: 320 }} />
        <input placeholder="Password" value={pass} onChange={e => setPass(e.target.value)} type="password" style={{ background: 'var(--card-bg, #222)', padding: 14, borderRadius: 10, marginBottom: 16, width: '100%', maxWidth: 320 }} />
        <button className="primary" onClick={signUp}>Create account</button>
        <button className="link" onClick={() => setMode('welcome')}>← Back</button>
      </>}
    </div>
  )
}

// ==================================================
// 🔵 ONBOARDING — NOW WITH YOUR NEW SCREEN!
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
    goals: '',
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
    // === NEW: What You're Looking For ===
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
        setPage('home') // ✅ FINAL SUBMIT → HOME PAGE
      }
    } catch (err) {
      alert(`Error: ${err.message}`)
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
        background: selected ? '#E8654F' : 'var(--card-bg, #2a2a2a)',
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
        background: selected ? '#E8654F' : 'var(--card-bg, #2a2a2a)',
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
    <div className="app" style={{ padding: '20px', minHeight: '100vh' }}>
      {/* Progress Bar — Now 8 Steps */}
      <div style={{ 
        height: 4, 
        background: '#333', 
        borderRadius: 2, 
        marginBottom: 20,
        overflow: 'hidden'
      }}>
        <div style={{ 
          width: `${(step / 8) * 100}%`, 
          height: '100%', 
          background: '#E8654F',
          transition: 'width 0.3s'
        }} />
      </div>
      <p style={{ textAlign: 'center', color: '#888', marginBottom: 20 }}>Step {step} of 8</p>

      {/* STEP 1: About You */}
      {step === 1 && <>
        <h2 style={{ fontSize: 24, marginBottom: 24 }}>About You</h2>
        
        <h3 style={{ fontSize: 16, color: '#ccc', marginBottom: 8 }}>I am a...</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 24 }}>
          {['Man', 'Woman', 'Couple', 'Non-binary', 'Trans man', 'Trans woman'].map(g => (
            <OptionBtn key={g} selected={profileData.gender === g} onClick={() => update('gender', g)}>
              {g}
            </OptionBtn>
          ))}
        </div>

        <h3 style={{ fontSize: 16, color: '#ccc', marginBottom: 8 }}>Marital status</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 24 }}>
          {['Single', 'In a relationship', 'Divorced', 'Widowed', 'Separated'].map(s => (
            <OptionBtn key={s} selected={profileData.marital_status === s} onClick={() => update('marital_status', s)}>
              {s}
            </OptionBtn>
          ))}
        </div>

        <h3 style={{ fontSize: 16, color: '#ccc', marginBottom: 8 }}>Sexual orientation</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 24 }}>
          {['Gay', 'Straight', 'Bisexual', 'Undecided'].map(s => (
            <OptionBtn key={s} selected={profileData.sexuality === s} onClick={() => update('sexuality', s)}>
              {s}
            </OptionBtn>
          ))}
        </div>
      </>}

      {/* ================================================== */}
      {/* ✨ NEW STEP 2: WHAT ARE YOU LOOKING FOR? ✨ */}
      {/* ================================================== */}
      {step === 2 && <>
        <h2 style={{ fontSize: 24, marginBottom: 24 }}>What Are You Looking For?</h2>
        
        <h3 style={{ fontSize: 16, color: '#ccc', marginBottom: 12 }}>Who are you interested in?</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 24 }}>
          {['Man', 'Woman', 'Non-binary', 'Trans man', 'Trans woman', 'Just making friends', 'Friends to double date with'].map(g => (
            <MultiBtn key={g} selected={profileData.looking_for_gender.includes(g)} onClick={() => toggleMulti('looking_for_gender', g)}>
              {g}
            </MultiBtn>
          ))}
        </div>

        <h3 style={{ fontSize: 16, color: '#ccc', marginBottom: 12 }}>What attracts you most?</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 24 }}>
          {['Hair', 'Face', 'Eyes', 'Lips', 'Personality', 'Someone who\'s funny', 'Nice body', 'Nice butt', 'A kind person', 'Flirty'].map(a => (
            <MultiBtn key={a} selected={profileData.attracted_to.includes(a)} onClick={() => toggleMulti('attracted_to', a)}>
              {a}
            </MultiBtn>
          ))}
        </div>

        <h3 style={{ fontSize: 16, color: '#ccc', marginBottom: 12 }}>Ideal first date would be...</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 24 }}>
          {['Bar scene', 'Restaurant', 'Beach walk', 'Snuggle watching a good film on the sofa', 'Arcade', 'Bowling', 'Ice skating', 'Dancing', 'Zoo trip', 'Karaoke'].map(d => (
            <MultiBtn key={d} selected={profileData.ideal_first_date.includes(d)} onClick={() => toggleMulti('ideal_first_date', d)}>
              {d}
            </MultiBtn>
          ))}
        </div>

        <h3 style={{ fontSize: 16, color: '#ccc', marginBottom: 12 }}>What do you want your partner to...</h3>
        <YesNoBtn label="Drink" value={profileData.partner_drink} onClick={v => update('partner_drink', v)} />
        <YesNoBtn label="Do drugs" value={profileData.partner_drugs} onClick={v => update('partner_drugs', v)} />
        <YesNoBtn label="Drive" value={profileData.partner_drive} onClick={v => update('partner_drive', v)} />
        <YesNoBtn label="Smoke" value={profileData.partner_smoke} onClick={v => update('partner_smoke', v)} />
        <YesNoBtn label="Have children" value={profileData.partner_children} onClick={v => update('partner_children', v)} />
      </>}

      {/* STEP 3: DOB, Height */}
      {step === 3 && <>
        <h2 style={{ fontSize: 24, marginBottom: 24 }}>Your Details</h2>
        
        <h3 style={{ fontSize: 16, color: '#ccc', marginBottom: 8 }}>
          <CalendarDays size={18} style={{ display: 'inline', marginRight: 8 }} />
          Date of Birth
        </h3>
        <input 
          type="date" 
          value={profileData.date_of_birth}
          onChange={e => update('date_of_birth', e.target.value)}
          style={{ 
            width: '100%', 
            padding: 14, 
            fontSize: 16, 
            background: 'var(--card-bg, #222)', 
            border: 'none', 
            borderRadius: 10, 
            color: '#fff',
            marginBottom: 8
          }}
        />
        {profileData.date_of_birth && (
          <p style={{ color: '#4ade4a', marginBottom: 24 }}>
            You are {calculateAge(profileData.date_of_birth)} years old ✅
          </p>
        )}

        <h3 style={{ fontSize: 16, color: '#ccc', marginBottom: 8 }}>Height</h3>
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <select 
            value={profileData.height_ft}
            onChange={e => update('height_ft', e.target.value)}
            style={{ flex: 1, padding: 12, background: '#222', color: '#fff', border: 'none', borderRadius: 8 }}
          >
            <option value="">Feet</option>
            {Array.from({length: 5}, (_,i) => i + 4).map(n => (
              <option key={n} value={n}>{n} ft</option>
            ))}
          </select>
          <select 
            value={profileData.height_in}
            onChange={e => update('height_in', e.target.value)}
            style={{ flex: 1, padding: 12, background: '#222', color: '#fff', border: 'none', borderRadius: 8 }}
          >
            <option value="">Inches</option>
            {Array.from({length: 12}, (_,i) => i).map(n => (
              <option key={n} value={n}>{n} in</option>
            ))}
          </select>
        </div>
      </>}

      {/* STEP 4: Body, Job, Bio */}
      {step === 4 && <>
        <h2 style={{ fontSize: 24, marginBottom: 24 }}>About Yourself</h2>
        
        <h3 style={{ fontSize: 16, color: '#ccc', marginBottom: 8 }}>Body Type</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 20 }}>
          {['Slim', 'Overweight', 'Athletic', 'Muscular'].map(b => (
            <OptionBtn key={b} selected={profileData.body_type === b} onClick={() => update('body_type', b)}>
              {b}
            </OptionBtn>
          ))}
        </div>

        <h3 style={{ fontSize: 16, color: '#ccc', marginBottom: 8 }}>Job Title</h3>
        <input 
          placeholder="e.g. Teacher, Engineer..."
          value={profileData.job_title}
          onChange={e => update('job_title', e.target.value)}
          style={{ 
            width: '100%', 
            padding: 14, 
            background: '#222', 
            border: 'none', 
            borderRadius: 10, 
            color: '#fff',
            marginBottom: 16
          }}
        />

        <h3 style={{ fontSize: 16, color: '#ccc', marginBottom: 8 }}>Headline</h3>
        <input 
          placeholder="A short catchy line..."
          value={profileData.headline}
          onChange={e => update('headline', e.target.value)}
          style={{ 
            width: '100%', 
            padding: 14, 
            background: '#222', 
            border: 'none', 
            borderRadius: 10, 
            color: '#fff',
            marginBottom: 16
          }}
        />

        <h3 style={{ fontSize: 16, color: '#ccc', marginBottom: 8 }}>Write a bit about yourself</h3>
        <textarea 
          placeholder="Your story..."
          value={profileData.bio}
          onChange={e => update('bio', e.target.value)}
          style={{ 
            width: '100%', 
            padding: 14, 
            background: '#222', 
            border: 'none', 
            borderRadius: 10, 
            color: '#fff',
            minHeight: 100,
            marginBottom: 16
          }}
        />

        <h3 style={{ fontSize: 16, color: '#ccc', marginBottom: 8 }}>Hobbies</h3>
        <input 
          placeholder="What do you enjoy?"
          value={profileData.hobbies}
          onChange={e => update('hobbies', e.target.value)}
          style={{ 
            width: '100%', 
            padding: 14, 
            background: '#222', 
            border: 'none', 
            borderRadius: 10, 
            color: '#fff',
            marginBottom: 16
          }}
        />

        <h3 style={{ fontSize: 16, color: '#ccc', marginBottom: 8 }}>Interests</h3>
        <input 
          placeholder="What fascinates you?"
          value={profileData.interests}
          onChange={e => update('interests', e.target.value)}
          style={{ 
            width: '100%', 
            padding: 14, 
            background: '#222', 
            border: 'none', 
            borderRadius: 10, 
            color: '#fff',
            marginBottom: 16
          }}
        />
      </>}

      {/* STEP 5: Lifestyle */}
      {step === 5 && <>
        <h2 style={{ fontSize: 24, marginBottom: 24 }}>Your Lifestyle</h2>
        <YesNoBtn label="Do you drive?" value={profileData.drive} onClick={v => update('drive', v)} />
        <YesNoBtn label="Do you drink?" value={profileData.drink} onClick={v => update('drink', v)} />
        <YesNoBtn label="Do you smoke?" value={profileData.smoke} onClick={v => update('smoke', v)} />
        <YesNoBtn label="Do you do drugs?" value={profileData.drugs} onClick={v => update('drugs', v)} />
        <YesNoBtn label="Have children?" value={profileData.have_children} onClick={v => update('have_children', v)} />
        <YesNoBtn label="Want children?" value={profileData.want_children} onClick={v => update('want_children', v)} />
      </>}

      {/* STEP 6: Seeking, Religion */}
      {step === 6 && <>
        <h2 style={{ fontSize: 24, marginBottom: 24 }}>What You're Looking For</h2>
        
        <h3 style={{ fontSize: 16, color: '#ccc', marginBottom: 12 }}>I want...</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 24 }}>
          {['Relationship', 'Marriage', 'Casual', 'Dating', 'Friends', 'Double dating'].map(s => (
            <MultiBtn key={s} selected={profileData.seeking.includes(s)} onClick={() => toggleMulti('seeking', s)}>
              {s}
            </MultiBtn>
          ))}
        </div>

        <h3 style={{ fontSize: 16, color: '#ccc', marginBottom: 12 }}>Religion</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 24 }}>
          {['Atheist', 'Christian', 'Hindu', 'Buddhist', 'Muslim', 'Non-religious'].map(r => (
            <OptionBtn key={r} selected={profileData.religion === r} onClick={() => update('religion', r)}>
              {r}
            </OptionBtn>
          ))}
        </div>
      </>}

      {/* STEP 7: Fun Questions */}
      {step === 7 && <>
        <h2 style={{ fontSize: 24, marginBottom: 24 }}>A Little More About You</h2>
        
        <h3 style={{ fontSize: 16, color: '#ccc', marginBottom: 8 }}>Most embarrassing moment</h3>
        <textarea 
          placeholder="The story you laugh about now..."
          value={profileData.embarrassing_moment}
          onChange={e => update('embarrassing_moment', e.target.value)}
          style={{ 
            width: '100%', 
            padding: 14, 
            background: '#222', 
            border: 'none', 
            borderRadius: 10, 
            color: '#fff',
            minHeight: 80,
            marginBottom: 16
          }}
        />

        <h3 style={{ fontSize: 16, color: '#ccc', marginBottom: 8 }}>Most romantic thing you've done</h3>
        <textarea 
          placeholder="Tell us about it..."
          value={profileData.most_romantic}
          onChange={e => update('most_romantic', e.target.value)}
          style={{ 
            width: '100%', 
            padding: 14, 
            background: '#222', 
            border: 'none', 
            borderRadius: 10, 
            color: '#fff',
            minHeight: 80,
            marginBottom: 16
          }}
        />

        <h3 style={{ fontSize: 16, color: '#ccc', marginBottom: 8 }}>Favourite movie quote</h3>
        <input 
          placeholder="e.g. 'May the Force be with you'"
          value={profileData.favourite_quote}
          onChange={e => update('favourite_quote', e.target.value)}
          style={{ 
            width: '100%', 
            padding: 14, 
            background: '#222', 
            border: 'none', 
            borderRadius: 10, 
            color: '#fff',
            marginBottom: 16
          }}
        />

        <h3 style={{ fontSize: 16, color: '#ccc', marginBottom: 8 }}>Favourite film</h3>
        <input 
          placeholder="Your #1 movie"
          value={profileData.favourite_film}
          onChange={e => update('favourite_film', e.target.value)}
          style={{ 
            width: '100%', 
            padding: 14, 
            background: '#222', 
            border: 'none', 
            borderRadius: 10, 
            color: '#fff',
            marginBottom: 24
          }}
        />
      </>}

      {/* STEP 8: Music — FINAL SCREEN */}
      {step === 8 && <>
        <h2 style={{ fontSize: 24, marginBottom: 24 }}>What Music Do You Love?</h2>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 24 }}>
          {['Pop', 'Rock', 'Classical', '80s/90s', 'Heavy Metal', 'Drum & Bass', 'R&B', 'Rap'].map(m => (
            <MultiBtn key={m} selected={profileData.music_tastes.includes(m)} onClick={() => toggleMulti('music_tastes', m)}>
              {m}
            </MultiBtn>
          ))}
        </div>

        <p style={{ color: '#4ade4a', fontSize: 16, marginTop: 20, textAlign: 'center' }}>
          ✨ You're all set! Tap Submit to join Love That ✨
        </p>
      </>}

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 30 }}>
        {step > 1 ? (
          <button 
            onClick={() => setStep(step - 1)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 20px', background: 'transparent', color: '#fff', border: 'none', fontSize: 16 }}
          >
            <ChevronLeft size={18} /> Back
          </button>
        ) : <div />}
        
        <button 
          onClick={saveAndContinue}
          disabled={!canProceed() || saving}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 6, 
            padding: '14px 28px', 
            background: canProceed() ? '#E8654F' : '#444', 
            color: '#fff', 
            border: 'none', 
            borderRadius: 10, 
            fontSize: 16,
            fontWeight: 600,
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

// --- Home ---
function Home({ me, profile, setPage }) {
  return (
    <div className="app">
      <header>
        <b>{APP_NAME}</b>
        <button onClick={() => setPage('settings')}><SettingsIcon size={22} /></button>
      </header>
      
      <main className="homePage">
        <h2 className="greeting">Hello, {profile.display_name}! 👋</h2>
        
        <button className="chatRoomHero" onClick={() => setPage('chatroom')}>
          <MessageCircle size={28} />
          <span><b>Public Chat Room</b><small>Chat with everyone in the community</small></span>
        </button>

        <button className="shortsHero" onClick={() => setPage('shorts')}>
          <Play size={28} />
          <span><b>Shorts</b><small>Watch & share 60s videos</small></span>
        </button>

        {Object.entries(P).map(([key, val]) => {
          const Icon = val[3]
          return (
            <button key={key} className="platformBtn" style={{ '--color': val[2] }} onClick={() => setPage('discover')}>
              <Icon size={28} />
              <span><b>{val[0]}</b><small>{val[1]}</small></span>
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
    <nav>
      {items.map(i => {
        const Icon = i.icon
        return (
          <button key={i.id} onClick={() => setPage(i.id)} style={{ color: active === i.id ? '#fff' : '#8e8e93' }}>
            <Icon size={22} />{i.label}
          </button>
        )
      })}
    </nav>
  )
}

function ChatRoom({ me, setPage }) {
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)
  const channelRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    let mounted = true
    async function load() {
      const { data } = await supabase.from('chat_room')
        .select('*,profiles(display_name)')
        .order('created_at', { ascending: true })
        .limit(100)
      if (mounted) setMessages(data || [])
    }
    load()

    channelRef.current = supabase.channel('public_chat')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_room' }, async (payload) => {
        const { data } = await supabase.from('chat_room')
          .select('*,profiles(display_name)')
          .eq('id', payload.new.id).maybeSingle()
        if (data && mounted) setMessages(p => [...p, data])
      })
      .subscribe()

    return () => { mounted = false; if (channelRef.current) supabase.removeChannel(channelRef.current) }
  }, [])

  async function sendMessage(e) {
    e.preventDefault()
    if (!newMessage.trim() || sending) return
    setSending(true)
    const text = newMessage.trim()
    setNewMessage('')
    try {
      const { error } = await supabase.from('chat_room').insert({
        user_id: me.id, content: text, type: 'text'
      })
      if (error) throw error
      setMessages(p => [...p, {
        id: Date.now(), user_id: me.id, content: text, type: 'text',
        created_at: new Date().toISOString(),
        profiles: { display_name: 'You' }
      }])
    } catch (err) {
      alert(err.message)
      setNewMessage(text)
    } finally { setSending(false) }
  }

  async function sendImage(e) {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const path = `chat-media/${me.id}/${makeUploadId()}.${mediaExtension(file, file.type)}`
    const { error: upErr } = await supabase.storage.from('chat-media').upload(path, file)
    if (upErr) return alert(upErr.message)
    const { data: { publicUrl } } = supabase.storage.from('chat-media').getPublicUrl(path)
    await supabase.from('chat_room').insert({ user_id: me.id, content: publicUrl, type: 'image' })
  }

  return (
    <div className="chatRoomPage">
      <div className="chatHeader">
        <button onClick={() => setPage('home')} className="backBtn"><ArrowLeft /></button>
        <div><h2>Chat room</h2><p>Everyone in the room</p></div>
        <button onClick={async () => {
          const { data } = await supabase.from('chat_room').select('*,profiles(display_name)').order('created_at', { ascending: true }).limit(100)
          setMessages(data || [])
        }} className="refreshBtn"><RefreshCw /></button>
      </div>
      
      <div className="chatNotice"><Shield size={18} /><p>Be respectful. This is a public 18+ community room.</p></div>
      
      <div className="messagesArea">
        {messages.length === 0 && <p className="noMessages">No messages yet — be the first to say hi!</p>}
        {messages.map((msg, i) => {
          const isMe = msg.user_id === me.id
          return (
            <div key={msg.id || i} className={`messageBubble ${isMe ? 'myMessage' : 'otherMessage'}`}>
              <div className="messageSender">{msg.profiles?.display_name || 'Someone'}</div>
              {msg.type === 'text' && <p className="messageText">{msg.content}</p>}
              {msg.type === 'image' && <img src={msg.content} alt="" className="messageImage" />}
              <span className="messageTime">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={sendMessage} className="messageInputArea">
        <label className="attachBtn">
          <input type="file" accept="image/*" onChange={sendImage} hidden />
          <ImageIcon size={22} />
        </label>
        <input type="text" className="textInput" placeholder="Type a message…" value={newMessage} onChange={e => setNewMessage(e.target.value)} disabled={sending} />
        <button type="submit" className="sendBtn" disabled={sending || !newMessage.trim()}><Send size={22} /></button>
      </form>
      
      <Nav setPage={setPage} active="chatroom" />
    </div>
  )
}

function Discover({ setPage }) {
  return (
    <div className="app">
      <header><b>Discover</b><button onClick={() => setPage('settings')}><SettingsIcon size={22} /></button></header>
      <div style={{ padding: 20, textAlign: 'center', marginTop: 60 }}>
        <Sparkles size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
        <h2 style={{ fontSize: 22, marginBottom: 8 }}>Coming Soon</h2>
        <p style={{ color: '#8e8e93' }}>Find matches and connections here</p>
      </div>
      <Nav setPage={setPage} active="discover" />
    </div>
  )
}

function Shorts({ setPage }) {
  return (
    <div className="app">
      <header><b>Shorts</b><button onClick={() => setPage('settings')}><SettingsIcon size={22} /></button></header>
      <div style={{ padding: 20, textAlign: 'center', marginTop: 60 }}>
        <Play size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
        <h2 style={{ fontSize: 22, marginBottom: 8 }}>Video Shorts</h2>
        <p style={{ color: '#8e8e93' }}>Share and watch short videos — coming soon</p>
      </div>
      <Nav setPage={setPage} active="shorts" />
    </div>
  )
}

function Profile({ me, profile, setProfile, setPage }) {
  const [photoUrl, setPhotoUrl] = useState(profile?.avatar_url || '')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)

  async function uploadPhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    try {
      const ext = mediaExtension(file, file.type)
      const fileName = `${makeUploadId()}.${ext}`
      const path = `${me.id}/${fileName}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { cacheControl: '3600', upsert: true })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      const freshUrl = `${publicUrl}?t=${Date.now()}`
      await supabase.from('profiles').update({ avatar_url: freshUrl }).eq('id', me.id)
      setPhotoUrl(freshUrl)
      setProfile(prev => ({ ...prev, avatar_url: freshUrl }))
      alert('✅ Photo updated!')
    } catch (err) {
      alert(`❌ Failed: ${err.message}`)
    } finally { setUploadingPhoto(false) }
  }

  async function uploadBioVideo(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('video/')) return alert('Please select a video')
    if (file.size > 30 * 1024 * 1024) return alert('Video too large (max 30MB)')
    setUploadingVideo(true)
    try {
      const ext = mediaExtension(file, file.type)
      const path = `${me.id}/${makeUploadId()}.${ext}`
      const { error: upErr } = await supabase.storage.from('profile-videos').upload(path, file, { upsert: true })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('profile-videos').getPublicUrl(path)
      const freshUrl = `${publicUrl}?t=${Date.now()}`
      await supabase.from('profiles').update({ bio_video_url: freshUrl }).eq('id', me.id)
      setProfile(prev => ({ ...prev, bio_video_url: freshUrl }))
      alert('✅ Video uploaded!')
    } catch (err) {
      alert(`❌ Failed: ${err.message}`)
    } finally { setUploadingVideo(false) }
  }

  return (
    <div className="app">
      <header>
        <b>{APP_NAME}</b>
        <button onClick={() => setPage('settings')}><SettingsIcon size={22} /></button>
      </header>
      
      <div className="profilePage">
        <div className="avatarCircle">
          {photoUrl ? (
            <img src={photoUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: 48, fontWeight: 600, color: '#666' }}>
              {profile.display_name?.[0]?.toUpperCase() || 'M'}
            </span>
          )}
        </div>

        <h2>{profile.display_name}, {profile.age || '??'}</h2>
        <p style={{ color: '#8e8e93' }}>{profile.location || 'Isle of Wight'}</p>
        
        {profile.headline && <p style={{ fontStyle: 'italic', color: '#E8654F', margin: '8px 0' }}>"{profile.headline}"</p>}
        
        <label style={{ marginTop: 24, display: 'block' }}>
          <b>Profile Photo</b>
          <input type="file" accept="image/*" onChange={uploadPhoto} disabled={uploadingPhoto} style={{ marginTop: 8 }} />
          {uploadingPhoto && <p style={{ color: '#E8654F' }}>Uploading photo…</p>}
        </label>
        
        <label style={{ marginTop: 20, display: 'block' }}>
          <b>Bio Video</b>
          <input type="file" accept="video/*" onChange={uploadBioVideo} disabled={uploadingVideo} style={{ marginTop: 8 }} />
          {uploadingVideo && <p style={{ color: '#E8654F' }}>Uploading video…</p>}
        </label>
      </div>
      
      <Nav setPage={setPage} active="profile" />
    </div>
  )
}

function Settings({ setPage }) {
  async function signOut() {
    await supabase.auth.signOut()
    setPage('splash')
  }
  return (
    <div className="app">
      <header style={{ justifyContent: 'flex-start', gap: 12 }}>
        <button onClick={() => setPage('home')} className="backBtn"><ArrowLeft /></button>
        <b>Settings</b>
      </header>
      <div className="settingsPage">
        <button className="signOutBtn" onClick={signOut}>Sign Out</button>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<App />)
