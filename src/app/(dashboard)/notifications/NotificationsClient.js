'use client';

import { useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
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
  invite_accepted: { label: 'Invite Accepted', variant: 'success' },
  invite_rejected: { label: 'Invite Declined', variant: 'error' },
  merge_received: { label: 'Merge Request', variant: 'accent' },
  merge_accepted: { label: 'Merge Accepted', variant: 'success' },
  merge_rejected: { label: 'Merge Declined', variant: 'error' },
};

export default function NotificationsClient() {
  const { notifications, loading, unreadCount, markAsRead, markAllRead } = useNotifications();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  // Resolve the destination URL from a notification's metadata
  const resolveNotificationUrl = useCallback(async (notification) => {
    const meta = notification.metadata || {};

    // Get team_id from metadata — different types store it differently
    const teamId = meta.team_id || meta.target_team_id || meta.source_team_id;

    if (!teamId) return null;

    // Look up the project_id from the team
    const { data: team } = await supabase
      .from('teams')
      .select('project_id')
      .eq('id', teamId)
      .single();

    if (team?.project_id) {
      return `/projects/${team.project_id}`;
    }

    return null;
  }, [supabase]);

  const handleNotificationClick = useCallback(async (notification) => {
    // Always mark as read
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    // Resolve and navigate
    const url = await resolveNotificationUrl(notification);
    if (url) {
      router.push(url);
    }
  }, [markAsRead, resolveNotificationUrl, router]);

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
            const hasLink = !!(n.metadata?.team_id || n.metadata?.target_team_id || n.metadata?.source_team_id);
            return (
              <Card
                key={n.id}
                className={`${styles.notification} ${!n.is_read ? styles.unread : ''} ${hasLink ? styles.clickable : ''}`}
                onClick={() => handleNotificationClick(n)}
              >
                <div className={styles.notifContent}>
                  <div className={styles.notifHeader}>
                    <Badge variant={meta.variant} size="sm">{meta.label}</Badge>
                    <span className={styles.time}>{formatRelativeTime(n.created_at)}</span>
                  </div>
                  <p className={styles.notifTitle}>{n.title}</p>
                  <p className={styles.notifBody}>{n.body}</p>
                </div>
                <div className={styles.notifActions}>
                  {!n.is_read && <div className={styles.unreadDot} />}
                  {hasLink && <ExternalLink size={14} className={styles.linkIcon} />}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
