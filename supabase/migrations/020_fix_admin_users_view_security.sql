-- Fix security vulnerability: ensure the view respects RLS of the underlying tables
CREATE OR REPLACE VIEW public.admin_users_view
WITH (security_invoker = on)
AS
SELECT 
  p.id, 
  p.full_name, 
  p.role, 
  p.avatar_url, 
  p.created_at, 
  c.email, 
  c.whatsapp_number
FROM public.profiles p
LEFT JOIN public.contact_info c ON p.id = c.id;
