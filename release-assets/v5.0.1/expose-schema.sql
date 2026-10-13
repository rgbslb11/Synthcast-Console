DO $$ DECLARE schemas text; BEGIN
SELECT split_part(v,'=',2) INTO schemas FROM pg_roles r CROSS JOIN LATERAL unnest(r.rolconfig) v WHERE r.rolname='authenticator' AND v LIKE 'pgrst.db_schemas=%';
IF schemas IS NULL THEN RAISE EXCEPTION 'existing REST schemas unavailable'; END IF;
IF NOT 'gamecast_v501'=ANY(regexp_split_to_array(schemas, '\s*,\s*')) THEN
EXECUTE format('ALTER ROLE authenticator SET pgrst.db_schemas = %L', schemas || ', gamecast_v501');
END IF; END $$;
NOTIFY pgrst, 'reload config'; NOTIFY pgrst, 'reload schema';
