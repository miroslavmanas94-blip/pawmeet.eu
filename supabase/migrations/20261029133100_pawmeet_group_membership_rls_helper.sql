-- SECURITY DEFINER membership helper avoids recursive RLS checks across groups and group_members.
CREATE SCHEMA IF NOT EXISTS private;
CREATE OR REPLACE FUNCTION private.is_group_member(p_group_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = p_group_id AND gm.user_id = auth.uid());
$$;
REVOKE ALL ON FUNCTION private.is_group_member(uuid) FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_group_member(uuid) TO authenticated;
DROP POLICY IF EXISTS "Groups are visible when public or joined" ON public.groups;
CREATE POLICY "Groups are visible when public or joined"
ON public.groups FOR SELECT TO anon, authenticated
USING (COALESCE(is_private, false) = false OR created_by = auth.uid() OR (auth.role() = 'authenticated' AND private.is_group_member(id)));
DROP POLICY IF EXISTS "Members see eligible memberships" ON public.group_members;
CREATE POLICY "Members see eligible memberships"
ON public.group_members FOR SELECT TO authenticated
USING (
 user_id = auth.uid()
 OR EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_members.group_id AND COALESCE(g.is_private, false) = false)
 OR private.is_group_member(group_id)
);
