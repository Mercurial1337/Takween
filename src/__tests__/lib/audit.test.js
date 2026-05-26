import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logAdminAction } from '@/lib/supabase/audit';

describe('logAdminAction', () => {
  let mockSupabase;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { id: 'log-1', admin_id: 'admin-1', action: 'create', entity_type: 'skill' },
              error: null,
            }),
          })),
        })),
      })),
    };
  });

  it('returns error when required parameters are missing', async () => {
    const result = await logAdminAction({});
    expect(result.error).toBeTruthy();
    expect(result.data).toBeNull();
  });

  it('returns error when adminId is missing', async () => {
    const result = await logAdminAction({ action: 'create', entityType: 'skill' });
    expect(result.error).toBeTruthy();
  });

  it('returns error when action is missing', async () => {
    const result = await logAdminAction({ adminId: 'admin-1', entityType: 'skill' });
    expect(result.error).toBeTruthy();
  });

  it('returns error when entityType is missing', async () => {
    const result = await logAdminAction({ adminId: 'admin-1', action: 'create' });
    expect(result.error).toBeTruthy();
  });

  it('inserts audit log with correct parameters', async () => {
    const result = await logAdminAction({
      adminId: 'admin-1',
      action: 'create',
      entityType: 'skill',
      entityId: 'skill-1',
      details: { name: 'React' },
      supabase: mockSupabase,
    });

    expect(mockSupabase.from).toHaveBeenCalledWith('audit_logs');
    expect(result.data).toBeTruthy();
    expect(result.error).toBeNull();
  });

  it('handles supabase insert errors gracefully', async () => {
    mockSupabase.from = vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'RLS policy violation' },
          }),
        })),
      })),
    }));

    const result = await logAdminAction({
      adminId: 'admin-1',
      action: 'create',
      entityType: 'skill',
      supabase: mockSupabase,
    });

    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
  });

  it('defaults entityId to null and details to empty object', async () => {
    const insertMock = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ data: { id: 'log-1' }, error: null }),
      })),
    }));
    mockSupabase.from = vi.fn(() => ({ insert: insertMock }));

    await logAdminAction({
      adminId: 'admin-1',
      action: 'delete',
      entityType: 'department',
      supabase: mockSupabase,
    });

    expect(insertMock).toHaveBeenCalledWith({
      admin_id: 'admin-1',
      action: 'delete',
      entity_type: 'department',
      entity_id: null,
      details: {},
    });
  });
});
