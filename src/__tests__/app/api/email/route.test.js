import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/email/route';
import { NextResponse } from 'next/server';

const { mockSendMail } = vi.hoisted(() => ({
  mockSendMail: vi.fn().mockResolvedValue({ messageId: 'test-message-id' }),
}));

// Mock nodemailer
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: mockSendMail,
    })),
  },
}));

// Mock rateLimiter
vi.mock('@/lib/rateLimit', () => ({
  getRateLimiter: () => ({
    check: vi.fn().mockReturnValue({ success: true, resetIn: 0 }),
  }),
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
}));

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { email: 'mocked@example.com' },
            error: null
          })
        })
      })
    })
  }))
}));

// Helper to create a mock Request object
function createMockRequest(body) {
  return {
    json: vi.fn().mockResolvedValue(body),
    headers: {
      get: vi.fn().mockReturnValue(null),
    },
  };
}

describe('POST /api/email', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    // Set up mock env variables so it attempts to send email
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_USER = 'test@example.com';
    process.env.SMTP_PASS = 'password';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-key';
  });

  it('returns 400 if recipientId is missing', async () => {
    const req = createMockRequest({ type: 'request_received' });
    const response = await POST(req);
    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: 'Recipient ID is required' },
      { status: 400 }
    );
  });

  it('returns simulated success if SMTP credentials are missing', async () => {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;

    // Suppress console.warn for this test
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

    const req = createMockRequest({ type: 'request_received', recipientId: 'test-id' });
    const response = await POST(req);

    expect(warnSpy).toHaveBeenCalled();
    expect(NextResponse.json).toHaveBeenCalledWith({ success: true, simulated: true });

    warnSpy.mockRestore();
  });

  it('returns 400 for invalid notification type', async () => {
    const req = createMockRequest({ type: 'invalid_type', recipientId: 'test-id' });
    const response = await POST(req);
    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: 'Invalid notification type' },
      { status: 400 }
    );
  });

  it('sends email successfully for request_received', async () => {
    const req = createMockRequest({
      type: 'request_received',
      recipientId: 'test-id',
      recipientName: 'Owner',
      actorName: 'Requester',
      projectName: 'Test Project',
    });
    const response = await POST(req);
    expect(NextResponse.json).toHaveBeenCalledWith({ success: true, messageId: 'test-message-id' });
  });

  it('handles errors during email sending gracefully', async () => {
    // We override the sendMail mock just for this test
    mockSendMail.mockRejectedValueOnce(new Error('SMTP error'));

    // Suppress console.error
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

    const req = createMockRequest({
      type: 'request_accepted',
      recipientId: 'test-id',
    });
    const response = await POST(req);

    expect(errSpy).toHaveBeenCalled();
    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: 'Internal server error' },
      { status: 500 }
    );

    errSpy.mockRestore();
  });

  it('sends email for invite_received', async () => {
    const req = createMockRequest({
      type: 'invite_received',
      recipientId: 'test-id',
      recipientName: 'Student',
      actorName: 'Team Owner',
      projectName: 'Graduation Project',
      message: 'We need your skills!',
    });
    const response = await POST(req);
    expect(mockSendMail).toHaveBeenCalledTimes(1);

    const sentArgs = mockSendMail.mock.calls[0][0];
    expect(sentArgs.subject).toBe('Invitation to join Graduation Project');
    expect(sentArgs.html).toContain('Team Invitation');
    expect(sentArgs.subject).toBe('Invitation to join Graduation Project');
    expect(sentArgs.html).toContain('Team Invitation');
    expect(sentArgs.html).toContain('Team Owner');
    expect(sentArgs.html).toContain('Graduation Project');
    expect(sentArgs.html).toContain('We need your skills!');
    expect(NextResponse.json).toHaveBeenCalledWith({ success: true, messageId: 'test-message-id' });
  });

  it('sends email for invite_accepted', async () => {
    const req = createMockRequest({
      type: 'invite_accepted',
      recipientId: 'test-id',
      recipientName: 'Team Owner',
      actorName: 'Student',
      projectName: 'Graduation Project',
    });
    const response = await POST(req);
    expect(mockSendMail).toHaveBeenCalledTimes(1);

    const sentArgs = mockSendMail.mock.calls[0][0];
    expect(sentArgs.subject).toBe('Your invitation for Graduation Project was accepted');
    expect(sentArgs.html).toContain('Invitation Accepted');
    expect(sentArgs.subject).toBe('Your invitation for Graduation Project was accepted');
    expect(sentArgs.html).toContain('Invitation Accepted');
    expect(sentArgs.html).toContain('Student');
    expect(NextResponse.json).toHaveBeenCalledWith({ success: true, messageId: 'test-message-id' });
  });

  it('sends email for invite_rejected', async () => {
    const req = createMockRequest({
      type: 'invite_rejected',
      recipientId: 'test-id',
      recipientName: 'Team Owner',
      actorName: 'Student',
      projectName: 'Graduation Project',
    });
    const response = await POST(req);
    expect(mockSendMail).toHaveBeenCalledTimes(1);

    const sentArgs = mockSendMail.mock.calls[0][0];
    expect(sentArgs.subject).toBe('Update on your invitation for Graduation Project');
    expect(sentArgs.html).toContain('Invitation Declined');
    expect(sentArgs.subject).toBe('Update on your invitation for Graduation Project');
    expect(sentArgs.html).toContain('Invitation Declined');
    expect(sentArgs.html).toContain('declined your invitation');
    expect(sentArgs.html).toContain('Student Directory');
    expect(NextResponse.json).toHaveBeenCalledWith({ success: true, messageId: 'test-message-id' });
  });

  it('sends invite_received email without message', async () => {
    const req = createMockRequest({
      type: 'invite_received',
      recipientId: 'test-id',
      recipientName: 'Student',
      actorName: 'Team Owner',
      projectName: 'Test Project',
    });
    const response = await POST(req);
    expect(mockSendMail).toHaveBeenCalledTimes(1);

    const sentArgs = mockSendMail.mock.calls[0][0];
    expect(sentArgs.html).not.toContain('border-left:4px solid #C49A4A');
    expect(NextResponse.json).toHaveBeenCalledWith({ success: true, messageId: 'test-message-id' });
  });
});
