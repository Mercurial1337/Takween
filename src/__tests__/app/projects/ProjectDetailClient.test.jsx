import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProjectDetailClient from '@/app/(dashboard)/projects/[id]/ProjectDetailClient.jsx';
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
  role: 'student',
  department_id: 'dept-1',
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    profile: mockProfile,
    loading: false,
  }),
}));

vi.mock('@/components/ui/Toast/Toast', () => ({
  ToastContainer: () => null,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

// Data Mocks
const mockProject = {
  id: 'proj-1',
  title: 'Test Project',
  description: 'A test project',
  max_team_size: 4,
  status: 'open',
};

const mockSeekers = [
  {
    id: 'seeker-1',
    project_id: 'proj-1',
    user_id: 'user-2',
    message: 'Looking for backend work',
    profiles: {
      id: 'user-2',
      full_name: 'Available User',
      avatar_url: null,
      levels: { name: 'Senior' }
    }
  }
];

describe('ProjectDetailClient - Available Students Tab', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default Supabase responses
    mockSupabase.from.mockImplementation((table) => {
      const builder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        match: vi.fn().mockReturnThis(),
      };

      if (table === 'projects') {
        builder.single.mockResolvedValue({ data: mockProject, error: null });
      } else if (table === 'departments') {
        builder.order.mockResolvedValue({ data: [], error: null });
      } else if (table === 'teams') {
        builder.order.mockResolvedValue({ data: [], error: null });
      } else if (table === 'project_seekers') {
        builder.order.mockResolvedValue({ data: mockSeekers, error: null });
      }

      return builder;
    });
  });

  it('renders the Available Students tab and displays seekers', async () => {
    render(<ProjectDetailClient id="proj-1" />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.queryByText('Test Project')).toBeInTheDocument();
    });

    // Check tabs
    const studentsTab = screen.getByRole('button', { name: /Available Students/i });
    expect(studentsTab).toBeInTheDocument();

    // Click tab
    await userEvent.click(studentsTab);

    // Verify seeker is displayed
    await waitFor(() => {
      expect(screen.getByText('Available User')).toBeInTheDocument();
      expect(screen.getByText('"Looking for backend work"')).toBeInTheDocument();
    });
  });

  it('allows a student to mark themselves as available', async () => {
    render(<ProjectDetailClient id="proj-1" />);

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    // Click "I'm looking for a team" action
    const lookingBtn = screen.getByRole('button', { name: /I'm looking for a team/i });
    await userEvent.click(lookingBtn);

    // Modal should appear
    expect(screen.getByRole('heading', { name: 'Mark as Available' })).toBeInTheDocument();

    // Type a message and submit
    const input = screen.getByLabelText(/Short Message/i);
    await userEvent.type(input, 'I love React');

    // We need to mock the insert response just before clicking
    mockSupabase.from.mockImplementationOnce((table) => {
      if (table === 'project_seekers') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null })
        };
      }
      return mockSupabase.from(table); // fallback
    });

    const submitBtn = screen.getByRole('button', { name: /^Mark as Available$/ });
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Availability updated'
      }));
    });
  });
});
