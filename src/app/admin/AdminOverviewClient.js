'use client';

import { useEffect, useState, useMemo } from 'react';
import { Users, FolderOpen, Building2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Card from '@/components/ui/Card/Card';
import Badge from '@/components/ui/Badge/Badge';
import Skeleton from '@/components/ui/Skeleton/Skeleton';
import { formatRelativeTime } from '@/lib/utils';
import styles from './page.module.css';

export default function AdminOverviewClient() {
  const [stats, setStats] = useState({});
  const [activities, setActivities] = useState([]);
  const [topDepartments, setTopDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Stats counts
        const [students, projects, teams, departments] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
          supabase.from('projects').select('*', { count: 'exact', head: true }),
          supabase.from('teams').select('*', { count: 'exact', head: true }),
          supabase.from('departments').select('*', { count: 'exact', head: true }),
        ]);

        setStats({
          students: students.count || 0,
          projects: projects.count || 0,
          teams: teams.count || 0,
          departments: departments.count || 0,
        });

        // Fetch recent activities from multiple sources with small limits each
        const [recentProfiles, recentTeams, recentProjects, recentFeedback, recentJoinRequests] = await Promise.all([
          supabase.from('profiles').select('id, full_name, created_at').order('created_at', { ascending: false }).limit(5),
          supabase.from('teams').select('id, created_at, projects(title), profiles:owner_id(full_name)').order('created_at', { ascending: false }).limit(5),
          supabase.from('projects').select('id, title, created_at').order('created_at', { ascending: false }).limit(5),
          supabase.from('feedback').select('id, subject, type, created_at, profiles:user_id(full_name)').order('created_at', { ascending: false }).limit(5),
          supabase.from('join_requests').select('id, status, created_at, profiles:user_id(full_name), teams(projects(title))').order('created_at', { ascending: false }).limit(5),
        ]);

        if (recentProfiles.error) console.error('Error fetching recent profiles:', recentProfiles.error);
        if (recentTeams.error) console.error('Error fetching recent teams:', recentTeams.error);
        if (recentProjects.error) console.error('Error fetching recent projects:', recentProjects.error);
        if (recentFeedback.error) console.error('Error fetching recent feedback:', recentFeedback.error);
        if (recentJoinRequests.error) console.error('Error fetching recent join requests:', recentJoinRequests.error);

        // Merge into a unified activity feed
        const merged = [
          ...(recentProfiles.data || []).map(p => ({
            id: `prof-${p.id}`,
            title: 'New User Registered',
            description: `${p.full_name || 'A user'} joined Takween`,
            created_at: p.created_at,
          })),
          ...(recentTeams.data || []).map(t => ({
            id: `team-${t.id}`,
            title: 'Team Created',
            description: `${t.profiles?.full_name || 'A user'} created a team for "${t.projects?.title || 'a project'}"`,
            created_at: t.created_at,
          })),
          ...(recentProjects.data || []).map(p => ({
            id: `proj-${p.id}`,
            title: 'Project Added',
            description: `Project "${p.title}" was created`,
            created_at: p.created_at,
          })),
          ...(recentFeedback.data || []).map(f => ({
            id: `fb-${f.id}`,
            title: `${f.type} Feedback Submitted`,
            description: `${f.profiles?.full_name || 'A user'} submitted: "${f.subject}"`,
            created_at: f.created_at,
          })),
          ...(recentJoinRequests.data || []).map(jr => ({
            id: `jr-${jr.id}`,
            title: 'Join Request',
            description: `${jr.profiles?.full_name || 'A user'} requested to join "${jr.teams?.projects?.title || 'a team'}"`,
            created_at: jr.created_at,
          })),
        ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 15);

        setActivities(merged);

        // Top departments by team count
        const { data: allTeams } = await supabase
          .from('teams')
          .select('projects(department_id, departments(name))');
        
        if (allTeams) {
          const deptCounts = {};
          allTeams.forEach(t => {
            const deptName = t.projects?.departments?.name;
            if (deptName) {
              deptCounts[deptName] = (deptCounts[deptName] || 0) + 1;
            }
          });
          const sorted = Object.entries(deptCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));
          setTopDepartments(sorted);
        }

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [supabase]);

  if (loading) {
    return <Skeleton variant="rectangular" height="200px" count={2} />;
  }

  const statCards = [
    { label: 'Students', value: stats.students, icon: Users, color: 'var(--color-surface)' },
    { label: 'Projects', value: stats.projects, icon: FolderOpen, color: 'var(--color-alt-surface)' },
    { label: 'Teams', value: stats.teams, icon: Users, color: 'var(--color-success-bg)' },
    { label: 'Departments', value: stats.departments, icon: Building2, color: 'var(--color-warning-bg)' },
  ];

  return (
    <div>
      <h1 className={styles.title}>Admin Overview</h1>
      
      <div className={styles.grid}>
        {statCards.map((stat) => (
          <Card key={stat.label} className={styles.statCard}>
            <div className={styles.statIcon} style={{ backgroundColor: stat.color }}>
              <stat.icon size={24} style={{ color: 'var(--color-primary)' }} />
            </div>
            <p className={styles.statValue}>{stat.value}</p>
            <p className={styles.statLabel}>{stat.label}</p>
          </Card>
        ))}
      </div>

      <div className={`${styles.overviewSections} ${topDepartments.length > 0 ? styles.withSidebar : ''}`}>
        <div className={styles.overviewMain}>
          <h2 className={styles.sectionTitle}>Recent Activities</h2>
          <div className={styles.activityList}>
            {activities.length > 0 ? activities.map((activity) => (
              <Card key={activity.id} className={styles.activityItem}>
                <div className={styles.activityInfo}>
                  <p className={styles.activityTitle}>{activity.title}</p>
                  <p className={styles.activityDesc}>{activity.description}</p>
                </div>
                <div className={styles.activityTime}>
                  {formatRelativeTime(activity.created_at)}
                </div>
              </Card>
            )) : (
              <p className={styles.emptyActivity}>No recent activities found.</p>
            )}
          </div>
        </div>

        {topDepartments.length > 0 && (
          <div className={styles.overviewSide}>
            <h2 className={styles.sectionTitle}>Top Departments by Teams</h2>
            <div className={styles.activityList}>
              {topDepartments.map((dept) => (
                <Card key={dept.name} className={styles.activityItem}>
                  <span className={styles.activityTitle}>{dept.name}</span>
                  <Badge variant="primary" size="sm">{dept.count} team{dept.count !== 1 ? 's' : ''}</Badge>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
