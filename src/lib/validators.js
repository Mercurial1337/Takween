import { z } from 'zod';

// ============================================================================
// AUTH SCHEMAS
// ============================================================================

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirm_password: z.string(),
  whatsapp_number: z
    .string()
    .min(8, 'Please enter a valid WhatsApp number')
    .max(20)
    .regex(/^[\d+\-\s()]+$/, 'Please enter a valid phone number'),
  level_id: z.string().uuid('Please select your academic level'),
  skills: z.array(z.string()).optional().default([]),
  linkedin_url: z
    .string()
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal('')),
  github_url: z
    .string()
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal('')),
}).refine((data) => data.password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
});

// ============================================================================
// PROFILE SCHEMAS
// ============================================================================

export const profileUpdateSchema = z.object({
  full_name: z.string().min(2).max(100).optional(),
  whatsapp_number: z
    .string()
    .min(8)
    .max(20)
    .regex(/^[\d+\-\s()]+$/)
    .optional(),
  level_id: z.string().uuid().optional(),
  linkedin_url: z.string().url().optional().or(z.literal('')),
  github_url: z.string().url().optional().or(z.literal('')),
  skills: z.array(z.string()).optional(),
});

// ============================================================================
// PROJECT SCHEMAS
// ============================================================================

export const projectSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000),
  department_id: z.string().uuid('Please select a department'),
  max_team_size: z
    .number()
    .int()
    .min(1, 'Team size must be at least 1')
    .max(20, 'Team size cannot exceed 20'),
  status: z.enum(['open', 'closed']).optional().default('open'),
});

// ============================================================================
// TEAM SCHEMAS
// ============================================================================

export const createTeamSchema = z.object({
  project_id: z.string().uuid('Invalid project'),
});

export const updateTeamSchema = z.object({
  status: z.enum(['recruiting', 'closed']),
});

// ============================================================================
// MANUAL MEMBER SCHEMAS
// ============================================================================

export const manualMemberSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  whatsapp_number: z
    .string()
    .max(20)
    .regex(/^[\d+\-\s()]*$/, 'Please enter a valid phone number')
    .optional()
    .or(z.literal('')),
  notes: z.string().max(500).optional().or(z.literal('')),
});

// ============================================================================
// JOIN REQUEST SCHEMAS
// ============================================================================

export const joinRequestSchema = z.object({
  message: z.string().max(500, 'Message cannot exceed 500 characters').optional().or(z.literal('')),
});

export const joinRequestActionSchema = z.object({
  action: z.enum(['accepted', 'rejected']),
});

// ============================================================================
// ADMIN SCHEMAS
// ============================================================================

export const departmentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
});

export const levelSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  sort_order: z.number().int().min(0).optional().default(0),
});

export const skillSchema = z.object({
  name: z.string().min(1, 'Skill name is required').max(50),
  is_predefined: z.boolean().optional().default(true),
});

export const adminInviteSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});
