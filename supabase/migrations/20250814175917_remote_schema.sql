drop extension if exists "pg_net";

create extension if not exists "http" with schema "public";

drop policy "authenticated_insert_own_reminder" on "public"."event_reminders";

drop policy "Allow public insert for unsubscribe logging" on "public"."unsubscribe_logs";

drop policy "admin_all_access_event_reminders" on "public"."event_reminders";

drop index if exists "public"."idx_newsletter_queue_status_created_at";

alter table "public"."newsletter_sends" alter column "sent_at" set not null;

alter table "public"."newsletters" alter column "created_by" drop not null;

CREATE INDEX idx_newsletter_queue_status_created_at ON public.newsletter_queue USING btree (status, created_at) WHERE (status = ANY (ARRAY['pending'::text, 'processing'::text]));

set check_function_bodies = off;

create type "public"."http_header" as ("field" character varying, "value" character varying);

create type "public"."http_request" as ("method" http_method, "uri" character varying, "headers" http_header[], "content_type" character varying, "content" character varying);

create type "public"."http_response" as ("status" integer, "content_type" character varying, "headers" http_header[], "content" character varying);

CREATE OR REPLACE FUNCTION public.trigger_newsletter_processing()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  result jsonb;
  supabase_url text;
  service_key text;
BEGIN
  -- Try to get settings, use defaults for local development if not available
  BEGIN
    supabase_url := current_setting('app.settings.supabase_url', true);
    IF supabase_url IS NULL THEN
      supabase_url := 'http://localhost:54321';
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      supabase_url := 'http://localhost:54321';
  END;
  
  BEGIN
    service_key := current_setting('app.settings.supabase_service_role_key', true);
    IF service_key IS NULL THEN
      -- Return error for local development
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Service role key not configured. Edge function cannot be called from database in local development.'
      );
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      -- Return error for local development
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Service role key not configured. Edge function cannot be called from database in local development.'
      );
  END;
  
  -- This function can be called manually to trigger newsletter processing
  -- It's useful for testing without waiting for the cron job
  SELECT net.http_post(
    url := supabase_url || '/functions/v1/process-newsletters',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || service_key,
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) INTO result;
  
  RETURN result;
END;
$function$
;


  create policy "admin_all_access_event_reminders"
  on "public"."event_reminders"
  as permissive
  for all
  to authenticated
using ((profile_id IN ( SELECT profiles.id
   FROM profiles
  WHERE (profiles.user_id IN ( SELECT user_roles.user_id
           FROM user_roles
          WHERE (user_roles.role_name = 'admin'::text))))))
with check ((profile_id IN ( SELECT profiles.id
   FROM profiles
  WHERE (profiles.user_id IN ( SELECT user_roles.user_id
           FROM user_roles
          WHERE (user_roles.role_name = 'admin'::text))))));



