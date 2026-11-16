-- Gloups · schéma V1
-- Principes : voir claude/modele-donnees-evolutif.md
-- UUID générés côté client, UTC partout, codes plutôt que libellés,
-- suppression logique, droits centralisés dans private.can(),
-- accès payant via entitlements, santé dans un schéma séparé.

-- ============================================================
-- 0. Schémas et utilitaires
-- ============================================================
create schema if not exists private;   -- fonctions internes, jamais exposées par l'API
create schema if not exists health;    -- données de santé, isolables

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
revoke all on schema health from public, anon;
grant usage on schema health to authenticated;

create or replace function private.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ============================================================
-- 1. Configuration de l'app (valeurs non secrètes)
-- ============================================================
create table public.app_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
insert into public.app_config (key, value) values
  ('paywall_enabled', 'false'::jsonb),
  ('min_app_version', '"1.0.0"'::jsonb),
  ('trial_days', '7'::jsonb);

-- ============================================================
-- 2. Identité, familles, enfants
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null default '' check (char_length(first_name) <= 60),
  locale text not null default 'fr' check (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  timezone text not null default 'Europe/Paris' check (char_length(timezone) <= 64),
  settings jsonb not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object'),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.family_members (
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('parent', 'proche', 'lecture')),
  status text not null default 'active' check (status in ('active', 'left', 'removed')),
  invited_by uuid references public.profiles (id) on delete set null,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (family_id, user_id)
);
create index family_members_user_idx on public.family_members (user_id) where status = 'active';

