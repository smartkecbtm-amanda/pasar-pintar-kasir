-- Tampilan laporan ber-RLS (security_invoker): pemilik/akun perangkat hanya melihat tokonya sendiri.
create or replace view public.v_products with (security_invoker = true) as
select e.store_id, e.entity_id as id, e.data->>'name' as name, e.data->>'category' as category, e.data->>'baseUnit' as base_unit,
       (e.data->>'hpp')::numeric as hpp, e.data->>'barcode' as barcode, (e.data->>'minStock')::numeric as min_stock,
       coalesce((select sum((m.data->>'qty')::numeric) from public.sync_entities m
                  where m.store_id = e.store_id and m.entity = 'stock_moves' and m.data->>'productId' = e.entity_id), 0) as stock
  from public.sync_entities e where e.entity = 'products' and not e.deleted;

create or replace view public.v_sales with (security_invoker = true) as
select store_id, entity_id as id, to_timestamp((data->>'ts')::bigint / 1000.0) as sold_at, (data->>'total')::numeric as total,
       data->>'method' as method, data->>'cashierName' as cashier, (data->'voided') is not null as voided, (data->>'manualDiscount')::numeric as manual_discount
  from public.sync_entities where entity = 'sales' and not deleted;

create or replace view public.v_sale_items with (security_invoker = true) as
select e.store_id, e.entity_id as sale_id, i->>'productId' as product_id, i->>'name' as name, (i->>'qty')::numeric as qty,
       (i->>'factor')::numeric as factor, (i->>'price')::numeric as price, (i->>'hpp')::numeric as hpp
  from public.sync_entities e, jsonb_array_elements(e.data->'items') i
 where e.entity = 'sales' and not e.deleted and (e.data->'voided') is null;

create or replace view public.v_stock_moves with (security_invoker = true) as
select store_id, entity_id as id, to_timestamp((data->>'ts')::bigint / 1000.0) as moved_at, data->>'productId' as product_id,
       (data->>'qty')::numeric as qty, data->>'reason' as reason, coalesce((data->>'audit')::boolean, false) as audit_flag
  from public.sync_entities where entity = 'stock_moves';

create or replace view public.v_cash_moves with (security_invoker = true) as
select store_id, entity_id as id, to_timestamp((data->>'ts')::bigint / 1000.0) as moved_at, data->>'shiftId' as shift_id,
       (data->>'amount')::numeric as amount, data->>'kind' as kind, data->>'note' as note
  from public.sync_entities where entity = 'cash_moves';

create or replace view public.v_customer_balance with (security_invoker = true) as
select store_id, data->>'customerId' as customer_id, sum((data->>'debit')::numeric - (data->>'credit')::numeric) as balance
  from public.sync_entities where entity = 'ledger' group by store_id, data->>'customerId';

create or replace view public.v_daily_sales with (security_invoker = true) as
select store_id, date_trunc('day', sold_at) as day, count(*) as transactions, sum(total) as revenue
  from public.v_sales where not voided group by store_id, date_trunc('day', sold_at);
