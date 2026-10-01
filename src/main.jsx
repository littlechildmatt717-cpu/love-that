import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { 
  Heart, Users, UsersRound, Flame, MessageCircle, UserRound, 
  Settings as SettingsIcon, ChevronRight, ChevronLeft, CalendarDays, 
  LogOut, Zap, Video, Search, ArrowLeft, Shield, Send, X, Trash2, 
  Sparkles, LogIn, Flag, Lock, Play, Image as ImageIcon, Smile, 
  Link as LinkIcon, FileVideo, RefreshCw, Phone, PhoneOff, Mic, 
  MicOff, Camera, CameraOff, Timer, CheckCircle2, HeartHandshake
} from 'lucide-react'
import { supabase } from './lib/supabase'
import './styles.css'

const APP_NAME = 'love that'
const BRAND_RED = '#E50000'
const P = {
  singles: ['Meet someone new', 'One-to-one dating', '#E8654F', Heart],
  couples: ['Find a double date', 'Meet people together', '#E3AC3E', UsersRound],
  friends: ['No romance, just people', 'Make genuine connections', '#3FB9A8', Users],
  after: ['18+ chat only', 'Consenting adults only', '#B85AC4', Flame]
}
const identities = ['Woman', 'Man', 'Non-binary', 'Trans woman', 'Trans man']
const seeking = ['Men', 'Women', 'Men & women', 'Double dates', 'Non-binary people', 'Everyone']
const goals = ['A relationship', 'Casual dating', 'New friends', 'Flirty chat', 'Not sure yet']
const bodyTypes = ['Slim', 'Average', 'Curvy', 'Overweight', 'Muscular', 'Athletic', 'Plus size']
const religions = ['Atheist', 'Hindu', 'Buddhist', 'Christian', 'Muslim', 'None religious', 'Other', 'Prefer not to say']
const maritalStatuses = ['Single', 'Married', 'Separated', 'Divorced', 'Widowed', 'It’s complicated', 'Prefer not to say']
const attractiveTraits = ['Smile', 'Body', 'Personality', 'Funny', 'Smart', 'Good teeth', 'Nice butt', 'Flirty', 'Cute face', 'Kind', 'Confident', 'Eyes', 'Sense of humour', 'Ambitious']
const identityDb = {Woman:'woman',Man:'man','Non-binary':'non_binary','Trans woman':'trans_woman','Trans man':'trans_man'}
const goalDb = {'A relationship':'relationship','Casual dating':'casual_dating','New friends':'new_friends','Flirty chat':'flirty_chat','Not sure yet':'not_sure'}
const seekingDb = {'Men':'men','Women':'women','Men & women':'men_women','Double dates':'double_dates','Non-binary people':'non_binary','Everyone':'everyone'}

function calculateAge(dobString) {
  if (!dobString) return null
  const dob = new Date(dobString)
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
  return age
}

function makeUploadId() {
  try { if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID() } catch {}
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function getVideoDuration(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file), v = document.createElement('video')
    v.preload = 'metadata'
    v.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(v.duration) }
    v.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read this video on your device. Try an MP4 video.')) }
    v.src = url
  })
}

