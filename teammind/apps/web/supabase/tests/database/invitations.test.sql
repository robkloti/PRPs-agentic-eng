begin;
create extension "basejump-supabase_test_helpers" version '0.0.6';

select no_plan();

-- test

select teammind.set_identifier('test', 'test@teammind.dev');
select teammind.set_identifier('member', 'member@teammind.dev');
select teammind.set_identifier('custom', 'custom@teammind.dev');

select tests.authenticate_as('test');

select lives_ok(
    $$ insert into public.invitations (email, invited_by, account_id, role, invite_token) values ('invite1@teammind.dev', auth.uid(),  teammind.get_account_id_by_slug('teammind'), 'member', gen_random_uuid()); $$,
'owner should be able to create invitations'
);

-- check two invitations to the same email/account are not allowed
select throws_ok(
    $$ insert into public.invitations (email, invited_by, account_id, role, invite_token) values ('invite1@teammind.dev', auth.uid(), teammind.get_account_id_by_slug('teammind'), 'member', gen_random_uuid()) $$,
    'duplicate key value violates unique constraint "invitations_email_account_id_key"'
);

select tests.authenticate_as('member');

-- check a member cannot invite members with higher roles
select throws_ok(
    $$ insert into public.invitations (email, invited_by, account_id, role, invite_token) values ('invite2@teammind.dev', auth.uid(), teammind.get_account_id_by_slug('teammind'), 'owner', gen_random_uuid()) $$,
    'new row violates row-level security policy for table "invitations"'
);

-- check a member can invite members with the same or lower roles
select lives_ok(
    $$ insert into public.invitations (email, invited_by, account_id, role, invite_token) values ('invite2@teammind.dev', auth.uid(), teammind.get_account_id_by_slug('teammind'), 'member', gen_random_uuid()) $$,
    'member should be able to create invitations for members or lower roles'
);

-- authenticate_as the custom role
select tests.authenticate_as('custom');

-- it will fail because the custom role does not have the invites.manage permission
select throws_ok(
    $$ insert into public.invitations (email, invited_by, account_id, role, invite_token) values ('invite3@teammind.dev', auth.uid(), teammind.get_account_id_by_slug('teammind'), 'custom-role', gen_random_uuid()) $$,
    'new row violates row-level security policy for table "invitations"'
);

set local role postgres;

-- add permissions to invite members to the custom role
insert into public.role_permissions (role, permission) values ('custom-role', 'invites.manage');

-- authenticate_as the custom role
select tests.authenticate_as('custom');

select lives_ok(
    $$ insert into public.invitations (email, invited_by, account_id, role, invite_token) values ('invite3@teammind.dev', auth.uid(), teammind.get_account_id_by_slug('teammind'), 'custom-role', gen_random_uuid()) $$,
    'custom role should be able to create invitations'
);

select lives_ok(
    $$ SELECT public.add_invitations_to_account('teammind', ARRAY[ROW('example@teammind.dev', 'custom-role')::public.invitation]); $$,
    'custom role should be able to create invitations using the function public.add_invitations_to_account'
);

select throws_ok(
    $$ SELECT public.add_invitations_to_account('teammind', ARRAY[ROW('example2@teammind.dev', 'owner')::public.invitation]); $$,
    'new row violates row-level security policy for table "invitations"',
    'cannot invite members with higher roles'
);

-- Foreigners should not be able to create invitations

select tests.create_supabase_user('user');

select tests.authenticate_as('user');

-- it will fail because the user is not a member of the account
select throws_ok(
    $$ insert into public.invitations (email, invited_by, account_id, role, invite_token) values ('invite4@teammind.dev', auth.uid(), teammind.get_account_id_by_slug('teammind'), 'member', gen_random_uuid()) $$,
    'new row violates row-level security policy for table "invitations"'
);

select throws_ok(
    $$ SELECT public.add_invitations_to_account('teammind', ARRAY[ROW('example@example.com', 'member')::public.invitation]); $$,
    'new row violates row-level security policy for table "invitations"'
);

select is_empty($$
    select * from public.invitations where account_id = teammind.get_account_id_by_slug('teammind') $$,
    'no invitations should be listed'
);

select * from finish();

rollback;
