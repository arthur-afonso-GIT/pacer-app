begin;

drop trigger if exists group_member_sync_challenges on public.group_members;
create trigger group_member_sync_challenges
after insert or update of status on public.group_members
for each row execute function public.sync_challenges_on_group_member();

commit;
