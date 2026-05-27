import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StudentsClient from '@/app/(dashboard)/students/StudentsClient';
import { mockSupabase } from '../../setup';

// Mock contexts
const mockShowToast = vi.fn();
vi.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

const mockAuthUser = {
  id: 'user-1',
  email: 'owner@example.com',
};

const mockAuthProfile = {
  id: 'user-1',
  full_name: 'Test Owner',
  email: 'owner@example.com',
  department_id: 'dept-1',
};

let mockAuthReturn = { user: mockAuthUser, profile: mockAuthProfile, loading: false };

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuthReturn,
}));

// Mock Toast component
vi.mock('@/components/ui/Toast/Toast', () => ({
  ToastContainer: () => null,
}));

// Mock useDebounce to return value immediately
vi.mock('@/hooks/useDebounce', () => ({
  useDebounce: (value) => value,
}));

// Mock fetch for email API
global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }));

// Sample data
const mockStudents = [
  {
    id: 'student-1',
    full_name: 'Alice Johnson',
    avatar_url: null,
    level_id: 'level-1',
    department_id: 'dept-1',
    linkedin_url: null,
    github_url: null,
    levels: { name: 'Year 3', sort_order: 3 },
    departments: { name: 'Computer Science' },
    profile_skills: [
      { skill_id: 's1', skills: { name: 'React' } },
      { skill_id: 's2', skills: { name: 'Node.js' } },
    ],
  },
  {
    id: 'student-2',
    full_name: 'Bob Smith',
    avatar_url: null,
    level_id: 'level-2',
    department_id: 'dept-2',
    linkedin_url: null,
    github_url: null,
    levels: { name: 'Year 4', sort_order: 4 },
    departments: { name: 'Information Systems' },
    profile_skills: [],
  },
];

const mockDepartments = [
  { id: 'dept-1', name: 'Computer Science' },
  { id: 'dept-2', name: 'Information Systems' },
];

const mockLevels = [
  { id: 'level-1', name: 'Year 3', sort_order: 3 },
  { id: 'level-2', name: 'Year 4', sort_order: 4 },
];

const mockTeams = [
  {
    id: 'team-1',
    status: 'recruiting',
    department_id: 'dept-1',
    project_id: 'proj-1',
    projects: { id: 'proj-1', title: 'Graduation Project', max_team_size: 5, department_id: 'dept-1' },
    team_members: [{ count: 2 }],
    manual_members: [{ count: 0 }],
  },
];

// Helper to create a chainable mock
function createChain(resolveValue) {
  const chain = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.in = vi.fn(() => chain);
  chain.ilike = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.insert = vi.fn().mockResolvedValue({ error: null });
  chain.update = vi.fn(() => chain);
  chain.then = (resolve) => resolve(resolveValue);
  return chain;
}

describe('StudentsClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthReturn = { user: mockAuthUser, profile: mockAuthProfile, loading: false };

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'departments') {
        return createChain({ data: mockDepartments, error: null });
      }
      if (table === 'levels') {
        return createChain({ data: mockLevels, error: null });
      }
      if (table === 'teams') {
        return createChain({ data: mockTeams, error: null });
      }
      if (table === 'profiles') {
        return createChain({ data: mockStudents, error: null });
      }
      if (table === 'team_invites') {
        const c = createChain({ data: [], error: null });
        c.insert = vi.fn().mockResolvedValue({ error: null });
        return c;
      }
      if (table === 'team_members') {
        return createChain({ data: [], error: null });
      }
      if (table === 'notifications') {
        const c = createChain({ data: null, error: null });
        c.insert = vi.fn().mockResolvedValue({ error: null });
        return c;
      }
      return createChain({ data: null, error: null });
    });
  });

  it('renders the page header', async () => {
    await act(async () => {
      render(<StudentsClient />);
    });

    await waitFor(() => {
      expect(screen.getByText('Student Directory')).toBeInTheDocument();
    });
  });

  it('renders the search input', async () => {
    await act(async () => {
      render(<StudentsClient />);
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search students/i)).toBeInTheDocument();
    });
  });

  it('renders student cards when data is loaded', async () => {
    await act(async () => {
      render(<StudentsClient />);
    });

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    });
  });

  it('renders student skills as badges', async () => {
    await act(async () => {
      render(<StudentsClient />);
    });

    await waitFor(() => {
      expect(screen.getByText('React')).toBeInTheDocument();
      expect(screen.getByText('Node.js')).toBeInTheDocument();
    });
  });

  it('renders student level and department in card tags', async () => {
    await act(async () => {
      render(<StudentsClient />);
    });

    await waitFor(() => {
      // Use getAllByText since 'Year 3' also appears in the filter <option>
      const year3Elements = screen.getAllByText('Year 3');
      expect(year3Elements.length).toBeGreaterThanOrEqual(1);

      // The level tag is inside a <span> with class "levelTag"
      const levelTags = document.querySelectorAll('.levelTag');
      expect(levelTags.length).toBeGreaterThan(0);
    });
  });

  it('shows result count', async () => {
    await act(async () => {
      render(<StudentsClient />);
    });

    await waitFor(() => {
      expect(screen.getByText(/2 students looking for a team/i)).toBeInTheDocument();
    });
  });

  it('renders empty state when no students found', async () => {
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'profiles') {
        return createChain({ data: [], error: null });
      }
      if (table === 'departments') {
        return createChain({ data: mockDepartments, error: null });
      }
      if (table === 'levels') {
        return createChain({ data: mockLevels, error: null });
      }
      if (table === 'teams') {
        return createChain({ data: [], error: null });
      }
      return createChain({ data: null, error: null });
    });

    await act(async () => {
      render(<StudentsClient />);
    });

    await waitFor(() => {
      expect(screen.getByText(/no students found/i)).toBeInTheDocument();
    });
  });

  it('shows Invite button for team owners', async () => {
    await act(async () => {
      render(<StudentsClient />);
    });

    await waitFor(() => {
      const inviteButtons = screen.getAllByText('Invite');
      expect(inviteButtons.length).toBeGreaterThan(0);
    });
  });

  it('does not show Invite buttons when user has no teams', async () => {
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'teams') {
        return createChain({ data: [], error: null });
      }
      if (table === 'departments') {
        return createChain({ data: mockDepartments, error: null });
      }
      if (table === 'levels') {
        return createChain({ data: mockLevels, error: null });
      }
      if (table === 'profiles') {
        return createChain({ data: mockStudents, error: null });
      }
      return createChain({ data: null, error: null });
    });

    await act(async () => {
      render(<StudentsClient />);
    });

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    expect(screen.queryAllByText('Invite')).toHaveLength(0);
  });

  it('shows only first name for unauthenticated users', async () => {
    mockAuthReturn = { user: null, profile: null, loading: false };

    await act(async () => {
      render(<StudentsClient />);
    });

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.queryByText('Alice Johnson')).not.toBeInTheDocument();
      expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument();
    });
  });

  it('renders View Profile links', async () => {
    await act(async () => {
      render(<StudentsClient />);
    });

    await waitFor(() => {
      const viewLinks = screen.getAllByText('View Profile');
      expect(viewLinks.length).toBe(2);
    });
  });
});
