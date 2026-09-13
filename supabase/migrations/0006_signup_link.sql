-- Quest Duo — self-service signup: link a new auth user to the player they
-- picked at signup (raw_user_meta_data.player = 'mohanad' | 'hasabo').
-- Only claims a player slot that is still unlinked.

create or replace function public.link_player_on_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
     set auth_user_id = new.id
   where id = new.raw_user_meta_data->>'player'
     and auth_user_id is null;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.link_player_on_signup();
