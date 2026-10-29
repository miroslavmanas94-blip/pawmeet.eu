-- Keep existing communities available, but require approval for newly proposed communities.
ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS group_type text,
  ADD COLUMN IF NOT EXISTS approval_status text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

UPDATE public.groups
SET group_type = COALESCE(group_type, 'community'),
    approval_status = COALESCE(approval_status, 'approved')
WHERE group_type IS NULL OR approval_status IS NULL;

ALTER TABLE public.groups
  ALTER COLUMN group_type SET DEFAULT 'community',
  ALTER COLUMN group_type SET NOT NULL,
  ALTER COLUMN approval_status SET DEFAULT 'pending',
  ALTER COLUMN approval_status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'groups_group_type_check') THEN
    ALTER TABLE public.groups ADD CONSTRAINT groups_group_type_check CHECK (group_type IN ('community', 'chat'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'groups_approval_status_check') THEN
    ALTER TABLE public.groups ADD CONSTRAINT groups_approval_status_check CHECK (approval_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.guard_pawmeet_group_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  trusted_admin boolean;
BEGIN
  trusted_admin := COALESCE(auth.role(), '') = 'service_role'
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND LOWER(p.role) IN ('admin', 'administrator', 'administrátor'));

  IF TG_OP = 'INSERT' THEN
    IF NEW.approval_status = 'approved'
      AND NOT trusted_admin
      AND NOT (NEW.group_type = 'chat' AND COALESCE(NEW.is_private, true) AND COALESCE(NEW.is_public, false) = false) THEN
      RAISE EXCEPTION 'Community approval is required before publication';
    END IF;
  ELSE
    IF NEW.approval_status IS DISTINCT FROM OLD.approval_status AND NOT trusted_admin THEN
      RAISE EXCEPTION 'Only an administrator can change group approval status';
    END IF;
    IF NEW.group_type IS DISTINCT FROM OLD.group_type AND NOT trusted_admin THEN
      RAISE EXCEPTION 'Group type cannot be changed by a member';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_pawmeet_group_approval ON public.groups;
CREATE TRIGGER guard_pawmeet_group_approval
BEFORE INSERT OR UPDATE ON public.groups
FOR EACH ROW EXECUTE FUNCTION public.guard_pawmeet_group_approval();

ALTER POLICY "Groups are visible when public or joined"
ON public.groups
USING (
  created_by = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  OR (
    approval_status = 'approved'
    AND (
      COALESCE(is_private, false) = false
      OR (auth.role() = 'authenticated' AND private.is_group_member(id))
    )
  )
);

ALTER POLICY "Authenticated users create own groups"
ON public.groups
WITH CHECK (
  created_by = auth.uid()
  AND (
    (group_type = 'community' AND approval_status = 'pending')
    OR (
      group_type = 'chat'
      AND approval_status = 'approved'
      AND COALESCE(is_private, false) = true
      AND COALESCE(is_public, false) = false
    )
  )
);
