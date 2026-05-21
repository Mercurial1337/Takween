'use client';

import { useEffect, useState, useMemo } from 'react';
import { Bell, Check, CheckCheck, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/layout/PageHeader/PageHeader';
import Card from '@/components/ui/Card/Card';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import Skeleton from '@/components/ui/Skeleton/Skeleton';
import { formatRelativeTime } from '@/lib/utils';
import styles from './page.module.css';

const typeLabels = {
  request_received: { label: 'Join Request', variant: 'primary' },
  request_accepted: { label: 'Accepted', variant: 'success' },
  request_rejected: { label: 'Rejected', variant: 'error' },
  member_removed: { label: 'Removed', variant: 'warning' },
  member_left: { label: 'Left', variant: 'default' },
  team_closed: { label: 'Closed', variant: 'default' },
  team_deleted: { label: 'Deleted', variant: 'error' },
  ownership_transferred: { label: 'Transfer', variant: 'accent' },
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  const fetchNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setNotifications(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();

    // Realtime subscription
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user?.id}`,
      }, (payload) => {
        setNotifications((prev) => [payload.new, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const markAsRead = async (id) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (loading) {
    return (
      <div>
        <Skeleton variant="text" width="200px" height="32px" />
        <Skeleton variant="rectangular" height="60px" count={5} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader title="Notifications" description={`${unreadCount} unread`}>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" icon={CheckCheck} onClick={markAllRead}>
            Mark All Read
          </Button>
        )}
      </PageHeader>

      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications"
          description="You're all caught up. Notifications will appear here when there's activity."
        />
      ) : (
        <div className={styles.list}>
          {notifications.map((n) => {
            const meta = typeLabels[n.type] || { label: n.type, variant: 'default' };
            return (
              <Card
                key={n.id}
                className={`${styles.notification} ${!n.is_read ? styles.unread : ''}`}
                onClick={() => !n.is_read && markAsRead(n.id)}
              >
                <div className={styles.notifContent}>
                  <div className={styles.notifHeader}>
                    <Badge variant={meta.variant} size="sm">{meta.label}</Badge>
                    <span className={styles.time}>{formatRelativeTime(n.created_at)}</span>
                  </div>
                  <p className={styles.notifTitle}>{n.title}</p>
                  <p className={styles.notifBody}>{n.body}</p>
                </div>
                {!n.is_read && <div className={styles.unreadDot} />}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
