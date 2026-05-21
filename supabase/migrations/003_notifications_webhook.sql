-- ============================================================================
-- Takween Database Schema
-- Version: 003 — Notifications Webhook
-- Description: Trigger and helper function to notify the send-email Edge Function
-- ============================================================================

-- Enable pg_net extension if it is not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create the trigger function to invoke the edge function via pg_net
CREATE OR REPLACE FUNCTION public.notify_send_email_webhook()
RETURNS TRIGGER AS $$
DECLARE
  v_url TEXT;
  v_service_key TEXT;
  v_headers JSONB;
BEGIN
  -- Default local development webhook URL
  v_url := 'http://host.docker.internal:54321/functions/v1/send-email';
  
  -- Attempt to retrieve dynamic production secrets from Supabase Vault if they exist
  BEGIN
    IF EXISTS (
      SELECT 1 FROM pg_namespace n
      JOIN pg_class c ON n.oid = c.relnamespace
      WHERE n.nspname = 'vault' AND c.relname = 'decrypted_secrets'
    ) THEN
      -- Try to fetch the configured endpoint URL
      SELECT decrypted_secret INTO v_url 
      FROM vault.decrypted_secrets 
      WHERE name = 'send_email_webhook_url' 
      LIMIT 1;
      
      -- Try to fetch the service role key to authenticate the edge function
      SELECT decrypted_secret INTO v_service_key 
      FROM vault.decrypted_secrets 
      WHERE name = 'service_role_key' 
      LIMIT 1;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Fallback to default local URL on any access error (e.g. permission issues on vault)
    v_url := 'http://host.docker.internal:54321/functions/v1/send-email';
  END;

  -- Ensure we have a valid URL
  IF v_url IS NULL OR v_url = '' THEN
    v_url := 'http://host.docker.internal:54321/functions/v1/send-email';
  END IF;

  -- Build headers JSON
  v_headers := jsonb_build_object(
    'Content-Type', 'application/json'
  );
  
  IF v_service_key IS NOT NULL AND v_service_key <> '' THEN
    v_headers := v_headers || jsonb_build_object('Authorization', 'Bearer ' || v_service_key);
  END IF;

  -- Fire the asynchronous HTTP POST request
  PERFORM net.http_post(
    url := v_url,
    headers := v_headers,
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'notifications',
      'record', to_jsonb(NEW)
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach the trigger to the notifications table
CREATE OR REPLACE TRIGGER trigger_notifications_send_email
  AFTER INSERT ON notifications
  FOR EACH ROW
  WHEN (NEW.type IN ('request_received', 'request_accepted'))
  EXECUTE FUNCTION notify_send_email_webhook();
