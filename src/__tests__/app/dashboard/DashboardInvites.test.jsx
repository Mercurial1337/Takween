import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import DashboardClient from '@/app/(dashboard)/dashboard/DashboardClient.jsx';
import { mockSupabase } from '../../setup';

// Mock contexts
const mockShowToast = vi.fn();
vi.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

const mockUser = {
  id: 'user-1',
  email: 'student@example.com',
};

const mockProfile = {
  id: 'user-1',
  full_name: 'Test Student',
  email: 'student@example.com',
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    profile: mockProfile,
    loading: false,
  }),
}));

// Mock Toast component
vi.mock('@/components/ui/Toast/Toast', () => ({
  ToastContainer: () => null,
}));

// Mock fetch for email API
global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }));

// Sample data
const mockPendingInvites = [
  {
    id: 'invite-1',
    team_id: 'team-1',
    user_id: 'user-1',
    invited_by: 'owner-1',
    message: 'We need your React skills!',
    status: 'pending',
    created_at: '2026-05-27T10:00:00Z',
    teams: {
      id: 'team-1',
      owner_id: 'owner-1',
      project_id: 'proj-1',
      profiles: { id: 'owner-1', full_name: 'Team Owner', email: 'owner@example.com', avatar_url: null },
      projects: { id: 'proj-1', title: 'Graduation Project' },
    },
  },
];

// Helper to create a chainable mock
function createChain(resolveValue) {
  const chain = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.in = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.single = vi.fn(() => chain);
  chain.insert = vi.fn().mockResolvedValue({ data: null, error: null });
  chain.update = vi.fn(() => chain);
  chain.then = (resolve) => resolve(resolveValue);
  return chain;
}

describe('DashboardClient — Team Invitations', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'team_members') {
        // Returns no team memberships (no teams for this user)
        // but for invite test we need user to exist
        return createChain({ data: [], error: null });
      }
      if (table === 'join_requests') {
        return createChain({ data: [], error: null });
      }
      if (table === 'notifications') {
        // For count query
        const c = createChain({ count: 0, error: null });
        c.insert = vi.fn().mockResolvedValue({ data: null, error: null });
        return c;
      }
      if (table === 'team_merge_requests') {
        return createChain({ data: [], error: null });
      }
      if (table === 'team_invites') {
        return createChain({ data: mockPendingInvites, error: null });
      }
      return createChain({ data: null, error: null });
    });
  });

  it('renders the dashboard page header', async () => {
    await act(async () => {
      render(<DashboardClient />);
    });

    await waitFor(() => {
      expect(screen.getByText(/welcome/i)).toBeInTheDocument();
    });
  });

  it('renders Team Invitations section when invites exist', async () => {
    await act(async () => {
      render(<DashboardClient />);
    });

    await waitFor(() => {
      expect(screen.getByText('Team Invitations')).toBeInTheDocument();
    });
  });

  it('shows invite sender name', async () => {
    await act(async () => {
      render(<DashboardClient />);
    });

    await waitFor(() => {
      expect(screen.getByText('Team Owner')).toBeInTheDocument();
    });
  });

  it('shows invite project name', async () => {
    await act(async () => {
      render(<DashboardClient />);
    });

    await waitFor(() => {
      expect(screen.getByText(/graduation project/i)).toBeInTheDocument();
    });
  });

  it('shows invite message', async () => {
    await act(async () => {
      render(<DashboardClient />);
    });

    await waitFor(() => {
      expect(screen.getByText(/we need your react skills/i)).toBeInTheDocument();
    });
  });

  it('renders Accept and Decline buttons', async () => {
    await act(async () => {
      render(<DashboardClient />);
    });

    await waitFor(() => {
      expect(screen.getByTitle('Accept')).toBeInTheDocument();
      expect(screen.getByTitle('Decline')).toBeInTheDocument();
    });
  });

  it('does not render Team Invitations when no invites', async () => {
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'team_invites') {
        return createChain({ data: [], error: null });
      }
      if (table === 'team_members') {
        return createChain({ data: [], error: null });
      }
      if (table === 'join_requests') {
        return createChain({ data: [], error: null });
      }
      if (table === 'notifications') {
        return createChain({ count: 0, error: null });
      }
      if (table === 'team_merge_requests') {
        return createChain({ data: [], error: null });
      }
      return createChain({ data: null, error: null });
    });

    await act(async () => {
      render(<DashboardClient />);
    });

    await waitFor(() => {
      expect(screen.getByText(/welcome/i)).toBeInTheDocument();
    });

    expect(screen.queryByText('Team Invitations')).not.toBeInTheDocument();
  });
});
