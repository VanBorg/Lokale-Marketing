create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client_name text,
  client_address text,
  client_contact text,
  client_phone text,
  client_email text,
  btw_nummer text,
  status text not null default 'Concept'
    check (status in ('Concept','Offerte Verstuurd','Akkoord','In Uitvoering','Afgerond')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table rooms (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  name text,
  shape text,
  width numeric,
  height numeric,
  position_x numeric default 0,
  position_y numeric default 0,
  sub_rooms jsonb default '[]',
  area_m2 numeric,
  created_at timestamptz default now()
);

create table materials (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  name text not null,
  unit text,
  quantity numeric default 0,
  price_per_unit numeric default 0
);

create table labor (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  description text,
  hours numeric default 0,
  hourly_rate numeric default 0
);

create table offerte_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  version_number int not null,
  margin_percentage numeric default 0,
  total_price numeric default 0,
  created_at timestamptz default now()
);

create table room_photos (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  file_url text,
  note text,
  created_at timestamptz default now()
);

alter table projects enable row level security;
alter table rooms enable row level security;
alter table materials enable row level security;
alter table labor enable row level security;
alter table offerte_versions enable row level security;
alter table room_photos enable row level security;

create policy "Authenticated users can manage projects"
  on projects for all to authenticated using (true) with check (true);
create policy "Authenticated users can manage rooms"
  on rooms for all to authenticated using (true) with check (true);
create policy "Authenticated users can manage materials"
  on materials for all to authenticated using (true) with check (true);
create policy "Authenticated users can manage labor"
  on labor for all to authenticated using (true) with check (true);
create policy "Authenticated users can manage offerte_versions"
  on offerte_versions for all to authenticated using (true) with check (true);
create policy "Authenticated users can manage room_photos"
  on room_photos for all to authenticated using (true) with check (true);
