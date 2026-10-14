-- Private, read-only archive encoder. No production table or function is changed.
-- Delta tags: = literal, o object changes/removals, a array length/index changes.
create schema gamecast_v501_recovery_stage;
revoke all on schema gamecast_v501_recovery_stage from public,anon,authenticated,service_role;
create or replace function gamecast_v501_recovery_stage.delta(a jsonb,b jsonb)
returns jsonb language plpgsql immutable strict
set search_path=pg_catalog,gamecast_v501_recovery_stage as $$
declare changes jsonb := '{}'; removed jsonb := '[]'; k text; v jsonb; i integer; oldv jsonb; newv jsonb;
begin
  if a=b then return null; end if;
  if jsonb_typeof(a)='object' and jsonb_typeof(b)='object' then
    for k,v in select key,value from jsonb_each(b) loop
      if not (a ? k) then changes:=changes||jsonb_build_object(k,jsonb_build_array('=',v));
      elsif a->k is distinct from v then changes:=changes||jsonb_build_object(k,gamecast_v501_recovery_stage.delta(a->k,v)); end if;
    end loop;
    select coalesce(jsonb_agg(key order by key),'[]') into removed from jsonb_object_keys(a) key where not (b ? key);
    return jsonb_build_array('o',changes,removed);
  elsif jsonb_typeof(a)='array' and jsonb_typeof(b)='array' then
    for i,oldv,newv in
      select (bb.ord-1)::integer,aa.value,bb.value
      from jsonb_array_elements(b) with ordinality bb(value,ord)
      left join jsonb_array_elements(a) with ordinality aa(value,ord) using(ord)
      where aa.value is distinct from bb.value
    loop
      changes:=changes||jsonb_build_object(i::text,case when oldv is null then jsonb_build_array('=',newv) else gamecast_v501_recovery_stage.delta(oldv,newv) end);
    end loop;
    return jsonb_build_array('a',jsonb_array_length(b),changes);
  end if;
  return jsonb_build_array('=',b);
end $$;
revoke all on function gamecast_v501_recovery_stage.delta(jsonb,jsonb) from public,anon,authenticated,service_role;
