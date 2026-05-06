-- Photos storage bucket (public read; auth users upload only into their own folder)
INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Photos are publicly viewable"
ON storage.objects FOR SELECT USING (bucket_id = 'photos');

CREATE POLICY "Users upload to their own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update their own photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete their own photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Nearby profiles via Haversine (km). Excludes self, banned/suspended, and missing coords.
CREATE OR REPLACE FUNCTION public.nearby_profiles(
  _lat double precision,
  _lng double precision,
  _radius_km double precision DEFAULT 50,
  _limit integer DEFAULT 60
)
RETURNS TABLE (
  id uuid,
  nickname text,
  age integer,
  gender public.gender_type,
  intent public.intent_type,
  city text,
  bio text,
  photo_url text,
  online_status boolean,
  last_seen timestamptz,
  distance_km double precision
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.nickname, p.age, p.gender, p.intent, p.city, p.bio, p.photo_url,
         p.online_status, p.last_seen,
         (6371 * acos(
           greatest(-1, least(1,
             cos(radians(_lat)) * cos(radians(p.latitude))
             * cos(radians(p.longitude) - radians(_lng))
             + sin(radians(_lat)) * sin(radians(p.latitude))
           ))
         )) AS distance_km
  FROM public.profiles p
  WHERE p.id <> auth.uid()
    AND p.status NOT IN ('suspended','banned')
    AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
    AND (6371 * acos(
           greatest(-1, least(1,
             cos(radians(_lat)) * cos(radians(p.latitude))
             * cos(radians(p.longitude) - radians(_lng))
             + sin(radians(_lat)) * sin(radians(p.latitude))
           ))
         )) <= _radius_km
  ORDER BY p.online_status DESC, distance_km ASC
  LIMIT _limit;
$$;