-- Safe, additive controls for live-location visibility. Existing active shares remain visible,
-- but are downgraded to approximate coordinates so exact locations are never public by default.
ALTER TABLE public.user_locations
  ADD COLUMN IF NOT EXISTS sharing_audience text,
  ADD COLUMN IF NOT EXISTS sharing_precision text,
  ADD COLUMN IF NOT EXISTS sharing_expires_at timestamptz;

UPDATE public.user_locations
SET sharing_audience = CASE WHEN is_active THEN 'public' ELSE 'nobody' END
WHERE sharing_audience IS NULL;

UPDATE public.user_locations
SET sharing_precision = 'approximate'
WHERE sharing_precision IS NULL;

ALTER TABLE public.user_locations
  ALTER COLUMN sharing_audience SET DEFAULT 'nobody',
  ALTER COLUMN sharing_audience SET NOT NULL,
  ALTER COLUMN sharing_precision SET DEFAULT 'approximate',
  ALTER COLUMN sharing_precision SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_locations_sharing_audience_check') THEN
    ALTER TABLE public.user_locations
      ADD CONSTRAINT user_locations_sharing_audience_check
      CHECK (sharing_audience IN ('nobody', 'contacts', 'public'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_locations_sharing_precision_check') THEN
    ALTER TABLE public.user_locations
      ADD CONSTRAINT user_locations_sharing_precision_check
      CHECK (sharing_precision IN ('approximate', 'exact'));
  END IF;
END $$;

-- Restrict direct table reads to the owner. The view below exposes only the precision
-- and audience the location owner explicitly selected.
ALTER POLICY "Polohy jsou veřejné" ON public.user_locations
  USING (auth.uid() = user_id);
ALTER POLICY "Povolit čtení polohy všem" ON public.user_locations
  USING (auth.uid() = user_id);
ALTER POLICY "Users can read active locations" ON public.user_locations
  USING (auth.uid() = user_id);
ALTER POLICY "read active locations" ON public.user_locations
  USING (auth.uid() = user_id);

CREATE OR REPLACE VIEW public.public_map_locations
WITH (security_barrier = true, security_invoker = false)
AS
SELECT
  ul.user_id,
  CASE
    WHEN ul.sharing_precision = 'exact' THEN ul.latitude
    ELSE round(ul.latitude::numeric, 2)::double precision
  END AS latitude,
  CASE
    WHEN ul.sharing_precision = 'exact' THEN ul.longitude
    ELSE round(ul.longitude::numeric, 2)::double precision
  END AS longitude,
  CASE WHEN ul.sharing_precision = 'exact' THEN ul.address ELSE NULL END AS address,
  ul.is_active,
  ul.updated_at,
  p.username,
  p.avatar_url,
  p.bio,
  p.display_name,
  p.full_name
FROM public.user_locations AS ul
LEFT JOIN public.profiles AS p ON p.id = ul.user_id
WHERE ul.is_active = true
  AND (ul.sharing_expires_at IS NULL OR ul.sharing_expires_at > now())
  AND (
    ul.user_id = auth.uid()
    OR (
      ul.sharing_audience = 'public'
      AND (
        COALESCE(p.visibility, 'public') = 'public'
        OR (COALESCE(p.visibility, 'public') = 'members' AND auth.uid() IS NOT NULL)
      )
    )
    OR (
      ul.sharing_audience = 'contacts'
      AND auth.uid() IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.followers AS f1
        JOIN public.followers AS f2
          ON f2.follower_id = f1.following_id
         AND f2.following_id = f1.follower_id
        WHERE f1.follower_id = auth.uid()
          AND f1.following_id = ul.user_id
      )
    )
  );

REVOKE ALL ON public.public_map_locations FROM PUBLIC;
GRANT SELECT ON public.public_map_locations TO anon, authenticated;
