-- Restrict photo SELECT to authenticated users (avoid public listing)
DROP POLICY IF EXISTS "Photos are publicly viewable" ON storage.objects;
CREATE POLICY "Authed users view photos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'photos');

UPDATE storage.buckets SET public = false WHERE id = 'photos';

-- Switch nearby_profiles to SECURITY INVOKER + auth check; revoke from anon
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
  SELECT p.id, p.nickname, p.age, p.gender, p.intent, p.city, p.bio, p.photo_url,
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