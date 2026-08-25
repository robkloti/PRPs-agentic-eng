-- Create meeting status enum with all states
create type public.meeting_status as enum (
  -- Scheduling states
  'pending',
  'scheduled',
  'cancelled',
  
  -- Execution states
  'joining_call',
  'in_waiting_room', 
  'in_call_not_recording',
  'in_call_recording',
  
  -- Completion states
  'call_ended',
  'completed',
  'failed',
  'meeting_error'
);

create type public.document_update_action_type as enum (
  'document_create',
  'document_update',
  'ticket_create'
);

create type public.document_update_action_status as enum (
  'pending',
  'executed',
  'dismissed'
);

-- Create consolidated meetings table with scheduling capability
create table if not exists public.meetings (
  id uuid primary key default extensions.uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade not null,
  bot_id text unique,
  meeting_url text,
  title text,
  is_scheduled boolean not null default false,
  scheduled_at timestamptz,
  time_start timestamptz,
  time_end timestamptz,
  transcript jsonb,
  status public.meeting_status not null default 'joining_call',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

comment on table public.meetings is 'Stores all meeting information including instant and scheduled meetings';
comment on column public.meetings.bot_id is 'The unique identifier for the meeting bot';
comment on column public.meetings.meeting_url is 'URL of the meeting (Zoom, Teams, Google Meet)';
comment on column public.meetings.time_start is 'When the meeting started';
comment on column public.meetings.time_end is 'When the meeting ended';
comment on column public.meetings.transcript is 'The meeting transcript in JSON format';
comment on column public.meetings.status is 'Current status of the meeting';
comment on column public.meetings.user_id is 'The user who created the meeting';
comment on column public.meetings.is_scheduled is 'Whether this is a scheduled meeting or an instant meeting';
comment on column public.meetings.scheduled_at is 'When a scheduled meeting is set to occur';

-- Create autojoin_emails table for automatic meeting joining
create table if not exists public.autojoin_emails (
  id uuid primary key default extensions.uuid_generate_v4(),
  user_id uuid references auth.users not null unique, -- No cascade delete
  email_handle text not null unique,
  is_deleted boolean not null default false,
  created_at timestamptz default now() not null,
  deleted_at timestamptz default null,
  updated_at timestamptz default now() not null
);

comment on table public.autojoin_emails is 'Stores unique email handles for users to automatically join meetings';
comment on column public.autojoin_emails.user_id is 'The user this email handle belongs to';
comment on column public.autojoin_emails.email_handle is 'Unique handle for receiving meeting invitations';
comment on column public.autojoin_emails.is_deleted is 'Soft delete flag to prevent handle reuse';
comment on column public.autojoin_emails.deleted_at is 'When this email handle was deleted';

-- Create document updates table
create table if not exists public.document_updates (
  id uuid primary key default extensions.uuid_generate_v4(),
  meeting_id uuid references public.meetings on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  content_before text,
  content_after text,
  title text,
  update_summary text,
  url text,
  source_id text,                
  source document_source not null,
  status public.document_update_action_status not null default 'pending',
  execution_data jsonb,
  executed_at timestamptz,
  action_type public.document_update_action_type,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

comment on table public.document_updates is 'Tracks document changes during meetings';
comment on column public.document_updates.meeting_id is 'The associated meeting';
comment on column public.document_updates.user_id is 'The user who triggered the update';
comment on column public.document_updates.content_before is 'Document content before the change';
comment on column public.document_updates.content_after is 'Document content after the change';
comment on column public.document_updates.title is 'Title of the document';
comment on column public.document_updates.url is 'URL of the document';
comment on column public.document_updates.source_id is 'ID of the source document';
comment on column public.document_updates.source is 'Source of the document';
comment on column public.document_updates.status is 'Status of the document update';
comment on column public.document_updates.execution_data is 'Data needed for execution';
comment on column public.document_updates.executed_at is 'When the document update was executed';
comment on column public.document_updates.action_type is 'Type of document update action';
comment on column public.document_updates.created_at is 'When the document update was created';
comment on column public.document_updates.updated_at is 'When the document update was last updated';

-- Create update preferences table
create table if not exists public.update_preferences (
  id uuid primary key default extensions.uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade not null unique,
  document_generation_enabled boolean NOT NULL DEFAULT true,
  ticket_generation_enabled boolean NOT NULL DEFAULT true,
  document_auto_update boolean not null default false,
  ticket_auto_update boolean not null default false,
  preferred_document_source document_source default null,
  preferred_ticket_source document_source default null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

comment on table public.update_preferences is 'Stores user preferences for document and ticket updates';
comment on column public.update_preferences.user_id is 'The user these preferences belong to';
COMMENT ON COLUMN public.update_preferences.document_generation_enabled IS 'Whether document generation is enabled for the user';
COMMENT ON COLUMN public.update_preferences.ticket_generation_enabled IS 'Whether ticket generation is enabled for the user';
comment on column public.update_preferences.document_auto_update is 'Whether document updates are automatically executed';
comment on column public.update_preferences.ticket_auto_update is 'Whether ticket updates are automatically executed';
comment on column public.update_preferences.preferred_document_source is 'Preferred source for document updates';
comment on column public.update_preferences.preferred_ticket_source is 'Preferred source for ticket updates';

-- Function to generate a unique human-readable email handle
create or replace function public.generate_unique_email_handle(user_id uuid) returns text as $$
declare
  base_handle text;
  unique_handle text;
  random_number text;
  user_name text;
  user_email text;
begin
  -- Get user info
  select raw_user_meta_data->>'name', email
  into user_name, user_email
  from auth.users
  where id = user_id;
  
  -- Fallback to email if name not available
  if user_name is null or user_name = '' then
    user_name := split_part(user_email, '@', 1);
  end if;
  
  -- Clean up the name to create a base handle
  base_handle := lower(regexp_replace(user_name, '[^a-zA-Z0-9]', '', 'g'));
  
  -- If base handle is too short, add 'tm' prefix (TeamMind)
  if length(base_handle) < 3 then
    base_handle := 'tm' || base_handle;
  end if;
  
  -- Ensure it's not too long (leaving room for random suffix)
  base_handle := substring(base_handle, 1, 12);
  
  -- Generate a random 3-digit number for security through obscurity
  random_number := floor(random() * 900 + 100)::text;
  
  -- Create handle with random number
  unique_handle := base_handle || random_number;
  
  -- Check if handle exists and is not deleted
  while exists (
    select 1 from public.autojoin_emails 
    where email_handle = unique_handle 
    and (is_deleted = false or deleted_at is null)
  ) loop
    -- Generate a new random number if collision occurs
    random_number := floor(random() * 900 + 100)::text;
    unique_handle := base_handle || random_number;
  end loop;
  
  return unique_handle;
end;
$$ language plpgsql;

-- Trigger to create email handle on user creation
create or replace function public.create_user_email_handle() returns trigger as $$
declare
  email_handle text;
begin
  -- Generate unique email handle
  email_handle := public.generate_unique_email_handle(new.id);
  
  -- Insert into autojoin_emails
  insert into public.autojoin_emails(user_id, email_handle)
  values (new.id, email_handle);
  
  return new;
end;
$$ language plpgsql;

-- Function to handle user deletion (soft delete email handles)
create or replace function public.handle_user_deletion() returns trigger as $$
begin
  -- Mark email handle as deleted but keep the record
  update public.autojoin_emails
  set is_deleted = true,
      deleted_at = now()
  where user_id = old.id;
  
  return old;
end;
$$ language plpgsql;

-- Create indexes
create index idx_meetings_user_id on public.meetings(user_id);
create index idx_meetings_bot_id on public.meetings(bot_id);
create index idx_meetings_status on public.meetings(status);
create index idx_meetings_scheduled_at on public.meetings(scheduled_at);
create index idx_meetings_is_scheduled on public.meetings(is_scheduled);
create index idx_document_updates_meeting_id on public.document_updates(meeting_id);
create index idx_document_updates_status on public.document_updates(status);
create index idx_document_updates_user_id on public.document_updates(user_id);
create index idx_update_preferences_user_id on public.update_preferences(user_id);
create index idx_autojoin_emails_user_id on public.autojoin_emails(user_id);
create index idx_autojoin_emails_email_handle on public.autojoin_emails(email_handle);

-- Create triggers
create trigger on_auth_user_created_email_handle
after insert on auth.users
for each row
execute function public.create_user_email_handle();

create trigger on_user_deleted
before delete on auth.users
for each row
execute function public.handle_user_deletion();

create trigger set_timestamp
before update on public.meetings
for each row
execute procedure public.trigger_set_timestamps();

create trigger set_timestamp
before update on public.document_updates
for each row
execute procedure public.trigger_set_timestamps();

create trigger set_timestamp
before update on public.update_preferences
for each row
execute procedure public.trigger_set_timestamps();

create trigger set_timestamp
before update on public.autojoin_emails
for each row
execute procedure public.trigger_set_timestamps();

-- Enable RLS
alter table public.meetings enable row level security;
alter table public.document_updates enable row level security;
alter table public.update_preferences enable row level security;
alter table public.autojoin_emails enable row level security;

-- Grant permissions
grant all on public.meetings to authenticated;
grant all on public.document_updates to authenticated;
grant all on public.update_preferences to authenticated;
grant all on public.autojoin_emails to authenticated, service_role;

-- RLS policies for meetings
create policy "Users can view their own meetings"
  on public.meetings for select
  using (auth.uid() = user_id);

create policy "Users can insert their own meetings"
  on public.meetings for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own meetings"
  on public.meetings for update
  using (auth.uid() = user_id);

create policy "Users can delete their own meetings"
  on public.meetings for delete
  using (auth.uid() = user_id);

-- Document updates policies
create policy "Users can view their own document updates"
  on public.document_updates for select
  using (auth.uid() = user_id OR exists (
    select 1 from public.meetings
    where meetings.id = document_updates.meeting_id
    and meetings.user_id = auth.uid()
  ));

create policy "Users can insert their own document updates"
  on public.document_updates for insert
  with check (auth.uid() = user_id OR exists (
    select 1 from public.meetings
    where meetings.id = document_updates.meeting_id
    and meetings.user_id = auth.uid()
  ));

create policy "Users can update their own document updates"
  on public.document_updates for update
  using (auth.uid() = user_id OR exists (
    select 1 from public.meetings
    where meetings.id = document_updates.meeting_id
    and meetings.user_id = auth.uid()
  ));

create policy "Users can delete their meeting document updates"
  on public.document_updates for delete
  using (exists (
    select 1 from public.meetings
    where meetings.id = document_updates.meeting_id
    and meetings.user_id = auth.uid()
  ));

-- Update preferences policies
create policy "Users can view their own update preferences"
  on public.update_preferences for select
  using (auth.uid() = user_id);

create policy "Users can insert their own update preferences"
  on public.update_preferences for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own update preferences"
  on public.update_preferences for update
  using (auth.uid() = user_id);

-- Autojoin emails policies  
create policy "Users can view their own email handles"
  on public.autojoin_emails for select
  using (auth.uid() = user_id);

create policy "Service role can manage all email handles"
  on public.autojoin_emails for all
  using (current_user = 'service_role');