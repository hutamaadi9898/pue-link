create table if not exists user (
  id text primary key,
  name text not null,
  email text not null unique,
  emailVerified integer not null default 0,
  image text,
  createdAt integer not null,
  updatedAt integer not null
);

create table if not exists session (
  id text primary key,
  userId text not null references user(id) on delete cascade,
  token text not null unique,
  expiresAt integer not null,
  ipAddress text,
  userAgent text,
  createdAt integer not null,
  updatedAt integer not null
);

create table if not exists account (
  id text primary key,
  userId text not null references user(id) on delete cascade,
  accountId text not null,
  providerId text not null,
  accessToken text,
  refreshToken text,
  accessTokenExpiresAt integer,
  refreshTokenExpiresAt integer,
  scope text,
  idToken text,
  password text,
  createdAt integer not null,
  updatedAt integer not null
);

create table if not exists verification (
  id text primary key,
  identifier text not null,
  value text not null,
  expiresAt integer not null,
  createdAt integer,
  updatedAt integer
);

alter table accounts add column auth_user_id text;

create unique index if not exists idx_accounts_auth_user_id on accounts (auth_user_id);
create index if not exists idx_better_auth_session_user_id on session (userId);
create index if not exists idx_better_auth_account_user_id on account (userId);

