-- 1. Moderation status enum
DO $$ BEGIN
  CREATE TYPE public.photo_moderation_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. New columns on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS photo_status public.photo_moderation_status,
  ADD COLUMN IF NOT EXISTS photo_pending_path text,
  ADD COLUMN IF NOT EXISTS photo_rejection_reason text,
  ADD COLUMN IF NOT EXISTS photo_reviewed_at timestamptz;

-- 3. Moderation history (audit trail)
CREATE TABLE IF NOT EXISTS public.photo_moderation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  storage_path text NOT NULL,
  status public.photo_moderation_status NOT NULL,
  reason text,
  reviewer text NOT NULL DEFAULT 'auto',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.photo_moderation_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads own log" ON public.photo_moderation_log
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all logs" ON public.photo_moderation_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 4. Block end-users from writing moderated columns directly
CREATE OR REPLACE FUNCTION public.enforce_photo_moderation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role text := COALESCE(current_setting('request.jwt.claim.role', true),
                          current_setting('role', true));
BEGIN
  IF v_role = 'service_role' OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.photo_url IS DISTINCT FROM OLD.photo_url THEN
    RAISE EXCEPTION 'photo_url can only be set by the moderation service';
  END IF;
  IF NEW.photo_status IS DISTINCT FROM OLD.photo_status THEN
    RAISE EXCEPTION 'photo_status is moderation-only';
  END IF;
  IF NEW.photo_rejection_reason IS DISTINCT FROM OLD.photo_rejection_reason THEN
    RAISE EXCEPTION 'photo_rejection_reason is moderation-only';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_enforce_photo_moderation ON public.profiles;
CREATE TRIGGER trg_enforce_photo_moderation
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.enforce_photo_moderation();

-- 5. nearby_profiles: only expose approved photos
CREATE OR REPLACE FUNCTION public.nearby_profiles(
  _lat double precision,
  _lng double precision,
  _radius_km double precision DEFAULT 50,
  _limit integer DEFAULT 60
)
RETURNS TABLE (
  id uuid, nickname text, age integer,
  gender public.gender_type, intent public.intent_type,
  city text, bio text, photo_url text,
  online_status boolean, last_seen timestamptz,
  distance_km double precision
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT p.id, p.nickname, p.age, p.gender, p.intent, p.city, p.bio,
         CASE WHEN p.photo_status = 'approved' THEN p.photo_url ELSE NULL END AS photo_url,
         p.online_status, p.last_seen,
         (6371 * acos(greatest(-1, least(1,
           cos(radians(_lat)) * cos(radians(p.latitude))
           * cos(radians(p.longitude) - radians(_lng))
           + sin(radians(_lat)) * sin(radians(p.latitude))
         )))) AS distance_km
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND p.id <> auth.uid()
    AND p.status NOT IN ('suspended','banned')
    AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
    AND (6371 * acos(greatest(-1, least(1,
           cos(radians(_lat)) * cos(radians(p.latitude))
           * cos(radians(p.longitude) - radians(_lng))
           + sin(radians(_lat)) * sin(radians(p.latitude))
         )))) <= _radius_km
  ORDER BY p.online_status DESC, distance_km ASC
  LIMIT _limit;
$$;
REVOKE ALL ON FUNCTION public.nearby_profiles(double precision, double precision, double precision, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nearby_profiles(double precision, double precision, double precision, integer) TO authenticated;