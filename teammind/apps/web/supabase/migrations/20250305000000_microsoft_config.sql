-- Create microsoft configuration table
create table microsoft_config (
  id uuid not null default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  access_token text not null,
  refresh_token text not null,
  access_token_expires_at timestamp with time zone not null,
  refresh_token_expires_at timestamp with time zone not null, -- Absolute expiry (365 days from creation)
  refresh_token_inactivity_expires_at timestamp with time zone not null, -- Inactivity expiry (90 days from last use)  
  microsoft_account_id text,
  microsoft_email text,
  microsoft_display_name text,
  is_syncing boolean not null default false,
  last_synced_at timestamp with time zone,
  selected_sharepoint_sites jsonb not null default '[]'::jsonb,
  sharepoint_root_id text,
  sharepoint_base_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint microsoft_config_pkey primary key (id),
  constraint unique_user_microsoft_config unique (user_id)
);

-- Set up Row Level Security (RLS) for microsoft_config
alter table microsoft_config enable row level security;

-- Grant select access only to non-sensitive columns
grant select(
    id,
    user_id,
    microsoft_account_id,
    microsoft_email,
    microsoft_display_name,
    is_syncing,
    last_synced_at,
    selected_sharepoint_sites,
    sharepoint_root_id,
    sharepoint_base_url,
    created_at,
    updated_at
) on microsoft_config to authenticated;

-- Grant delete and update privileges to authenticated users
grant delete on microsoft_config to authenticated;
grant update(selected_sharepoint_sites, is_syncing) on microsoft_config to authenticated;

-- Create simplified RLS policies that only check user_id
create policy "Users can view their own microsoft config" on microsoft_config
    for select to authenticated
    using (auth.uid() = user_id);

create policy "Users can delete their own microsoft config" on microsoft_config
    for delete to authenticated
    using (auth.uid() = user_id);


-- Add trigger for updated_at
create trigger update_microsoft_config_updated_at
    before update on microsoft_config
    for each row
    execute function public.trigger_set_timestamps();