import React, { useEffect, useState, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Heart, Users, UsersRound, Flame, MessageCircle, UserRound, Settings as SettingsIcon, ArrowLeft, Shield, Send, X,
  Sparkles, Play, Image as ImageIcon, RefreshCw
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

const identityDb = {Woman:'woman',Man:'man','Non-binary':'non_binary','Trans woman':'trans_woman','Trans man':'trans_man'}
const goalDb = {'A relationship':'relationship','Casual dating':'casual_dating','New friends':'new_friends','Flirty chat':'flirty_chat','Not sure yet':'not_sure'}
const seekingDb = {'Men':'men','Women':'women','Men & women':'men_women','Double dates':'double_dates','Non-binary people':'non_binary','Everyone':'everyone'}

// --- Like Limit Config ---
const MAX_LIKES_PER_24H = 20

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
  const [likeCount24h, setLikeCount24h] = useState(0)
  const [likesRemaining, setLikesRemaining] = useState(MAX_LIKES_PER_24H)

  useEffect(() => {
    if (session?.user) countLikesLast24h(session.user.id)
  }, [session?.user])

  async function countLikesLast24h(userId) {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { count, error } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('from_user_id', userId)
        .gte('created_at', oneDayAgo)
      
      if (!error) {
        setLikeCount24h(count || 0)
        setLikesRemaining(MAX_LIKES_PER_24H - (count || 0))
      }
    } catch (e) { console.error('Counting likes:', e) }
  }

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

  async function likePerson(person) {
    setError('')
    
    if (likesRemaining <= 0) {
      setError(`⚠️ You've used all ${MAX_LIKES_PER_24H} likes for today. Come back tomorrow!`)
      return
    }

    try {
      const res = await supabase.functions.invoke('like-user', { body: { to_user_id: person.id } })
      
      if (res.error) {
        console.warn('Function error — using direct DB fallback')
        const { error: insertErr } = await supabase.from('likes').insert({
          from_user_id: session.user.id,
          to_user_id: person.id
        })
        if (insertErr && !insertErr.message.includes('duplicate')) throw insertErr
      }

      setLikeCount24h(prev => prev + 1)
      setLikesRemaining(prev => prev - 1)

      if (res.data?.match) {
        alert(`🎉 It's a match with ${person.display_name}!`)
        await loadMatches()
      }

      setDiscover(v => v.filter(x => x.id !== person.id))
    } catch (err) {
      setError(`Could not like: ${err.message}`)
      console.error('Like error:', err)
    }
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
        <button onClick={() => setPage('settings')}><SettingsIcon /></button>
      </header>
      {error && <div className="error">{error}</div>}

      {page === 'home' && <Home me={profile} choose={(p) => { setPlatform(p); setPage('discover'); loadDiscover(p) }} openShorts={() => setPage('shorts')} openChatRoom={() => setPage('chatroom')} />}
      {page === 'shorts' && <Shorts me={profile} back={() => setPage('home')} />}
      {page === 'discover' && <Discover 
        me={profile} 
        platform={platform} 
        people={discover} 
        like={likePerson} 
        likesRemaining={likesRemaining}
        maxLikes={MAX_LIKES_PER_24H}
        back={() => setPage('home')} 
      />}
      {page === 'matches' && <Matches people={matches} load={loadMatches} back={() => setPage('home')} />}
      {page === 'profile' && <Profile me={profile} photoUrl={profilePhotoUrl} bioVideo={bioVideo} onPhotoUpdate={setProfilePhotoUrl} onVideoUpdate={setBioVideo} />}
      {page === 'chatroom' && <ChatRoom me={profile} back={() => setPage('home')} />}
      {page === 'settings' && <SettingsPage signOut={async () => { await supabase.auth.signOut(); setPage('home') }} />}

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
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
          <label>Name<input required value={p.name} onChange={e => setP({...p, name: e.target.value})} /></label>
          <label>Date of birth<input type="date" required value={p.dob} onChange={e => setP({...p, dob: e.target.value})} /></label>
          <div className="choice"><b>I identify as:</b>{identities.map(x => (
            <button type="button" className={p.identity === x ? 'sel' : ''} onClick={() => setP({...p, identity: x})} key={x}>{x}</button>
          ))}</div>
          <div className="choice"><b>Looking for:</b>{seeking.map(x => {
            const sel = p.seeking.includes(x)
            return <button type="button" className={sel ? 'sel' : ''} onClick={() => setP({...p, seeking: sel ? p.seeking.filter(y => y !== x) : [...p.seeking, x]})} key={x}>{sel ? '✓ ' : ''}{x}</button>
          })}</div>
          <div className="choice"><b>My goal:</b>{goals.map(x => (
            <button type="button" className={p.goal === x ? 'sel' : ''} onClick={() => setP({...p, goal: x})} key={x}>{x}</button>
          ))}</div>
        </>}
        {error && <p className="error">{error}</p>}
        <button className="primary" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}</button>
      </form>
      <button className="link" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
        {mode === 'login' ? 'Create account' : 'Sign in'}
      </button>
    </div>
  )
}

