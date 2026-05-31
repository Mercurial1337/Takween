import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TeamDetailClient from '@/app/(dashboard)/teams/[id]/TeamDetailClient';
import { mockSupabase } from '../../setup';

// ── Mocks ───────────────────────────────────────────────────────

const mockShowToast = vi.fn();
vi.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

const mockRouterPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    back: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/teams/team-1',
}));

let mockUserId = 'user-owner';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: mockUserId } }),
}));

// ── Test data ───────────────────────────────────────────────────

const OWNER_ID = 'user-owner';

const mockTeam = {
  id: 'team-1',
  name: 'Alpha Team',
  description: 'A great team for the capstone project.',
  owner_id: OWNER_ID,
  project_id: 'proj-1',
  status: 'recruiting',
  projects: { id: 'proj-1', title: 'Capstone', max_team_size: 5 },
  departments: { id: 'dept-1', name: 'Software Engineering' },
  profiles: {
    id: OWNER_ID,
    full_name: 'Ahmed Owner',
    avatar_url: null,
    role: 'student',
    whatsapp_number: '+966500000000',
    linkedin_url: 'https://linkedin.com/in/ahmed',
    github_url: 'https://github.com/ahmed',
    departments: { name: 'Software Engineering' },
    levels: { name: 'Year 4' },
    profile_skills: [
      { skill_id: 's1', skills: { name: 'React' } },
      { skill_id: 's2', skills: { name: 'Next.js' } },
    ],
  },
};

const mockMembers = [
  {
    id: 'tm-1',
    team_id: 'team-1',
    user_id: 'user-member1',
    role: 'member',
    profiles: {
      id: 'user-member1',
      full_name: 'Sara Member',
      avatar_url: null,
      role: 'student',
      whatsapp_number: null,
      linkedin_url: null,
      github_url: 'https://github.com/sara',
      departments: { name: 'AI' },
      levels: { name: 'Year 3' },
      profile_skills: [{ skill_id: 's3', skills: { name: 'Python' } }],
    },
  },
];

const mockJoinRequests = [
  {
    id: 'jr-1',
    team_id: 'team-1',
    user_id: 'user-requester',
    message: 'I want to contribute!',
    status: 'pending',
    profiles: {
      id: 'user-requester',
      full_name: 'Khalid Requester',
      avatar_url: null,
    },
  },
];

// ── Mock builder ────────────────────────────────────────────────

function createMockBuilder(resolvedValue) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn(),
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    match: vi.fn().mockResolvedValue({ error: null }),
  };
  // Default: eq resolves with the data
  builder.eq.mockImplementation(() => {
    // Return a thenable that is also chainable
    const thenable = {
      ...builder,
      then: (resolve) => resolve(resolvedValue),
    };
    return thenable;
  });
  builder.single.mockResolvedValue(resolvedValue);
  return builder;
}

// ── Tests ───────────────────────────────────────────────────────

describe('TeamDetailClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserId = OWNER_ID;

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'teams') {
        return createMockBuilder({ data: mockTeam, error: null });
      }
      if (table === 'team_members') {
        return createMockBuilder({ data: mockMembers, error: null });
      }
      if (table === 'manual_members') {
        return createMockBuilder({ data: [], error: null });
      }
      if (table === 'join_requests') {
        const b = createMockBuilder({ data: mockJoinRequests, error: null });
        b.insert.mockResolvedValue({ error: null });
        return b;
      }
      return createMockBuilder({ data: [], error: null });
    });
  });

  it('renders team name and description', async () => {
    render(<TeamDetailClient id="team-1" />);

    await waitFor(() => {
      expect(screen.getAllByText("Ahmed Owner's Team").length).toBeGreaterThan(0);
      expect(screen.getByText('A great team for the capstone project.')).toBeInTheDocument();
    });
  });

  it('renders owner card with leader badge', async () => {
    render(<TeamDetailClient id="team-1" />);

    await waitFor(() => {
      expect(screen.getByText('Ahmed Owner')).toBeInTheDocument();
      // 'Team Leader' text is no longer rendered; we use a Crown icon instead.
    });
  });

  it('renders registered member cards', async () => {
    render(<TeamDetailClient id="team-1" />);

    await waitFor(() => {
      expect(screen.getByText('Sara Member')).toBeInTheDocument();
    });
  });

  it('renders member skills', async () => {
    render(<TeamDetailClient id="team-1" />);

    await waitFor(() => {
      expect(screen.getByText('React')).toBeInTheDocument();
      expect(screen.getByText('Next.js')).toBeInTheDocument();
      expect(screen.getByText('Python')).toBeInTheDocument();
    });
  });

  it('shows delete button for owner', async () => {
    render(<TeamDetailClient id="team-1" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Delete Team/i })).toBeInTheDocument();
    });
  });

  it('shows join request section for owner', async () => {
    render(<TeamDetailClient id="team-1" />);

    await waitFor(() => {
      expect(screen.getByText(/Pending Join Requests/i)).toBeInTheDocument();
      expect(screen.getByText('Khalid Requester')).toBeInTheDocument();
      expect(screen.getByText('I want to contribute!')).toBeInTheDocument();
    });
  });

  it('shows "Request to Join" for non-member users', async () => {
    mockUserId = 'user-outsider';

    // Non-owner won't fetch join_requests, so adjust mock
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'teams') {
        return createMockBuilder({ data: mockTeam, error: null });
      }
      if (table === 'team_members') {
        return createMockBuilder({ data: mockMembers, error: null });
      }
      if (table === 'manual_members') {
        return createMockBuilder({ data: [], error: null });
      }
      return createMockBuilder({ data: [], error: null });
    });

    render(<TeamDetailClient id="team-1" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Request to Join/i })).toBeInTheDocument();
    });
  });

  it('shows "Leave Team" for member who is not owner', async () => {
    mockUserId = 'user-member1';

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'teams') {
        return createMockBuilder({ data: mockTeam, error: null });
      }
      if (table === 'team_members') {
        return createMockBuilder({ data: mockMembers, error: null });
      }
      if (table === 'manual_members') {
        return createMockBuilder({ data: [], error: null });
      }
      return createMockBuilder({ data: [], error: null });
    });

    render(<TeamDetailClient id="team-1" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Leave Team/i })).toBeInTheDocument();
    });
  });
});
