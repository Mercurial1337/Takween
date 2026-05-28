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

// Mock rate limiter to always allow requests
vi.mock('@/lib/rateLimit', () => ({
  getRateLimiter: () => ({
    check: () => ({ success: true, remaining: 99, resetIn: 0 }),
  }),
  getClientIp: () => '127.0.0.1',
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
  });

  it('returns 400 if recipientEmail is missing', async () => {
    const req = createMockRequest({ type: 'request_received' });
    const response = await POST(req);
    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: 'Recipient email is required' },
      { status: 400 }
    );
  });

  it('returns simulated success if SMTP credentials are missing', async () => {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    
    // Suppress console.warn for this test
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const req = createMockRequest({ type: 'request_received', recipientEmail: 'test@test.com' });
    const response = await POST(req);

    expect(warnSpy).toHaveBeenCalled();
    expect(NextResponse.json).toHaveBeenCalledWith({ success: true, simulated: true });
    
    warnSpy.mockRestore();
  });

  it('returns 400 for invalid notification type', async () => {
    const req = createMockRequest({ type: 'invalid_type', recipientEmail: 'test@test.com' });
    const response = await POST(req);
    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: 'Invalid notification type' },
      { status: 400 }
    );
  });

  it('sends email successfully for request_received', async () => {
    const req = createMockRequest({
      type: 'request_received',
      recipientEmail: 'owner@example.com',
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
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const req = createMockRequest({
      type: 'request_accepted',
      recipientEmail: 'requester@example.com',
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
      recipientEmail: 'student@example.com',
      recipientName: 'Student',
      actorName: 'Team Owner',
      projectName: 'Graduation Project',
      message: 'We need your skills!',
    });
    const response = await POST(req);
    expect(mockSendMail).toHaveBeenCalledTimes(1);

    const sentArgs = mockSendMail.mock.calls[0][0];
    expect(sentArgs.subject).toBe('Invitation to join Graduation Project');
    expect(sentArgs.html).toContain('You\'ve Been Invited!');
    expect(sentArgs.html).toContain('Team Owner');
    expect(sentArgs.html).toContain('Graduation Project');
    expect(sentArgs.html).toContain('We need your skills!');
    expect(NextResponse.json).toHaveBeenCalledWith({ success: true, messageId: 'test-message-id' });
  });

  it('sends email for invite_accepted', async () => {
    const req = createMockRequest({
      type: 'invite_accepted',
      recipientEmail: 'owner@example.com',
      recipientName: 'Team Owner',
      actorName: 'Student',
      projectName: 'Graduation Project',
    });
    const response = await POST(req);
    expect(mockSendMail).toHaveBeenCalledTimes(1);

    const sentArgs = mockSendMail.mock.calls[0][0];
    expect(sentArgs.subject).toBe('Your invitation for Graduation Project was accepted');
    expect(sentArgs.html).toContain('Invitation Accepted!');
    expect(sentArgs.html).toContain('Student');
    expect(NextResponse.json).toHaveBeenCalledWith({ success: true, messageId: 'test-message-id' });
  });

  it('sends email for invite_rejected', async () => {
    const req = createMockRequest({
      type: 'invite_rejected',
      recipientEmail: 'owner@example.com',
      recipientName: 'Team Owner',
      actorName: 'Student',
      projectName: 'Graduation Project',
    });
    const response = await POST(req);
    expect(mockSendMail).toHaveBeenCalledTimes(1);

    const sentArgs = mockSendMail.mock.calls[0][0];
    expect(sentArgs.subject).toBe('Update on your invitation for Graduation Project');
    expect(sentArgs.html).toContain('Invitation Update');
    expect(sentArgs.html).toContain('declined your invitation');
    expect(sentArgs.html).toContain('Student Directory');
    expect(NextResponse.json).toHaveBeenCalledWith({ success: true, messageId: 'test-message-id' });
  });

  it('sends invite_received email without message content', async () => {
    const req = createMockRequest({
      type: 'invite_received',
      recipientEmail: 'student@example.com',
      recipientName: 'Student',
      actorName: 'Team Owner',
      projectName: 'Test Project',
    });
    const response = await POST(req);
    expect(mockSendMail).toHaveBeenCalledTimes(1);

    const sentArgs = mockSendMail.mock.calls[0][0];
    // When no message is passed, the template should not render the quoted message
    expect(sentArgs.html).not.toContain('"message-box"><p>');
    expect(sentArgs.subject).toBe('Invitation to join Test Project');
    expect(NextResponse.json).toHaveBeenCalledWith({ success: true, messageId: 'test-message-id' });
  });
});
