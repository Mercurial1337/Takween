import { createClient } from '@/lib/supabase/client';

export async function logAdminAction({ adminId, action, entityType, entityId = null, details = {}, supabase = null }) {
  if (!adminId || !action || !entityType) {
    console.warn('logAdminAction: missing required parameters', { adminId, action, entityType });
    return { data: null, error: new Error('Missing required parameters: adminId, action, entityType') };
  }

  const client = supabase || createClient();

  try {
    const { data, error } = await client
      .from('audit_logs')
      .insert({
        admin_id: adminId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        details,
      })
      .select()
      .single();

    if (error) {
      console.error('Audit log insert error:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Audit log unexpected error:', err);
    return { data: null, error: err };
  }
}
