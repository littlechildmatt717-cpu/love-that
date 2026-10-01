import React, { useEffect, useState, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Heart, Users, UsersRound, Flame, MessageCircle, UserRound, Settings, ArrowLeft, Shield, Send, X,
  Sparkles, Play, Video, Image as ImageIcon, RefreshCw
} from 'lucide-react'
import { supabase } from './lib/supabase'
import './styles.css'

const APP_NAME = 'love that'
const P = {
  singles: ['Meet someone new','One-to-one dating','#E8654F',Heart],
  couples: ['Find a double date','Meet people together','#E3AC3E',UsersRound],
  friends: ['No romance, just people','Make genuine connections','#3FB9A8',Users],
  after: ['18+ chat only','Consenting adults only','#B85AC4',Flame]
}
const identities = ['Woman','Man','Non-binary','Trans woman','Trans man']
const seeking = ['Men','Women','Men & women','Double dates','Non-binary people','Everyone']
const goals = ['A relationship','Casual dating','New friends','Flirty chat','Not sure yet']

const identityDb = {Woman:'woman',Man:'man','Non-binary:'non_binary','Trans woman':'trans_woman','Trans man':'trans_man'}
const goalDb = {'A relationship':'relationship','Casual dating':'casual_dating','New friends':'new_friends','Flirty chat':'flirty_chat','Not sure yet':'not_sure'}
const seekingDb = {'Men':'men','Women':'women','Men & women':'men_women','Double dates':'double_dates','Non-binary people':'non_binary','Everyone':'everyone'}

// --- Helpers ---
async function getPrimaryPhotoUrl(userId) {
  try {
    const { data } = await supabase.functions.invoke('profile-photo-url', { body: { user_id: userId } })
    return data?.photos?.[0]?.url || null
  } catch { return null }
}

async function getBioVideo(userId) {
  try {
    const { data } = await supabase.from('short_videos')
      .select('*').eq('user_id', userId).eq('is_bio_video', true).maybeSingle()
    if (!data) return null
    if (data.storage_path) {
      const { data: urlData } = await supabase.storage
        .from('profile-videos')
        .createSignedUrl(data.storage_path, 31536000)
      return { ...data, video_url: urlData?.signedUrl || data.video_url }
    }
    return data
  } catch { return null }
}

function mediaExtension(file, mime) {
  if (file.name.includes('.')) return file.name.split('.').pop().toLowerCase()
  const map = {'image/jpeg':'jpg','image/png':'png','image/gif':'gif','video/mp4':'mp4'}
  return map[mime] || 'bin'
}
function makeUploadId() { return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}` }
async function getVideoDuration(file) {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video')
    v.preload = 'metadata'
    v.onloadedmetadata = () => { URL.revokeObjectURL(v.src); resolve(v.duration) }
    v.onerror = () => reject(new Error('Cannot read video'))
    v.src = URL.createObjectURL(file)
  })
}

// --- App ---
function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [gate, setGate] = useState(localStorage.getItem('love_that_gate') === '1')
  const [authMode, setAuthMode] = useState('signup')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState('home')
  const [platform, setPlatform] = useState('singles')
  const [discover, setDiscover] = useState([])
  const [matches, setMatches] = useState([])
  const [error, setError] = useState('')
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(null)
  const [bioVideo, setBioVideo] = useState(null)

  useEffect(() => {
    let alive = true
    async function restoreSession() {
      try {
        const { data: { session: s } } = await supabase.auth.getSession()
        if (!alive) return
        setSession(s)
        if (s) await loadProfile(s.user.id)
      } catch (e) { setError(e.message || 'Could not restore session.') }
      finally { if (alive) setLoading(false) }
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, s) => {
      if (!alive) return
      setSession(s)
      if (!s) { setProfile(null); return }
      await loadProfile(s.user.id)
      setLoading(false)
    })
    restoreSession()
    return () => { alive = false; subscription.unsubscribe() }
  }, [])

  async function loadProfile(uid) {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle()
    let prof = data
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const meta = user?.user_metadata || {}
      if (!prof && user) {
        const age = Number(meta.age || 0)
        if (age >= 18 && age <= 120) {
          const payload = {
            id: uid,
            display_name: meta.display_name || user.email?.split('@')[0] || 'Member',
            age,
            identity: identityDb[meta.identity] || 'prefer_not_to_say',
            location: meta.location || '',
            goal: goalDb[meta.goal] || null,
            seeking: Array.isArray(meta.seeking) ? meta.seeking.map(x => seekingDb[x]).filter(Boolean) : [],
            platform: meta.platform || 'singles'
          }
          const { data: created } = await supabase.from('profiles').upsert(payload).select('*').single()
          prof = created
        }
      }
    } catch (e) { console.error(e) }
    setProfile(prof)
    if (prof?.id) {
      setProfilePhotoUrl(await getPrimaryPhotoUrl(prof.id))
      setBioVideo(await getBioVideo(prof.id))
    }
  }

  async function loadDiscover(p) {
    setError('')
    const { data } = await supabase.from('profiles')
      .select('*').eq('is_active', true).neq('id', session.user.id).eq('platform', p).limit(30)
    setDiscover(await Promise.all((data || []).map(async x => ({ ...x, photo: await getPrimaryPhotoUrl(x.id) }))))
  }

  async function loadMatches() {
    if (!session) return
    const { data } = await supabase.from('matches')
      .select('*').or(`user_a.eq.${session.user.id},user_b.eq.${session.user.id}`)
      .order('created_at', { ascending: false })
    const ids = (data || []).map(m => m.user_a === session.user.id ? m.user_b : m.user_a)
    if (!ids.length) { setMatches([]); return }
    const { data: ps } = await supabase.from('profiles').select('*').in('id', ids)
    setMatches(await Promise.all((ps || []).map(async p => ({ ...p, photo: await getPrimaryPhotoUrl(p.id) }))))
  }

  if (loading) return <div className="gate"><h1>Loading {APP_NAME}…</h1></div>
  if (!gate) return <Gate go={() => { localStorage.setItem('love_that_gate', '1'); setGate(true) }} />
  if (!session || !profile) return <Auth mode={authMode} setMode={setAuthMode} error={error} setError={setError} onReady={async s => {
    setSession(s); setLoading(true); await loadProfile(s.user.id); setLoading(false)
  }} />

  return (
    <div className="app">
      <header>
        <b>{APP_NAME}</b>
        <button onClick={() => setPage('settings')}><Settings /></button>
      </header>
      {error && <div className="error">{error}</div>}

      {page === 'home' && <Home me={profile} choose={(p) => { setPlatform(p); setPage('discover'); loadDiscover(p) }} openShorts={() => setPage('shorts')} openChatRoom={() => setPage('chatroom')} />}
      {page === 'shorts' && <Shorts me={profile} back={() => setPage('home')} />}
      {page === 'discover' && <Discover me={profile} platform={platform} people={discover} like={async (p) => {
        setError('')
        try {
          const res = await supabase.functions.invoke('like-user', { body: { to_user_id: p.id } })
          if (res.error) throw new Error(res.error.message || 'Function error — check like-user Edge Function')
          if (res.data?.match) {
            alert(`🎉 It's a match with ${p.display_name}!`)
            await loadMatches()
          }
          setDiscover(v => v.filter(x => x.id !== p.id))
        } catch (err) {
          setError(`Could not like: ${err.message}`)
          console.error('Like error:', err)
        }
      }} back={() => setPage('home')} refresh={loadDiscover} />}
      {page === 'matches' && <Matches people={matches} load={loadMatches} back={() => setPage('home')} />}
      {page === 'profile' && <Profile me={profile} photoUrl={profilePhotoUrl} bioVideo={bioVideo} onPhotoUpdate={setProfilePhotoUrl} onVideoUpdate={setBioVideo} />}
      {page === 'chatroom' && <ChatRoom me={profile} back={() => setPage('home')} />}
      {page === 'settings' && <Settings signOut={async () => { await supabase.auth.signOut(); setPage('home') }} />}

      <nav>
        <button onClick={() => setPage('home')}><Sparkles />Discover</button>
        <button onClick={() => setPage('shorts')}><Play />Shorts</button>
        <button onClick={() => setPage('chatroom')}><MessageCircle />Chat Room</button>
        <button onClick={() => setPage('profile')}><UserRound />Profile</button>
      </nav>
    </div>
  )
}

