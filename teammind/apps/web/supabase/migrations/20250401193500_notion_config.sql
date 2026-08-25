-- Create notion configuration table
create table notion_config (
  id uuid not null default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  access_token text not null,
  bot_id text not null,
  workspace_id text not null,
  workspace_name text,
  workspace_icon text,
  owner_id text,
  owner_name text,
  owner_email text,
  is_syncing boolean not null default false,
  last_synced_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint notion_config_pkey primary key (id),
  constraint unique_user_notion_config unique (user_id)
);

-- Set up Row Level Security (RLS) for notion_config
alter table notion_config enable row level security;

-- Grant select access only to non-sensitive columns
grant select(
    id,
    user_id,
    bot_id,
    workspace_id,
    workspace_name,
    workspace_icon,
    owner_id,
    owner_name,
    owner_email,
    is_syncing,
    last_synced_at,
    created_at,
    updated_at
) on notion_config to authenticated;

-- Grant delete and update privileges to authenticated users
grant delete on notion_config to authenticated;
grant update(is_syncing) on notion_config to authenticated;

-- Create simplified RLS policies that only check user_id
create policy "Users can view their own notion config" on notion_config
    for select to authenticated
    using (auth.uid() = user_id);

create policy "Users can delete their own notion config" on notion_config
    for delete to authenticated
    using (auth.uid() = user_id);

-- Add trigger for updated_at
create trigger update_notion_config_updated_at
    before update on notion_config
    for each row
    execute function public.trigger_set_timestamps();