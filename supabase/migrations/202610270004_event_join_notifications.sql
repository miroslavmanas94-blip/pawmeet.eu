-- Send an in-app notification to an event owner when another member joins.
create or replace function public.notify_event_owner_on_join()
returns trigger language plpgsql security definer set search_path = public as $$
declare owner_id uuid; event_title text;
begin
  select e.created_by, e.title into owner_id, event_title from public.events e where e.id = new.event_id;
  if owner_id is not null and owner_id <> new.user_id then
    insert into public.notifications(user_id, sender_id, type, text, target_id, message)
    values (owner_id, new.user_id, 'event_participant', 'Někdo se přihlásil na tvoji akci.', new.event_id::text, event_title);
  end if;
  return new;
end;
$$;
drop trigger if exists notify_event_owner_on_join on public.event_participants;
create trigger notify_event_owner_on_join after insert on public.event_participants for each row execute function public.notify_event_owner_on_join();