create table public.children (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  first_name text not null check (char_length(btrim(first_name)) between 1 and 40),
  color text not null default '#2B7262' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  birth_date date,
  due_date date,
  sex text check (sex in ('f', 'm')),
  feeding text check (feeding in ('breast', 'bottle', 'mixed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (birth_date is not null or due_date is not null),
  unique (id, family_id)
);
create index children_family_idx on public.children (family_id);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  code_hash text not null unique,
  role text not null check (role in ('parent', 'proche', 'lecture')),
  created_by uuid references public.profiles (id) on delete set null,
  expires_at timestamptz not null default now() + interval '7 days',
  max_uses int not null default 1 check (max_uses between 1 and 20),
  uses int not null default 0,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index invitations_family_idx on public.invitations (family_id);

-- ============================================================
-- 3. Droits : une seule fonction pour toutes les règles
-- ============================================================
create or replace function private.can(p_family uuid, p_action text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.family_members m
    join public.families f on f.id = m.family_id and f.deleted_at is null
    where m.family_id = p_family
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and case p_action
            when 'read'          then true
            when 'event.write'   then m.role in ('parent', 'proche')
            when 'health.write'  then m.role in ('parent', 'proche')
            when 'child.manage'  then m.role = 'parent'
            when 'family.manage' then m.role = 'parent'
            when 'invite'        then m.role = 'parent'
            else false
          end
  );
$$;

create or replace function private.shares_family(p_other uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.family_members a
    join public.family_members b on b.family_id = a.family_id
    where a.user_id = (select auth.uid()) and a.status = 'active'
      and b.user_id = p_other and b.status = 'active'
  );
$$;

-- ============================================================
-- 4. Accès payant : droits indépendants du paiement
-- ============================================================
create table public.entitlements (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  feature text not null default 'write' check (feature ~ '^[a-z][a-z0-9_.]{1,40}$'),
  source text not null check (source in ('gift', 'trial', 'purchase', 'promo', 'admin')),
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index entitlements_family_idx on public.entitlements (family_id, feature);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete restrict,
  paid_by uuid references public.profiles (id) on delete set null,
  provider text not null default 'stripe',
  provider_ref text not null unique,
  amount_cents int not null check (amount_cents >= 0),
  currency text not null default 'eur' check (currency ~ '^[a-z]{3}$'),
  status text not null check (status in ('pending', 'paid', 'refunded', 'failed')),
  created_at timestamptz not null default now()
);

create table public.trials (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  family_id uuid references public.families (id) on delete set null,
  started_at timestamptz not null default now()
);

create or replace function private.has_entitlement(p_family uuid, p_feature text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.entitlements e
    where e.family_id = p_family
      and e.feature = p_feature
      and e.revoked_at is null
      and e.valid_from <= now()
      and (e.valid_until is null or e.valid_until > now())
  );
$$;

-- ============================================================
-- 5. Saisies : table générique + catalogue de types
-- ============================================================
create table public.event_types (
  code text primary key check (code ~ '^[a-z]+(\.[a-z_]+)?$'),
  category text not null check (category in ('feed', 'sleep', 'diaper', 'cry', 'care', 'other')),
  timed boolean not null default false,
  schema_version int not null default 1,
  active boolean not null default true,
  sort int not null default 100
);
insert into public.event_types (code, category, timed, sort) values
  ('feed.breast', 'feed',   true,  10),
  ('feed.bottle', 'feed',   false, 20),
  ('feed.pump',   'feed',   true,  30),
  ('sleep',       'sleep',  true,  40),
  ('diaper',      'diaper', false, 50),
  ('cry',         'cry',    true,  60),
  ('bath',        'care',   false, 70),
  ('note',        'other',  false, 90);

create table public.events (
  id uuid primary key default gen_random_uuid(),   -- fourni par le téléphone : saisie idempotente
  family_id uuid not null,
  child_id uuid not null,
  type text not null references public.event_types (code),
  started_at timestamptz not null,
  ended_at timestamptz,                            -- vide = en cours (minuteur partagé)
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  source text not null default 'app' check (source in ('app', 'shortcut', 'import')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (child_id, family_id) references public.children (id, family_id) on delete cascade,
  check (ended_at is null or ended_at >= started_at),
  check (pg_column_size(data) <= 4096)
);
create index events_child_time_idx on public.events (child_id, started_at desc) where deleted_at is null;
create index events_family_updated_idx on public.events (family_id, updated_at);
create index events_running_idx on public.events (family_id) where ended_at is null and deleted_at is null;

-- Validation du contenu selon le type (à l'écriture seulement : les règles peuvent évoluer)
create or replace function private.validate_event()
returns trigger language plpgsql set search_path = '' as $$
declare
  d jsonb := new.data;
  t public.event_types;
begin
  select * into t from public.event_types where code = new.type;
  if not found or (tg_op = 'INSERT' and not t.active) then
    raise exception 'type de saisie inconnu ou inactif: %', new.type using errcode = '22023';
  end if;

  if tg_op = 'INSERT' then
    new.created_by := coalesce((select auth.uid()), new.created_by);
    new.created_at := now();
  else
    new.created_by := old.created_by;       -- l'auteur ne change jamais
    new.created_at := old.created_at;
    new.family_id  := old.family_id;
  end if;
  new.updated_at := now();
  if not (d ? 'v') then d := d || jsonb_build_object('v', t.schema_version); end if;

  if new.started_at > now() + interval '10 minutes' then
    raise exception 'date dans le futur' using errcode = '22023';
  end if;
  if not t.timed and new.ended_at is not null and new.ended_at <> new.started_at then
    raise exception 'ce type de saisie n''a pas de durée' using errcode = '22023';
  end if;

  case new.type
    when 'feed.breast' then
      if coalesce(d->>'side', '') not in ('left', 'right', 'both') then
        raise exception 'tétée: côté requis (left, right, both)' using errcode = '22023';
      end if;
    when 'feed.bottle' then
      if d ? 'ml' and (jsonb_typeof(d->'ml') <> 'number' or (d->>'ml')::numeric not between 0 and 400) then
        raise exception 'biberon: ml entre 0 et 400' using errcode = '22023';
      end if;
      if d ? 'milk' and d->>'milk' not in ('breastmilk', 'formula', 'other') then
        raise exception 'biberon: lait inconnu' using errcode = '22023';
      end if;
    when 'feed.pump' then
      if d ? 'ml' and (jsonb_typeof(d->'ml') <> 'number' or (d->>'ml')::numeric not between 0 and 500) then
        raise exception 'tire-lait: ml entre 0 et 500' using errcode = '22023';
      end if;
      if d ? 'side' and d->>'side' not in ('left', 'right', 'both') then
        raise exception 'tire-lait: côté inconnu' using errcode = '22023';
      end if;
    when 'diaper' then
      if not (coalesce((d->>'pee')::boolean, false) or coalesce((d->>'poo')::boolean, false)) then
        raise exception 'couche: pipi ou selles requis' using errcode = '22023';
      end if;
      if d ? 'color' and d->>'color' not in ('yellow', 'mustard', 'green', 'brown', 'black', 'white', 'red') then
        raise exception 'couche: couleur inconnue' using errcode = '22023';
      end if;
      if d ? 'texture' and d->>'texture' not in ('liquid', 'soft', 'seedy', 'firm', 'mucus') then
        raise exception 'couche: consistance inconnue' using errcode = '22023';
      end if;
    when 'sleep' then
      if d ? 'place' and d->>'place' not in ('cosleep', 'crib', 'arms', 'stroller', 'car', 'carrier', 'other') then
        raise exception 'sommeil: lieu inconnu' using errcode = '22023';
      end if;
    when 'cry' then
      if d ? 'intensity' and d->>'intensity' not in ('1', '2', '3') then
        raise exception 'pleurs: intensité 1 à 3' using errcode = '22023';
      end if;
    when 'note' then
      if char_length(coalesce(d->>'text', '')) not between 1 and 500 then
        raise exception 'note: texte de 1 à 500 caractères' using errcode = '22023';
      end if;
    else null;
  end case;

  new.data := d;
  return new;
end $$;

create trigger events_validate
before insert or update on public.events
for each row execute function private.validate_event();

-- ============================================================
-- 6. Santé (schéma séparé)
-- ============================================================
create table health.measurements (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  child_id uuid not null,
  kind text not null check (kind in ('weight_g', 'length_mm', 'head_mm', 'temp_dc')),
  value numeric not null,
  method text check (method in ('rectal', 'axillary', 'ear', 'forehead', 'home', 'doctor')),
  measured_at timestamptz not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (child_id, family_id) references public.children (id, family_id) on delete cascade,
  check (
    (kind = 'weight_g'  and value between 300 and 40000) or
    (kind = 'length_mm' and value between 200 and 1500) or
    (kind = 'head_mm'   and value between 200 and 700) or
    (kind = 'temp_dc'   and value between 300 and 440)
  )
);
create index measurements_child_idx on health.measurements (child_id, kind, measured_at desc);

create table health.medications (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  child_id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  dose_text text check (char_length(dose_text) <= 120),
  schedule jsonb not null default '{}'::jsonb check (jsonb_typeof(schedule) = 'object'),
  active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (child_id, family_id) references public.children (id, family_id) on delete cascade,
  unique (id, family_id)
);

create table health.medication_doses (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  medication_id uuid not null,
  given_at timestamptz not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (medication_id, family_id) references health.medications (id, family_id) on delete cascade
);
create index medication_doses_idx on health.medication_doses (medication_id, given_at desc);

create table health.appointments (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  child_id uuid references public.children (id) on delete set null,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text check (char_length(location) <= 200),
  notes text check (char_length(notes) <= 1000),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (ends_at is null or ends_at >= starts_at)
);
create index appointments_family_idx on health.appointments (family_id, starts_at);

-- auteur imposé côté serveur sur les tables santé
create or replace function private.set_author()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce((select auth.uid()), new.created_by);
  else
    new.created_by := old.created_by;
    new.family_id := old.family_id;
  end if;
  return new;
end $$;

create trigger measurements_author before insert or update on health.measurements for each row execute function private.set_author();
create trigger medications_author before insert or update on health.medications for each row execute function private.set_author();
create trigger doses_author before insert or update on health.medication_doses for each row execute function private.set_author();
create trigger appointments_author before insert or update on health.appointments for each row execute function private.set_author();

-- ============================================================
-- 7. Appareils et intégrations
-- ============================================================
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique check (endpoint ~ '^https://'),
  p256dh text not null,
  auth_key text not null,
  device_name text check (char_length(device_name) <= 60),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table public.shortcut_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  device_name text not null default 'iPhone' check (char_length(device_name) <= 60),
  token_hash text not null unique,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.calendar_feeds (
  family_id uuid primary key references public.families (id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

-- ============================================================
-- 8. Journal d'audit (ajout seul)
-- ============================================================
create table public.audit_log (
  id bigint generated always as identity primary key,
  family_id uuid references public.families (id) on delete cascade,
  actor uuid,
  action text not null,
  target uuid,
  details jsonb not null default '{}'::jsonb,
  at timestamptz not null default now()
);
create index audit_log_family_idx on public.audit_log (family_id, at desc);

create or replace function private.audit(p_family uuid, p_action text, p_target uuid, p_details jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into public.audit_log (family_id, actor, action, target, details)
  values (p_family, (select auth.uid()), p_action, p_target, coalesce(p_details, '{}'::jsonb));
$$;

-- suppressions et changements de rôle tracés automatiquement
create or replace function private.audit_member_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.role is distinct from new.role or old.status is distinct from new.status then
    perform private.audit(new.family_id, 'member.update', new.user_id,
      jsonb_build_object('role', jsonb_build_array(old.role, new.role), 'status', jsonb_build_array(old.status, new.status)));
  end if;
  return new;
end $$;
create trigger family_members_audit after update on public.family_members
for each row execute function private.audit_member_change();

create or replace function private.audit_event_delete()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.deleted_at is null and new.deleted_at is not null then
    perform private.audit(new.family_id, 'event.delete', new.id, jsonb_build_object('type', new.type));
  end if;
  return new;
end $$;
create trigger events_audit_delete after update on public.events
for each row execute function private.audit_event_delete();

-- Toujours au moins un parent actif dans une famille
create or replace function private.keep_one_parent()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.role = 'parent' and old.status = 'active'
     and (tg_op = 'DELETE' or new.role <> 'parent' or new.status <> 'active')
     and not exists (
       select 1 from public.family_members m
       where m.family_id = old.family_id and m.user_id <> old.user_id
         and m.role = 'parent' and m.status = 'active')
     and exists (select 1 from public.families f where f.id = old.family_id and f.deleted_at is null)
  then
    raise exception 'la famille doit garder au moins un parent' using errcode = '23514';
  end if;
  return coalesce(new, old);
end $$;
create trigger family_members_keep_parent before update or delete on public.family_members
for each row execute function private.keep_one_parent();

-- ============================================================
-- 9. updated_at automatique
-- ============================================================
create trigger profiles_touch before update on public.profiles for each row execute function private.touch_updated_at();
create trigger families_touch before update on public.families for each row execute function private.touch_updated_at();
create trigger family_members_touch before update on public.family_members for each row execute function private.touch_updated_at();
create trigger children_touch before update on public.children for each row execute function private.touch_updated_at();
create trigger measurements_touch before update on health.measurements for each row execute function private.touch_updated_at();
create trigger medications_touch before update on health.medications for each row execute function private.touch_updated_at();
create trigger appointments_touch before update on health.appointments for each row execute function private.touch_updated_at();

-- ============================================================
-- 10. Profil créé à la première connexion (Google)
-- ============================================================
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, first_name)
  values (
    new.id,
    left(coalesce(
      new.raw_user_meta_data->>'given_name',
      split_part(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''), ' ', 1),
      ''), 60)
  )
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function private.handle_new_user();

-- ============================================================
-- 11. Fonctions appelées par l'app (API v1)
-- ============================================================
create or replace function private.random_code(p_len int)
returns text language plpgsql volatile set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; -- sans 0/O, 1/I/L
  b bytea := uuid_send(gen_random_uuid()) || uuid_send(gen_random_uuid());
  out text := '';
begin
  for i in 0 .. p_len - 1 loop
    out := out || substr(alphabet, (get_byte(b, i) % 31) + 1, 1);
  end loop;
  return out;
end $$;

create or replace function private.hash_code(p_code text)
returns text language sql immutable set search_path = '' as $$
  select encode(sha256(convert_to(upper(regexp_replace(p_code, '[^A-Za-z0-9]', '', 'g')), 'UTF8')), 'hex');
$$;

create or replace function public.api_v1_create_family(
  p_family_name text,
  p_child_first_name text,
  p_child_birth_date date default null,
  p_child_due_date date default null,
  p_child_color text default '#2B7262'
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  fid uuid;
  cid uuid;
begin
  if uid is null then raise exception 'connexion requise' using errcode = '42501'; end if;
  if (select count(*) from public.family_members where user_id = uid and status = 'active') >= 10 then
    raise exception 'trop de familles' using errcode = '54000';
  end if;
  insert into public.profiles (id) values (uid) on conflict (id) do nothing;

  insert into public.families (name, created_by) values (btrim(p_family_name), uid) returning id into fid;
  insert into public.family_members (family_id, user_id, role) values (fid, uid, 'parent');
  insert into public.children (family_id, first_name, birth_date, due_date, color)
  values (fid, btrim(p_child_first_name), p_child_birth_date, p_child_due_date, p_child_color)
  returning id into cid;

  -- tant que le paiement n'est pas ouvert : accès offert sans fin
  if not coalesce((select (value)::boolean from public.app_config where key = 'paywall_enabled'), false) then
    insert into public.entitlements (family_id, feature, source) values (fid, 'write', 'gift');
  end if;

  perform private.audit(fid, 'family.create', fid);
  return fid;
end $$;

create or replace function public.api_v1_create_invitation(p_family uuid, p_role text default 'proche')
returns text language plpgsql security definer set search_path = '' as $$
declare
  code text;
begin
  if not private.can(p_family, 'invite') then raise exception 'non autorisé' using errcode = '42501'; end if;
  if p_role not in ('parent', 'proche', 'lecture') then raise exception 'rôle inconnu' using errcode = '22023'; end if;
  if (select count(*) from public.invitations
      where family_id = p_family and created_at > now() - interval '1 day') >= 20 then
    raise exception 'trop d''invitations aujourd''hui' using errcode = '54000';
  end if;
  code := private.random_code(7);
  insert into public.invitations (family_id, code_hash, role, created_by)
  values (p_family, private.hash_code(code), p_role, (select auth.uid()));
  perform private.audit(p_family, 'invitation.create', null, jsonb_build_object('role', p_role));
  return substr(code, 1, 4) || '-' || substr(code, 5, 3);
end $$;

create or replace function public.api_v1_preview_invitation(p_code text)
returns table (family_name text, role text, invited_by text, children text[], expires_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select f.name, i.role, p.first_name,
         array(select c.first_name from public.children c
               where c.family_id = f.id and c.deleted_at is null order by c.created_at),
         i.expires_at
  from public.invitations i
  join public.families f on f.id = i.family_id and f.deleted_at is null
  left join public.profiles p on p.id = i.created_by
  where (select auth.uid()) is not null
    and i.code_hash = private.hash_code(p_code)
    and i.revoked_at is null and i.expires_at > now() and i.uses < i.max_uses;
$$;

create or replace function public.api_v1_accept_invitation(p_code text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  inv public.invitations;
begin
  if uid is null then raise exception 'connexion requise' using errcode = '42501'; end if;
  select * into inv from public.invitations
  where code_hash = private.hash_code(p_code)
    and revoked_at is null and expires_at > now() and uses < max_uses
  for update;
  if not found then raise exception 'invitation invalide ou expirée' using errcode = '22023'; end if;

  insert into public.profiles (id) values (uid) on conflict (id) do nothing;
  insert into public.family_members (family_id, user_id, role, invited_by)
  values (inv.family_id, uid, inv.role, inv.created_by)
  on conflict (family_id, user_id) do update
    set status = 'active', role = excluded.role, invited_by = excluded.invited_by
    where public.family_members.status <> 'active';
  update public.invitations set uses = uses + 1 where id = inv.id;
  perform private.audit(inv.family_id, 'invitation.accept', uid, jsonb_build_object('role', inv.role));
  return inv.family_id;
end $$;

create or replace function public.api_v1_leave_family(p_family uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.family_members set status = 'left'
  where family_id = p_family and user_id = (select auth.uid()) and status = 'active';
  if not found then raise exception 'pas membre de cette famille' using errcode = '22023'; end if;
end $$;

create or replace function public.api_v1_create_shortcut_token(p_family uuid, p_device_name text default 'iPhone')
returns text language plpgsql security definer set search_path = '' as $$
declare
  token text := encode(uuid_send(gen_random_uuid()) || uuid_send(gen_random_uuid()), 'hex');
begin
  if not private.can(p_family, 'event.write') then raise exception 'non autorisé' using errcode = '42501'; end if;
  if (select count(*) from public.shortcut_tokens
      where user_id = (select auth.uid()) and revoked_at is null) >= 10 then
    raise exception 'trop de jetons actifs' using errcode = '54000';
  end if;
  insert into public.shortcut_tokens (user_id, family_id, device_name, token_hash)
  values ((select auth.uid()), p_family, left(coalesce(p_device_name, 'iPhone'), 60),
          encode(sha256(convert_to(token, 'UTF8')), 'hex'));
  perform private.audit(p_family, 'shortcut.create', null, jsonb_build_object('device', p_device_name));
  return token;   -- montré une seule fois
end $$;

create or replace function public.api_v1_create_calendar_feed(p_family uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  token text := encode(uuid_send(gen_random_uuid()) || uuid_send(gen_random_uuid()), 'hex');
begin
  if not private.can(p_family, 'family.manage') then raise exception 'non autorisé' using errcode = '42501'; end if;
  insert into public.calendar_feeds (family_id, token_hash)
  values (p_family, encode(sha256(convert_to(token, 'UTF8')), 'hex'))
  on conflict (family_id) do update set token_hash = excluded.token_hash, created_at = now(), revoked_at = null;
  perform private.audit(p_family, 'calendar.create', null);
  return token;
end $$;

-- ============================================================
-- 12. Règles d'accès (RLS) sur toutes les tables
-- ============================================================
alter table public.app_config enable row level security;
alter table public.profiles enable row level security;
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.children enable row level security;
alter table public.invitations enable row level security;
alter table public.entitlements enable row level security;
alter table public.payments enable row level security;
alter table public.trials enable row level security;
alter table public.event_types enable row level security;
alter table public.events enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.shortcut_tokens enable row level security;
alter table public.calendar_feeds enable row level security;
alter table public.audit_log enable row level security;
alter table health.measurements enable row level security;
alter table health.medications enable row level security;
alter table health.medication_doses enable row level security;
alter table health.appointments enable row level security;

-- accès explicites (l'exposition automatique des tables est désactivée sur le projet)
grant usage on schema public to authenticated, service_role;
grant usage on schema health to service_role;
grant select, insert, update on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant all on all tables in schema health to service_role;

-- personne n'accède sans être connecté
revoke all on all tables in schema public from anon;
revoke all on all tables in schema health from anon;
revoke all on all functions in schema public from anon, public;
revoke all on all functions in schema private from anon, public;
grant execute on all functions in schema private to authenticated;
-- seules les fonctions api_v1_* sont appelables (elles vérifient elles-mêmes les droits)
grant execute on function
  public.api_v1_create_family(text, text, date, date, text),
  public.api_v1_create_invitation(uuid, text),
  public.api_v1_preview_invitation(text),
  public.api_v1_accept_invitation(text),
  public.api_v1_leave_family(uuid),
  public.api_v1_create_shortcut_token(uuid, text),
  public.api_v1_create_calendar_feed(uuid)
to authenticated;
grant select, insert, update on all tables in schema health to authenticated;

create policy app_config_read on public.app_config for select to authenticated using (true);
create policy event_types_read on public.event_types for select to authenticated using (true);

create policy profiles_read on public.profiles for select to authenticated
  using (id = (select auth.uid()) or private.shares_family(id));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy families_read on public.families for select to authenticated
  using (private.can(id, 'read'));
create policy families_update on public.families for update to authenticated
  using (private.can(id, 'family.manage')) with check (private.can(id, 'family.manage'));

create policy members_read on public.family_members for select to authenticated
  using (private.can(family_id, 'read'));
create policy members_manage on public.family_members for update to authenticated
  using (private.can(family_id, 'family.manage')) with check (private.can(family_id, 'family.manage'));

create policy children_read on public.children for select to authenticated
  using (private.can(family_id, 'read'));
create policy children_insert on public.children for insert to authenticated
  with check (private.can(family_id, 'child.manage'));
create policy children_update on public.children for update to authenticated
  using (private.can(family_id, 'child.manage')) with check (private.can(family_id, 'child.manage'));

create policy invitations_read on public.invitations for select to authenticated
  using (private.can(family_id, 'invite'));
create policy invitations_revoke on public.invitations for update to authenticated
  using (private.can(family_id, 'invite')) with check (private.can(family_id, 'invite'));

create policy entitlements_read on public.entitlements for select to authenticated
  using (private.can(family_id, 'read'));
create policy payments_read on public.payments for select to authenticated
  using (private.can(family_id, 'family.manage'));
create policy trials_read on public.trials for select to authenticated
  using (user_id = (select auth.uid()));

create policy events_read on public.events for select to authenticated
  using (private.can(family_id, 'read'));
create policy events_insert on public.events for insert to authenticated
  with check (private.can(family_id, 'event.write') and private.has_entitlement(family_id, 'write'));
create policy events_update on public.events for update to authenticated
  using (private.can(family_id, 'event.write')
         and (created_by = (select auth.uid()) or private.can(family_id, 'family.manage')))
  with check (private.can(family_id, 'event.write') and private.has_entitlement(family_id, 'write'));

create policy push_own on public.push_subscriptions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy shortcut_read on public.shortcut_tokens for select to authenticated
  using (user_id = (select auth.uid()) or private.can(family_id, 'family.manage'));
create policy shortcut_revoke on public.shortcut_tokens for update to authenticated
  using (user_id = (select auth.uid()) or private.can(family_id, 'family.manage'))
  with check (user_id = (select auth.uid()) or private.can(family_id, 'family.manage'));
create policy calendar_read on public.calendar_feeds for select to authenticated
  using (private.can(family_id, 'family.manage'));

create policy audit_read on public.audit_log for select to authenticated
  using (private.can(family_id, 'family.manage'));

create policy measurements_read on health.measurements for select to authenticated using (private.can(family_id, 'read'));
create policy measurements_insert on health.measurements for insert to authenticated with check (private.can(family_id, 'health.write') and private.has_entitlement(family_id, 'write'));
create policy measurements_update on health.measurements for update to authenticated using (private.can(family_id, 'health.write')) with check (private.can(family_id, 'health.write'));

create policy medications_read on health.medications for select to authenticated using (private.can(family_id, 'read'));
create policy medications_insert on health.medications for insert to authenticated with check (private.can(family_id, 'health.write') and private.has_entitlement(family_id, 'write'));
create policy medications_update on health.medications for update to authenticated using (private.can(family_id, 'health.write')) with check (private.can(family_id, 'health.write'));

create policy doses_read on health.medication_doses for select to authenticated using (private.can(family_id, 'read'));
create policy doses_insert on health.medication_doses for insert to authenticated with check (private.can(family_id, 'health.write') and private.has_entitlement(family_id, 'write'));
create policy doses_update on health.medication_doses for update to authenticated using (private.can(family_id, 'health.write')) with check (private.can(family_id, 'health.write'));

create policy appointments_read on health.appointments for select to authenticated using (private.can(family_id, 'read'));
create policy appointments_insert on health.appointments for insert to authenticated with check (private.can(family_id, 'health.write') and private.has_entitlement(family_id, 'write'));
create policy appointments_update on health.appointments for update to authenticated using (private.can(family_id, 'health.write')) with check (private.can(family_id, 'health.write'));

-- colonnes modifiables limitées (le reste passe par les fonctions api_v1_*)
revoke update on public.family_members from authenticated;
grant update (role, status) on public.family_members to authenticated;
revoke update on public.families from authenticated;
grant update (name, timezone, settings, deleted_at) on public.families to authenticated;
revoke update on public.invitations from authenticated;
grant update (revoked_at) on public.invitations to authenticated;
revoke update on public.shortcut_tokens from authenticated;
grant update (revoked_at, device_name) on public.shortcut_tokens to authenticated;
revoke update on public.profiles from authenticated;
grant update (first_name, locale) on public.profiles to authenticated;
revoke insert, update, delete on public.entitlements, public.payments, public.trials, public.audit_log,
  public.app_config, public.event_types, public.calendar_feeds, public.families, public.family_members,
  public.invitations, public.shortcut_tokens, public.profiles from authenticated;
grant update (name, timezone, settings, deleted_at) on public.families to authenticated;
grant update (role, status) on public.family_members to authenticated;
grant update (revoked_at) on public.invitations to authenticated;
grant update (revoked_at, device_name) on public.shortcut_tokens to authenticated;
grant update (first_name, locale) on public.profiles to authenticated;
revoke delete on all tables in schema public from authenticated;
revoke delete on all tables in schema health from authenticated;

-- ============================================================
-- 13. Temps réel : minuteurs partagés entre téléphones
-- ============================================================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.events;
  end if;
end $$;

-- Note : sur le projet Supabase, la fonction public.rls_auto_enable() (RLS automatique, créée par Supabase)
-- a reçu le droit d'exécution par l'ancienne version de ce script ; il a été retiré le 16/11/2026 :
-- revoke execute on function public.rls_auto_enable() from authenticated, anon, public;
