begin;
select plan(28);

select ok((select relrowsecurity from pg_class where oid = 'public.profiles'::regclass), 'profiles has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.submissions'::regclass), 'submissions has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.notifications'::regclass), 'notifications has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.point_transactions'::regclass), 'point ledger has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.activity_post_events'::regclass), 'activity decision history has RLS enabled');

select is(has_table_privilege('authenticated', 'public.point_transactions', 'INSERT'), false, 'authenticated clients cannot forge points');
select is(has_table_privilege('authenticated', 'public.point_transactions', 'UPDATE'), false, 'authenticated clients cannot edit points');
select is(has_table_privilege('authenticated', 'public.point_transactions', 'DELETE'), false, 'authenticated clients cannot delete points');
select is(has_table_privilege('authenticated', 'public.reviews', 'INSERT'), false, 'authenticated clients cannot insert reviews directly');
select is(has_table_privilege('authenticated', 'public.group_members', 'UPDATE'), false, 'authenticated clients cannot bypass guarded membership RPCs');
select is(has_table_privilege('authenticated', 'public.groups', 'INSERT'), false, 'authenticated clients cannot bypass atomic group creation');
select is(has_table_privilege('authenticated', 'public.activity_post_events', 'INSERT'), false, 'authenticated clients cannot forge activity history');

select has_trigger('public', 'point_transactions', 'point_transactions_immutable', 'the point ledger has an immutability trigger');
select has_trigger('public', 'reviews', 'reviews_notify_submitter', 'reviews create user notifications server-side');
select has_trigger('public', 'submissions', 'submissions_validate_limits', 'submission dates and daily limits are enforced server-side');
select has_trigger('public', 'challenges', 'challenge_rules_guard', 'published challenge rules are frozen server-side');
select has_trigger('public', 'challenge_habits', 'challenge_habit_rules_guard', 'published challenge scoring rules are frozen server-side');
select has_trigger('public', 'habits', 'attached_habit_rules_guard', 'habit labels attached to published challenges are frozen server-side');
select ok(has_function_privilege('authenticated', 'public.get_review_queue(uuid)', 'EXECUTE'), 'authenticated users can request their authorized review queue');
select ok(has_function_privilege('authenticated', 'public.manage_group_member(uuid,uuid,text,public.group_role)', 'EXECUTE'), 'member management is exposed only through its guarded RPC');
select ok(has_function_privilege('authenticated', 'public.create_group(text,text,text)', 'EXECUTE'), 'authenticated users can atomically create groups');
select ok(has_function_privilege('authenticated', 'public.get_my_groups()', 'EXECUTE'), 'authenticated users can reload their persisted groups');
select ok(exists (select 1 from storage.buckets where id = 'avatars' and public and file_size_limit = 5242880), 'profile avatars use a constrained public bucket');
select ok(has_function_privilege('authenticated', 'public.create_global_habit(text,text,integer,integer)', 'EXECUTE'), 'global habit creation uses its guarded RPC');
select ok(has_function_privilege('authenticated', 'public.dispute_submission(uuid,text)', 'EXECUTE'), 'submission disputes use their guarded RPC');
select ok(has_function_privilege('authenticated', 'public.correct_point_transaction(uuid,integer,text)', 'EXECUTE'), 'point corrections use their guarded RPC');
select is(has_function_privilege('authenticated', 'public.record_activity_post_event()', 'EXECUTE'), false, 'clients cannot call the internal history trigger directly');
select ok(exists (select 1 from storage.buckets where id = 'evidence' and not public and file_size_limit = 10485760), 'submission evidence uses a constrained private bucket');

select * from finish();
rollback;
