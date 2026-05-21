'use client';

import { useEffect, useState, useMemo } from 'react';
import { Users, FolderOpen, Building2, GraduationCap } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Card from '@/components/ui/Card/Card';
import Skeleton from '@/components/ui/Skeleton/Skeleton';
import styles from './page.module.css';

export default function AdminOverviewPage() {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const fetchStats = async () => {
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
      setLoading(false);
    };
    fetchStats();
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
    </div>
  );
}
