-- Secure public and private community groups without deleting existing records.
DROP POLICY IF EXISTS "Povolit vše přihlášeným u skupin" ON public.groups;
DROP POLICY IF EXISTS "Přihlášení uživatelé mohou vytvářet skupiny" ON public.groups;
DROP POLICY IF EXISTS "Veřejné skupiny vidí všichni" ON public.groups;
DROP POLICY IF EXISTS "Povolit vše přihlášeným u členství" ON public.group_members;
DROP POLICY IF EXISTS "Přidávání členů" ON public.group_members;
DROP POLICY IF EXISTS "Členství vidí členové skupiny nebo u veřejných skupin v" ON public.group_members;

CREATE POLICY "Groups are visible when public or joined"
ON public.groups FOR SELECT TO anon, authenticated
USING (
  COALESCE(is_private, false) = false
  OR created_by = auth.uid()
  OR (auth.role() = 'authenticated' AND private.is_group_member(id))
);
CREATE POLICY "Authenticated users create own groups"
ON public.groups FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Group owners update their groups"
ON public.groups FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "Group owners delete their groups"
ON public.groups FOR DELETE TO authenticated USING (created_by = auth.uid());

CREATE POLICY "Members see eligible memberships"
ON public.group_members FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_members.group_id AND COALESCE(g.is_private, false) = false)
  OR private.is_group_member(group_id)
);
CREATE POLICY "Join public groups or add members to owned groups"
ON public.group_members FOR INSERT TO authenticated
WITH CHECK (
  (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_members.group_id AND COALESCE(g.is_private, false) = false))
  OR EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_members.group_id AND g.created_by = auth.uid())
);
CREATE POLICY "Group owners manage membership roles"
ON public.group_members FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_members.group_id AND g.created_by = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_members.group_id AND g.created_by = auth.uid()));
CREATE POLICY "Members can leave and owners can remove members"
ON public.group_members FOR DELETE TO authenticated
USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_members.group_id AND g.created_by = auth.uid()));