async function uploadVideoFile(me, file, type, caption, setMsg, setBusy) {
  if (!file) return
  if (!file.type.startsWith('video/')) { setMsg('Please choose a video file.'); return }
  if (file.size > 100 * 1024 * 1024) { setMsg('Videos must be 100MB or smaller.'); return }
  setBusy(true); setMsg('Checking video…')
  let path = ''
  try {
    const duration = await getVideoDuration(file)
    if (!Number.isFinite(duration) || duration <= 0 || duration > 60.01) throw new Error('Videos must be no longer than 60 seconds.')
    const ext = (file.name.split('.').pop() || 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp4'
    path = `${me.id}/${makeUploadId()}.${ext}`
    const up = await supabase.storage.from('short-videos').upload(path, file, { contentType: file.type || 'video/mp4', upsert: false })
    if (up.error) throw up.error
    const { error: dbError } = await supabase.from('short_videos').insert({
      user_id: me.id, video_type: type, storage_path: path,
      duration_seconds: Math.round(duration * 100) / 100,
      caption: (caption || '').trim()
    })
    if (dbError) { await supabase.storage.from('short-videos').remove([path]); throw dbError }
    setMsg(type === 'bio' ? 'Video uploaded and sent for safety review.' : 'Short uploaded and sent for safety review.')
    return true
  } catch (e) {
    if (path) await supabase.storage.from('short-videos').remove([path]).catch(() => {})
    setMsg(e.message || 'Video upload failed.')
    return false
  } finally { setBusy(false) }
}

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [gate, setGate] = useState(localStorage.getItem('love_that_gate') === '1')
  const [authMode, setAuthMode] = useState('signup')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState('splash')
  const [platform, setPlatform] = useState('singles')
  const [discover, setDiscover] = useState([])
  const [matches, setMatches] = useState([])
  const [chat, setChat] = useState(null)
  const [error, setError] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [call, setCall] = useState(null)
  const [incoming, setIncoming] = useState(null)
  const [me, setMe] = useState(null)

  useEffect(() => {
    let alive = true
    let profileLoadTimer = null
    async function restoreSession() {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error
        if (!alive) return
        setSession(data.session)
        setMe(data.session?.user || null)
        if (data.session) {
          await loadProfile(data.session.user.id)
          setPage(profile?.display_name ? 'home' : 'onboarding')
        } else {
          setPage('splash')
        }
      } catch (e) { if (alive) setError(e.message || 'Could not restore your sign-in session.') }
      finally { if (alive) setLoading(false) }
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, s) => {
      if (!alive) return
      setSession(s)
      setMe(s?.user || null)
      if (!s) { setProfile(null); setMatches([]); setPage('splash'); return }
      profileLoadTimer = setTimeout(async () => {
        if (!alive) return
        await loadProfile(s.user.id)
        setPage(profile?.display_name ? 'home' : 'onboarding')
        if (alive) setLoading(false)
      }, 0)
    })
    restoreSession()
    return () => {
      alive = false
      if (profileLoadTimer) clearTimeout(profileLoadTimer)
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!session?.user?.id) return
    const ch = supabase.channel('incoming-calls-' + session.user.id)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'private_call_sessions',
        filter: `callee_id=eq.${session.user.id}`
      }, async payload => {
        if (payload.new.status === 'ringing' && payload.new.offer) {
          const { data: ps } = await supabase.from('profiles').select('id,display_name,age').eq('id', payload.new.caller_id).maybeSingle()
          const { data: conv } = await supabase.from('conversations').select('*').eq('id', payload.new.conversation_id).maybeSingle()
          setIncoming({
            call: payload.new, conversation: conv,
            person: ps || { id: payload.new.caller_id, display_name: 'Member' }
          })
        }
      }).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [session?.user?.id])

  async function loadProfile(uid) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle()
    if (error) { console.error(error); setProfile(null) }
    let prof = data || null
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const meta = user?.user_metadata || {}
      if (!prof && user) {
        const dob = meta.date_of_birth || null
        const age = Number(meta.age || 0)
        const identity = meta.identity || 'prefer_not_to_say'
        if (age >= 18 && age <= 120) {
          const payload = {
            id: uid, display_name: meta.display_name || user.email?.split('@')[0] || 'Member',
            age, identity, location: meta.location || '', headline: meta.headline || '',
            bio: meta.bio || '', goal: meta.goal || null,
            seeking: Array.isArray(meta.seeking) ? meta.seeking : [],
            platform: meta.platform || 'singles', date_of_birth: dob,
            body_type: meta.body_type || null, religion: meta.religion || null,
            height_cm: meta.height_cm ? Number(meta.height_cm) : null,
            interested_body_types: Array.isArray(meta.interested_body_types) ? meta.interested_body_types : [],
            attractive_traits: Array.isArray(meta.attractive_traits) ? meta.attractive_traits : []
          }
          const created = await supabase.from('profiles').upsert(payload).select('*').single()
          if (!created.error) prof = created.data
        }
      }
      if (prof && (!prof.display_name || !prof.display_name.trim())) {
        const name = meta.display_name || user?.email?.split('@')[0] || 'Member'
        const fixed = await supabase.from('profiles').update({ display_name: name }).eq('id', uid).select('*').single()
        if (!fixed.error) prof = fixed.data
      }
    } catch (e) { console.error(e) }
    setProfile(prof)
    try {
      const r = await supabase.functions.invoke('admin-console', { body: { action: 'dashboard' } })
      setIsAdmin(!r.error && r.data?.ok === true)
    } catch { setIsAdmin(false) }
  }

  async function loadDiscover(nextPlatform = platform) {
    setError('')
    const { data, error } = await supabase.from('profiles').select('*').eq('is_active', true).neq('id', session.user.id).eq('platform', nextPlatform).limit(30)
    if (error) { setError(error.message); return }
    const enriched = []
    for (const p of data || []) {
      try {
        const r = await supabase.functions.invoke('profile-photo-url', { body: { user_id: p.id } })
        enriched.push({ ...p, photo: r.data?.photos?.[0]?.url || null })
      } catch { enriched.push({ ...p, photo: null }) }
    }
    setDiscover(enriched)
  }

  async function openDiscover(p) { setPlatform(p); setPage('discover'); if (session) await loadDiscover(p) }
  async function loadMatches() {
    if (!session) return
    const { data, error } = await supabase.from('matches').select('*').or(`user_a.eq.${session.user.id},user_b.eq.${session.user.id}`).order('created_at', { ascending: false })
    if (error) { setError(error.message); return }
    const ids = (data || []).map(m => m.user_a === session.user.id ? m.user_b : m.user_a)
    if (!ids.length) { setMatches([]); return }
    const { data: ps } = await supabase.from('profiles').select('*').in('id', ids)
    const out = []
    for (const p of ps || []) {
      const r = await supabase.functions.invoke('profile-photo-url', { body: { user_id: p.id } })
      out.push({ ...p, photo: r.data?.photos?.[0]?.url || null })
    }
    setMatches(out)
  }
  async function openPrivateChat(person) {
    const r = await supabase.functions.invoke('start-conversation', { body: { other_user_id: person.id } })
    if (r.error) { setError(r.error.message); return }
    setChat({ ...person, conversation: r.data.conversation })
    setPage('chat')
  }
  async function startCall(person, conversation, mode = 'video', speedPair = null) {
    setCall({ person, conversation, mode, speedPair })
  }
  async function signOut() { await supabase.auth.signOut(); setPage('splash') }

  if (loading) return <div className="gate"><h1>Loading {APP_NAME}…</h1></div>
  if (!gate && me) return <Gate go={() => { localStorage.setItem('love_that_gate', '1'); setGate(true) }} />
  if (!me) return <Splash setPage={setPage} />
  if (!profile || page === 'onboarding') return <Onboarding me={me} setProfile={setProfile} setPage={setPage} loadProfile={loadProfile} />

  return (
    <div className="app">
      <header>
        <b><img src="/icon.png" alt="" /> {APP_NAME}</b>
        <button onClick={() => setPage('settings')}><SettingsIcon /></button>
      </header>
      {error && <div className="error">{error}</div>}
      {page === 'home' && (
        <Home 
          me={profile} choose={openDiscover} openShorts={() => setPage('shorts')}
          openRoom={() => setPage('room')} openSpeed={() => setPage('speed')}
          openDateNight={() => setPage('dateNight')} setPage={setPage}
        />
      )}
      {page === 'room' && <ChatRoom me={profile} back={() => setPage('home')} />}
      {page === 'discover' && (
        <Discover 
          profile={profile} platform={platform} people={discover}
          like={async p => {
            const r = await supabase.functions.invoke('like-user', { body: { to_user_id: p.id } })
            if (r.error) { setError(r.error.message); return }
            if (r.data?.match) await loadMatches()
            setDiscover(v => v.filter(x => x.id !== p.id))
          }}
          back={() => setPage('home')}
        />
      )}
      {page === 'shorts' && <Shorts me={profile} openChat={openPrivateChat} back={() => setPage('home')} />}
      {page === 'matches' && <Matches people={matches} open={openPrivateChat} />}
      {page === 'chat' && (
        <Chat 
          me={profile} p={chat} startCall={(mode) => startCall(chat, chat.conversation, mode)}
          back={() => { setPage('matches'); loadMatches() }}
        />
      )}
      {incoming && (
        <IncomingCall 
          me={profile} incoming={incoming}
          accept={() => {
            setCall({
              person: incoming.person, conversation: incoming.conversation,
              mode: incoming.call.mode || 'video', incoming: incoming.call
            })
            setIncoming(null)
          }}
          decline={async () => {
            await supabase.from('private_call_sessions').update({ status: 'declined', ended_at: new Date().toISOString() }).eq('id', incoming.call.id)
            setIncoming(null)
          }}
        />
      )}
      {call && <CallOverlay me={profile} call={call} close={() => setCall(null)} />}
      {page === 'speed' && <SpeedDating me={profile} startCall={startCall} back={() => setPage('home')} />}
      {page === 'dateNight' && <DateNight me={profile} openChat={openPrivateChat} startCall={startCall} back={() => setPage('home')} />}
      {page === 'profile' && <Profile me={profile} refresh={loadProfile} signOut={signOut} />}
      {page === 'admin' && isAdmin ? <AdminPage back={() => setPage('settings')} /> : null}
      {page === 'settings' && (
        <SettingsPage 
          me={profile} isAdmin={isAdmin} openAdmin={() => setPage('admin')} signOut={signOut}
          deleteAccount={async () => {
            if (!confirm(`Delete your ${APP_NAME} account and associated data? This cannot be undone.`)) return
            const r = await supabase.functions.invoke('delete-account', { body: {} })
            if (r.error) { setError(r.error.message); return }
            await supabase.auth.signOut()
            localStorage.clear()
            location.reload()
          }}
        />
      )}
      <nav>
        <button onClick={() => setPage('home')}><Sparkles />Discover</button>
        <button onClick={() => setPage('shorts')}><Play />Shorts</button>
        <button onClick={() => { setPage('matches'); loadMatches() }}><MessageCircle />Matches</button>
        <button onClick={() => setPage('profile')}><UserRound />Profile</button>
      </nav>
    </div>
  )
}

