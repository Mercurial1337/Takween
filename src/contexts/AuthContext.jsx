'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const AuthContext = createContext(undefined)

export function AuthProvider({ children }) {
  const isConfigured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const supabase = isConfigured ? createClient() : null

  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [authLoading, setAuthLoading] = useState(isConfigured)
  const [profileLoading, setProfileLoading] = useState(false)
  const loading = authLoading || profileLoading
  const router = useRouter()

  const fetchProfile = async (currentUser) => {
    if (!currentUser) return null;

    const { data: fetchResult, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)

    if (error) {
      console.error('Error fetching profile:', error.message || error)
    }

    const data = fetchResult && fetchResult.length > 0 ? fetchResult[0] : null;

    if (!data && currentUser.user_metadata && currentUser.user_metadata.full_name) {
      const meta = currentUser.user_metadata;
      const newProfile = {
        id: currentUser.id,
        full_name: meta.full_name || currentUser.email?.split('@')[0] || 'Student',
        email: currentUser.email,
        whatsapp_number: meta.whatsapp_number || '',
        level_id: meta.level_id || null,
        department_id: meta.department_id || null,
        linkedin_url: meta.linkedin_url || null,
        github_url: meta.github_url || null,
        role: 'student'
      };

      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert(newProfile);

      if (upsertError) {
        console.error('Error auto-creating profile:', upsertError);
      } else {
        // Attempt to restore skills
        if (meta.skills && Array.isArray(meta.skills) && meta.skills.length > 0) {
          try {
            const skillIds = [];
            for (const skillName of meta.skills) {
              let { data: existing } = await supabase.from('skills').select('id').eq('name', skillName).maybeSingle();
              if (existing) {
                skillIds.push(existing.id);
              } else {
                const { data: newSkill } = await supabase.from('skills').insert({ name: skillName, is_predefined: false }).select('id').maybeSingle();
                if (newSkill) skillIds.push(newSkill.id);
              }
            }
            if (skillIds.length > 0) {
              await supabase.from('profile_skills').upsert(
                skillIds.map((skillId) => ({ profile_id: currentUser.id, skill_id: skillId }))
              );
            }
          } catch (skillErr) {
            console.error('Error restoring skills:', skillErr);
          }
        }
        return newProfile;
      }
    }

    return data
  }

  const refreshProfile = async () => {
    if (!user) return
    const profileData = await fetchProfile(user)
    setProfile(profileData)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    router.push('/')
  }

  // Load profile whenever user changes
  useEffect(() => {
    if (!supabase) return

    if (!user) {
      setProfile(null)
      setProfileLoading(false)
      return
    }

    let isMounted = true

    const loadProfile = async () => {
      setProfileLoading(true)
      try {
        const profileData = await fetchProfile(user)
        if (isMounted) {
          setProfile(profileData)
        }
      } catch (error) {
        console.error('Error loading profile:', error)
      } finally {
        if (isMounted) {
          setProfileLoading(false)
        }
      }
    }

    loadProfile()

    return () => {
      isMounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  useEffect(() => {
    if (!supabase) return;

    const initAuth = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser()

        if (currentUser) {
          setUser(currentUser)
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
      } finally {
        setAuthLoading(false)
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          setUser(session.user)
        } else {
          setUser(null)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const value = {
    user,
    profile,
    loading,
    signOut,
    refreshProfile,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
