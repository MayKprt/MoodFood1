-- Supabase PostgreSQL. Demo mode does not require a database.
-- Merchant and financial writes are performed only by a trusted backend.
begin;
create table public.customer_profiles (
  customer_id uuid primary key references auth.users(id) on delete cascade,
  display_name text, dietary_preferences text[] not null default '{}',
  allergies text[] not null default '{}', disliked_ingredients text[] not null default '{}',
  favorite_cuisines text[] not null default '{}', budget_cents integer check(budget_cents > 0),
  notifications boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.addresses (
  id uuid primary key default gen_random_uuid(), customer_id uuid not null references auth.users(id) on delete cascade,
  street text not null, apartment text, city text not null, postal_code text not null, country_code char(2) not null default 'US',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.restaurants (
  id text primary key default gen_random_uuid()::text, name text not null, description text,
  accepting_orders boolean not null default false, delivery_postal_codes text[] not null default '{}',
  delivery_fee_cents integer not null default 0 check(delivery_fee_cents>=0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.restaurant_members (
  restaurant_id text not null references public.restaurants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check(role in ('owner','manager','staff')), primary key(restaurant_id,user_id)
);
create table public.restaurant_hours (
  id uuid primary key default gen_random_uuid(), restaurant_id text not null references public.restaurants(id) on delete cascade,
  weekday smallint not null check(weekday between 0 and 6), opens_at time not null, closes_at time not null, timezone text not null default 'America/New_York'
);
create table public.dishes (
  id text primary key default gen_random_uuid()::text, restaurant_id text not null references public.restaurants(id),
  name text not null, description text not null, cuisine text not null,
  price_cents integer not null check(price_cents>0), currency char(3) not null default 'USD',
  is_available boolean not null default false, recipe_verified_at timestamptz,
  prep_minutes smallint not null check(prep_minutes>=0), delivery_min smallint not null check(delivery_min>=0),
  delivery_max smallint not null check(delivery_max>=delivery_min),
  is_signature boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.dish_images (
  id uuid primary key default gen_random_uuid(), dish_id text not null references public.dishes(id) on delete cascade,
  storage_path text not null, alt_text text not null, sort_order integer not null default 0,
  provenance text not null, unique(dish_id,sort_order)
);
create table public.dish_attributes (
  dish_id text primary key references public.dishes(id) on delete cascade,
  spice_level smallint check(spice_level between 0 and 5), texture text[] not null default '{}', flavors text[] not null default '{}',
  temperature text check(temperature in ('hot','cold','room')), richness text check(richness in ('light','rich')),
  portion text, source text not null check(source in ('merchant','ai_draft')), verified_at timestamptz
);
create table public.ingredients (id text primary key, name text not null unique);
create table public.allergens (id text primary key, name text not null unique);
create table public.dietary_attributes (id text primary key, name text not null unique);
create table public.dish_ingredients (dish_id text references public.dishes(id) on delete cascade, ingredient_id text references public.ingredients(id), primary key(dish_id,ingredient_id));
create table public.dish_allergens (dish_id text references public.dishes(id) on delete cascade, allergen_id text references public.allergens(id), primary key(dish_id,allergen_id));
create table public.dish_dietary_attributes (dish_id text references public.dishes(id) on delete cascade, dietary_attribute_id text references public.dietary_attributes(id), verified_at timestamptz not null, primary key(dish_id,dietary_attribute_id));
create table public.dish_modifiers (
  id text primary key default gen_random_uuid()::text, dish_id text not null references public.dishes(id) on delete cascade,
  name text not null, price_cents integer not null default 0 check(price_cents>=0), available boolean not null default true
);
create table public.dish_availability (
  id uuid primary key default gen_random_uuid(), dish_id text not null references public.dishes(id) on delete cascade,
  starts_at timestamptz not null, ends_at timestamptz not null check(ends_at>starts_at), available boolean not null
);
create table public.dish_inventory (
  dish_id text primary key references public.dishes(id) on delete cascade,
  tracked boolean not null default false, remaining integer check(remaining>=0), reserved integer not null default 0 check(reserved>=0),
  untracked_policy text not null default 'manual_review' check(untracked_policy in ('auto_accept','manual_review')),
  check(not tracked or remaining is not null), updated_at timestamptz not null default now()
);
create table public.discovery_sessions (
  id uuid primary key default gen_random_uuid(), customer_id uuid not null references auth.users(id) on delete cascade,
  selected_mood text, cravings text[] not null default '{}', interpreted_intent jsonb not null default '{}',
  created_at timestamptz not null default now(), completed_at timestamptz
);
create table public.discovery_session_cards (
  id uuid primary key default gen_random_uuid(), session_id uuid not null references public.discovery_sessions(id) on delete cascade,
  dish_id text not null references public.dishes(id), position smallint not null check(position between 0 and 6), unique(session_id,position), unique(session_id,dish_id)
);
create table public.swipe_actions (
  id uuid primary key default gen_random_uuid(), session_id uuid not null references public.discovery_sessions(id) on delete cascade,
  dish_id text not null references public.dishes(id), action text not null check(action in ('like','skip')),
  undone_at timestamptz, created_at timestamptz not null default now()
);
create table public.saved_dishes (
  customer_id uuid references auth.users(id) on delete cascade, dish_id text references public.dishes(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(customer_id,dish_id)
);
create table public.carts (
  id uuid primary key default gen_random_uuid(), customer_id uuid not null references auth.users(id) on delete cascade,
  restaurant_id text not null references public.restaurants(id), updated_at timestamptz not null default now(), unique(customer_id)
);
create table public.cart_items (
  id uuid primary key default gen_random_uuid(), cart_id uuid not null references public.carts(id) on delete cascade,
  dish_id text not null references public.dishes(id), quantity smallint not null check(quantity between 1 and 20),
  modifier_ids text[] not null default '{}', instructions text not null default ''
);
create table public.orders (
  id uuid primary key default gen_random_uuid(), customer_id uuid not null references auth.users(id), restaurant_id text not null references public.restaurants(id),
  idempotency_key uuid not null, request_fingerprint text not null,
  address_snapshot jsonb not null, instructions text not null default '',
  subtotal_cents integer not null check(subtotal_cents>=0), delivery_fee_cents integer not null check(delivery_fee_cents>=0),
  service_fee_cents integer not null check(service_fee_cents>=0), tax_cents integer not null check(tax_cents>=0),
  total_cents integer not null check(total_cents=subtotal_cents+delivery_fee_cents+service_fee_cents+tax_cents),
  currency char(3) not null default 'USD', is_demo boolean not null default true,
  kitchen_status text not null default 'awaiting_confirmation' check(kitchen_status in ('awaiting_confirmation','accepted','preparing','ready','needs_attention','cancelled')),
  payment_status text not null default 'demo' check(payment_status in ('demo','pending','paid','refund_pending','refunded','failed')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(customer_id,idempotency_key)
);
create table public.order_items (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
  dish_id text references public.dishes(id), dish_name_snapshot text not null,
  unit_price_cents integer not null check(unit_price_cents>0), quantity smallint not null check(quantity between 1 and 20),
  modifiers_snapshot jsonb not null default '[]', ingredients_snapshot jsonb not null, instructions text not null default ''
);
create table public.order_status_events (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id),
  status text not null, source text not null, source_event_id text not null, created_at timestamptz not null default now(), unique(source,source_event_id)
);
create table public.delivery_requests (
  id uuid primary key default gen_random_uuid(), order_id uuid not null unique references public.orders(id), provider text not null,
  provider_reference text unique, status text not null default 'unassigned' check(status in ('unassigned','assigned','picked_up','on_the_way','delivered','failed','support_pending')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.delivery_status_events (
  id uuid primary key default gen_random_uuid(), delivery_request_id uuid not null references public.delivery_requests(id),
  status text not null, provider text not null, provider_event_id text not null, occurred_at timestamptz not null,
  created_at timestamptz not null default now(), unique(provider,provider_event_id)
);
create table public.recommendation_feedback (
  id uuid primary key default gen_random_uuid(), customer_id uuid not null references auth.users(id) on delete cascade,
  dish_id text not null references public.dishes(id), session_id uuid references public.discovery_sessions(id),
  kind text not null check(kind in ('liked','skipped','bookmarked','ordered','explicit_association')),
  user_association jsonb, created_at timestamptz not null default now()
);
create index addresses_customer_idx on public.addresses(customer_id);
create index dishes_eligible_idx on public.dishes(restaurant_id,is_available);
create index orders_customer_time_idx on public.orders(customer_id,created_at desc);
create index order_items_order_idx on public.order_items(order_id);
create index sessions_customer_idx on public.discovery_sessions(customer_id,created_at desc);
create index swipe_session_idx on public.swipe_actions(session_id,created_at);
create index feedback_customer_idx on public.recommendation_feedback(customer_id,created_at desc);
create index delivery_event_idx on public.delivery_status_events(delivery_request_id,occurred_at);
create index dish_availability_time_idx on public.dish_availability(dish_id,starts_at,ends_at);
create index cart_items_cart_idx on public.cart_items(cart_id);
-- Enable RLS on EVERY application table, including internal merchant/inventory tables.
do $$ declare t text; begin
  foreach t in array array['customer_profiles','addresses','restaurants','restaurant_members','restaurant_hours','dishes','dish_images','dish_attributes','ingredients','allergens','dietary_attributes','dish_ingredients','dish_allergens','dish_dietary_attributes','dish_modifiers','dish_availability','dish_inventory','discovery_sessions','discovery_session_cards','swipe_actions','saved_dishes','carts','cart_items','orders','order_items','order_status_events','delivery_requests','delivery_status_events','recommendation_feedback'] loop
    execute format('alter table public.%I enable row level security',t);
  end loop;
end $$;
-- Public catalog contains only customer-facing information, never internal stock/membership.
do $$ declare t text; begin
  foreach t in array array['restaurants','restaurant_hours','dishes','dish_images','ingredients','allergens','dietary_attributes','dish_ingredients','dish_allergens','dish_dietary_attributes','dish_modifiers'] loop
    execute format('create policy catalog_read on public.%I for select to anon,authenticated using (true)',t);
    execute format('grant select on public.%I to anon,authenticated',t);
  end loop;
end $$;
create policy verified_attributes_read on public.dish_attributes for select to anon,authenticated using (source='merchant' and verified_at is not null);
grant select on public.dish_attributes to anon,authenticated;
-- Customers may maintain only their own mutable data.
do $$ declare t text; begin
  foreach t in array array['customer_profiles','addresses','discovery_sessions','saved_dishes','carts','recommendation_feedback'] loop
    execute format('create policy own_customer_data on public.%I for all to authenticated using (customer_id=auth.uid()) with check (customer_id=auth.uid())',t);
    execute format('grant select,insert,update,delete on public.%I to authenticated',t);
  end loop;
end $$;
create policy own_cart_items on public.cart_items for all to authenticated using(exists(select 1 from public.carts c where c.id=cart_id and c.customer_id=auth.uid())) with check(exists(select 1 from public.carts c join public.dishes d on d.id=dish_id where c.id=cart_id and c.customer_id=auth.uid() and c.restaurant_id=d.restaurant_id));
grant select,insert,update,delete on public.cart_items to authenticated;
do $$ declare t text; begin
  foreach t in array array['discovery_session_cards','swipe_actions'] loop
    execute format('create policy own_session on public.%I for all to authenticated using (exists(select 1 from public.discovery_sessions s where s.id=session_id and s.customer_id=auth.uid())) with check(exists(select 1 from public.discovery_sessions s where s.id=session_id and s.customer_id=auth.uid()))',t);
    execute format('grant select,insert,update,delete on public.%I to authenticated',t);
  end loop;
end $$;
-- Customer orders are read-only; trusted checkout creates authoritative snapshots atomically.
create policy own_orders_read on public.orders for select to authenticated using(customer_id=auth.uid());
grant select on public.orders to authenticated;
do $$ declare t text; begin
  foreach t in array array['order_items','order_status_events','delivery_requests'] loop
    execute format('create policy own_order_read on public.%I for select to authenticated using(exists(select 1 from public.orders o where o.id=order_id and o.customer_id=auth.uid()))',t);
    execute format('grant select on public.%I to authenticated',t);
  end loop;
end $$;
create policy own_delivery_events on public.delivery_status_events for select to authenticated using(exists(select 1 from public.delivery_requests d join public.orders o on o.id=d.order_id where d.id=delivery_request_id and o.customer_id=auth.uid()));
grant select on public.delivery_status_events to authenticated;
-- Smart Accept readiness: trusted workers reserve tracked stock under row locks.
-- One reservation per event; idempotency is enforced independently of order events.
create table public.inventory_reservations (
  order_id uuid not null references public.orders(id), dish_id text not null references public.dishes(id),
  quantity integer not null check(quantity>0), created_at timestamptz not null default now(), primary key(order_id,dish_id)
);
alter table public.inventory_reservations enable row level security;
create function public.reserve_order_inventory(p_order uuid) returns text language plpgsql security definer set search_path=pg_catalog,public as $$
declare rec record; inv record; ord record;
begin
  select * into ord from public.orders where id=p_order for update;
  if not found then raise exception 'Unknown order'; end if;
  if ord.kitchen_status='accepted' then return 'accepted'; end if;
  if ord.kitchen_status<>'awaiting_confirmation' then return ord.kitchen_status; end if;
  perform 1 from public.restaurants where id=ord.restaurant_id and accepting_orders=true for update;
  if not found then return 'needs_attention'; end if;
  -- Lock in stable dish-id order and validate ALL stock before making reservations.
  for rec in select dish_id,sum(quantity)::integer qty from public.order_items where order_id=p_order group by dish_id order by dish_id loop
    perform 1 from public.dishes where id=rec.dish_id and is_available=true and restaurant_id=ord.restaurant_id for update;
    if not found then return 'needs_attention'; end if;
    select * into inv from public.dish_inventory where dish_id=rec.dish_id for update;
    if not found then return 'needs_attention'; end if;
    if (inv.tracked and inv.remaining-inv.reserved<rec.qty) or (not inv.tracked and inv.untracked_policy<>'auto_accept') then return 'needs_attention'; end if;
  end loop;
  if not exists(select 1 from public.order_items where order_id=p_order) then return 'needs_attention'; end if;
  for rec in select dish_id,sum(quantity)::integer qty from public.order_items where order_id=p_order group by dish_id order by dish_id loop
    insert into public.inventory_reservations(order_id,dish_id,quantity) values(p_order,rec.dish_id,rec.qty) on conflict do nothing;
    if found then update public.dish_inventory set reserved=reserved+rec.qty where dish_id=rec.dish_id and tracked=true; end if;
  end loop;
  update public.orders set kitchen_status='accepted',updated_at=now() where id=p_order;
  return 'accepted';
end $$;
revoke all on function public.reserve_order_inventory(uuid) from public,anon,authenticated;
grant execute on function public.reserve_order_inventory(uuid) to service_role;
create function public.touch_updated_at() returns trigger language plpgsql set search_path=pg_catalog as $$ begin new.updated_at=now();return new;end $$;
do $$ declare t text; begin
  foreach t in array array['customer_profiles','addresses','restaurants','dishes','dish_inventory','carts','orders','delivery_requests'] loop
    execute format('create trigger touch_updated before update on public.%I for each row execute function public.touch_updated_at()',t);
  end loop;
end $$;
commit;
