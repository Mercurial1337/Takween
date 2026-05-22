import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

// Mock @supabase/ssr
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => mockServerSupabase),
}));

const mockServerSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { role: 'student' } }),
  })),
};

// Helper to create a mock request
function mockRequest(pathname, cookies = []) {
  return {
    nextUrl: {
      pathname,
      clone: () => ({
        pathname,
        searchParams: { set: vi.fn() },
      }),
    },
    cookies: {
      getAll: () => cookies,
      set: vi.fn(),
    },
  };
}

describe('updateSession (middleware logic)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    // Set env vars
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  });

  it('redirects unauthenticated users from /dashboard to /login', async () => {
    mockServerSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
    const { updateSession } = await import('@/lib/supabase/middleware');

    const req = mockRequest('/dashboard');
    const result = await updateSession(req);

    expect(NextResponse.redirect).toHaveBeenCalled();
  });

  it('redirects unauthenticated users from /profile to /login', async () => {
    mockServerSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
    const { updateSession } = await import('@/lib/supabase/middleware');

    const req = mockRequest('/profile');
    const result = await updateSession(req);

    expect(NextResponse.redirect).toHaveBeenCalled();
  });

  it('redirects unauthenticated users from /admin to /login', async () => {
    mockServerSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
    const { updateSession } = await import('@/lib/supabase/middleware');

    const req = mockRequest('/admin');
    const result = await updateSession(req);

    expect(NextResponse.redirect).toHaveBeenCalled();
  });

  it('redirects authenticated users from /login to /dashboard', async () => {
    mockServerSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const { updateSession } = await import('@/lib/supabase/middleware');

    const req = mockRequest('/login');
    const result = await updateSession(req);

    expect(NextResponse.redirect).toHaveBeenCalled();
  });

  it('allows access to public paths for unauthenticated users', async () => {
    mockServerSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
    const { updateSession } = await import('@/lib/supabase/middleware');

    const req = mockRequest('/');
    const result = await updateSession(req);

    // Should call NextResponse.next, not redirect
    expect(NextResponse.next).toHaveBeenCalled();
  });

  it('skips supabase when env vars are missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const { updateSession } = await import('@/lib/supabase/middleware');
    const req = mockRequest('/dashboard');
    const result = await updateSession(req);

    expect(NextResponse.next).toHaveBeenCalled();
    expect(mockServerSupabase.auth.getUser).not.toHaveBeenCalled();
  });
});
