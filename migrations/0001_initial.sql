create table if not exists accounts (
  id text primary key,
  role text not null check (role in ('super_admin', 'family_member', 'device', 'public_place')),
  email text unique,
  display_name text not null,
  password_hash text,
  family_id text,
  location_id text,
  device_id text,
  is_active integer not null default 1,
  created_at text not null,
  updated_at text not null
);

create table if not exists families (
  id text primary key,
  name text not null,
  created_at text not null,
  updated_at text not null
);

create table if not exists devices (
  id text primary key,
  family_id text not null,
  name text not null,
  barcode_token text unique not null,
  is_active integer not null default 1,
  created_at text not null,
  updated_at text not null
);

create table if not exists locations (
  id text primary key,
  name text not null,
  kind text,
  address text,
  overuse_threshold integer not null default 5,
  is_active integer not null default 1,
  created_at text not null,
  updated_at text not null
);

create table if not exists video_slots (
  id text primary key,
  family_id text not null,
  location_id text not null,
  slot_number integer not null check (slot_number between 1 and 3),
  video_id text,
  created_at text not null,
  updated_at text not null,
  unique (family_id, location_id, slot_number)
);

create table if not exists videos (
  id text primary key,
  family_id text not null,
  location_id text not null,
  slot_id text not null,
  title text not null,
  description text,
  r2_key text not null,
  mime_type text not null,
  file_size integer not null,
  duration_seconds integer,
  play_count integer not null default 0,
  last_played_at text,
  overuse_threshold integer,
  needs_refresh integer not null default 0,
  last_overuse_notified_at text,
  created_at text not null,
  updated_at text not null
);

create table if not exists playback_logs (
  id text primary key,
  family_id text not null,
  location_id text not null,
  device_id text not null,
  public_place_account_id text,
  slot_id text not null,
  video_id text not null,
  machine_id text,
  played_at text not null,
  user_agent text
);

create table if not exists playback_sessions (
  id text primary key,
  family_id text not null,
  location_id text not null,
  device_id text not null,
  public_place_account_id text not null,
  slot_id text not null,
  video_id text not null,
  playback_log_id text not null,
  expires_at text not null,
  created_at text not null
);

create table if not exists push_subscriptions (
  id text primary key,
  family_id text not null,
  onesignal_player_id text not null,
  enabled integer not null default 1,
  created_at text not null,
  updated_at text not null
);

create table if not exists settings (
  key text primary key,
  value text not null,
  updated_at text not null
);

create index if not exists idx_accounts_role on accounts (role);
create index if not exists idx_accounts_family_id on accounts (family_id);
create index if not exists idx_accounts_location_id on accounts (location_id);
create index if not exists idx_accounts_device_id on accounts (device_id);
create index if not exists idx_devices_family_id on devices (family_id);
create index if not exists idx_devices_barcode_token on devices (barcode_token);
create index if not exists idx_video_slots_location_id on video_slots (location_id);
create index if not exists idx_video_slots_family_id on video_slots (family_id);
create index if not exists idx_videos_location_id on videos (location_id);
create index if not exists idx_videos_family_id on videos (family_id);
create index if not exists idx_videos_needs_refresh on videos (needs_refresh);
create index if not exists idx_playback_logs_played_at on playback_logs (played_at);
create index if not exists idx_playback_logs_location_id on playback_logs (location_id);
create index if not exists idx_playback_logs_family_id on playback_logs (family_id);
create index if not exists idx_playback_logs_device_id on playback_logs (device_id);
create index if not exists idx_playback_sessions_expires_at on playback_sessions (expires_at);
create index if not exists idx_playback_sessions_public_place_account_id on playback_sessions (public_place_account_id);
