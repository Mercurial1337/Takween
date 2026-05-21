'use client';

import { Bell, CheckCheck } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationsContext';
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

export default function NotificationsClient() {
  const { notifications, loading, unreadCount, markAsRead, markAllRead } = useNotifications();

  if (loading) {
    return (
      <div className={styles.page}>
        <Skeleton variant="text" width="200px" height="32px" />
        <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Skeleton variant="rectangular" height="80px" />
          <Skeleton variant="rectangular" height="80px" />
          <Skeleton variant="rectangular" height="80px" />
        </div>
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
