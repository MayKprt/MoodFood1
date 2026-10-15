begin;
alter table public.addresses add column label text not null default 'Home';
alter table public.addresses add constraint addresses_customer_label_key unique(customer_id,label);
-- One transaction for a customer's editable profile, Home address, and bookmarks.
-- SECURITY INVOKER keeps every underlying RLS check in force.
create function public.save_customer_state(p_state jsonb) returns void language plpgsql security invoker set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); prefs jsonb:=p_state->'preferences'; addr jsonb:=p_state->'address';
begin
  if uid is null then raise exception 'Authentication required'; end if;
  insert into public.customer_profiles(customer_id,dietary_preferences,allergies,disliked_ingredients,favorite_cuisines,budget_cents,notifications)
  values(uid,array(select jsonb_array_elements_text(prefs->'diets')),array(select jsonb_array_elements_text(prefs->'allergies')),
    string_to_array(prefs->>'disliked',','),array(select jsonb_array_elements_text(prefs->'cuisines')),round((prefs->>'budget')::numeric*100),(prefs->>'notifications')::boolean)
  on conflict(customer_id) do update set dietary_preferences=excluded.dietary_preferences,allergies=excluded.allergies,
    disliked_ingredients=excluded.disliked_ingredients,favorite_cuisines=excluded.favorite_cuisines,budget_cents=excluded.budget_cents,notifications=excluded.notifications;
  if length(trim(coalesce(addr->>'street','')))>0 then
    insert into public.addresses(customer_id,street,apartment,city,postal_code,label)
    values(uid,addr->>'street',addr->>'apartment',addr->>'city',addr->>'zip','Home')
    on conflict(customer_id,label) do update set street=excluded.street,apartment=excluded.apartment,city=excluded.city,postal_code=excluded.postal_code;
  else delete from public.addresses where customer_id=uid and label='Home'; end if;
  delete from public.saved_dishes where customer_id=uid and dish_id not in(select jsonb_array_elements_text(p_state->'saved'));
  insert into public.saved_dishes(customer_id,dish_id) select uid,value from jsonb_array_elements_text(p_state->'saved') on conflict do nothing;
end $$;
revoke all on function public.save_customer_state(jsonb) from public,anon;
grant execute on function public.save_customer_state(jsonb) to authenticated;
commit;
