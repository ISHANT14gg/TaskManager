-- Create clients table
create table if not exists "public"."clients" (
    "id" uuid not null default gen_random_uuid(),
    "organization_id" uuid not null references "public"."organizations"("id") on delete cascade,
    "name" text not null,
    "email" text,
    "created_at" timestamp with time zone not null default now(),
    primary key ("id"),
    unique ("organization_id", "name")
);

-- RLS
alter table "public"."clients" enable row level security;

-- Policies
drop policy if exists "Users can view clients in their organization" on "public"."clients";
create policy "Users can view clients in their organization"
on "public"."clients"
as permissive
for select
to authenticated
using (
    (organization_id in (
        select profiles.organization_id
        from profiles
        where profiles.id = auth.uid()
    ))
);

drop policy if exists "Users can insert clients in their organization" on "public"."clients";
create policy "Users can insert clients in their organization"
on "public"."clients"
as permissive
for insert
to authenticated
with check (
    (organization_id in (
        select profiles.organization_id
        from profiles
        where profiles.id = auth.uid()
    ))
);

drop policy if exists "Users can delete clients in their organization" on "public"."clients";
create policy "Users can delete clients in their organization"
on "public"."clients"
as permissive
for delete
to authenticated
using (
    (organization_id in (
        select profiles.organization_id
        from profiles
        where profiles.id = auth.uid()
    ))
);
