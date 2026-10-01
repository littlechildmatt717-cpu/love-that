-- Love That: profiles RLS fix
-- Run this once in Supabase SQL Editor for the Love That project.
-- The app writes profiles only after the user has an authenticated session.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "love_that_profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "love_that_profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "love_that_profiles_update_own" ON public.profiles;

CREATE POLICY "love_that_profiles_insert_own"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "love_that_profiles_select_own"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "love_that_profiles_update_own"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
