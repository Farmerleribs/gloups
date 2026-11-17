-- Gloups : tableau de bord du créateur
-- Uniquement des chiffres agrégés : aucun prénom, aucun contenu de saisie, aucune donnée de santé individuelle.

-- Administrateurs : jamais exposés par l'API
create table if not exists private.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table private.admins enable row level security;
revoke all on private.admins from public, anon, authenticated;

-- Ouvertures de l'app : une ligne par personne et par jour
create table if not exists public.app_opens (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  opens integer not null default 1,
  platform text check (platform in ('ios', 'android', 'ordinateur')),
  standalone boolean,
  version text check (char_length(version) <= 16),
  last_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.app_opens enable row level security;
revoke all on public.app_opens from anon, authenticated;
create index if not exists app_opens_day_idx on public.app_opens (day);

-- Compteurs d'usage anonymes : écrans vus, boutons utilisés (aucun identifiant de personne)
create table if not exists public.app_usage (
  day date not null,
  kind text not null check (kind in ('screen', 'fab', 'log', 'action')),
  name text not null check (name ~ '^[a-z0-9_.:]{1,48}$'),
  n integer not null default 0,
  primary key (day, kind, name)
);
alter table public.app_usage enable row level security;
revoke all on public.app_usage from anon, authenticated;

create or replace function public.api_v1_ping(p_platform text default null, p_standalone boolean default null, p_version text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null then return; end if;
  if p_platform not in ('ios', 'android', 'ordinateur') then p_platform := null; end if;
  insert into public.app_opens (user_id, day, platform, standalone, version)
  values (uid, (now() at time zone 'Europe/Paris')::date, p_platform, p_standalone, left(p_version, 16))
  on conflict (user_id, day) do update
    set opens = public.app_opens.opens + 1, last_at = now(),
        platform = coalesce(excluded.platform, public.app_opens.platform),
        standalone = coalesce(excluded.standalone, public.app_opens.standalone),
        version = coalesce(excluded.version, public.app_opens.version);
end;
$$;

create or replace function public.api_v1_track(p_counts jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare k text; v jsonb; kd text; nm text; c int; i int := 0;
begin
  if (select auth.uid()) is null or jsonb_typeof(p_counts) <> 'object' then return; end if;
  for k, v in select * from jsonb_each(p_counts) loop
    i := i + 1; exit when i > 100;
    kd := split_part(k, ':', 1);
    nm := substr(k, char_length(kd) + 2);
    c := least(greatest(coalesce((v #>> '{}')::int, 0), 0), 500);
    continue when c = 0 or kd not in ('screen', 'fab', 'log', 'action') or nm !~ '^[a-z0-9_.:]{1,48}$';
    insert into public.app_usage (day, kind, name, n)
    values ((now() at time zone 'Europe/Paris')::date, kd, nm, c)
    on conflict (day, kind, name) do update set n = public.app_usage.n + excluded.n;
  end loop;
exception when others then return;
end;
$$;

create or replace function public.api_admin_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from private.admins a where a.user_id = (select auth.uid()));
$$;

create or replace function public.api_admin_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'Europe/Paris')::date;
  r jsonb;
begin
  if not exists (select 1 from private.admins a where a.user_id = (select auth.uid())) then
    raise exception 'réservé à l''administrateur' using errcode = '42501';
  end if;

  with
  kids as (select id, family_id, birth_date, due_date from public.children where deleted_at is null),
  ev7 as (select child_id, type, started_at, ended_at from public.events
          where deleted_at is null and started_at >= now() - interval '7 days'),
  last_open as (select distinct on (user_id) user_id, platform, standalone, version
                from public.app_opens where day > today - 30 order by user_id, day desc)
  select jsonb_build_object(
    'generated_at', now(),
    'families', (select count(*) from public.families where deleted_at is null),
    'children', (select count(*) from kids),
    'children_unborn', (select count(*) from kids where birth_date is null),
    'users', (select count(*) from public.profiles),
    'members_by_role', (select coalesce(jsonb_object_agg(role, n), '{}'::jsonb)
                        from (select role, count(*) n from public.family_members where status = 'active' group by role) x),
    'families_by_children', (select coalesce(jsonb_object_agg(k, n), '{}'::jsonb)
                             from (select k, count(*) n from (select family_id, count(*) k from kids group by family_id) y group by k) x),
    'families_multi_parent', (select count(*) from (select family_id from public.family_members
                              where status = 'active' and role = 'parent' group by family_id having count(*) > 1) x),
    'families_twins_mode', (select count(*) from public.families where deleted_at is null and settings->>'twins' = 'true'),
    'children_age', (select coalesce(jsonb_object_agg(b, n), '{}'::jsonb) from (
        select case when birth_date is null then 'a_naitre'
                    when birth_date > today - 30 then 'm0_1'
                    when birth_date > today - 91 then 'm1_3'
                    when birth_date > today - 183 then 'm3_6'
                    when birth_date > today - 365 then 'm6_12'
                    else 'plus_1an' end b, count(*) n
        from kids group by 1) x),
    'active', jsonb_build_object(
      'd1',  (select count(distinct user_id) from public.app_opens where day = today),
      'd7',  (select count(distinct user_id) from public.app_opens where day > today - 7),
      'd30', (select count(distinct user_id) from public.app_opens where day > today - 30)),
    'opens', jsonb_build_object(
      'd1',  (select coalesce(sum(opens), 0) from public.app_opens where day = today),
      'd7',  (select coalesce(sum(opens), 0) from public.app_opens where day > today - 7),
      'd30', (select coalesce(sum(opens), 0) from public.app_opens where day > today - 30)),
    'retention_7d', jsonb_build_object(
      'prev', (select count(distinct user_id) from public.app_opens where day <= today - 7 and day > today - 14),
      'kept', (select count(distinct a.user_id) from public.app_opens a
               where a.day <= today - 7 and a.day > today - 14
                 and exists (select 1 from public.app_opens b where b.user_id = a.user_id and b.day > today - 7))),
    'platforms', (select coalesce(jsonb_object_agg(coalesce(platform, 'inconnu'), n), '{}'::jsonb)
                  from (select platform, count(*) n from last_open group by platform) x),
    'installed', (select count(*) from last_open where standalone),
    'versions', (select coalesce(jsonb_object_agg(coalesce(version, '?'), n), '{}'::jsonb)
                 from (select version, count(*) n from last_open group by version) x),
    'events', jsonb_build_object(
      'total', (select count(*) from public.events where deleted_at is null),
      'd1',  (select count(*) from public.events where deleted_at is null and (created_at at time zone 'Europe/Paris')::date = today),
      'd7',  (select count(*) from public.events where deleted_at is null and created_at >= now() - interval '7 days'),
      'deleted_30d', (select count(*) from public.events where deleted_at >= now() - interval '30 days'),
      'by_shortcut_30d', (select count(*) from public.events where deleted_at is null and source = 'shortcut' and created_at >= now() - interval '30 days'),
      'twin_30d', (select count(*) from public.events where deleted_at is null and data ? 'twin_group' and created_at >= now() - interval '30 days')),
    'events_by_type_30d', (select coalesce(jsonb_object_agg(type, n), '{}'::jsonb)
                           from (select type, count(*) n from public.events
                                 where deleted_at is null and created_at >= now() - interval '30 days' group by type) x),
    'per_child_day_7d', (select jsonb_build_object(
        'children', count(distinct child_id),
        'feeds', round(count(*) filter (where type like 'feed.%' and type <> 'feed.pump')::numeric / nullif(count(distinct child_id) * 7, 0), 1),
        'diapers', round(count(*) filter (where type = 'diaper')::numeric / nullif(count(distinct child_id) * 7, 0), 1),
        'sleep_h', round((sum(extract(epoch from (ended_at - started_at))) filter (where type = 'sleep' and ended_at is not null) / 3600)::numeric
                         / nullif(count(distinct child_id) * 7, 0), 1))
        from ev7),
    'usage_30d', (select coalesce(jsonb_object_agg(kind, m), '{}'::jsonb) from (
        select kind, jsonb_object_agg(name, n) m from (
          select kind, name, sum(n) n from public.app_usage where day > today - 30 group by kind, name) y group by kind) x),
    'invitations_30d', jsonb_build_object(
      'created', (select count(*) from public.invitations where created_at >= now() - interval '30 days'),
      'used', (select coalesce(sum(uses), 0) from public.invitations where created_at >= now() - interval '30 days')),
    'health_30d', jsonb_build_object(
      'measurements', (select count(*) from health.measurements where deleted_at is null and created_at >= now() - interval '30 days'),
      'appointments_upcoming', (select count(*) from health.appointments where deleted_at is null and starts_at >= now())),
    'calendar_feeds', (select count(*) from public.calendar_feeds where revoked_at is null),
    'daily', (select jsonb_agg(jsonb_build_object(
                'day', d::date,
                'active', (select count(distinct o.user_id) from public.app_opens o where o.day = d::date),
                'opens', (select coalesce(sum(o.opens), 0) from public.app_opens o where o.day = d::date),
                'events', (select count(*) from public.events e where e.deleted_at is null
                           and (e.created_at at time zone 'Europe/Paris')::date = d::date),
                'new_users', (select count(*) from public.profiles p where (p.created_at at time zone 'Europe/Paris')::date = d::date),
                'new_families', (select count(*) from public.families f where (f.created_at at time zone 'Europe/Paris')::date = d::date)
              ) order by d)
              from generate_series(today - 29, today, interval '1 day') d)
  ) into r;
  return r;
end;
$$;

revoke execute on function public.api_v1_ping(text, boolean, text) from public, anon;
revoke execute on function public.api_v1_track(jsonb) from public, anon;
revoke execute on function public.api_admin_is_admin() from public, anon;
revoke execute on function public.api_admin_stats() from public, anon;
grant execute on function public.api_v1_ping(text, boolean, text) to authenticated;
grant execute on function public.api_v1_track(jsonb) to authenticated;
grant execute on function public.api_admin_is_admin() to authenticated;
grant execute on function public.api_admin_stats() to authenticated;
