-- Only users who explicitly enabled live location sharing should appear in public map queries.
-- Keep existing location rows intact; disabling sharing only hides them from other users.
ALTER POLICY "Polohy jsou veřejné"
ON public.user_locations
USING (is_active = true);

ALTER POLICY "Povolit čtení polohy všem"
ON public.user_locations
USING (is_active = true);
