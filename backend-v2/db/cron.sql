-- Run once in the Supabase SQL editor, after the backend is deployed.
-- Supabase-only: needs the pg_cron, pg_net and Vault extensions.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 1. Store the backend URL and shared secret in Vault (never inline secrets in a cron job).
--    Replace the placeholders, run these two lines, then delete them from the editor.
-- select vault.create_secret('https://<your-service>.onrender.com', 'scrape_api_url');
-- select vault.create_secret('<same value as CRON_SECRET>',          'scrape_cron_secret');

-- 2. Every 5 minutes: ask the backend to scrape. pg_net is asynchronous, so a slow Render
--    cold start does not block the database. The request also keeps the free instance awake.
select cron.schedule(
    'scrape-every-5-min',
    '*/5 * * * *',
    $$
    select net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'scrape_api_url') || '/jobs/scrape',
        headers := jsonb_build_object(
            'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'scrape_cron_secret')
        ),
        timeout_milliseconds := 60000
    );
    $$
);

-- 3. Daily: purge products that have been sold out for a week, and trim the run log.
select cron.schedule(
    'purge-sold-out',
    '17 3 * * *',
    $$
    delete from products    where status = 'sold_out' and sold_out_at < now() - interval '7 days';
    delete from scrape_runs where started_at < now() - interval '30 days';
    $$
);

-- Inspect:   select * from cron.job;   select * from cron.job_run_details order by start_time desc limit 20;
-- Remove:    select cron.unschedule('scrape-every-5-min');
