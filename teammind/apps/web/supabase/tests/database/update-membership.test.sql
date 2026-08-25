begin;
create extension "basejump-supabase_test_helpers" version '0.0.6';

select no_plan();

select teammind.set_identifier('primary_owner', 'test@teammind.dev');
select teammind.set_identifier('owner', 'owner@teammind.dev');
select teammind.set_identifier('member', 'member@teammind.dev');
select teammind.set_identifier('custom', 'custom@teammind.dev');

-- another user not in the team
select tests.create_supabase_user('test', 'test@supabase.com');

select tests.authenticate_as('member');

-- run an update query
update public.accounts_memberships set account_role = 'owner' where user_id = auth.uid() and account_id = teammind.get_account_id_by_slug('teammind');

select row_eq(
    $$ select account_role from public.accounts_memberships where user_id = auth.uid() and account_id = teammind.get_account_id_by_slug('teammind'); $$,
    row('member'::varchar),
    'Updates fail silently to any field of the accounts_membership table'
);

select * from finish();

rollback;