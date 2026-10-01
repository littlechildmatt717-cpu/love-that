async function saveAndContinue() {
  setSaving(true)
  try {
    const age = calculateAge(profileData.date_of_birth)
    
    const { error } = await supabase.from('profiles').upsert({
      id: me.id,
      display_name: profileData.display_name || 'Friend',
      ...profileData,
      // ✅ Only send date if it's NOT empty!
      date_of_birth: profileData.date_of_birth || null,
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
