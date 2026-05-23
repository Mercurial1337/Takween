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

// Helper to create a mock Request object
function createMockRequest(body) {
  return {
    json: vi.fn().mockResolvedValue(body),
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
});
