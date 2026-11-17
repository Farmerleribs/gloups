-- Gloups v0.6.0 : rendez-vous typés, abonnement agenda de la famille (iCal)

-- Rendez-vous : type et rappels
alter table health.appointments
  add column if not exists kind text not null default 'autre'
    check (kind in ('pediatre', 'sage_femme', 'vaccin', 'pmi', 'examen', 'autre')),
  add column if not exists reminders text[] not null default array['veille', '1h']::text[]
    check (reminders <@ array['veille', '1h', '15min']::text[]);

-- Abonnement : contenu choisi par la famille
alter table public.calendar_feeds
  add column if not exists options jsonb not null default '{"appointments": true, "summary": false, "events": false}'::jsonb
    check (jsonb_typeof(options) = 'object');

-- Choisir ce qui apparaît dans l'agenda abonné (parents seulement)
create or replace function public.api_v1_set_calendar_feed_options(p_family uuid, p_summary boolean, p_events boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.can(p_family, 'family.manage') then raise exception 'non autorisé' using errcode = '42501'; end if;
  update public.calendar_feeds
     set options = jsonb_build_object('appointments', true, 'summary', coalesce(p_summary, false), 'events', coalesce(p_events, false))
   where family_id = p_family;
  perform private.audit(p_family, 'calendar.options', null, jsonb_build_object('summary', p_summary, 'events', p_events));
end $$;

-- Couper le lien (les agendas abonnés ne reçoivent plus rien)
create or replace function public.api_v1_revoke_calendar_feed(p_family uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.can(p_family, 'family.manage') then raise exception 'non autorisé' using errcode = '42501'; end if;
  update public.calendar_feeds set revoked_at = now() where family_id = p_family and revoked_at is null;
  perform private.audit(p_family, 'calendar.revoke', null);
end $$;

-- Données du flux, lues par la fonction « ical » avec la clé serveur uniquement
create or replace function public.api_v1_calendar_feed_data(p_token text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  fid uuid; opts jsonb; tz text; fam text; res jsonb;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then return null; end if;
  select cf.family_id, cf.options into fid, opts
    from public.calendar_feeds cf
   where cf.token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex') and cf.revoked_at is null;
  if fid is null then return null; end if;
  select f.timezone, f.name into tz, fam from public.families f where f.id = fid and f.deleted_at is null;
  if tz is null then return null; end if;
  res := jsonb_build_object('family', fam, 'tz', tz, 'options', opts,
    'appointments', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'title', a.title, 'kind', a.kind, 'starts_at', a.starts_at, 'ends_at', a.ends_at,
               'location', a.location, 'notes', a.notes, 'reminders', a.reminders, 'updated_at', a.updated_at, 'child', c.first_name) order by a.starts_at)
        from health.appointments a left join public.children c on c.id = a.child_id
       where a.family_id = fid and a.deleted_at is null and a.starts_at > now() - interval '180 days'), '[]'::jsonb));
  if coalesce((opts->>'summary')::boolean, false) or coalesce((opts->>'events')::boolean, false) then
    res := res || jsonb_build_object('events', coalesce((
      select jsonb_agg(jsonb_build_object('id', e.id, 'type', e.type, 'started_at', e.started_at, 'ended_at', e.ended_at,
               'data', e.data, 'child', c.first_name, 'updated_at', e.updated_at) order by e.started_at)
        from public.events e left join public.children c on c.id = e.child_id
       where e.family_id = fid and e.deleted_at is null and e.started_at > now() - interval '30 days'), '[]'::jsonb));
  end if;
  return res;
end $$;

revoke all on function public.api_v1_set_calendar_feed_options(uuid, boolean, boolean) from public, anon;
revoke all on function public.api_v1_revoke_calendar_feed(uuid) from public, anon;
revoke all on function public.api_v1_calendar_feed_data(text) from public, anon, authenticated;
grant execute on function public.api_v1_set_calendar_feed_options(uuid, boolean, boolean), public.api_v1_revoke_calendar_feed(uuid) to authenticated;
grant execute on function public.api_v1_calendar_feed_data(text) to service_role;