function Gate({ go }) {
  return (
    <div className="gate">
      <div className="heart"><img src="/icon.png" alt="love that logo" /></div>
      <h1>Welcome to {APP_NAME}</h1>
      <p>Meet people, make friends, share moments and find genuine connections.</p>
      <div className="notice">
        <Shield /> <span><b>18+ only</b><br />{APP_NAME} is for adults aged 18 and over. Your date of birth is checked again when you create an account.</span>
      </div>
      <button className="primary" onClick={go}>Continue — I am 18 or older</button>
      <small>By continuing, you agree to our Terms, Privacy Policy and Community Standards.</small>
    </div>
  )
}

function Auth({ mode, setMode, error, setError, onReady }) {
  const [email, setEmail] = useState(''), [password, setPassword] = useState('')
  const [p, setP] = useState({
    name: '', dob: '', identity: '', location: '', goal: '', seeking: ['Everyone'],
    headline: '', bio: '', platform: 'singles', body_type: '', religion: '',
    height_cm: '', interested_body_types: [], attractive_traits: []
  })
  const [busy, setBusy] = useState(false)

  function ageFromDob(d) {
    if (!d) return 0
    const dob = new Date(d + 'T00:00:00'); const now = new Date()
    let age = now.getFullYear() - dob.getFullYear()
    const m = now.getMonth() - dob.getMonth()
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--
    return age
  }

  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('')
    try {
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        if (!data.session) throw new Error('Sign in completed but no active session was returned. Please try again.')
        onReady(data.session); return
      }
      const age = ageFromDob(p.dob)
      if (!p.name || age < 18 || age > 120 || !p.identity || !p.goal || !(p.seeking || []).length) {
        throw new Error('Please complete your name, date of birth, identity, what you are looking for and your main goal.')
      }
      const { data, error } = await supabase.auth.signUp({
        email, password,
        data: {
          display_name: p.name.trim(), age, date_of_birth: p.dob,
          identity: identityDb[p.identity], location: p.location.trim(),
          headline: p.headline.trim(), bio: p.bio.trim(), goal: goalDb[p.goal],
          seeking: (p.seeking || []).map(x => seekingDb[x]).filter(Boolean),
          platform: p.platform, body_type: p.body_type || null, religion: p.religion || null,
          height_cm: p.height_cm ? Number(p.height_cm) : null,
          interested_body_types: p.interested_body_types || [],
          attractive_traits: p.attractive_traits || []
        }
      })
      if (error) throw error
      if (!data.session) {
        alert(`Account created. Please confirm your email, then sign in to ${APP_NAME}.`)
        setMode('login')
      } else onReady(data.session)
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  return (
    <div className="signup">
      <main>
        <div className="authIcon"><img src="/icon.png" alt="love that logo" /></div>
        <h1>{mode === 'login' ? 'Welcome back' : `Create your ${APP_NAME} account`}</h1>
        <p className="muted">Real accounts, secure sessions and cloud profiles.</p>
        <form onSubmit={submit}>
          <Field t="Email"><input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></Field>
          <Field t="Password"><input type="password" minLength="8" required value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" /></Field>
          {mode === 'signup' && <>
            <Field t="Name"><input required maxLength="80" value={p.name} onChange={e => setP({ ...p, name: e.target.value })} placeholder="Your name" /></Field>
            <Field t="Date of birth"><input type="date" required value={p.dob} onChange={e => setP({ ...p, dob: e.target.value })} /></Field>
            <Choice t="I identify as" a={identities} v={p.identity} set={v => setP({ ...p, identity: v })} />
            <Field t="Town or city"><input value={p.location} onChange={e => setP({ ...p, location: e.target.value })} placeholder="Where you live" /></Field>
            <ChoiceMulti t="What are you looking for?" a={seeking} v={p.seeking} set={v => setP({ ...p, seeking: v })} help="You can choose more than one." />
            <Choice t="Main goal" a={goals} v={p.goal} set={v => setP({ ...p, goal: v })} />
            <Choice t="Your body type" a={bodyTypes} v={p.body_type} set={v => setP({ ...p, body_type: v })} />
            <ChoiceMulti t="Body types you are interested in" a={bodyTypes} v={p.interested_body_types} set={v => setP({ ...p, interested_body_types: v })} help="Choose as many as you like." />
            <ChoiceMulti t="What is most attractive to you in a partner?" a={attractiveTraits} v={p.attractive_traits} set={v => setP({ ...p, attractive_traits: v })} help="Multiple choices are allowed." />
            <Choice t="Religion" a={religions} v={p.religion} set={v => setP({ ...p, religion: v })} />
            <Field t="Height (cm)"><input type="number" min="100" max="250" inputMode="numeric" value={p.height_cm} onChange={e => setP({ ...p, height_cm: e.target.value })} placeholder="e.g. 175" /></Field>
            <Field t="Headline"><input maxLength="120" value={p.headline} onChange={e => setP({ ...p, headline: e.target.value })} placeholder="A short line about you" /></Field>
            <Field t="Bio"><textarea maxLength="2000" value={p.bio} onChange={e => setP({ ...p, bio: e.target.value })} placeholder="Tell people about yourself" /></Field>
          </>}
          {error && <div className="error">{error}</div>}
          <button className="primary" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
        </form>
        <button className="linkBtn" onClick={() => { setError(''); setMode(mode === 'login' ? 'signup' : 'login') }}>
          {mode === 'login' ? 'Create a new account' : 'Already have an account? Sign in'}
        </button>
      </main>
    </div>
  )
}

