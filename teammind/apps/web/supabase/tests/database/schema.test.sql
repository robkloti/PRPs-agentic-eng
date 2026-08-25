BEGIN;
create extension "basejump-supabase_test_helpers" version '0.0.6';

select no_plan();

select has_table('public', 'config', 'TeamMind config table should exist');
select has_table('public', 'accounts', 'TeamMind accounts table should exist');
select has_table('public', 'accounts_memberships', 'TeamMind account_users table should exist');
select has_table('public', 'invitations', 'TeamMind invitations table should exist');
select has_table('public', 'billing_customers', 'TeamMind billing_customers table should exist');
select has_table('public', 'subscriptions', 'TeamMind subscriptions table should exist');
select has_table('public', 'subscription_items', 'TeamMind subscription_items table should exist');
select has_table('public', 'orders', 'TeamMind orders table should exist');
select has_table('public', 'order_items', 'TeamMind order_items table should exist');
select has_table('public', 'roles', 'TeamMind roles table should exist');
select has_table('public', 'role_permissions', 'TeamMind roles_permissions table should exist');

select tests.rls_enabled('public', 'config');
select tests.rls_enabled('public', 'accounts');
select tests.rls_enabled('public', 'accounts_memberships');
select tests.rls_enabled('public', 'invitations');
select tests.rls_enabled('public', 'billing_customers');
select tests.rls_enabled('public', 'subscriptions');
select tests.rls_enabled('public', 'subscription_items');
select tests.rls_enabled('public', 'orders');
select tests.rls_enabled('public', 'order_items');
select tests.rls_enabled('public', 'roles');
select tests.rls_enabled('public', 'role_permissions');

SELECT schema_privs_are('public', 'anon', Array [NULL], 'Anon should not have access to public schema');

-- set the role to anonymous for verifying access tests
set role anon;
select throws_ok('select public.get_config()');
select throws_ok('select public.is_set(''enable_team_accounts'')');

-- set the role to the service_role for testing access
set role service_role;
select ok(public.get_config() is not null),
       'TeamMind get_config should be accessible to the service role';

-- set the role to authenticated for tests
set role authenticated;
select ok(public.get_config() is not null), 'TeamMind get_config should be accessible to authenticated users';
select ok(public.is_set('enable_team_accounts')),
       'TeamMind is_set should be accessible to authenticated users';
select isnt_empty('select * from public.config', 'authenticated users should have access to TeamMind config');

SELECT *
FROM finish();

ROLLBACK;