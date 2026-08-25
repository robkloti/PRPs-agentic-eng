-- Create Atlassian configuration table
create table atlassian_config (
  id uuid not null default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  access_token text not null,
  refresh_token text not null,
  access_token_expires_at timestamp with time zone not null,
  refresh_token_expires_at timestamp with time zone not null, -- Absolute expiry (365 days from creation)
  refresh_token_inactivity_expires_at timestamp with time zone not null, -- Inactivity expiry (90 days from last use)  
  atlassian_cloud_id uuid not null,
  atlassian_account_id text not null,
  atlassian_base_url text not null,
  atlassian_email text,
  atlassian_display_name text,
  is_syncing boolean not null default false,
  last_synced_at timestamp with time zone,
  selected_confluence_spaces jsonb not null default '[]'::jsonb,
  selected_jira_boards jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint atlassian_config_pkey primary key (id),
  constraint unique_user_config unique (user_id)
);


-- Set up Row Level Security (RLS) for atlassian_config
alter table atlassian_config enable row level security;

-- Grant select access only to non-sensitive columns
grant select(
    id,
    user_id,
    atlassian_account_id,
    atlassian_cloud_id,
    atlassian_base_url,
    atlassian_email,
    atlassian_display_name,
    is_syncing,
    last_synced_at,
    selected_confluence_spaces,
    selected_jira_boards,
    created_at,
    updated_at
) on atlassian_config to authenticated;

-- Grant delete and update privileges to authenticated users
grant delete on atlassian_config to authenticated;
grant update(selected_confluence_spaces, selected_jira_boards, is_syncing) on atlassian_config to authenticated;

-- Create simplified RLS policies that only check user_id
create policy "Users can view their own atlassian config" on atlassian_config
    for select to authenticated
    using (auth.uid() = user_id);

create policy "Users can delete their own atlassian config" on atlassian_config
    for delete to authenticated
    using (auth.uid() = user_id);

-- Add trigger for updated_at
create trigger update_atlassian_config_updated_at
    before update on atlassian_config
    for each row
    execute function public.trigger_set_timestamps();