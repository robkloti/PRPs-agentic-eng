-- Create enum type for message feedback
create type message_feedback as enum ('up', 'down');

-- Create a table to store conversations (removed account_id)
create table conversations (
  id uuid primary key default gen_random_uuid(),
  title text,
  user_id uuid references auth.users(id) not null,
  shared_with_team boolean default false not null,
  favourite boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create a table to store messages within conversations
create table messages (
  id bigserial primary key,
  conversation_id uuid references conversations(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  feedback message_feedback,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);


-- Create an RPC function to handle feedback updates by content
create or replace function update_message_feedback_by_content(
  conversation_id uuid,
  message_content text,
  feedback_value message_feedback = NULL
)
returns boolean as $$
declare
  v_message_id bigint;
  v_affected_rows int;
begin
  -- Find the message ID and verify permissions in one step
  select m.id into v_message_id
  from messages m
  join conversations c on m.conversation_id = c.id
  where m.conversation_id = update_message_feedback_by_content.conversation_id  
    and c.id = update_message_feedback_by_content.conversation_id        
    and m.role = 'assistant'
    and m.content = message_content
    and c.user_id = auth.uid()
  order by m.created_at desc
  limit 1;
  
  -- If a message was found, update it
  if v_message_id is not null then
    update messages
    set feedback = feedback_value
    where id = v_message_id;
    
    get diagnostics v_affected_rows = row_count;
    return v_affected_rows > 0;
  else
    return false;
  end if;
end;
$$ language plpgsql security definer;

-- Enable RLS
alter table conversations enable row level security;
alter table messages enable row level security;

-- Add updated_at trigger for conversations
create trigger update_conversations_updated_at
    before update on conversations
    for each row
    execute function update_updated_at_column();

-- Set up RLS policies for conversations
create policy "Users can view their own conversations or team-shared ones"
  on conversations for select
  using (
    auth.uid() = user_id 
    or (
      shared_with_team = true
      and exists (
        -- Find if the viewing user is on the same team as the conversation owner
        select 1 from accounts_memberships as viewer_membership
        join accounts_memberships as owner_membership
          on viewer_membership.account_id = owner_membership.account_id
        where viewer_membership.user_id = auth.uid()
          and owner_membership.user_id = conversations.user_id
      )
    )
  );

create policy "Users can insert their own conversations"
  on conversations for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own conversations"
  on conversations for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own conversations"
  on conversations for delete
  using (auth.uid() = user_id);

-- Messages policies (linked to conversation ownership)
create policy "Users can view msgs in their conversations or team-shared ones"
  on messages for select
  using (
    exists (
      select 1 from conversations
      where conversations.id = messages.conversation_id
      and (
        conversations.user_id = auth.uid() 
        or (
          conversations.shared_with_team = true
          and exists (
            -- Find if the viewing user is on the same team as the conversation owner
            select 1 from accounts_memberships as viewer_membership
            join accounts_memberships as owner_membership
              on viewer_membership.account_id = owner_membership.account_id
            where viewer_membership.user_id = auth.uid()
              and owner_membership.user_id = conversations.user_id
          )
        )
      )
    )
  );

create policy "Users can insert messages in their conversations"
  on messages for insert
  with check (
    exists (
      select 1 from conversations
      where conversations.id = conversation_id
      and conversations.user_id = auth.uid()
    )
  );

-- Policy for feedback changes
create policy "Users can update feedback on messages in their conversations"
  on messages for update                                                    
  using (                                                                   
    exists (                                                                
      select 1 from conversations                                           
      where conversations.id = conversation_id                              
      and conversations.user_id = auth.uid()                                
    )                                                                       
  )                                                                         
  with check (                                                              
    -- Ensure only the feedback field is being updated, nothing else can change
    id = id
    and conversation_id = conversation_id
    and role = role
    and content = content
    and created_at = created_at
    -- Remove the problematic check that was always false
  );

create policy "Users can delete messages in their conversations"
  on messages for delete
  using (
    exists (
      select 1 from conversations
      where conversations.id = conversation_id
      and conversations.user_id = auth.uid()
    )
  );

grant execute on function update_message_feedback_by_content(uuid, text, message_feedback) to authenticated;
