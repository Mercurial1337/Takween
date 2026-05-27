import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  registerSchema,
  profileUpdateSchema,
  projectSchema,
  createTeamSchema,
  updateTeamSchema,
  manualMemberSchema,
  joinRequestSchema,
  joinRequestActionSchema,
  teamInviteSchema,
  teamInviteActionSchema,
  departmentSchema,
  levelSchema,
  skillSchema,
  adminInviteSchema,
} from '@/lib/validators';

// ============================================================================
// loginSchema
// ============================================================================
describe('loginSchema', () => {
  it('validates correct credentials', () => {
    const result = loginSchema.safeParse({ email: 'test@example.com', password: '123456' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({ email: 'not-email', password: '123456' });
    expect(result.success).toBe(false);
  });

  it('rejects short password', () => {
    const result = loginSchema.safeParse({ email: 'test@example.com', password: '12345' });
    expect(result.success).toBe(false);
  });

  it('rejects empty fields', () => {
    const result = loginSchema.safeParse({ email: '', password: '' });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// registerSchema
// ============================================================================
describe('registerSchema', () => {
  const validData = {
    full_name: 'Ahmed Hassan',
    email: 'ahmed@example.com',
    password: 'password123',
    confirm_password: 'password123',
    whatsapp_number: '+201234567890',
    level_id: '550e8400-e29b-41d4-a716-446655440000',
    department_id: '',
    skills: ['React', 'Node.js'],
    linkedin_url: '',
    github_url: '',
  };

  it('validates correct registration data', () => {
    const result = registerSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('rejects mismatched passwords', () => {
    const result = registerSchema.safeParse({ ...validData, confirm_password: 'different' });
    expect(result.success).toBe(false);
    const confirmErr = result.error.issues.find((e) => e.path.includes('confirm_password'));
    expect(confirmErr).toBeDefined();
  });

  it('rejects name shorter than 2 characters', () => {
    const result = registerSchema.safeParse({ ...validData, full_name: 'A' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid whatsapp number format', () => {
    const result = registerSchema.safeParse({ ...validData, whatsapp_number: 'abc' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid level_id (not UUID)', () => {
    const result = registerSchema.safeParse({ ...validData, level_id: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('allows optional linkedin_url as empty string', () => {
    const result = registerSchema.safeParse({ ...validData, linkedin_url: '' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid linkedin_url', () => {
    const result = registerSchema.safeParse({ ...validData, linkedin_url: 'not-a-url' });
    expect(result.success).toBe(false);
  });

  it('allows valid URLs for linkedin and github', () => {
    const result = registerSchema.safeParse({
      ...validData,
      linkedin_url: 'https://linkedin.com/in/ahmed',
      github_url: 'https://github.com/ahmed',
    });
    expect(result.success).toBe(true);
  });

  it('defaults skills to empty array when not provided', () => {
    const { skills, ...withoutSkills } = validData;
    const result = registerSchema.safeParse(withoutSkills);
    expect(result.success).toBe(true);
    expect(result.data.skills).toEqual([]);
  });
});

// ============================================================================
// profileUpdateSchema
// ============================================================================
describe('profileUpdateSchema', () => {
  it('validates partial update', () => {
    const result = profileUpdateSchema.safeParse({ full_name: 'Ahmed' });
    expect(result.success).toBe(true);
  });

  it('validates empty object (all optional)', () => {
    const result = profileUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rejects short full_name', () => {
    const result = profileUpdateSchema.safeParse({ full_name: 'A' });
    expect(result.success).toBe(false);
  });

  it('allows valid linkedin_url', () => {
    const result = profileUpdateSchema.safeParse({ linkedin_url: 'https://linkedin.com/in/test' });
    expect(result.success).toBe(true);
  });


});

// ============================================================================
// projectSchema
// ============================================================================
describe('projectSchema', () => {
  const validProject = {
    title: 'Graduation Project',
    description: 'A comprehensive project for the graduation course.',
    min_team_size: 2,
    max_team_size: 5,
  };

  it('validates correct project', () => {
    const result = projectSchema.safeParse(validProject);
    expect(result.success).toBe(true);
  });

  it('rejects short title', () => {
    const result = projectSchema.safeParse({ ...validProject, title: 'GP' });
    expect(result.success).toBe(false);
  });

  it('rejects short description', () => {
    const result = projectSchema.safeParse({ ...validProject, description: 'Short' });
    expect(result.success).toBe(false);
  });

  it('rejects min_team_size > max_team_size', () => {
    const result = projectSchema.safeParse({ ...validProject, min_team_size: 6, max_team_size: 5 });
    expect(result.success).toBe(false);
    const err = result.error.issues.find((e) => e.path.includes('min_team_size'));
    expect(err).toBeDefined();
  });

  it('rejects team size below 1', () => {
    const result = projectSchema.safeParse({ ...validProject, min_team_size: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects team size above 20', () => {
    const result = projectSchema.safeParse({ ...validProject, max_team_size: 21 });
    expect(result.success).toBe(false);
  });

  it('defaults status to open', () => {
    const result = projectSchema.safeParse(validProject);
    expect(result.success).toBe(true);
    expect(result.data.status).toBe('open');
  });

  it('allows optional department_id', () => {
    const result = projectSchema.safeParse({
      ...validProject,
      department_id: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// createTeamSchema & updateTeamSchema
// ============================================================================
describe('createTeamSchema', () => {
  it('validates correct team creation', () => {
    const result = createTeamSchema.safeParse({ project_id: '550e8400-e29b-41d4-a716-446655440000' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid project_id', () => {
    const result = createTeamSchema.safeParse({ project_id: 'nope' });
    expect(result.success).toBe(false);
  });
});

describe('updateTeamSchema', () => {
  it('validates recruiting status', () => {
    expect(updateTeamSchema.safeParse({ status: 'recruiting' }).success).toBe(true);
  });

  it('validates closed status', () => {
    expect(updateTeamSchema.safeParse({ status: 'closed' }).success).toBe(true);
  });

  it('rejects invalid status', () => {
    expect(updateTeamSchema.safeParse({ status: 'unknown' }).success).toBe(false);
  });
});

// ============================================================================
// manualMemberSchema
// ============================================================================
describe('manualMemberSchema', () => {
  it('validates correct manual member', () => {
    const result = manualMemberSchema.safeParse({ full_name: 'John Doe' });
    expect(result.success).toBe(true);
  });

  it('rejects short name', () => {
    const result = manualMemberSchema.safeParse({ full_name: 'J' });
    expect(result.success).toBe(false);
  });

  it('allows optional whatsapp and notes', () => {
    const result = manualMemberSchema.safeParse({
      full_name: 'John Doe',
      whatsapp_number: '+201234567890',
      notes: 'Team lead backup',
    });
    expect(result.success).toBe(true);
  });

  it('allows empty strings for optional fields', () => {
    const result = manualMemberSchema.safeParse({
      full_name: 'John Doe',
      whatsapp_number: '',
      notes: '',
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// joinRequestSchema & joinRequestActionSchema
// ============================================================================
describe('joinRequestSchema', () => {
  it('allows empty message', () => {
    expect(joinRequestSchema.safeParse({}).success).toBe(true);
    expect(joinRequestSchema.safeParse({ message: '' }).success).toBe(true);
  });

  it('allows valid message', () => {
    expect(joinRequestSchema.safeParse({ message: 'I want to join!' }).success).toBe(true);
  });

  it('rejects message exceeding 500 characters', () => {
    const result = joinRequestSchema.safeParse({ message: 'a'.repeat(501) });
    expect(result.success).toBe(false);
  });
});

describe('joinRequestActionSchema', () => {
  it('accepts accepted', () => {
    expect(joinRequestActionSchema.safeParse({ action: 'accepted' }).success).toBe(true);
  });

  it('accepts rejected', () => {
    expect(joinRequestActionSchema.safeParse({ action: 'rejected' }).success).toBe(true);
  });

  it('rejects invalid action', () => {
    expect(joinRequestActionSchema.safeParse({ action: 'pending' }).success).toBe(false);
  });
});

// ============================================================================
// Admin schemas: departmentSchema, levelSchema, skillSchema, adminInviteSchema
// ============================================================================
describe('departmentSchema', () => {
  it('validates correct department', () => {
    expect(departmentSchema.safeParse({ name: 'Computer Science' }).success).toBe(true);
  });

  it('rejects short name', () => {
    expect(departmentSchema.safeParse({ name: 'C' }).success).toBe(false);
  });
});

describe('levelSchema', () => {
  it('validates with name only', () => {
    const result = levelSchema.safeParse({ name: 'Year 1' });
    expect(result.success).toBe(true);
    expect(result.data.sort_order).toBe(0);
  });

  it('validates with name and sort_order', () => {
    expect(levelSchema.safeParse({ name: 'Year 3', sort_order: 3 }).success).toBe(true);
  });

  it('rejects negative sort_order', () => {
    expect(levelSchema.safeParse({ name: 'Year 1', sort_order: -1 }).success).toBe(false);
  });
});

describe('skillSchema', () => {
  it('validates correct skill', () => {
    expect(skillSchema.safeParse({ name: 'React' }).success).toBe(true);
  });

  it('defaults is_predefined to true', () => {
    const result = skillSchema.safeParse({ name: 'React' });
    expect(result.success).toBe(true);
    expect(result.data.is_predefined).toBe(true);
  });

  it('rejects empty skill name', () => {
    expect(skillSchema.safeParse({ name: '' }).success).toBe(false);
  });
});

describe('adminInviteSchema', () => {
  it('validates correct email', () => {
    expect(adminInviteSchema.safeParse({ email: 'admin@uni.edu' }).success).toBe(true);
  });

  it('rejects invalid email', () => {
    expect(adminInviteSchema.safeParse({ email: 'not-email' }).success).toBe(false);
  });
});

// ============================================================================
// teamInviteSchema & teamInviteActionSchema
// ============================================================================
describe('teamInviteSchema', () => {
  it('allows empty message', () => {
    expect(teamInviteSchema.safeParse({}).success).toBe(true);
    expect(teamInviteSchema.safeParse({ message: '' }).success).toBe(true);
  });

  it('allows valid message', () => {
    expect(teamInviteSchema.safeParse({ message: 'We need you on our team!' }).success).toBe(true);
  });

  it('rejects message exceeding 500 characters', () => {
    const result = teamInviteSchema.safeParse({ message: 'a'.repeat(501) });
    expect(result.success).toBe(false);
  });

  it('accepts exactly 500 characters', () => {
    const result = teamInviteSchema.safeParse({ message: 'a'.repeat(500) });
    expect(result.success).toBe(true);
  });
});

describe('teamInviteActionSchema', () => {
  it('accepts accepted', () => {
    expect(teamInviteActionSchema.safeParse({ action: 'accepted' }).success).toBe(true);
  });

  it('accepts rejected', () => {
    expect(teamInviteActionSchema.safeParse({ action: 'rejected' }).success).toBe(true);
  });

  it('rejects invalid action', () => {
    expect(teamInviteActionSchema.safeParse({ action: 'pending' }).success).toBe(false);
  });

  it('rejects missing action', () => {
    expect(teamInviteActionSchema.safeParse({}).success).toBe(false);
  });
});
