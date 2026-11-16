-- Keamanan (RLS) dan fungsi RPC. Klien tidak menulis langsung ke tabel; semuanya lewat fungsi di bawah.

create or replace function public.is_member(p_store uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.store_members m where m.store_id = p_store and m.user_id = auth.uid());
$$;

create or replace function public.is_owner(p_store uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.store_members m where m.store_id = p_store and m.user_id = auth.uid() and m.role = 'owner');
$$;

alter table public.stores enable row level security;
alter table public.store_members enable row level security;
alter table public.sync_entities enable row level security;
alter table public.sync_events enable row level security;
alter table public.employee_pins enable row level security;
alter table public.audit_chain enable row level security;
alter table public.transfers enable row level security;
alter table public.payment_intents enable row level security;
alter table public.ppob_orders enable row level security;

create policy stores_select on public.stores for select using (public.is_member(id));
create policy members_select on public.store_members for select using (user_id = auth.uid() or public.is_owner(store_id));
create policy sync_entities_select on public.sync_entities for select using (public.is_member(store_id));
create policy audit_chain_select on public.audit_chain for select using (public.is_member(store_id));
create policy transfers_select on public.transfers for select using (public.is_member(from_store) or public.is_member(to_store));
create policy payment_intents_select on public.payment_intents for select using (public.is_member(store_id));
create policy ppob_orders_select on public.ppob_orders for select using (public.is_member(store_id));
-- sync_events dan employee_pins: tanpa kebijakan = tidak bisa diakses klien sama sekali.

revoke all on public.sync_events, public.employee_pins from anon, authenticated;
revoke insert, update, delete on public.stores, public.store_members, public.sync_entities, public.audit_chain, public.transfers, public.payment_intents, public.ppob_orders from anon, authenticated;

