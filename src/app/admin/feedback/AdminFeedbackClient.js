'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import PageHeader from '@/components/layout/PageHeader/PageHeader';
import Badge from '@/components/ui/Badge/Badge';
import Avatar from '@/components/ui/Avatar/Avatar';
import Skeleton from '@/components/ui/Skeleton/Skeleton';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import { MessageSquare } from 'lucide-react';
import styles from './page.module.css';

export default function AdminFeedbackClient() {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        const { data, error } = await supabase
          .from('feedback')
          .select(`
            *,
            profiles:user_id (full_name, email, avatar_url)
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setFeedback(data || []);
      } catch (err) {
        console.error(err);
        showToast({ title: 'Error', message: 'Failed to load feedback.', variant: 'error' });
      } finally {
        setLoading(false);
      }
    };

    fetchFeedback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateStatus = async (id, newStatus) => {
    try {
      const { error } = await supabase
        .from('feedback')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      
      setFeedback(prev => prev.map(f => f.id === id ? { ...f, status: newStatus } : f));
      showToast({ title: 'Success', message: `Marked as ${newStatus}`, variant: 'success' });
    } catch (err) {
      console.error(err);
      showToast({ title: 'Error', message: 'Failed to update status.', variant: 'error' });
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
        <PageHeader title="User Feedback" description="Manage feedback and requests" />
        <Skeleton variant="rectangular" height="400px" />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader 
        title="User Feedback" 
        description="Review bug reports, feature requests, and general feedback." 
      />

      {feedback.length === 0 ? (
        <EmptyState 
          icon={MessageSquare} 
          title="No Feedback Yet" 
          description="You haven't received any feedback from users." 
        />
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>User</th>
                <th>Type</th>
                <th>Subject & Message</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {feedback.map(item => (
                <tr key={item.id}>
                  <td>
                    <div className={styles.senderInfo}>
                      <Avatar src={item.profiles?.avatar_url} name={item.profiles?.full_name} size="sm" />
                      <div className={styles.senderDetails}>
                        <span className={styles.senderName}>{item.profiles?.full_name || 'Unknown User'}</span>
                        <span className={styles.senderEmail}>{item.profiles?.email || 'No email'}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <Badge variant={getTypeColor(item.type)} size="sm">{item.type}</Badge>
                  </td>
                  <td className={styles.subjectCell}>
                    <span className={styles.subject}>{item.subject}</span>
                    <span className={styles.message}>{item.message}</span>
                  </td>
                  <td>{new Date(item.created_at).toLocaleDateString()}</td>
                  <td>
                    <Badge variant={getStatusColor(item.status)} size="sm">{item.status}</Badge>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      {item.status !== 'Read' && item.status !== 'Resolved' && (
                        <button className={styles.actionBtn} onClick={() => updateStatus(item.id, 'Read')}>
                          Mark Read
                        </button>
                      )}
                      {item.status !== 'Resolved' && (
                        <button className={`${styles.actionBtn} ${styles.resolveBtn}`} onClick={() => updateStatus(item.id, 'Resolved')}>
                          Resolve
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
