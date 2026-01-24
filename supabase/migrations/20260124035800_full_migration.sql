-- Client Settings Table (for category assignment & hiding)
create table if not exists "public"."client_settings" (
    "organization_id" uuid not null references "public"."organizations"("id") on delete cascade,
    "client_name" text not null,
    "category" text,
    "is_hidden" boolean default false,
    "updated_at" timestamp with time zone not null default now(),
    primary key ("organization_id", "client_name")
);

-- Hidden Categories Table
create table if not exists "public"."hidden_categories" (
    "organization_id" uuid not null references "public"."organizations"("id") on delete cascade,
    "category_name" text not null,
    "created_at" timestamp with time zone not null default now(),
    primary key ("organization_id", "category_name")
);

-- RLS for client_settings
alter table "public"."client_settings" enable row level security;

drop policy if exists "Users can view client settings in their organization" on "public"."client_settings";
create policy "Users can view client settings in their organization"
on "public"."client_settings" for select
to authenticated
using (organization_id = (select organization_id from profiles where id = auth.uid()));

drop policy if exists "Users can insert/update client settings in their organization" on "public"."client_settings";
create policy "Users can insert/update client settings in their organization"
on "public"."client_settings" for insert
to authenticated
with check (organization_id = (select organization_id from profiles where id = auth.uid()));

drop policy if exists "Users can update client settings in their organization" on "public"."client_settings";
create policy "Users can update client settings in their organization"
on "public"."client_settings" for update
to authenticated
using (organization_id = (select organization_id from profiles where id = auth.uid()));

-- RLS for hidden_categories
alter table "public"."hidden_categories" enable row level security;

drop policy if exists "Users can view hidden categories in their organization" on "public"."hidden_categories";
create policy "Users can view hidden categories in their organization"
on "public"."hidden_categories" for select
to authenticated
using (organization_id = (select organization_id from profiles where id = auth.uid()));

drop policy if exists "Users can insert hidden categories in their organization" on "public"."hidden_categories";
create policy "Users can insert hidden categories in their organization"
on "public"."hidden_categories" for insert
to authenticated
with check (organization_id = (select organization_id from profiles where id = auth.uid()));

drop policy if exists "Users can delete hidden categories in their organization" on "public"."hidden_categories";
create policy "Users can delete hidden categories in their organization"
on "public"."hidden_categories" for delete
to authenticated
using (organization_id = (select organization_id from profiles where id = auth.uid()));
