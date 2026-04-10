
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  aliases text[] default '{}',
  type text default 'ngo',
  country text,
  description text,
  created_at timestamptz default now()
);

create table if not exists public.fundings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  funder_name text not null,
  amount numeric,
  currency text default 'USD',
  year integer,
  source_name text not null,
  source_url text not null,
  confidence text default 'confirmed',
  created_at timestamptz default now()
);

alter table public.organizations enable row level security;
alter table public.fundings enable row level security;

create policy "Public read organizations" on public.organizations for select using (true);
create policy "Public read fundings" on public.fundings for select using (true);
create policy "Service role insert organizations" on public.organizations for insert with check (true);
create policy "Service role insert fundings" on public.fundings for insert with check (true);