// --- Gate ---
function Gate({ go }) {
  return (
    <div className="gate">
      <h1>Welcome to love that</h1>
      <p>Meet people, make genuine connections.</p>
      <button className="primary" onClick={go}>I am 18 or older — Enter</button>
    </div>
  )
}

// --- Auth ---
function Auth({ mode, setMode, error, setError, onReady }) {
  const [email, setEmail] = useState(''), [password, setPassword] = useState('')
  const [p, setP] = useState({ name: '', dob: '', identity: '', location: '', goal: '', seeking: ['Everyone'] })
  const [busy, setBusy] = useState(false)

  function ageFromDob(d) {
    if (!d) return 0
    const dob = new Date(d + 'T00:00:00'), now = new Date()
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
        if (data.session) onReady(data.session)
        return
      }
      const age = ageFromDob(p.dob)
      if (!p.name || age < 18 || !p.identity || !p.goal) throw new Error('Fill all required fields')
      const { data, error } = await supabase.auth.signUp({
        email, password,
        data: {
          display_name: p.name, age, date_of_birth: p.dob,
          identity: identityDb[p.identity], location: p.location,
          goal: goalDb[p.goal], seeking: p.seeking.map(x => seekingDb[x]).filter(Boolean)
        }
      })
      if (error) throw error
      if (data.session) onReady(data.session)
      else alert('Check email to verify, then sign in.')
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  return (
    <div className="authPage">
      <h1>{mode === 'login' ? 'Sign In' : 'Create Account'}</h1>
      <form onSubmit={submit}>
        <label>Email<input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>
        <label>Password<input type="password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} /></label>
        {mode === 'signup' && <>
          <label>Name<input required value={p.name} onChange={e => setP({...p, name:e.target.value})} /></label>
          <label>Date of birth<input type="date" required value={p.dob} onChange={e => setP({...p, dob:e.target.value})} /></label>
          <div className="choice"><b>I identify as:</b>{identities.map(x => (
            <button type="button" className={p.identity===x?'sel':''} onClick={()=>setP({...p,identity:x})} key={x}>{x}</button>
          ))}</div>
          <div className="choice"><b>Looking for:</b>{seeking.map(x => {
            const sel = p.seeking.includes(x)
            return <button type="button" className={sel?'sel':''} onClick={()=>setP({...p,seeking:sel?p.seeking.filter(y=>y!==x):[...p.seeking,x]})} key={x}>{sel?'✓ ':''}{