function Field({ t, children }) { return <label><b>{t}</b>{children}</label> }
function Choice({ t, a, v, set }) {
  return <div className="choice"><b>{t}</b><div>{a.map(x => <button type="button" className={v === x ? 'sel' : ''} onClick={() => set(x)} key={x}>{x}</button>)}</div></div>
}
function ChoiceMulti({ t, a, v, set, help }) {
  return (
    <div className="choice multiChoice">
      <b>{t}</b>{help && <small className="muted">{help}</small>}
      <div>{a.map(x => {
        const selected = (v || []).includes(x)
        return <button type="button" className={selected ? 'sel' : ''} onClick={() => set(selected ? (v || []).filter(y => y !== x) : [...(v || []), x])} key={x}>{selected ? '✓ ' : ''}{x}</button>
      })}</div>
    </div>
  )
}

function Splash({ setPage }) {
  const [name, setName] = useState(''), [email, setEmail] = useState(''), [pass, setPass] = useState('')
  const [mode, setMode] = useState('welcome'), [err, setErr] = useState(''), [working, setWorking] = useState(false)

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
    } catch (e) { setErr(e?.message || 'Something went wrong') }
    finally { setWorking(false) }
  }

  async function signIn() {
    setErr(''); setWorking(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pass })
      if (error) throw error
    } catch (e) { setErr(e?.message || 'Login failed') }
    finally { setWorking(false) }
  }

  return (
    <div style={{ background: BRAND_RED, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <img 
        src="/logo-love-that.png" 
        alt="love that"
        style={{ width: 220, height: 220, borderRadius: 24, marginBottom: 10, objectFit: 'contain' }}
        onError={(e) => { e.target.style.display = 'none' }}
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
        <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} type="email" style={{ width: 320, padding: 16, marginBottom: 12, background: 'rgba(0,0,0,0.25)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 16 }} />
        <input placeholder="Password" value={pass} onChange={e => setPass(e.target.value)} type="password" style={{ width: 320, padding: 16, marginBottom: 20, background: 'rgba(0,0,0,0.25)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 16 }} />
        <button onClick={signIn} disabled={working} style={{ width: 320, padding: 16, background: '#fff', color: BRAND_RED, border: 'none', borderRadius: 12, fontSize: 18, fontWeight: 'bold' }}>{working ? 'Signing in…' : 'Sign in'}</button>
        <button onClick={() => setMode('welcome')} style={{ color: '#fff', marginTop: 20, background: 'none', border: 'none', fontSize: 16, textDecoration: 'underline' }}>← Back</button>
      </>}
      {mode === 'signup' && <>
        <h2 style={{ color: '#fff', fontSize: 28, marginBottom: 24 }}>Join {APP_NAME}</h2>
        {err && <p style={{ color: '#ffb3b3', marginBottom: 16, textAlign: 'center' }}>{err}</p>}
        <input placeholder="Your name" value={name} onChange={e => setName(e.target.value)} style={{ width: 320, padding: 16, marginBottom: 12, background: 'rgba(0,0,0,0.25)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 16 }} />
        <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} type="email" style={{ width: 320, padding: 16, marginBottom: 12, background: 'rgba(0,0,0,0.25)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 16 }} />
        <input placeholder="Password" value={pass} onChange={e => setPass(e.target.value)} type="password" style={{ width: 320, padding: 16, marginBottom: 24, background: 'rgba(0,0,0,0.25)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 16 }} />
        <button onClick={signUp} disabled={working} style={{ width: 320, padding: 16, background: '#fff', color: BRAND_RED, border: 'none', borderRadius: 12, fontSize: 18, fontWeight: 'bold' }}>{working ? 'Creating account…' : 'Create account'}</button>
        <button onClick={() => setMode('welcome')} style={{ color: '#fff', marginTop: 20, background: 'none', border: 'none', fontSize: 16, textDecoration: 'underline' }}>← Back</button>
      </>}
    </div>
  )
}

function Onboarding({ me, setProfile, setPage, loadProfile }) {
  const [step, setStep] = useState(1), [saving, setSaving] = useState(false)
  const [profileData, setProfileData] = useState({
    display_name: '', gender: '', marital_status: '', sexuality: '',
    date_of_birth: '', height_ft: '', height_in: '', job: '', bio: '',
    hobbies: '', music: '', quote: '', looking_for: []
  })

  const update = (field, val) => setProfileData(p => ({ ...p, [field]: val }))

  async function saveAndNext() {
    setSaving(true)
    const dataToSave = {
      id: me.id, display_name: profileData.display_name,
      gender: profileData.gender, marital_status: profileData.marital_status,
      sexuality: profileData.sexuality,
      height_ft: profileData.height_ft ? Number(profileData.height_ft) : null,
      height_in: profileData.height_in ? Number(profileData.height_in) : null,
      job: profileData.job || null, bio: profileData.bio || null,
      hobbies: profileData.hobbies || null, music: profileData.music || null,
      quote: profileData.quote || null,
      looking_for: profileData.looking_for.length > 0 ? profileData.looking_for : null,
    }
    if (profileData.date_of_birth) {
      dataToSave.date_of_birth = profileData.date_of_birth
      dataToSave.age = calculateAge(profileData.date_of_birth)
    }
    try {
      const { error } = await supabase.from('profiles').upsert(dataToSave)
      if (error) { alert(`Error: ${error.message}`); return }
      if (step < 8) setStep(step + 1)
      else {
        await loadProfile(me.id)
        setPage('home')
      }
    } catch (e) {
      console.log('Save error:', e)
      if (step < 8) setStep(step + 1)
      else { await loadProfile(me.id); setPage('home') }
    }
    finally { setSaving(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', padding: 25 }}>
      <div style={{ height: 4, background: '#222', borderRadius: 2, marginBottom: 30 }}>
        <div style={{ height: '100%', width: `${(step / 8) * 100}%`, background: BRAND_RED, borderRadius: 2, transition: 'width 0.3s' }} />
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
        <input placeholder="Your name" value={profileData.display_name} onChange={e => update('display_name', e.target.value)} style={{ width: '100%', padding: 16, background: '#1a1a1a', border: 'none', borderRadius: 10, color: '#fff', fontSize: 16, marginBottom: 20 }} />
      </>}
      {step === 2 && <>
        <h2 style={{ fontSize: 28, marginBottom: 25 }}>I identify as…</h2>
        {['Man', 'Woman', 'Non-binary', 'Trans man', 'Trans woman', 'Other'].map(g => (
          <button key={g} onClick={() => update('gender', g)} style={{ width: '100%', padding: 16, marginBottom: 10, background: profileData.gender === g ? BRAND_RED : '#1a1a1a', border: 'none', borderRadius: 10, color: '#fff', fontSize: 16 }}>{g}</button>
        ))}
      </>}
      {step === 3 && <>
        <h2 style={{ fontSize: 28, marginBottom: 25 }}>Relationship status</h2>
        {['Single', 'In a relationship', 'Married', 'Separated', 'Divorced', 'It’s complicated'].map(s => (
          <button key={s} onClick={() => update('marital_status', s)} style={{ width: '100%', padding: 16, marginBottom: 10, background: profileData.marital_status === s ? BRAND_RED : '#1a1a1a', border: 'none', borderRadius: 10, color: '#fff', fontSize: 16 }}>{s}</button>
        ))}
      </>}
      {step === 4 && <>
        <h2 style={{ fontSize: 28, marginBottom: 25 }}>Your sexuality</h2>
        {['Straight', 'Gay', 'Lesbian', 'Bisexual', 'Pansexual', 'Queer', 'Prefer not to say'].map(s => (
          <button key={s} onClick={() => update('sexuality', s)} style={{ width: '100%', padding: 16, marginBottom: 10, background: profileData.sexuality === s ? BRAND_RED : '#1a1a1a', border: 'none', borderRadius: 10, color: '#fff', fontSize: 16 }}>{s}</button>
        ))}
      </>}
      {step === 5 && <>
        <h2 style={{ fontSize: 28, marginBottom: 10 }}><CalendarDays size={24} style={{ display: 'inline', marginRight: 8 }} />Date of birth</h2>
        <p style={{ color: '#888', marginBottom: 25 }}>Your age will be shown — not your full birthday</p>
        <input type="date" value={profileData.date_of_birth} onChange={e => update('date_of_birth', e.target.value)} style={{ width: '100%', padding: 16, background: '#1a1a1a', border: 'none', borderRadius: 10, color: '#fff', fontSize: 18 }} />
        {profileData.date_of_birth && calculateAge(profileData.date_of_birth) && (
          <p style={{ color: BRAND_RED, marginTop: 15 }}>✅ Age: {calculateAge(profileData.date_of_birth)}</p>
        )}
      </>}
      {step === 6 && <>
        <h2 style={{ fontSize: 28, marginBottom: 25 }}>Your height</h2>
        <div style={{ display: 'flex', gap: 15 }}>
          <input type="number" placeholder="Feet" value={profileData.height_ft} onChange={e => update('height_ft', e.target.value)} style={{ flex: 1, padding: 16, background: '#1a1a1a', border: 'none', borderRadius: 10, color: '#fff', fontSize: 16 }} />
          <input type="number" placeholder="Inches" value={profileData.height_in} onChange={e => update('height_in', e.target.value)} style={{ flex: 1, padding: 16, background: '#1a1a1a', border: 'none', borderRadius: 10, color: '#fff', fontSize: 16 }} />
        </div>
      </>}
      {step === 7 && <>
        <h2 style={{ fontSize: 28, marginBottom: 25 }}>A bit more about you</h2>
        <input placeholder="What do you do? (Job / Role)" value={profileData.job} onChange={e => update('job', e.target.value)} style={{ width: '100%', padding: 16, marginBottom: 12, background: '#1a1a1a', border: 'none', borderRadius: 10, color: '#fff', fontSize: 16 }} />
        <textarea placeholder="Short bio — tell us about yourself" value={profileData.bio} onChange={e => update('bio', e.target.value)} rows={3} style={{ width: '100%', padding: 16, marginBottom: 12, background: '#1a1a1a', border: 'none', borderRadius: 10, color: '#fff', fontSize: 16 }} />
        <input placeholder="Hobbies & interests" value={profileData.hobbies} onChange={e => update('hobbies', e.target.value)} style={{ width: '100%', padding: 16, marginBottom: 12, background: '#1a1a1a', border: 'none', borderRadius: 10, color: '#fff', fontSize: 16 }} />
        <input placeholder="Favourite music / artists" value={profileData.music} onChange={e => update('music', e.target.value)} style={{ width: '100%', padding: 16, marginBottom: 12, background: '#1a1a1a', border: 'none', borderRadius: 10, color: '#fff', fontSize: 16 }} />
        <input placeholder="Favourite quote or motto" value={profileData.quote} onChange={e => update('quote', e.target.value)} style={{ width: '100%', padding: 16, background: '#1a1a1a', border: 'none', borderRadius: 10, color: '#fff', fontSize: 16 }} />
      </>}
      {step === 8 && <>
        <h2 style={{ fontSize: 28, marginBottom: 25 }}>What are you looking for?</h2>
        {['Singles dating', 'Couples / double dates', 'Just friends', 'Community chat'].map(opt => (
          <button key={opt} onClick={() => {
            const arr = profileData.looking_for
            update('looking_for', arr.includes(opt) ? arr.filter(x => x !== opt) : [...arr, opt])
          }} style={{ width: '100%', padding: 16, marginBottom: 10, background: profileData.looking_for.includes(opt) ? BRAND_RED : '#1a1a1a', border: 'none', borderRadius: 10, color: '#fff', fontSize: 16 }}>
            {profileData.looking_for.includes(opt) ? '✅ ' : '  '}{opt}
          </button>
        ))}
      </>}
      <button 
        onClick={saveAndNext} 
        disabled={saving} 
        style={{ width: '100%', padding: 18, marginTop: 30, background: BRAND_RED, color: '#fff', border: 'none', borderRadius: 12, fontSize: 18, fontWeight: 'bold' }}
      >
        {saving ? 'Saving…' : step === 8 ? '🎉 Finish & Start' : 'Continue →'}
      </button>
    </div>
  )
}

function Home({ me, choose, openShorts, openRoom, openSpeed, openDateNight, setPage }) {
  const displayName = me?.display_name || 'Friend'
  const age = calculateAge(me?.date_of_birth)
  return (
    <main className="scroll">
      <p className="eyebrow">HELLO, {displayName.toUpperCase()}</p>
      <h1>Who are you<br /><em>looking for?</em></h1>
      <p className="muted">Choose how you want to connect today.</p>
      <button className="dateNightHero" onClick={openDateNight}>
        <span className="dateNightIcon"><HeartHandshake fill="currentColor" /></span>
        <span><b>Date Night</b><small>Meet someone local, match, choose a date and meet on video at 8pm UK time.</small></span>
        <CalendarDays />
      </button>
      <button className="shortsHero" onClick={openShorts}>
        <span className="shortsIcon"><Play fill="currentColor" /></span>
        <span><b>Shorts</b><small>Watch up to 60-second videos from people on {APP_NAME}.</small></span>
        <Video />
      </button>
      <button className="speedHero" onClick={openSpeed}>
        <span className="speedIcon"><Zap fill="currentColor" /></span>
        <span><b>Speed dating</b><small>2-minute video dates on Saturday & Sunday, 8:00–8:30pm.</small></span>
        <Timer />
      </button>
      <button className="roomHero" onClick={openRoom}>
        <span className="roomIcon"><MessageCircle fill="currentColor" /></span>
        <span><b>Chat room</b><small>Join the live community chat — messages, emojis, GIFs, links, photos and videos.</small></span>
        <Users />
      </button>
      {Object.entries(P).map(([k, x]) => {
        let I = x[3]
        const locked = k === 'after' && me.age_verification_status !== 'verified'
        return (
          <button className="platform" style={{ '--a': x[2], opacity: locked ? .65 : 1 }} onClick={() => locked ? alert('After Dark is locked until stronger age verification is completed.') : choose(k)} key={k}>
            <I />
            <span><b>{x[0]}</b><small>{locked ? '18+ verified adults only' : x[1]}</small></span>
            {locked ? <Lock /> : <>›</>}
          </button>
        )
      })}
      <div style={{ marginTop: 30, paddingTop: 20, borderTop: '1px solid #222' }}>
        <h3 style={{ color: '#888', fontSize: 14 }}>Quick Access</h3>
        {[
          { title: '🔍 Discover', desc: 'Browse profiles', page: 'discover' },
          { title: '💬 Matches', desc: 'Your connections', page: 'matches' },
          { title: '👤 My Profile', desc: 'View & edit', page: 'profile' },
          { title: '⚙️ Settings', desc: 'Account & safety', page: 'settings' },
        ].map(item => (
          <button 
            key={item.page} 
            onClick={() => setPage(item.page)} 
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: 14, background: '#1a1a1a', border: 'none', borderRadius: 10, color: '#fff', marginBottom: 8 }}
          >
            <div><b>{item.title}</b><br /><small style={{ color: '#777' }}>{item.desc}</small></div>
            <ChevronRight size={16} color="#666" />
          </button>
        ))}
      </div>
    </main>
  )
}

function DateNight({ me, openChat, startCall, back }) {
  const [enabled, setEnabled] = useState(!!me
