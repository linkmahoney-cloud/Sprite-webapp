-- SPRITE Tracker — Full Database Migration
-- Run this in Supabase Dashboard → SQL Editor

-- Projects
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  name text not null,
  description text default '',
  status text default 'active' check (status in ('active','archived')),
  created_at timestamptz default now(),
  notion_page_id text
);

-- Tasks
create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  title text not null,
  description text default '',
  project_id uuid references projects(id) on delete set null,
  status text default 'todo' check (status in ('todo','in_progress','done')),
  sprite_category text not null check (sprite_category in ('S','P','R','I','T','E')),
  type text default 'work' check (type in ('work','play')),
  priority text default 'medium' check (priority in ('low','medium','high')),
  estimated_minutes int default 30,
  actual_minutes int default 0,
  due_date date,
  completed_at timestamptz,
  created_at timestamptz default now(),
  notion_page_id text
);

-- Notes
create table notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  title text not null,
  content text default '',
  sprite_category text check (sprite_category in ('S','P','R','I','T','E')),
  tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  notion_page_id text
);

-- Monthly Income
create table monthly_income (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  month text not null,
  earned_income numeric default 0,
  unearned_income numeric default 0,
  tithe_pct numeric default 10,
  save_pct numeric default 2,
  invest_pct numeric default 30,
  tax_pct numeric default 35,
  unique(user_id, month)
);

-- Expense Categories
create table expense_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  month text not null,
  name text not null,
  required_amount numeric default 0,
  unique(user_id, month, name)
);

-- Individual Expenses
create table expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  month text not null,
  category text not null,
  description text default '',
  amount numeric not null,
  is_required boolean default true,
  date date not null,
  created_at timestamptz default now(),
  notion_page_id text
);

-- Google tokens
create table google_tokens (
  user_id uuid primary key references auth.users(id),
  access_token text,
  refresh_token text,
  expiry_date bigint,
  scopes text[]
);

-- Email classification cache
create table email_classifications (
  id text primary key,
  user_id uuid references auth.users(id),
  category text not null check (category in ('work','personal','subscription')),
  priority text default 'normal' check (priority in ('high','normal','low')),
  classified_at timestamptz default now()
);

-- Food log
create table food_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  name text not null,
  health_rating text not null check (health_rating in ('healthy','neutral','unhealthy')),
  penalty int not null default 0,
  date date default current_date,
  logged_at timestamptz default now()
);

-- SPRITE Time Logs
create table sprite_time_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  sprite_category text not null check (sprite_category in ('S','P','R','I','T','E')),
  minutes int not null,
  description text default '',
  type text default 'work' check (type in ('work','play')),
  logged_at timestamptz default now(),
  date date default current_date
);

-- SPRITE Daily Goals
create table sprite_daily_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  sprite_category text not null check (sprite_category in ('S','P','R','I','T','E')),
  day_of_week int not null check (day_of_week between 0 and 6),
  goal_minutes int not null,
  unique(user_id, sprite_category, day_of_week)
);

-- Contacts
create table contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  source text not null check (source in ('google','icloud','manual')),
  source_id text,
  name text not null,
  email text,
  phone text,
  company text,
  job_title text,
  birthday date,
  category text default 'personal' check (category in ('work','personal')),
  photo_url text,
  notes text default '',
  last_contacted_at timestamptz,
  contact_frequency int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, source, source_id)
);

-- Contact Interactions
create table contact_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  contact_id uuid references contacts(id) on delete cascade,
  type text not null check (type in ('email','meeting','call','text','social','other')),
  source text default 'manual' check (source in ('gmail','calendar','manual')),
  description text default '',
  occurred_at timestamptz not null,
  created_at timestamptz default now()
);

-- iCloud credentials
create table icloud_credentials (
  user_id uuid primary key references auth.users(id),
  apple_id text not null,
  app_specific_password text not null,
  last_sync_at timestamptz
);

-- Slack tokens (one per workspace)
create table slack_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  workspace_name text not null,
  workspace_id text not null,
  access_token text not null,
  bot_user_id text,
  created_at timestamptz default now(),
  unique(user_id, workspace_id)
);

-- Meta tokens (Instagram + Facebook)
create table meta_tokens (
  user_id uuid primary key references auth.users(id),
  access_token text,
  ig_user_id text,
  fb_page_id text,
  token_expiry timestamptz
);

-- Email senders (for classification)
create table email_senders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  email_address text not null,
  category text not null check (category in ('work','personal','subscription')),
  unique(user_id, email_address)
);

-- ==========================================
-- Row Level Security (RLS) — each user sees only their own data
-- ==========================================

alter table projects enable row level security;
alter table tasks enable row level security;
alter table notes enable row level security;
alter table monthly_income enable row level security;
alter table expense_categories enable row level security;
alter table expenses enable row level security;
alter table google_tokens enable row level security;
alter table email_classifications enable row level security;
alter table food_log enable row level security;
alter table sprite_time_logs enable row level security;
alter table sprite_daily_goals enable row level security;
alter table contacts enable row level security;
alter table contact_interactions enable row level security;
alter table icloud_credentials enable row level security;
alter table slack_tokens enable row level security;
alter table meta_tokens enable row level security;
alter table email_senders enable row level security;

-- RLS policies: authenticated users can CRUD their own rows
create policy "Users manage own projects" on projects for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own tasks" on tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own notes" on notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own income" on monthly_income for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own expense categories" on expense_categories for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own expenses" on expenses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own google tokens" on google_tokens for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own email classifications" on email_classifications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own food log" on food_log for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own time logs" on sprite_time_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own daily goals" on sprite_daily_goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own contacts" on contacts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own interactions" on contact_interactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own icloud creds" on icloud_credentials for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own slack tokens" on slack_tokens for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own meta tokens" on meta_tokens for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own email senders" on email_senders for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
