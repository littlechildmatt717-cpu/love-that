import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Heart, Users, UsersRound, Flame, MessageCircle, UserRound,
  Settings as SettingsIcon, ArrowLeft, Shield, Send, Image as ImageIcon,
  Sparkles, Play, RefreshCw, CalendarDays, ChevronRight, ChevronLeft,
  Eye, EyeOff, CheckCircle2, MapPin, LogIn, UserPlus
} from 'lucide-react'
import { supabase } from './lib/supabase'
import './styles.css'
import logo from './assets/love-that-logo.png'

const APP_NAME = 'love that'

const P = {
  singles: ['Meet someone new', 'One-to-one dating', '#E8654F', Heart],
  couples: ['Find a double date', 'Meet people together', '#E3AC66', UsersRound],
  friends: ['No romance, just people', 'Make genuine connections', '#8E8E93', Users],
  community: ['18+ chat only', 'Consenting adults only', '#9B59B6', Flame]
}

function makeUploadId() {
  return Math.random().toString(36).slice(2, 12)
}

function mediaExtension(file, type) {
  if (type?.startsWith('image/')) return type.replace('image/', '')
  if (type?.startsWith('video/')) return type.replace('video/', '')
  return 'bin'
}

function calculateAge(dobString) {
  if (!dobString) return null
  const dob = new Date(`${dobString}T00:00:00`)
  if (Number.isNaN(dob.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
  return age
}

function scrollToField(e) {
  setTimeout(() => e.currentTarget?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150)
}

function Field({ label, hint, error, children }) {
  return (
    <div className="fieldGroup">
      <label className="fieldLabel">{label}</label>
      {hint && <p className="fieldHint">{hint}</p>}
      {children}
      {error && <p className="fieldError">{error}</p>}
    </div>
  )
}

function TextField({ label, hint, error, ...props }) {
  return (
    <Field label={label} hint={hint} error={error}>
      <input className={`formInput ${error ? 'inputError' : ''}`} {...props} onFocus={scrollToField} />
    </Field>
  )
}

function PasswordField({ label, error, value, onChange, autoComplete }) {
  const [show, setShow] = useState(false)
  return (
    <Field label={label} error={error}>
      <div className="passwordWrap">
        <input
          className={`formInput passwordInput ${error ? 'inputError' : ''}`}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          onFocus={scrollToField}
          placeholder="At least 8 characters"
        />
        <button type="button" className="passwordToggle" onClick={() => setShow(v => !v)} aria-label={show ? 'Hide password' : 'Show password'}>
          {show ? <EyeOff size={21} /> : <Eye size={21} />}
        </button>
      </div>
    </Field>
  )
}

function DateField({ label, value, onChange, error }) {
  const maxDate = useMemo(() => {
    const d = new Date()
    d.setFullYear(d.getFullYear() - 18)
    return d.toISOString().slice(0, 10)
  }, [])

  return (
    <Field label={label} hint="You must be 18 or over to use love that." error={error}>
      <div className="dateWrap">
        <CalendarDays size={20} />
        <input
          className={`formInput dateInput ${error ? 'inputError' : ''}`}
          type="date"
          max={maxDate}
          value={value}
          onChange={onChange}
          onFocus={scrollToField}
        />
      </div>
    </Field>
  )
}

function OptionButton({ selected, onClick, children, multi = false }) {
  return (
    <button type="button" className={`optionButton ${selected ? 'selected' : ''}`} onClick={onClick}>
      {multi && selected && <span className="checkMark">✓</span>}
      {children}
    </button>
  )
}

function MobileProgress({ step, total }) {
  return (
    <div className="progressArea">
      <div className="progressTrack">
        <div className="progressFill" style={{ width: `${(step / total) * 100}%` }} />
      </div>
      <span>Step {step} of {total}</span>
    </div>
  )
}

function App() {
  const [page, setPage] = useState('splash')
  const [me, setMe] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setLoading(true)
      if (session?.user) {
        setMe(session.user)
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle()

        setProfile(data)
        setPage(data?.gender ? 'home' : 'onboarding')
      } else {
        setMe(null)
        setProfile(null)
        setPage('splash')
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <div className="gate"><div className="loadingCard"><img src={logo} alt="love that" /><p>Loading love that…</p></div></div>
  if (page === 'splash') return <Splash setPage={setPage} />
  if (!me) return <Splash setPage={setPage} />
  if (page === 'onboarding') return <Onboarding me={me} profile={profile} setProfile={setProfile} setPage={setPage} />
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
  const [mode, setMode] = useState('welcome')
  const [signupStep, setSignupStep] = useState(1)
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [name, setName] = useState('')
  const [dob, setDob] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  function reset() {
    setErr('')
    setSignupStep(1)
  }

  function validateCredentials() {
    const cleanEmail = email.trim()
    if (!cleanEmail) return 'Please enter your email address.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return 'Please enter a valid email address.'
    if (pass.length < 8) return 'Your password must be at least 8 characters.'
    return ''
  }

  function validateDetails() {
    if (!name.trim()) return 'Please enter your name.'
    if (!dob) return 'Please enter your date of birth.'
    const age = calculateAge(dob)
    if (age === null) return 'Please enter a valid date of birth.'
    if (age < 18) return 'You must be 18 or over to join love that.'
    return ''
  }

  async function signUp() {
    const credentialError = validateCredentials()
    if (credentialError) return setErr(credentialError)
    const detailError = validateDetails()
    if (detailError) return setErr(detailError)

    setBusy(true)
    setErr('')

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: pass
      })
      if (error) throw error

      if (!data.user) {
        setErr('Please check your email to confirm your account, then come back and log in.')
        return
      }

      const { error: profileError } = await supabase.from('profiles').upsert({
        id: data.user.id,
        display_name: name.trim(),
        date_of_birth: dob,
        age: calculateAge(dob)
      })
      if (profileError) throw profileError

      setPage('onboarding')
    } catch (error) {
      setErr(error.message || 'Unable to create your account.')
    } finally {
      setBusy(false)
    }
  }

  async function signIn() {
    const credentialError = validateCredentials()
    if (credentialError) return setErr(credentialError)

    setBusy(true)
    setErr('')

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pass
      })
      if (error) throw error
    } catch (error) {
      setErr(error.message || 'Unable to sign in.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="gate authGate">
      <div className="authCard">
        <img src={logo} className="authLogo" alt="love that logo" />

        {mode === 'welcome' && (
          <>
            <h1>Welcome to love that</h1>
            <p className="authIntro">Real accounts, secure sessions and cloud profiles.</p>
            <button className="primary largeButton" onClick={() => { reset(); setMode('login') }}>
              <LogIn size={20} /> Log in
            </button>
            <button className="secondaryButton largeButton" onClick={() => { reset(); setMode('signup') }}>
              <UserPlus size={20} /> Create a new account
            </button>
          </>
        )}

        {mode === 'login' && (
          <form className="mobileForm" onSubmit={e => { e.preventDefault(); signIn() }}>
            <h1>Welcome back</h1>
            <p className="authIntro">Log in to continue.</p>
            {err && <div className="errorBox">{err}</div>}

            <TextField
              label="Email address"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              error={err && !email ? 'Email is required.' : ''}
            />

            <PasswordField
              label="Password"
              value={pass}
              onChange={e => setPass(e.target.value)}
              autoComplete="current-password"
              error={err && !pass ? 'Password is required.' : ''}
            />

            <button className="primary largeButton" type="submit" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
            <button type="button" className="textButton" onClick={() => { reset(); setMode('welcome') }}>← Back</button>
            <button type="button" className="textButton" onClick={() => { reset(); setMode('signup') }}>Create a new account</button>
          </form>
        )}

        {mode === 'signup' && (
          <form className="mobileForm" onSubmit={e => e.preventDefault()}>
            <h1>Create your love that account</h1>
            <p className="authIntro">It only takes a minute. We'll guide you through the rest.</p>
            <MobileProgress step={signupStep} total={2} />

            {err && <div className="errorBox">{err}</div>}

            {signupStep === 1 && (
              <>
                <TextField
                  label="Email address"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
                <PasswordField
                  label="Password"
                  value={pass}
                  onChange={e => setPass(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="primary largeButton"
                  onClick={() => {
                    const error = validateCredentials()
                    if (error) setErr(error)
                    else { setErr(''); setSignupStep(2) }
                  }}
                >
                  Continue <ChevronRight size={20} />
                </button>
              </>
            )}

            {signupStep === 2 && (
              <>
                <TextField
                  label="What's your name?"
                  placeholder="Your name"
                  autoComplete="name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
                <DateField
                  label="Date of birth"
                  value={dob}
                  onChange={e => setDob(e.target.value)}
                />

                <div className="infoBox">
                  <Shield size={18} />
                  <span>Your date of birth is used to confirm that you are 18 or over.</span>
                </div>

                <button type="button" className="primary largeButton" onClick={signUp} disabled={busy}>
                  {busy ? 'Creating account…' : 'Create account'}
                </button>
                <button type="button" className="secondaryButton largeButton" onClick={() => { setErr(''); setSignupStep(1) }}>
                  <ChevronLeft size={20} /> Back
                </button>
              </>
            )}

            <button type="button" className="textButton" onClick={() => { reset(); setMode('welcome') }}>Cancel</button>
          </form>
        )}
      </div>
    </div>
  )
}

function Onboarding({ me, profile, setProfile, setPage }) {
  const initial = {
    display_name: profile?.display_name || '',
    gender: profile?.gender || '',
    marital_status: profile?.marital_status || '',
    sexuality: profile?.sexuality || '',
    date_of_birth: profile?.date_of_birth || '',
    location: profile?.location || '',
    height_ft: '',
    height_in: '',
    body_type: profile?.body_type || '',
    job_title: profile?.job_title || '',
    goals: profile?.goals || '',
    headline: profile?.headline || '',
    bio: profile?.bio || '',
    hobbies: profile?.hobbies || '',
    interests: profile?.interests || '',
    drive: profile?.drive ?? null,
    drink: profile?.drink ?? null,
    smoke: profile?.smoke ?? null,
    drugs: profile?.drugs ?? null,
    have_children: profile?.have_children ?? null,
    want_children: profile?.want_children ?? null,
    seeking: profile?.seeking || [],
    religion: profile?.religion || '',
    embarrassing_moment: profile?.embarrassing_moment || '',
    most_romantic: profile?.most_romantic || '',
    favourite_quote: profile?.favourite_quote || '',
    favourite_film: profile?.favourite_film || '',
    music_tastes: profile?.music_tastes || [],
    looking_for_gender: profile?.looking_for_gender || [],
    attracted_to: profile?.attracted_to || [],
    ideal_first_date: profile?.ideal_first_date || [],
    partner_drink: profile?.partner_drink ?? null,
    partner_drugs: profile?.partner_drugs ?? null,
    partner_drive: profile?.partner_drive ?? null,
    partner_smoke: profile?.partner_smoke ?? null,
    partner_children: profile?.partner_children ?? null
  }

  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [profileData, setProfileData] = useState(initial)

  const total = 8

  const update = (field, value) => {
    setError('')
    setProfileData(p => ({ ...p, [field]: value }))
  }

  const toggleMulti = (field, value) => {
    setError('')
    setProfileData(p => ({
      ...p,
      [field]: p[field].includes(value)
        ? p[field].filter(x => x !== value)
        : [...p[field], value]
    }))
  }

  function validateStep() {
    if (step === 1) {
      if (!profileData.gender) return 'Please choose how you identify.'
      if (!profileData.marital_status) return 'Please choose your relationship status.'
      if (!profileData.sexuality) return 'Please choose your sexual orientation.'
    }
    if (step === 2) {
      if (!profileData.looking_for_gender.length) return 'Choose at least one type of person you would like to meet.'
      if (!profileData.attracted_to.length) return 'Choose at least one thing that attracts you.'
      if (!profileData.ideal_first_date.length) return 'Choose at least one first-date idea.'
    }
    if (step === 3) {
      if (!profileData.date_of_birth) return 'Please enter your date of birth.'
      if (calculateAge(profileData.date_of_birth) < 18) return 'You must be 18 or over to use love that.'
      if (!profileData.location.trim()) return 'Please enter your town or city.'
    }
    if (step === 4) {
      if (!profileData.body_type) return 'Please choose your body type.'
      if (!profileData.job_title.trim()) return 'Please enter your job title.'
    }
    if (step === 5) {
      if (!profileData.headline.trim()) return 'Please add a short headline.'
      if (!profileData.bio.trim()) return 'Please tell people a little about yourself.'
    }
    if (step === 6) {
      if (profileData.drive === null || profileData.drink === null || profileData.smoke === null) {
        return 'Please answer the lifestyle questions.'
      }
    }
    if (step === 7) {
      if (!profileData.seeking.length) return 'Choose at least one thing you are looking for.'
      if (!profileData.religion) return 'Please choose an option for religion.'
    }
    if (step === 8) {
      if (!profileData.favourite_film.trim()) return 'Please add your favourite film.'
      if (!profileData.music_tastes.length) return 'Choose at least one music style.'
    }
    return ''
  }

  async function saveAndContinue() {
    const validation = validateStep()
    if (validation) return setError(validation)

    setSaving(true)
    setError('')

    try {
      const age = calculateAge(profileData.date_of_birth)
      const payload = {
        id: me.id,
        ...profileData,
        age,
        height: profileData.height_ft && profileData.height_in
          ? `${profileData.height_ft}' ${profileData.height_in}"`
          : null
      }

      delete payload.height_ft
      delete payload.height_in

      const { data, error: dbError } = await supabase.from('profiles').upsert(payload).select().single()
      if (dbError) throw dbError

      setProfile(data || { ...profileData, age })

      if (step < total) setStep(s => s + 1)
      else setPage('home')
    } catch (err) {
      setError(err.message || 'Could not save your profile.')
    } finally {
      setSaving(false)
    }
  }

  const YesNo = ({ label, value, field }) => (
    <div className="yesNoRow">
      <span>{label}</span>
      <div>
        <OptionButton selected={value === true} onClick={() => update(field, true)}>Yes</OptionButton>
        <OptionButton selected={value === false} onClick={() => update(field, false)}>No</OptionButton>
      </div>
    </div>
  )

  return (
    <div className="app onboardingPage">
      <main className="onboardingShell">
        <MobileProgress step={step} total={total} />

        {error && <div className="errorBox">{error}</div>}

        {step === 1 && (
          <section className="onboardingStep">
            <h1>Let's get to know you</h1>
            <p className="stepIntro">A few simple questions help us make love that feel more personal.</p>

            <h3>I identify as</h3>
            <div className="optionGrid">
              {['Woman', 'Man', 'Non-binary', 'Trans woman', 'Trans man', 'Couple'].map(x =>
                <OptionButton key={x} selected={profileData.gender === x} onClick={() => update('gender', x)}>{x}</OptionButton>
              )}
            </div>

            <h3>Relationship status</h3>
            <div className="optionGrid">
              {['Single', 'In a relationship', 'Divorced', 'Widowed', 'Separated'].map(x =>
                <OptionButton key={x} selected={profileData.marital_status === x} onClick={() => update('marital_status', x)}>{x}</OptionButton>
              )}
            </div>

            <h3>Sexual orientation</h3>
            <div className="optionGrid">
              {['Gay', 'Straight', 'Bisexual', 'Undecided'].map(x =>
                <OptionButton key={x} selected={profileData.sexuality === x} onClick={() => update('sexuality', x)}>{x}</OptionButton>
              )}
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="onboardingStep">
            <h1>Who would you like to meet?</h1>
            <p className="stepIntro">You can choose more than one.</p>

            <h3>I'm interested in</h3>
            <div className="optionGrid">
              {['Men', 'Women', 'Men & women', 'Double dates', 'Non-binary people', 'Everyone'].map(x =>
                <OptionButton key={x} multi selected={profileData.looking_for_gender.includes(x)} onClick={() => toggleMulti('looking_for_gender', x)}>{x}</OptionButton>
              )}
            </div>

            <h3>What attracts you most?</h3>
            <div className="optionGrid">
              {['Hair', 'Face', 'Eyes', 'Lips', 'Personality', 'Someone funny', 'Nice body', 'A kind person', 'Flirty'].map(x =>
                <OptionButton key={x} multi selected={profileData.attracted_to.includes(x)} onClick={() => toggleMulti('attracted_to', x)}>{x}</OptionButton>
              )}
            </div>

            <h3>Ideal first date</h3>
            <div className="optionGrid">
              {['Bar scene', 'Restaurant', 'Beach walk', 'Film on the sofa', 'Arcade', 'Bowling', 'Ice skating', 'Dancing', 'Zoo trip', 'Karaoke'].map(x =>
                <OptionButton key={x} multi selected={profileData.ideal_first_date.includes(x)} onClick={() => toggleMulti('ideal_first_date', x)}>{x}</OptionButton>
              )}
            </div>

            <h3>Would you like your partner to…?</h3>
            <YesNo label="Drink?" value={profileData.partner_drink} field="partner_drink" />
            <YesNo label="Do drugs?" value={profileData.partner_drugs} field="partner_drugs" />
            <YesNo label="Drive?" value={profileData.partner_drive} field="partner_drive" />
            <YesNo label="Smoke?" value={profileData.partner_smoke} field="partner_smoke" />
            <YesNo label="Have children?" value={profileData.partner_children} field="partner_children" />
          </section>
        )}

        {step === 3 && (
          <section className="onboardingStep">
            <h1>Your details</h1>
            <p className="stepIntro">These details help people know a little more about you.</p>

            <DateField
              label="Date of birth"
              value={profileData.date_of_birth}
              onChange={e => update('date_of_birth', e.target.value)}
            />

            {profileData.date_of_birth && calculateAge(profileData.date_of_birth) >= 18 && (
              <div className="successBox"><CheckCircle2 size={18} /> You are {calculateAge(profileData.date_of_birth)} years old.</div>
            )}

            <TextField
              label="Town or city"
              placeholder="e.g. London"
              value={profileData.location}
              onChange={e => update('location', e.target.value)}
              autoComplete="address-level2"
            />

            <div className="fieldGroup">
              <label className="fieldLabel">Height</label>
              <div className="twoColumn">
                <select className="formInput selectInput" value={profileData.height_ft} onChange={e => update('height_ft', e.target.value)}>
                  <option value="">Feet</option>
                  {[4,5,6,7].map(n => <option key={n} value={n}>{n} ft</option>)}
                </select>
                <select className="formInput selectInput" value={profileData.height_in} onChange={e => update('height_in', e.target.value)}>
                  <option value="">Inches</option>
                  {Array.from({ length: 12 }, (_, i) => i).map(n => <option key={n} value={n}>{n} in</option>)}
                </select>
              </div>
            </div>
          </section>
        )}

        {step === 4 && (
          <section className="onboardingStep">
            <h1>Tell us a little more</h1>
            <p className="stepIntro">Keep it simple — you can change these later.</p>

            <h3>Your body type</h3>
            <div className="optionGrid">
              {['Slim', 'Average', 'Curvy', 'Overweight', 'Athletic', 'Muscular'].map(x =>
                <OptionButton key={x} selected={profileData.body_type === x} onClick={() => update('body_type', x)}>{x}</OptionButton>
              )}
            </div>

            <TextField label="Job title" placeholder="e.g. Teacher, Engineer…" value={profileData.job_title} onChange={e => update('job_title', e.target.value)} autoComplete="organization-title" />
            <TextField label="Hobbies" placeholder="What do you enjoy?" value={profileData.hobbies} onChange={e => update('hobbies', e.target.value)} />
            <TextField label="Interests" placeholder="What fascinates you?" value={profileData.interests} onChange={e => update('interests', e.target.value)} />
          </section>
        )}

        {step === 5 && (
          <section className="onboardingStep">
            <h1>Show your personality</h1>
            <p className="stepIntro">This is where you can make your profile sound like you.</p>

            <TextField label="Profile headline" hint="A short, catchy line." placeholder="e.g. Looking for laughs and good times" value={profileData.headline} onChange={e => update('headline', e.target.value)} />
            <div className="fieldGroup">
              <label className="fieldLabel">About me</label>
              <textarea className="formInput textArea" placeholder="Tell people about yourself…" value={profileData.bio} onChange={e => update('bio', e.target.value)} onFocus={scrollToField} />
            </div>
            <div className="fieldGroup">
              <label className="fieldLabel">What is your main goal?</label>
              <div className="optionGrid">
                {['A relationship', 'Casual dating', 'New friends', 'Flirty chat', 'Not sure yet'].map(x =>
                  <OptionButton key={x} selected={profileData.goals === x} onClick={() => update('goals', x)}>{x}</OptionButton>
                )}
              </div>
            </div>
          </section>
        )}

        {step === 6 && (
          <section className="onboardingStep">
            <h1>Your lifestyle</h1>
            <p className="stepIntro">Answer honestly. These answers can help with compatibility.</p>

            <YesNo label="Do you drive?" value={profileData.drive} field="drive" />
            <YesNo label="Do you drink?" value={profileData.drink} field="drink" />
            <YesNo label="Do you smoke?" value={profileData.smoke} field="smoke" />
            <YesNo label="Do you do drugs?" value={profileData.drugs} field="drugs" />
            <YesNo label="Have children?" value={profileData.have_children} field="have_children" />
            <YesNo label="Want children?" value={profileData.want_children} field="want_children" />
          </section>
        )}

        {step === 7 && (
          <section className="onboardingStep">
            <h1>What are you looking for?</h1>
            <p className="stepIntro">Choose everything that applies to you.</p>

            <h3>I want…</h3>
            <div className="optionGrid">
              {['Relationship', 'Marriage', 'Casual', 'Dating', 'Friends', 'Double dating'].map(x =>
                <OptionButton key={x} multi selected={profileData.seeking.includes(x)} onClick={() => toggleMulti('seeking', x)}>{x}</OptionButton>
              )}
            </div>

            <h3>Religion</h3>
            <div className="optionGrid">
              {['Atheist', 'Christian', 'Hindu', 'Buddhist', 'Muslim', 'Non-religious'].map(x =>
                <OptionButton key={x} selected={profileData.religion === x} onClick={() => update('religion', x)}>{x}</OptionButton>
              )}
            </div>

            <div className="fieldGroup">
              <label className="fieldLabel">Favourite film</label>
              <input className="formInput" placeholder="Your #1 movie" value={profileData.favourite_film} onChange={e => update('favourite_film', e.target.value)} onFocus={scrollToField} />
            </div>
          </section>
        )}

        {step === 8 && (
          <section className="onboardingStep">
            <h1>A little more about you</h1>
            <p className="stepIntro">These optional-style questions make profiles more interesting.</p>

            <div className="fieldGroup">
              <label className="fieldLabel">Most embarrassing moment</label>
              <textarea className="formInput textArea small" placeholder="The story you laugh about now…" value={profileData.embarrassing_moment} onChange={e => update('embarrassing_moment', e.target.value)} onFocus={scrollToField} />
            </div>

            <div className="fieldGroup">
              <label className="fieldLabel">Most romantic thing you've done</label>
              <textarea className="formInput textArea small" placeholder="Tell us about it…" value={profileData.most_romantic} onChange={e => update('most_romantic', e.target.value)} onFocus={scrollToField} />
            </div>

            <TextField label="Favourite movie quote" placeholder="A quote you love" value={profileData.favourite_quote} onChange={e => update('favourite_quote', e.target.value)} />

            <h3>What music do you love?</h3>
            <div className="optionGrid">
              {['Pop', 'Rock', 'Classical', '80s/90s', 'Heavy Metal', 'Drum & Bass', 'R&B', 'Rap'].map(x =>
                <OptionButton key={x} multi selected={profileData.music_tastes.includes(x)} onClick={() => toggleMulti('music_tastes', x)}>{x}</OptionButton>
              )}
            </div>

            <div className="finalMessage">
              <CheckCircle2 size={24} />
              <div><b>You're almost there!</b><span>Submit your profile and start exploring love that.</span></div>
            </div>
          </section>
        )}

        <div className="navigationButtons">
          {step > 1 ? (
            <button type="button" className="secondaryButton navButton" onClick={() => { setError(''); setStep(s => s - 1) }}>
              <ChevronLeft size={20} /> Back
            </button>
          ) : <span />}

          <button type="button" className="primary navButton" onClick={saveAndContinue} disabled={saving}>
            {saving ? 'Saving…' : step === total ? '🎉 Submit' : 'Continue'}
            {!saving && step < total && <ChevronRight size={20} />}
          </button>
        </div>
      </main>
    </div>
  )
}

function Home({ profile, setPage }) {
  return (
    <div className="app">
      <header className="mainHeader">
        <b>{APP_NAME}</b>
        <button onClick={() => setPage('settings')} aria-label="Settings"><SettingsIcon size={22} /></button>
      </header>

      <main className="homePage">
        <div className="homeLogoWrap">
          <img src={logo} className="homeLogo" alt="love that" />
        </div>

        <h2 className="greeting">Hello, {profile.display_name || 'there'}! 👋</h2>
        <p className="homeIntro">Choose how you'd like to connect today.</p>

        <button className="chatRoomHero" onClick={() => setPage('chatroom')}>
          <MessageCircle size={28} />
          <span><b>Public Chat Room</b><small>Chat with everyone in the community</small></span>
          <ChevronRight size={20} />
        </button>

        <button className="shortsHero" onClick={() => setPage('shorts')}>
          <Play size={28} />
          <span><b>Shorts</b><small>Watch & share short videos</small></span>
          <ChevronRight size={20} />
        </button>

        <h3 className="sectionTitle">Find your way to connect</h3>

        {Object.entries(P).map(([key, val]) => {
          const Icon = val[3]
          return (
            <button key={key} className="platformBtn" style={{ '--color': val[2] }} onClick={() => setPage('discover')}>
              <Icon size={27} />
              <span><b>{val[0]}</b><small>{val[1]}</small></span>
              <ChevronRight size={19} />
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
    { id: 'chatroom', label: 'Chat', icon: MessageCircle },
    { id: 'profile', label: 'Profile', icon: UserRound }
  ]

  return (
    <nav className="bottomNav">
      {items.map(i => {
        const Icon = i.icon
        return (
          <button key={i.id} onClick={() => setPage(i.id)} className={active === i.id ? 'activeNav' : ''}>
            <Icon size={22} />
            <span>{i.label}</span>
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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_room' }, async payload => {
        const { data } = await supabase.from('chat_room')
          .select('*,profiles(display_name)')
          .eq('id', payload.new.id)
          .maybeSingle()
        if (data && mounted) setMessages(p => p.some(x => x.id === data.id) ? p : [...p, data])
      })
      .subscribe()

    return () => {
      mounted = false
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [])

  async function sendMessage(e) {
    e.preventDefault()
    if (!newMessage.trim() || sending) return
    setSending(true)
    const text = newMessage.trim()
    setNewMessage('')

    try {
      const { error } = await supabase.from('chat_room').insert({
        user_id: me.id,
        content: text,
        type: 'text'
      })
      if (error) throw error
      setMessages(p => [...p, {
        id: `local-${Date.now()}`,
        user_id: me.id,
        content: text,
        type: 'text',
        created_at: new Date().toISOString(),
        profiles: { display_name: 'You' }
      }])
    } catch (err) {
      alert(err.message)
      setNewMessage(text)
    } finally {
      setSending(false)
    }
  }

  async function sendImage(e) {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const path = `chat-media/${me.id}/${makeUploadId()}.${mediaExtension(file, file.type)}`
    const { error: upErr } = await supabase.storage.from('chat-media').upload(path, file)
    if (upErr) return alert(upErr.message)
    const { data: { publicUrl } } = supabase.storage.from('chat-media').getPublicUrl(path)
    const { error } = await supabase.from('chat_room').insert({
      user_id: me.id,
      content: publicUrl,
      type: 'image'
    })
    if (error) alert(error.message)
  }

  return (
    <div className="chatRoomPage app">
      <header className="mainHeader">
        <button onClick={() => setPage('home')} aria-label="Back"><ArrowLeft /></button>
        <div><b>Chat room</b><small>Everyone in the room</small></div>
        <button onClick={async () => {
          const { data } = await supabase.from('chat_room').select('*,profiles(display_name)').order('created_at', { ascending: true }).limit(100)
          setMessages(data || [])
        }} aria-label="Refresh"><RefreshCw /></button>
      </header>

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
      <header className="mainHeader"><b>Discover</b><button onClick={() => setPage('settings')}><SettingsIcon size={22} /></button></header>
      <div className="emptyPage"><Sparkles size={48} /><h2>Coming Soon</h2><p>Find matches and connections here.</p></div>
      <Nav setPage={setPage} active="discover" />
    </div>
  )
}

function Shorts({ setPage }) {
  return (
    <div className="app">
      <header className="mainHeader"><b>Shorts</b><button onClick={() => setPage('settings')}><SettingsIcon size={22} /></button></header>
      <div className="emptyPage"><Play size={48} /><h2>Video Shorts</h2><p>Share and watch short videos — coming soon.</p></div>
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
    if (!file.type.startsWith('image/')) return alert('Please select an image.')
    setUploadingPhoto(true)

    try {
      const ext = mediaExtension(file, file.type)
      const path = `${me.id}/${makeUploadId()}.${ext}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { cacheControl: '3600', upsert: true })
      if (upErr) throw upErr

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      const freshUrl = `${publicUrl}?t=${Date.now()}`
      const { error } = await supabase.from('profiles').update({ avatar_url: freshUrl }).eq('id', me.id)
      if (error) throw error

      setPhotoUrl(freshUrl)
      setProfile(prev => ({ ...prev, avatar_url: freshUrl }))
    } catch (err) {
      alert(`Failed: ${err.message}`)
    } finally {
      setUploadingPhoto(false)
    }
  }

  async function uploadBioVideo(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('video/')) return alert('Please select a video.')
    if (file.size > 30 * 1024 * 1024) return alert('Video too large (max 30MB).')

    setUploadingVideo(true)

    try {
      const ext = mediaExtension(file, file.type)
      const path = `${me.id}/${makeUploadId()}.${ext}`
      const { error: upErr } = await supabase.storage.from('profile-videos').upload(path, file, { upsert: true })
      if (upErr) throw upErr

      const { data: { publicUrl } } = supabase.storage.from('profile-videos').getPublicUrl(path)
      const freshUrl = `${publicUrl}?t=${Date.now()}`
      const { error } = await supabase.from('profiles').update({ bio_video_url: freshUrl }).eq('id', me.id)
      if (error) throw error

      setProfile(prev => ({ ...prev, bio_video_url: freshUrl }))
    } catch (err) {
      alert(`Failed: ${err.message}`)
    } finally {
      setUploadingVideo(false)
    }
  }

  return (
    <div className="app">
      <header className="mainHeader"><b>{APP_NAME}</b><button onClick={() => setPage('settings')}><SettingsIcon size={22} /></button></header>

      <main className="profilePage">
        <div className="avatarCircle">
          {photoUrl ? <img src={photoUrl} alt="Profile" /> : <span>{profile.display_name?.[0]?.toUpperCase() || 'M'}</span>}
        </div>

        <h2>{profile.display_name}, {profile.age || '??'}</h2>
        <p className="muted"><MapPin size={16} /> {profile.location || 'Location not set'}</p>
        {profile.headline && <p className="headline">"{profile.headline}"</p>}

        <div className="profileUploadCard">
          <b>Profile photo</b>
          <p>Choose a clear photo people can recognise you by.</p>
          <input type="file" accept="image/*" onChange={uploadPhoto} disabled={uploadingPhoto} />
          {uploadingPhoto && <p className="uploadStatus">Uploading photo…</p>}
        </div>

        <div className="profileUploadCard">
          <b>Bio video</b>
          <p>Add a short introduction video (maximum 30MB).</p>
          <input type="file" accept="video/*" onChange={uploadBioVideo} disabled={uploadingVideo} />
          {uploadingVideo && <p className="uploadStatus">Uploading video…</p>}
        </div>
      </main>

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
      <header className="mainHeader">
        <button onClick={() => setPage('home')} aria-label="Back"><ArrowLeft /></button>
        <b>Settings</b>
      </header>
      <main className="settingsPage">
        <button className="signOutBtn" onClick={signOut}>Sign Out</button>
      </main>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<App />)
