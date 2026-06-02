'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { createClient } from '@/lib/supabase/client';
import PageHeader from '@/components/layout/PageHeader/PageHeader';
import Input from '@/components/ui/Input/Input';
import Button from '@/components/ui/Button/Button';
import { Send, MessageSquarePlus } from 'lucide-react';
import styles from './page.module.css';

export default function FeedbackClient() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: 'Feature',
    subject: '',
    message: ''
  });

  const supabase = createClient();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.subject.trim() || !formData.message.trim()) {
      showToast({ title: 'Error', message: 'Subject and message are required.', variant: 'error' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('feedback').insert({
        user_id: user?.id,
        type: formData.type,
        subject: formData.subject.trim(),
        message: formData.message.trim(),
      });

      if (error) throw error;

      // Send email using resend
      try {
        await fetch('/api/feedback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: formData.type,
            subject: formData.subject.trim(),
            message: formData.message.trim(),
            userEmail: user?.email,
            userName: user?.user_metadata?.full_name || user?.user_metadata?.name || 'A user',
          }),
        });
      } catch (emailErr) {
        console.error('Failed to send email notification:', emailErr);
      }

      showToast({ 
        title: 'Feedback Submitted', 
        message: 'Thank you for your feedback! We will review it shortly.', 
        variant: 'success' 
      });
      
      setFormData({ type: 'Feature', subject: '', message: '' });
    } catch (err) {
      console.error(err);
      showToast({ title: 'Error', message: 'Could not submit feedback.', variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Feedback & Requests"
        description="Help us improve Takween. Report bugs, suggest features, or just say hello!"
      />

      <div className={styles.formCard}>
        <div className={styles.intro}>
          <p>
            Your input is highly valuable. Please be as detailed as possible so our team can better understand your request.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Type of Feedback</label>
            <select
              className={styles.select}
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            >
              <option value="Feature">Feature Request</option>
              <option value="Bug">Bug Report</option>
              <option value="General">General Inquiry</option>
            </select>
          </div>

          <Input
            id="subject"
            label="Subject"
            placeholder="e.g. Add dark mode to the dashboard"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            required
          />

          <div className={styles.formGroup}>
            <label className={styles.label}>Message</label>
            <textarea
              className={styles.textarea}
              placeholder="Describe your feature or issue in detail..."
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              required
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            loading={loading}
            icon={Send}
            className={styles.submitBtn}
          >
            Submit Feedback
          </Button>
        </form>
      </div>
    </div>
  );
}
