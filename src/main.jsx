import React, { useEffect, useState, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { 
  Heart, Users, UsersRound, Flame, MessageCircle, UserRound, 
  Settings as SettingsIcon, ArrowLeft, Shield, Send, X, Trash2, 
  Sparkles, LogIn, Flag, Lock, Play, Video, Image as ImageIcon, 
  Smile, Link as LinkIcon, FileVideo, RefreshCw, Phone, PhoneOff, 
  Mic, MicOff, Camera, CameraOff, Timer, Zap, CalendarDays, 
  MapPin, CheckCircle2, HeartHandshake
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

// --- App ---
function App() {
  const [page, setPage] = useState('splash')
  const [me, setMe] = useState(null)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setMe(session.user)
        const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
        setProfile(data)
        setPage('home')
      } else {
        setMe(null); setProfile(null); setPage('splash')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  if (page === 'splash') return <Splash setPage={setPage} />
  if (!me) return <div className="gate"><p>Loading…</p></div>
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

// --- Splash / Auth ---
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
      await supabase.from('profiles').insert({ id: data.user.id, display_name: name.trim() })
      setPage('home')
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

// --- Home ---
function Home({ me, profile, setPage }) {
  return (
    <div className="app">
      <header>
        <b>{APP_NAME}</b>
        <button onClick={() => setPage('settings')}><SettingsIcon size={22} /></button>
      </header>
      
      <main className="homePage">
        <h2 className="greeting">Hello, {profile.display_name}!</h2>
        
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

// --- Navigation ---
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

// --- Chat Room ---
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

// --- Discover ---
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

// --- Shorts ---
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

// --- Profile ---
function Profile({ me, profile, setProfile, setPage }) {
  const [photoUrl, setPhotoUrl] = useState(profile?.avatar_url || '')
  const [uploading, setUploading] = useState(false)

  async function uploadPhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    
    try {
      const ext = mediaExtension(file, file.type)
      const fileName = `${makeUploadId()}.${ext}`
      const path = `${me.id}/${fileName}`

      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { cacheControl: '3600', upsert: true })
      
      if (upErr) throw upErr
      
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(path)
      
      const freshUrl = `${publicUrl}?t=${Date.now()}`
      
      const { error: dbErr } = await supabase.from('profiles')
        .update({ avatar_url: freshUrl })
        .eq('id', me.id)
      
      if (dbErr) throw dbErr
      
      setPhotoUrl(freshUrl)
      setProfile(prev => ({ ...prev, avatar_url: freshUrl }))
      
      alert('✅ Photo updated!')
      
    } catch (err) {
      console.error('Upload failed:', err)
      alert(`❌ Upload failed: ${err.message}`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="app">
      <header>
        <b>{APP_NAME}</b>
        <button onClick={() => setPage('settings')}><SettingsIcon size={22} /></button>
      </header>
      
      <div className="profilePage">
        {/* Avatar Circle — shows uploaded photo instantly */}
        <div className="avatarCircle">
          {photoUrl ? (
            <img 
              src={photoUrl} 
              alt="Your Profile" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{ fontSize: 48, fontWeight: 600, color: '#666' }}>
              {profile.display_name?.[0]?.toUpperCase() || 'M'}
            </span>
          )}
        </div>

        <h2>{profile.display_name}, {profile.age || '39'}</h2>
        <p style={{ color: '#8e8e93' }}>{profile.location || 'Isle of Wight'}</p>
        
        <label style={{ marginTop: 24 }}>
          <b>Profile Photo</b>
          <input 
            type="file" 
            accept="image/*" 
            onChange={uploadPhoto} 
            disabled={uploading}
            style={{ marginTop: 8 }}
          />
          {uploading && <p style={{ color: '#E8654F', marginTop: 4 }}>Uploading…</p>}
        </label>
        
        <label style={{ marginTop: 20 }}>
          <b>Bio Video</b>
          <input type="file" accept="video/*" style={{ marginTop: 8 }} />
        </label>
      </div>
      
      <Nav setPage={setPage} active="profile" />
    </div>
  )
}

// --- Settings ---
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

// --- Mount ---
createRoot(document.getElementById('root')).render(<App />)
