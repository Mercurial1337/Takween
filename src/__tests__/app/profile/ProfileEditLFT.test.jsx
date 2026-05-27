import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfileEditClient from '@/app/(dashboard)/profile/ProfileEditClient.jsx';
import { mockSupabase } from '../../setup';

// Mock Toast
const mockShowToast = vi.fn();
vi.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

vi.mock('@/components/ui/Toast/Toast', () => ({
  ToastContainer: () => null,
}));

const mockProfile = {
  id: 'user-1',
  full_name: 'Test User',
  email: 'test@example.com',
  whatsapp_number: '+201234567890',
  level_id: 'level-1',
  department_id: 'dept-1',
  linkedin_url: '',
  github_url: '',
  is_looking_for_team: false,
  avatar_url: null,
};

const mockUser = { id: 'user-1', email: 'test@example.com' };

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    profile: mockProfile,
    loading: false,
    refreshProfile: vi.fn(),
  }),
}));

// Helper to create a chainable mock
function createChain(resolveValue) {
  const chain = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.in = vi.fn(() => chain);
  chain.delete = vi.fn(() => chain);
  chain.insert = vi.fn().mockResolvedValue({ error: null });
  chain.update = vi.fn(() => chain);
  chain.upsert = vi.fn().mockResolvedValue({ error: null });
  chain.then = (resolve) => resolve(resolveValue);
  return chain;
}

describe('ProfileEditClient — Looking for a Team Toggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock supabase queries
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'levels') {
        const c = createChain({ data: [{ id: 'level-1', name: 'Year 3', sort_order: 3 }], error: null });
        c.order = vi.fn(() => c);
        return c;
      } else if (table === 'departments') {
        const c = createChain({ data: [{ id: 'dept-1', name: 'Computer Science' }], error: null });
        c.order = vi.fn(() => c);
        return c;
      } else if (table === 'skills') {
        const c = createChain({ data: [{ id: 's1', name: 'React' }], error: null });
        c.order = vi.fn(() => c);
        return c;
      } else if (table === 'profile_skills') {
        const c = createChain({ data: [], error: null });
        c.eq = vi.fn(() => c);
        return c;
      }
      return createChain({ data: null, error: null });
    });
  });

  it('renders the Looking for a Team toggle', async () => {
    await act(async () => {
      render(<ProfileEditClient />);
    });

    await waitFor(() => {
      expect(screen.getByText('Looking for a Team')).toBeInTheDocument();
    });
  });

  it('renders the LFT description text', async () => {
    await act(async () => {
      render(<ProfileEditClient />);
    });

    await waitFor(() => {
      expect(screen.getByText(/enable this to appear in the student directory/i)).toBeInTheDocument();
    });
  });

  it('renders the toggle checkbox unchecked by default', async () => {
    await act(async () => {
      render(<ProfileEditClient />);
    });

    await waitFor(() => {
      const toggle = screen.getByRole('checkbox');
      expect(toggle).not.toBeChecked();
    });
  });

  it('can toggle the checkbox on', async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<ProfileEditClient />);
    });

    await waitFor(() => {
      expect(screen.getByText('Looking for a Team')).toBeInTheDocument();
    });

    const toggle = screen.getByRole('checkbox');
    await user.click(toggle);

    expect(toggle).toBeChecked();
  });

  it('initializes toggle from profile data when is_looking_for_team is true', async () => {
    // Override the profile to have is_looking_for_team = true
    const activeProfile = { ...mockProfile, is_looking_for_team: true };

    vi.doMock('@/contexts/AuthContext', () => ({
      useAuth: () => ({
        user: mockUser,
        profile: activeProfile,
        loading: false,
        refreshProfile: vi.fn(),
      }),
    }));

    await act(async () => {
      render(<ProfileEditClient />);
    });

    await waitFor(() => {
      expect(screen.getByText('Looking for a Team')).toBeInTheDocument();
    });
  });
});
