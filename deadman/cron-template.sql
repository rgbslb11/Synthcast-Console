-- DEAD-MAN FALLBACK CRON TEMPLATE — DO NOT APPLY FROM SOURCE CONTROL AUTOMATICALLY.
-- Deployment values are placeholders until the canonical Week 6 release identity is approved.
-- Requires pg_cron, pg_net and Supabase Vault. No secrets belong in this file.

-- One-time deployment prerequisites (performed explicitly by an authorized operator):
--   vault secret `gamecast_deadman_project_url`
--   vault secret `gamecast_deadman_scheduler_secret`
-- The Edge Function must expose POST ?api=deadman_tick&session=<slug> and require x-deadman-scheduler.

-- Example schedule. Supabase Cron supports interval schedules; 15 seconds bounds trigger delay without backdating Master Zulu.
-- Replace the placeholders before applying.
/*
select cron.schedule(
  'gamecast-week6-deadman',
  '15 seconds',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'gamecast_deadman_project_url')
           || '/functions/v1/<WEEK6_FUNCTION>?api=deadman_tick&session=' || s.public_slug,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-deadman-scheduler', (select decrypted_secret from vault.decrypted_secrets where name = 'gamecast_deadman_scheduler_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 5000
  )
  from gamecast_v12.sessions s
  where s.week_key = '2026-W06'
    and s.engine_version = '<WEEK6_ENGINE>';
  $$
);
*/
