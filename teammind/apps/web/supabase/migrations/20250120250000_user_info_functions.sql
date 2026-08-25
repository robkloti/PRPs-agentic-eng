-- Create function to get user picture URL by source user ID
create or replace function public.get_user_picture_url_by_source_user_id(
 source_user_id varchar(255),
 source document_source
)
returns varchar(255)
language sql
security definer
set search_path = public
as $$
 select a.picture_url::varchar(255)
 from atlassian_config ac
 join accounts a on a.id = ac.user_id
 where ac.atlassian_account_id = source_user_id
 and source = 'confluence'
 limit 1;
$$;

-- Grant execute permission
grant execute on function public.get_user_picture_url_by_source_user_id(varchar, document_source) to authenticated;

-- Add comment 
comment on function public.get_user_picture_url_by_source_user_id(varchar, document_source) is 'Get user picture URL from accounts table based on source user ID';