// --- Home ---
function Home({ me, choose, openShorts, openChatRoom }) {
  return (
    <main className="homePage">
      <p className="greeting">Hello, {me.display_name}!</p>
      <button className="chatRoomHero" onClick={openChatRoom}>
        <MessageCircle size={28} />
        <span><b>Public Chat Room</b><small>Chat with everyone in the community</small></span>
        ›
      </button>
      <button className="shortsHero" onClick={openShorts}>
        <Play fill="currentColor" />
        <span><b>Shorts</b><small>Watch & share 60s videos</small></span>
        ›
      </button>
      {Object.entries(P).map(([k, x]) => {
        const Icon = x[3]
        return (
          <button className="platformBtn" key={k} onClick={() => choose(k)} style={{'--color': x[2]}}>
            <Icon />
            <span><b>{x[0]}</b><small>{x[1]}</small></span>
            ›
          </button>
        )
      })}
    </main>
  )
}

// --- Chat Room ---
function ChatRoom({ me, back }) {
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    loadMessages()
    const channel = supabase.channel('public_chat')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_room' }, (payload) => {
        setMessages(prev => [...prev, payload.new])
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  async function loadMessages() {
    const { data } = await supabase.from('chat_room')
      .select('*,profiles(display_name)')
      .order('created_at', { ascending: true })
      .limit(100)
    if (data) setMessages(data)
  }

  async function sendMessage(e) {
    e?.preventDefault()
    if (!newMessage.trim() || sending) return
    setSending(true)
    try {
      await supabase.from('chat_room').insert({
        user_id: me.id,
        content: newMessage.trim(),
        type: 'text'
      })
      setNewMessage('')
    } catch (err) {
      alert(`Failed to send: ${err.message}`)
    } finally { setSending(false) }
  }

  async function sendImage(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { alert('Only images allowed'); return }
    if (file.size > 5 * 1024 * 1024) { alert('Image too large (max 5MB)'); return }
    setUploadingImage(true)
    try {
      const ext = mediaExtension(file, file.type)
      const path = `chat-media/${me.id}/${makeUploadId()}.${ext}`
      const { error: upErr } = await supabase.storage.from('chat-media').upload(path, file, { contentType: file.type })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('chat-media').getPublicUrl(path)
      await supabase.from('chat_room').insert({ user_id: me.id, content: publicUrl, type: 'image' })
    } catch (err) { alert(`Image failed: ${err.message}`) }
    finally { setUploadingImage(false) }
  }

  return (
    <div className="chatRoomPage">
      <div className="chatHeader">
        <button onClick={back} className="backBtn"><ArrowLeft /></button>
        <div>
          <h2>Chat room</h2>
          <p>Everyone in the room</p>
        </div>
        <button onClick={loadMessages} className="refreshBtn"><RefreshCw /></button>
      </div>
      <div className="chatNotice">
        <Shield size={18} />
        <p>Be respectful. This is a public 18+ community room.</p>
      </div>
      <div className="messagesArea">
        {messages.length === 0 && <p className="noMessages">No messages yet — be the first to say hi!</p>}
        {messages.map((msg, i) => {
          const isMe = msg.user_id === me.id
          return (
            <div key={i} className={`messageBubble ${isMe ? 'myMessage' : 'otherMessage'}`}>
              <div className="messageSender">{msg.profiles?.display_name || 'Someone'}</div>
              {msg.type === 'text' && <p className="messageText">{msg.content}</p>}
              {msg.type === 'image' && <img src={msg.content} alt="Shared" className="messageImage" />}
              <span className="messageTime">{new Date(msg.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={sendMessage} className="messageInputArea">
        <label className="attachBtn" title="Send image">
          <input type="file" accept="image/*" onChange={sendImage} disabled={uploadingImage} hidden />
          <ImageIcon size={22} />
        </label>
        <input
          type="text"
          className="textInput"
          placeholder="Type a message…"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          disabled={sending}
          autoComplete="off"
        />
        <button type="submit" className="sendBtn" disabled={sending || !newMessage.trim()}>
          <Send size={22} />
        </button>
      </form>
    </div>
  )
}

// --- Shorts ---
function Shorts({ me, back }) {
  const [videos, setVideos] = useState([])
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    supabase.from('short_videos')
      .select('*,profiles(display_name,age)')
      .eq('status', 'approved')
      .neq('user_id', me.id)
      .order('created_at', {ascending:false})
      .limit(30)
      .then(({data}) => setVideos(data||[]))
  }, [me.id])

  if (!videos.length) return <div className="page"><button onClick={back}><ArrowLeft /> Back</button><p>No Shorts yet</p></div>
  const v = videos[idx]
  return (
    <div className="shortsPage">
      <button onClick={back}><ArrowLeft /> Back</button>
      <video src={v.video_url} controls autoPlay loop muted playsInline className="shortVideo" />
      <p>{v.profiles?.display_name}, {v.profiles?.age}</p>
      <div className="shortsNav">
        <button disabled={idx===0} onClick={()=>setIdx(i=>i-1)}>‹ Prev</button>
        <span>{idx+1}/{videos.length}</span>
        <button disabled={idx===videos.length-1} onClick={()=>setIdx(i=>i+1)}>Next ›</button>
      </div>
    </div>
  )
}

// --- Discover WITH Like Limit ---
function Discover({ platform, people, like, likesRemaining, maxLikes, back }) {
  const p = people[0]
  const platformData = P[platform]
  const isLimitReached = likesRemaining <= 0

  return (
    <div className="discoverPage">
      <button className="backBtn" onClick={back}><ArrowLeft /></button>
      <h2>{platformData[0]}</h2>
      
      <div className="likeCounter" style={{textAlign:'center', padding:'8px 16px', background: isLimitReached ? '#ff3b3020' : '#34c75920', borderRadius:'20px', marginBottom:'12px'}}>
        <strong style={{color: isLimitReached ? '#ff3b30' : '#34c759'}}>
          {likesRemaining} / {maxLikes} likes remaining today
        </strong>
      </div>

      {p ? (
        <div className="profileCard">
          {p.photo ? (
            <img src={p.photo} alt={p.display_name} className="cardPhoto" />
          ) : (
            <div className="noPhoto"><UserRound size={48} /></div>
          )}
          <h2>{p.display_name}, {p.age}</h2>
          {p.location && <p className="location">{p.location}</p>}
          <div className="cardActions">
            <button className="passBtn" onClick={back} aria-label="Pass"><X size={28} /></button>
            <button 
              className="likeBtn" 
              onClick={() => like(p)} 
              aria-label="Like"
              disabled={isLimitReached}
              style={{opacity: isLimitReached ? 0.5 : 1, cursor: isLimitReached ? 'not-allowed' : 'pointer'}}
            >
              <Heart size={32} fill="currentColor" />
            </button>
          </div>
        </div>
      ) : (
        <div className="emptyState">
          <Heart size={48} />
          <h3>No more profiles right now</h3>
          <p>Check back later for new people!</p>
        </div>
      )}
    </div>
  )
}

// --- Matches ---
function Matches({ people, load, back }) {
  return (
    <div className="matchesPage">
      <button onClick={back}><ArrowLeft /> Back</button>
      <h2>Your Matches</h2>
      {!people.length ? (
        <p>No matches yet — keep liking people!</p>
      ) : people.map(person => (
        <div key={person.id} className="matchItem">
          {person.photo ? (
            <img src={person.photo} alt={person.display_name} className="matchAvatar" />
          ) : (
            <div className="matchAvatar">{person.display_name?.[0]}</div>
          )}
          <span>{person.display_name}, {person.age}</span>
        </div>
      ))}
      <button onClick={load}>Refresh</button>
    </div>
  )
}

// --- Profile ---
function Profile({ me, photoUrl, bioVideo, onPhotoUpdate, onVideoUpdate }) {
  const [message, setMessage] = useState('')

  async function uploadPhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setMessage('❌ Not an image'); return }
    const ext = mediaExtension(file, file.type)
    const path = `${me.id}/${makeUploadId()}.${ext}`
    const { error: upErr } = await supabase.storage.from('profile-photos').upload(path, file, { contentType: file.type })
    if (upErr) { setMessage(`❌ ${upErr.message}`); return }
    const { data: { publicUrl } } = supabase.storage.from('profile-photos').getPublicUrl(path)
    await supabase.from('profile_photos').insert({ user_id: me.id, storage_path: path, is_primary: true })
    onPhotoUpdate(publicUrl)
    setMessage('✅ Photo uploaded')
  }

  async function uploadBioVideo(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('video/')) { setMessage('❌ Not a video'); return }
    if (await getVideoDuration(file) > 60) { setMessage('❌ Video must be under 60 seconds'); return }

    await supabase.from('short_videos').delete().match({ user_id: me.id, is_bio_video: true })

    const ext = mediaExtension(file, file.type)
    const path = `${me.id}/bio-${makeUploadId()}.${ext}`
    const { error: upErr } = await supabase.storage.from('profile-videos').upload(path, file, { contentType: file.type })
    if (upErr) { setMessage(`❌ ${upErr.message}`); return }

    const { data: urlData } = await supabase.storage.from('profile-videos').createSignedUrl(path, 31536000)
    const { data: newVideo } = await supabase.from('short_videos').insert({
      user_id: me.id, video_url: urlData.signedUrl, storage_path: path, is_bio_video: true, status: 'approved'
    }).select().single()

    onVideoUpdate(newVideo)
    setMessage('✅ Bio video updated')
  }

  return (
    <div className="profilePage">
      <div className="avatarCircle">
        {photoUrl ? <img src={photoUrl} alt={me.display_name} /> : <span>{me.display_name?.[0]}</span>}
      </div>
      <h2>{me.display_name}, {me.age}</h2>
      <p>{me.location || 'Set your location'}</p>

      {bioVideo && (
        <div className="bioVideo">
          <video src={bioVideo.video_url} controls autoPlay loop muted playsInline />
        </div>
      )}

      <label>
        <b>Profile Photo</b>
        <input type="file" accept="image/*" onChange={uploadPhoto} />
      </label>

      <label>
        <b>Bio Video (replaces old automatically)</b>
        <input type="file" accept="video/*" onChange={uploadBioVideo} />
      </label>

      {message && <p>{message}</p>}
    </div>
  )
}

// --- SettingsPage (renamed to avoid conflict) ---
function SettingsPage({ signOut }) {
  return (
    <div className="settingsPage">
      <h2>Settings</h2>
      <button onClick={signOut} className="signOutBtn">Sign Out</button>
    </div>
  )
}

const root = createRoot(document.getElementById('root'))
root.render(<App />)
