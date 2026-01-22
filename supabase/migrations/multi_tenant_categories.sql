-- 🏥 Migration: Multi-Tenant Categories
-- 1. Add organization_id column to categories
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- 2. Backfill organization_id for existing categories (using the first org found)
DO $$
DECLARE
    fallback_org_id UUID;
BEGIN
    SELECT id INTO fallback_org_id FROM public.organizations LIMIT 1;
    UPDATE public.categories SET organization_id = fallback_org_id WHERE organization_id IS NULL;
END $$;

-- 3. Make organization_id NOT NULL after backfill
ALTER TABLE public.categories ALTER COLUMN organization_id SET NOT NULL;

-- 4. Update the Unique Constraint
-- First remove the old one (Supabase usually names it categories_name_key)
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_name_key;
-- Add the new multi-tenant constraint
ALTER TABLE public.categories ADD CONSTRAINT categories_org_name_unique UNIQUE (organization_id, name);

-- 5. Hardened RLS for Categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all to view categories" ON public.categories;
CREATE POLICY "allow_view_categories_in_org"
  ON public.categories FOR SELECT USING (organization_id = public.get_my_org_id());

DROP POLICY IF EXISTS "Allow authenticated to insert categories" ON public.categories;
CREATE POLICY "allow_insert_categories_in_org"
  ON public.categories FOR INSERT WITH CHECK (organization_id = public.get_my_org_id());

DROP POLICY IF EXISTS "Allow authenticated to update categories" ON public.categories;
CREATE POLICY "allow_update_categories_in_org"
  ON public.categories FOR UPDATE USING (organization_id = public.get_my_org_id());

DROP POLICY IF EXISTS "Allow admins to delete categories" ON public.categories;
CREATE POLICY "allow_delete_categories_in_org"
  ON public.categories FOR DELETE USING (
    organization_id = public.get_my_org_id() AND 
    public.get_my_role() = 'admin'
  );
