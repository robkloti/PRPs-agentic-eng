-- Create google configuration table
create table google_config (
  id uuid not null default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  access_token text not null,
  refresh_token text not null, 
  change_page_token text,
  token_expiry timestamp with time zone, 
  email text, -- User's Google email
  name text, -- User's Google name
  picture text, -- User's Google profile picture URL
  drive_root_folder_id text,
  granted_scopes text[],
  selected_folders jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_syncing boolean not null default false,
  last_synced_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint google_config_pkey primary key (id),
  constraint unique_user_google_config unique (user_id)
);

-- Set up Row Level Security (RLS) for google_config
alter table google_config enable row level security;

-- Grant select access only to non-sensitive columns
grant select(
    id,
    user_id,
    email,
    name,
    picture,
    granted_scopes,
    is_syncing,
    last_synced_at,
    created_at,
    updated_at
) on google_config to authenticated;

-- Grant delete and update privileges to authenticated users
grant delete on google_config to authenticated;
grant update(is_syncing) on google_config to authenticated;

-- Create simplified RLS policies that only check user_id
create policy "Users can view their own google config" on google_config
    for select to authenticated
    using (auth.uid() = user_id);

create policy "Users can delete their own google config" on google_config
    for delete to authenticated
    using (auth.uid() = user_id);

-- Add trigger for updated_at
create trigger update_google_config_updated_at
    before update on google_config
    for each row
    execute function public.trigger_set_timestamps();