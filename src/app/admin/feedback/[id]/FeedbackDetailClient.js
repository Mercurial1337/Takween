'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MessageSquare, Clock, User, Mail, AlertTriangle, Trash2, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import PageHeader from '@/components/layout/PageHeader/PageHeader';
import Card from '@/components/ui/Card/Card';
import Button from '@/components/ui/Button/Button';
import Badge from '@/components/ui/Badge/Badge';
import Avatar from '@/components/ui/Avatar/Avatar';
import Skeleton from '@/components/ui/Skeleton/Skeleton';
import { formatRelativeTime } from '@/lib/utils';
import styles from '../page.module.css';

export default function FeedbackDetailClient({ id }) {
  const router = useRouter();
  const { showToast } = useToast();
  const supabase = useMemo(() => createClient(), []);
  
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const updateStatus = async (newStatus, showNotify = true) => {
    try {
      setUpdating(true);
      const { error } = await supabase.from('feedback').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      setFeedback(prev => ({ ...prev, status: newStatus }));
      if (showNotify) showToast({ title: 'Status Updated', message: `Marked as ${newStatus}`, variant: 'success' });
    } catch (err) {
      showToast({ title: 'Error', message: 'Failed to update status.', variant: 'error' });
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        const { data, error } = await supabase
          .from('feedback')
          .select(`*, profiles:user_id (full_name, avatar_url)`)
          .eq('id', id)
          .single();

        if (error) throw error;

        // Fetch email from contact_info (separate table since migration 019)
        if (data?.user_id) {
          const { data: contact } = await supabase
            .from('contact_info')
            .select('email')
            .eq('id', data.user_id)
            .single();
          data.contact_info = contact;
        }

        setFeedback(data);

        // Auto-mark as read if it's 'New'
        if (data && data.status === 'New') {
          await updateStatus('Read', false);
        }
      } catch (err) {
        console.error(err);
        showToast({ title: 'Error', message: 'Failed to load feedback details.', variant: 'error' });
        router.push('/admin/feedback');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchFeedback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);


  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this feedback?')) return;
    try {
      setUpdating(true);
      const { error } = await supabase.from('feedback').delete().eq('id', id);
      if (error) throw error;
      showToast({ title: 'Deleted', message: 'Feedback removed.', variant: 'success' });
      router.push('/admin/feedback');
    } catch (err) {
      showToast({ title: 'Error', message: 'Failed to delete feedback.', variant: 'error' });
      setUpdating(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'New': return 'error';
      case 'Read': return 'warning';
      case 'Resolved': return 'success';
      default: return 'primary';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'Bug': return 'error';
      case 'Feature': return 'primary';
      case 'General': return 'secondary';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <Skeleton variant="rectangular" height="400px" />
      </div>
    );
  }

  if (!feedback) return null;

  return (
    <div className={styles.page}>
      <div style={{ marginBottom: '24px' }}>
        <Button variant="ghost" onClick={() => router.push('/admin/feedback')} icon={ArrowLeft} style={{ padding: '0 8px' }}>
          Back to Feedback
        </Button>
      </div>

      <PageHeader 
        title="Feedback Details" 
        description={`Submitted ${formatRelativeTime(feedback.created_at)}`} 
        customLabels={feedback ? { [id]: feedback.subject } : {}}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          {feedback.status !== 'Resolved' && (
            <Button 
              variant="primary" 
              icon={CheckCircle} 
              onClick={() => updateStatus('Resolved')}
              loading={updating}
            >
              Mark as Resolved
            </Button>
          )}
          <Button 
            variant="outline" 
            icon={Trash2} 
            onClick={handleDelete}
            loading={updating}
            style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)' }}
          >
            Delete
          </Button>
        </div>
      </PageHeader>

      <Card style={{ padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>{feedback.subject}</h2>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Badge variant={getTypeColor(feedback.type)}>{feedback.type}</Badge>
              <Badge variant={getStatusColor(feedback.status)}>{feedback.status}</Badge>
            </div>
          </div>
        </div>

        <div style={{ padding: '24px', backgroundColor: 'var(--color-surface-hover)', borderRadius: '8px', marginBottom: '32px' }}>
          <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{feedback.message}</p>
        </div>

        <div style={{ borderTop: '1px solid var(--color-border-subtle)', paddingTop: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'semibold', marginBottom: '16px' }}>Sender Information</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Avatar src={feedback.profiles?.avatar_url} name={feedback.profiles?.full_name} size="lg" />
            <div>
              <p style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <User size={16} /> {feedback.profiles?.full_name || 'Anonymous User'}
              </p>
              <p style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mail size={16} /> {feedback.contact_info?.email || 'No email provided'}
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
