-- =============================================
-- Mafioso Game — Initial Database Schema
-- =============================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- =============================================
-- 1. Cases (crime scenarios)
-- =============================================
create table cases (
  id uuid primary key default uuid_generate_v4(),
  case_code text unique not null,
  crime_type text not null,
  title text not null,
  intro text not null,
  player_count smallint not null check (player_count in (3, 5)),
  mafioso_count smallint not null,
  mafioso_names text,
  round_1_evidence text not null,
  round_2_evidence text not null,
  round_3_evidence text,
  final_truth text not null,
  innocent_secrets text,
  status text not null default 'production_ready',
  language text not null default 'ar-EG',
  created_at timestamptz default now()
);

-- =============================================
-- 2. Case Characters
-- =============================================
create table case_characters (
  id uuid primary key default uuid_generate_v4(),
  case_id uuid not null references cases(id) on delete cascade,
  character_name text not null,
  character_order smallint not null,
  public_profile text not null,
  is_mafioso boolean not null default false,
  created_at timestamptz default now()
);

create index idx_case_characters_case_id on case_characters(case_id);

-- =============================================
-- 3. Rooms
-- =============================================
create table rooms (
  id uuid primary key default uuid_generate_v4(),
  room_code text unique not null,
  host_player_id uuid,
  status text not null default 'waiting',
  case_id uuid references cases(id),
  player_count_mode smallint not null check (player_count_mode in (3, 5)),
  current_round smallint not null default 0,
  current_state text not null default 'waiting',
  created_at timestamptz default now(),
  started_at timestamptz,
  ended_at timestamptz
);

create index idx_rooms_code on rooms(room_code);
create index idx_rooms_status on rooms(status);

-- =============================================
-- 4. Room Players
-- =============================================
create table room_players (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid not null references rooms(id) on delete cascade,
  nickname text not null,
  avatar text not null default 'detective',
  seat_number smallint not null,
  is_ready boolean not null default false,
  is_alive boolean not null default true,
  assigned_role text,
  assigned_character_id uuid references case_characters(id),
  joined_at timestamptz default now()
);

create index idx_room_players_room_id on room_players(room_id);

-- Set host_player_id FK after room_players exists
alter table rooms
  add constraint fk_rooms_host_player
  foreign key (host_player_id) references room_players(id);

-- =============================================
-- 5. Room Votes
-- =============================================
create table room_votes (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid not null references rooms(id) on delete cascade,
  round_number smallint not null,
  voter_player_id uuid not null references room_players(id),
  target_player_id uuid not null references room_players(id),
  is_revote boolean not null default false,
  created_at timestamptz default now()
);

create index idx_room_votes_room_round on room_votes(room_id, round_number);

-- =============================================
-- 6. Room Events (audit log)
-- =============================================
create table room_events (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid not null references rooms(id) on delete cascade,
  event_type text not null,
  payload_json jsonb default '{}',
  created_at timestamptz default now()
);

create index idx_room_events_room_id on room_events(room_id);

-- =============================================
-- 7. Game Results
-- =============================================
create table game_results (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid unique not null references rooms(id) on delete cascade,
  winner_side text not null check (winner_side in ('mafioso', 'innocent')),
  summary text,
  ended_at timestamptz default now()
);

-- =============================================
-- Row Level Security
-- =============================================
alter table cases enable row level security;
alter table case_characters enable row level security;
alter table rooms enable row level security;
alter table room_players enable row level security;
alter table room_votes enable row level security;
alter table room_events enable row level security;
alter table game_results enable row level security;

-- Cases and characters are readable by everyone (public content)
create policy "Cases are viewable by everyone"
  on cases for select using (true);

create policy "Characters are viewable by everyone"
  on case_characters for select using (true);

-- Rooms: anyone can read, insert (create/join handled by app logic)
create policy "Rooms are viewable by everyone"
  on rooms for select using (true);

create policy "Anyone can create rooms"
  on rooms for insert with check (true);

create policy "Anyone can update rooms"
  on rooms for update using (true);

-- Room players: readable by everyone, insertable/updatable
create policy "Room players are viewable by everyone"
  on room_players for select using (true);

create policy "Anyone can join rooms"
  on room_players for insert with check (true);

create policy "Anyone can update room players"
  on room_players for update using (true);

-- Votes: readable, insertable
create policy "Votes are viewable by everyone"
  on room_votes for select using (true);

create policy "Anyone can vote"
  on room_votes for insert with check (true);

-- Events: readable, insertable
create policy "Events are viewable by everyone"
  on room_events for select using (true);

create policy "Anyone can create events"
  on room_events for insert with check (true);

-- Game results: readable, insertable
create policy "Results are viewable by everyone"
  on game_results for select using (true);

create policy "Anyone can create results"
  on game_results for insert with check (true);

-- =============================================
-- Enable Realtime
-- =============================================
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table room_players;
alter publication supabase_realtime add table room_votes;
alter publication supabase_realtime add table room_events;
