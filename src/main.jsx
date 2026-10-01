// --- Chat Room ---
function ChatRoom({ me, back }) {
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const messagesEndRef = useRef(null)
  const channelRef = useRef(null) // keep subscription reference

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load messages + real-time listener
  useEffect(() => {
    let isMounted = true

    async function loadMessages() {
      try {
        const { data, error } = await supabase.from('chat_room')
          .select('*,profiles(display_name)')
          .order('created_at', { ascending: true })
          .limit(100)
        
        if (!isMounted) return
        if (error) {
          console.error('Load error:', error)
          return
        }
        setMessages(data || [])
      } catch (err) {
        console.error('Load exception:', err)
      }
    }

    // Initial load
    loadMessages()

    // Real-time subscription
    channelRef.current = supabase.channel('public_chat')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_room'
        },
        async (payload) => {
          console.log('📥 New message received:', payload)
          
          // Fetch full message with profile info
          const { data } = await supabase.from('chat_room')
            .select('*,profiles(display_name)')
            .eq('id', payload.new.id)
            .maybeSingle()
          
          if (data && isMounted) {
            setMessages(prev => [...prev, data])
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status)
      })

    // Cleanup
    return () => {
      isMounted = false
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [])

  async function sendMessage(e) {
    e?.preventDefault()
    if (!newMessage.trim() || sending) return
    
    setSending(true)
    const textToSend = newMessage.trim()
    setNewMessage('') // clear input immediately
    
    try {
      const { error } = await supabase.from('chat_room').insert({
        user_id: me.id,
        content: textToSend,
        type: 'text'
      })
      
      if (error) throw error
      
      // ✅ Locally add message immediately (optimistic update)
      const tempMessage = {
        id: Date.now(),
        user_id: me.id,
        content: textToSend,
        type: 'text',
        created_at: new Date().toISOString(),
        profiles: { display_name: me.display_name }
      }
      setMessages(prev => [...prev, tempMessage])
      
    } catch (err) {
      console.error('Send failed:', err)
      alert(`Failed to send: ${err.message}`)
      setNewMessage(textToSend) // restore text on error
    } finally {
      setSending(false)
    }
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
      
      const { error: upErr } = await supabase.storage
        .from('chat-media')
        .upload(path, file, { contentType: file.type })
      if (upErr) throw upErr
      
      const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(path)
      
      const { error: insertErr } = await supabase.from('chat_room').insert({
        user_id: me.id,
        content: publicUrl,
        type: 'image'
      })
      if (insertErr) throw insertErr
      
    } catch (err) {
      alert(`Image failed: ${err.message}`)
      console.error('Image upload error:', err)
    } finally {
      setUploadingImage(false)
    }
  }

  return (
    <div className="chatRoomPage">
      <div className="chatHeader">
        <button onClick={back} className="backBtn"><ArrowLeft /></button>
        <div>
          <h2>Chat room</h2>
          <p>Everyone in the room</p>
        </div>
        <button onClick={async () => {
          // Manual refresh button
          const { data } = await supabase.from('chat_room')
            .select('*,profiles(display_name)')
            .order('created_at', { ascending: true })
            .limit(100)
          setMessages(data || [])
        }} className="refreshBtn"><RefreshCw /></button>
      </div>
      
      <div className="chatNotice">
        <Shield size={18} />
        <p>Be respectful. This is a public 18+ community room.</p>
      </div>
      
      <div className="messagesArea">
        {messages.length === 0 && (
          <p className="noMessages">No messages yet — be the first to say hi!</p>
        )}
        
        {messages.map((msg, i) => {
          const isMe = msg.user_id === me.id
          return (
            <div key={msg.id || i} className={`messageBubble ${isMe ? 'myMessage' : 'otherMessage'}`}>
              <div className="messageSender">
                {msg.profiles?.display_name || 'Someone'}
              </div>
              
              {msg.type === 'text' && (
                <p className="messageText">{msg.content}</p>
              )}
              
              {msg.type === 'image' && (
                <img 
                  src={msg.content} 
                  alt="Shared" 
                  className="messageImage"
                  loading="lazy"
                />
              )}
              
              <span className="messageTime">
                {new Date(msg.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          )
        })}
        
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={sendMessage} className="messageInputArea">
        <label className="attachBtn" title="Send image">
          <input 
            type="file" 
            accept="image/*" 
            onChange={sendImage} 
            disabled={uploadingImage} 
            hidden 
          />
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
        
        <button 
          type="submit" 
          className="sendBtn" 
          disabled={sending || !newMessage.trim()}
        >
          <Send size={22} />
        </button>
      </form>
    </div>
  )
}
