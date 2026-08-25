-- Migration file to fix permissions for the supabase_auth_admin role
-- This is needed because triggers on auth.users need to interact with tables in the public schema

-- Description: This migration grants the necessary permissions to the supabase_auth_admin role
-- to allow the auto-join meetings feature to work properly in production.

-- Grant schema usage to supabase_auth_admin
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;

-- Grant function execution permissions
GRANT EXECUTE ON FUNCTION public.generate_unique_email_handle(uuid) TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.create_user_email_handle() TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.handle_user_deletion() TO supabase_auth_admin;

-- Grant table access
GRANT ALL ON public.autojoin_emails TO supabase_auth_admin;
GRANT ALL ON public.meetings TO supabase_auth_admin;

-- Create specific RLS policies for supabase_auth_admin
CREATE POLICY "Auth admin can manage all email handles" 
  ON public.autojoin_emails FOR ALL 
  USING (current_user = 'supabase_auth_admin');

CREATE POLICY "Auth admin can manage all meetings" 
  ON public.meetings FOR ALL 
  USING (current_user = 'supabase_auth_admin');

-- Grant any sequence permissions that might be needed
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO supabase_auth_admin;
