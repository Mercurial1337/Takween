'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Users, FolderOpen, Bell, ArrowRight, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import PageHeader from '@/components/layout/PageHeader/PageHeader';
import Card from '@/components/ui/Card/Card';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import Skeleton from '@/components/ui/Skeleton/Skeleton';
import styles from './page.module.css';

export default function DashboardClient() {
  const { user, profile, loading: authLoading } = useAuth();
  const [teams, setTeams] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!user) return;

    const fetchDashboardData = async () => {
      try {
        // Fetch user's teams
        const { data: memberData } = await supabase
          .from('team_members')
          .select(`
            team_id,
            role,
            teams (
              id,
              status,
              project_id,
              owner_id,
              projects (
                id,
                title,
                department_id,
                min_team_size,
                max_team_size,
                departments (name)
              )
            )
          `)
          .eq('user_id', user.id);

        if (memberData) {
          // For each team, get member count
          const teamsWithCounts = await Promise.all(
            memberData.map(async (m) => {
              const { count: registeredCount } = await supabase
                .from('team_members')
                .select('*', { count: 'exact', head: true })
                .eq('team_id', m.team_id);

              const { count: manualCount } = await supabase
                .from('manual_members')
                .select('*', { count: 'exact', head: true })
                .eq('team_id', m.team_id);

              return {
                ...m.teams,
                role: m.role,
                memberCount: (registeredCount || 0) + (manualCount || 0),
              };
            })
          );
          setTeams(teamsWithCounts);
        }

        // Fetch pending join requests (for teams user owns)
        const { data: requestData } = await supabase
          .from('join_requests')
          .select(`
            id,
            message,
            status,
            created_at,
            profiles:user_id (full_name),
            teams:team_id (
              id,
              projects (title)
            )
          `)
          .eq('status', 'pending')
          .in('team_id', (memberData || []).filter(m => m.role === 'owner').map(m => m.team_id));

        if (requestData) setPendingRequests(requestData);

        // Fetch unread notifications count
        const { count } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false);

        setUnreadNotifications(count || 0);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    Promise.resolve().then(() => {
      fetchDashboardData();
    });
  }, [user, supabase]);

  if (authLoading || loading) {
    return (
      <div>
        <Skeleton variant="text" width="200px" height="32px" />
        <div className={styles.skeletonGrid}>
          <Skeleton variant="rectangular" height="160px" />
          <Skeleton variant="rectangular" height="160px" />
          <Skeleton variant="rectangular" height="160px" />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      <PageHeader
        title={`Welcome, ${profile?.full_name?.split(' ')[0] || 'Student'}`}
        description="Here's an overview of your teams and activity."
      />

      {/* Quick Stats */}
      <div className={styles.statsRow}>
        <Card className={styles.statCard}>
          <div className={styles.statIcon} style={{ backgroundColor: 'var(--color-surface)' }}>
            <Users size={20} style={{ color: 'var(--color-primary)' }} />
          </div>
          <div>
            <p className={styles.statNumber}>{teams.length}</p>
            <p className={styles.statLabel}>My Teams</p>
          </div>
        </Card>
        <Card className={styles.statCard}>
          <div className={styles.statIcon} style={{ backgroundColor: 'var(--color-warning-bg)' }}>
            <FolderOpen size={20} style={{ color: 'var(--color-accent)' }} />
          </div>
          <div>
            <p className={styles.statNumber}>{pendingRequests.length}</p>
            <p className={styles.statLabel}>Pending Requests</p>
          </div>
        </Card>
        <Card className={styles.statCard}>
          <div className={styles.statIcon} style={{ backgroundColor: 'var(--color-error-bg)' }}>
            <Bell size={20} style={{ color: 'var(--color-error)' }} />
          </div>
          <div>
            <p className={styles.statNumber}>{unreadNotifications}</p>
            <p className={styles.statLabel}>Unread Notifications</p>
          </div>
        </Card>
      </div>

      {/* My Teams */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>My Teams</h2>
          <Link href="/projects" className={styles.viewAll}>
            Browse Projects <ArrowRight size={16} />
          </Link>
        </div>

        {teams.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No teams yet"
            description="Browse available projects and create or join a team to get started."
            action={{ label: 'Browse Projects', onClick: () => window.location.href = '/projects' }}
          />
        ) : (
          <div className={styles.teamGrid}>
            {teams.map((team) => (
              <Link key={team.id} href={`/projects/${team.project_id}`} className={styles.teamCardLink}>
                <Card hoverable className={styles.teamCard}>
                  <div className={styles.teamCardHeader}>
                    <h3 className={styles.teamCardTitle}>{team.projects?.title}</h3>
                    <Badge variant={team.status === 'recruiting' ? 'success' : 'default'} size="sm">
                      {team.status === 'recruiting' ? 'Recruiting' : 'Closed'}
                    </Badge>
                  </div>
                  <p className={styles.teamCardDept}>
                    {team.projects?.departments?.name || 'Universal (All Departments)'}
                  </p>
                  <div className={styles.teamCardFooter}>
                    <span className={styles.teamCardMembers}>
                      <Users size={14} /> {team.memberCount}/{team.projects?.max_team_size} members ({team.projects?.min_team_size || 1}-{team.projects?.max_team_size} target)
                    </span>
                    <Badge variant={team.role === 'owner' ? 'accent' : 'primary'} size="sm">
                      {team.role === 'owner' ? 'Owner' : 'Member'}
                    </Badge>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Pending Join Requests</h2>
          </div>
          <div className={styles.requestList}>
            {pendingRequests.map((req) => (
              <Card key={req.id} className={styles.requestCard}>
                <div>
                  <p className={styles.requestName}>{req.profiles?.full_name}</p>
                  <p className={styles.requestProject}>wants to join {req.teams?.projects?.title}</p>
                  {req.message && <p className={styles.requestMessage}>&ldquo;{req.message}&rdquo;</p>}
                </div>
                <Link href={`/projects/${req.teams?.id}`} className={styles.requestLink}>
                  Review <ArrowRight size={14} />
                </Link>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
