
drop policy "Service role insert organizations" on public.organizations;
drop policy "Service role insert fundings" on public.fundings;

create policy "Authenticated insert organizations" on public.organizations for insert to authenticated with check (true);
create policy "Authenticated insert fundings" on public.fundings for insert to authenticated with check (true);