-- ---------- toko ----------
create or replace function public.create_store(p_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'harus masuk' using errcode = '42501'; end if;
  insert into public.stores(name, owner_id) values (trim(p_name), auth.uid()) returning id into v_id;
  insert into public.store_members(store_id, user_id, role) values (v_id, auth.uid(), 'owner');
  return v_id;
end $$;

-- Pemilik mengundang akun perangkat kasir (akun harus sudah pernah masuk lewat email).
create or replace function public.add_device_member(p_store uuid, p_email text) returns void
language plpgsql security definer set search_path = public as $$
declare v_user uuid;
begin
  if not public.is_owner(p_store) then raise exception 'hanya pemilik' using errcode = '42501'; end if;
  select id into v_user from auth.users where lower(email) = lower(trim(p_email));
  if v_user is null then raise exception 'akun belum terdaftar; minta pengguna masuk dengan email itu lebih dulu'; end if;
  insert into public.store_members(store_id, user_id, role) values (p_store, v_user, 'device') on conflict do nothing;
end $$;

-- ---------- sinkronisasi ----------
create or replace function public.sync_status(p_store uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_member(p_store) then raise exception 'akses ditolak' using errcode = '42501'; end if;
  return jsonb_build_object('count', (select count(*) from public.sync_entities where store_id = p_store));
end $$;

create or replace function public.sync_push(p_store uuid, p_events jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  ev jsonb; v_id text; v_entity text; v_eid text; v_op text; v_ts bigint; v_log boolean; n int := 0;
  v_known text[] := array['products','customers','suppliers','employees','shifts','payables','consigns','sales','ppob','settings',
                          'stock_moves','cash_moves','ledger','returns','audit','prive','deposit_moves'];
begin
  if not public.is_member(p_store) then raise exception 'akses ditolak' using errcode = '42501'; end if;
  if jsonb_typeof(p_events) <> 'array' then raise exception 'p_events harus array'; end if;
  if jsonb_array_length(p_events) > 500 then raise exception 'maksimal 500 peristiwa per panggilan'; end if;
  for ev in select * from jsonb_array_elements(p_events) loop
    v_id := ev->>'id'; v_entity := ev->>'entity'; v_eid := ev->>'entity_id'; v_op := ev->>'op'; v_ts := (ev->>'ts')::bigint;
    if v_id is null or v_entity is null or v_eid is null or v_ts is null then raise exception 'peristiwa tidak lengkap'; end if;
    if not (v_entity = any (v_known)) then raise exception 'entitas tidak dikenal: %', v_entity; end if;
    insert into public.sync_events(id, store_id) values (v_id, p_store) on conflict (id) do nothing;
    if not found then continue; end if;
    v_log := v_entity in ('stock_moves','cash_moves','ledger','returns','audit','prive','deposit_moves');
    if v_log then
      insert into public.sync_entities(store_id, entity, entity_id, data, ts) values (p_store, v_entity, v_eid, ev->'data', v_ts)
      on conflict (store_id, entity, entity_id) do nothing;
    else
      insert into public.sync_entities as t(store_id, entity, entity_id, data, deleted, ts)
      values (p_store, v_entity, v_eid, case when v_op = 'delete' then null else ev->'data' end, v_op = 'delete', v_ts)
      on conflict (store_id, entity, entity_id) do update
        set data = excluded.data, deleted = excluded.deleted, ts = excluded.ts, seq = nextval('public.sync_seq')
        where t.ts <= excluded.ts;
    end if;
    n := n + 1;
  end loop;
  return jsonb_build_object('accepted', n);
end $$;

create or replace function public.sync_pull(p_store uuid, p_since bigint, p_limit int default 500) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_rows jsonb; v_cur bigint;
begin
  if not public.is_member(p_store) then raise exception 'akses ditolak' using errcode = '42501'; end if;
  select coalesce(jsonb_agg(to_jsonb(r) order by r.seq), '[]'::jsonb), coalesce(max(r.seq), p_since)
    into v_rows, v_cur
    from (select seq, entity, entity_id, data, deleted, ts from public.sync_entities
           where store_id = p_store and seq > p_since order by seq limit least(greatest(p_limit, 1), 1000)) r;
  return jsonb_build_object('rows', v_rows, 'cursor', v_cur);
end $$;

-- Jejak audit: rantai hash dan tidak boleh diubah/dihapus.
create or replace function public.audit_chain_insert() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare v_prev text;
begin
  if new.entity <> 'audit' then return new; end if;
  select hash into v_prev from public.audit_chain where store_id = new.store_id order by seq desc limit 1;
  insert into public.audit_chain(store_id, entity_id, seq, prev_hash, hash)
  values (new.store_id, new.entity_id, new.seq, coalesce(v_prev, repeat('0', 64)),
          encode(extensions.digest(coalesce(v_prev, repeat('0', 64)) || new.entity_id || coalesce(new.data::text, ''), 'sha256'), 'hex'))
  on conflict do nothing;
  return new;
end $$;
create trigger sync_entities_audit_chain after insert on public.sync_entities for each row execute function public.audit_chain_insert();

create or replace function public.audit_protect() returns trigger language plpgsql as $$
begin
  if old.entity = 'audit' and (tg_op = 'UPDATE' or pg_trigger_depth() <= 1) then
    raise exception 'jejak audit tidak boleh diubah atau dihapus';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
create trigger sync_entities_audit_protect before update or delete on public.sync_entities for each row execute function public.audit_protect();

-- ---------- PIN pegawai (server-side, bcrypt) ----------
create or replace function public.set_employee_pin(p_store uuid, p_employee text, p_pin text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.is_owner(p_store) then raise exception 'hanya pemilik' using errcode = '42501'; end if;
  if p_pin !~ '^[0-9]{4,6}$' then raise exception 'PIN harus 4-6 digit'; end if;
  if exists (select 1 from public.employee_pins e where e.store_id = p_store and e.employee_id <> p_employee and e.pin_hash = extensions.crypt(p_pin, e.pin_hash)) then
    raise exception 'PIN wajib unik per pegawai';
  end if;
  insert into public.employee_pins(store_id, employee_id, pin_hash) values (p_store, p_employee, extensions.crypt(p_pin, extensions.gen_salt('bf', 10)))
  on conflict (store_id, employee_id) do update set pin_hash = excluded.pin_hash, failed_attempts = 0, locked_until = null;
end $$;

-- Hasil: true = benar, false = salah, null = PIN pegawai belum ada di server.
create or replace function public.verify_employee_pin(p_store uuid, p_employee text, p_pin text) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare r public.employee_pins%rowtype; ok boolean;
begin
  if not public.is_member(p_store) then raise exception 'akses ditolak' using errcode = '42501'; end if;
  select * into r from public.employee_pins where store_id = p_store and employee_id = p_employee for update;
  if not found then return null; end if; -- PIN belum disimpan di server: klien memakai hash lokal
  if r.locked_until is not null and r.locked_until > now() then raise exception 'PIN terkunci sementara; coba lagi nanti'; end if;
  ok := r.pin_hash = extensions.crypt(p_pin, r.pin_hash);
  if ok then
    update public.employee_pins set failed_attempts = 0, locked_until = null where store_id = p_store and employee_id = p_employee;
  else
    update public.employee_pins set failed_attempts = failed_attempts + 1,
      locked_until = case when failed_attempts + 1 >= 5 then now() + interval '5 minutes' else null end
    where store_id = p_store and employee_id = p_employee;
  end if;
  return ok;
end $$;

-- ---------- surat jalan antar-cabang ----------
create or replace function public.create_transfer(p_transfer jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare v_from uuid := (p_transfer->>'fromStore')::uuid; v_to uuid := (p_transfer->>'toStore')::uuid;
begin
  if not public.is_member(v_from) then raise exception 'akses ditolak' using errcode = '42501'; end if;
  if not exists (select 1 from public.stores a join public.stores b on a.owner_id = b.owner_id where a.id = v_from and b.id = v_to) then
    raise exception 'cabang tujuan harus milik pemilik yang sama';
  end if;
  insert into public.transfers(id, from_store, to_store, status, data) values (p_transfer->>'id', v_from, v_to, 'dikirim', p_transfer)
  on conflict (id) do nothing;
end $$;

create or replace function public.list_transfers(p_store uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_member(p_store) then raise exception 'akses ditolak' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', id, 'status', status, 'data', data) order by created_at)
                     from public.transfers where (from_store = p_store or to_store = p_store) and created_at > now() - interval '90 days'), '[]'::jsonb);
end $$;

create or replace function public.receive_transfer(p_id text, p_store uuid) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_member(p_store) then raise exception 'akses ditolak' using errcode = '42501'; end if;
  update public.transfers set status = 'diterima', updated_at = now(), data = jsonb_set(data, '{status}', '"diterima"') where id = p_id and to_store = p_store and status = 'dikirim';
  return found;
end $$;

create or replace function public.cancel_transfer(p_id text, p_store uuid) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_member(p_store) then raise exception 'akses ditolak' using errcode = '42501'; end if;
  update public.transfers set status = 'dibatalkan', updated_at = now(), data = jsonb_set(data, '{status}', '"dibatalkan"') where id = p_id and from_store = p_store and status = 'dikirim';
  return found;
end $$;

create or replace function public.list_group_stores(p_store uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_member(p_store) then raise exception 'akses ditolak' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name) order by s.name)
                     from public.stores s where s.owner_id = (select owner_id from public.stores where id = p_store) and s.id <> p_store), '[]'::jsonb);
end $$;

-- Hanya pengguna masuk yang boleh memanggil RPC.
revoke execute on all functions in schema public from public, anon;
grant execute on function public.is_member(uuid), public.is_owner(uuid), public.create_store(text), public.add_device_member(uuid, text),
  public.sync_status(uuid), public.sync_push(uuid, jsonb), public.sync_pull(uuid, bigint, int), public.set_employee_pin(uuid, text, text),
  public.verify_employee_pin(uuid, text, text), public.create_transfer(jsonb), public.list_transfers(uuid),
  public.receive_transfer(text, uuid), public.cancel_transfer(text, uuid), public.list_group_stores(uuid) to authenticated;
