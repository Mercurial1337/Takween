'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Trash2, Eye, Users, FileText, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import Card from '@/components/ui/Card/Card';
import Button from '@/components/ui/Button/Button';
import Badge from '@/components/ui/Badge/Badge';
import { formatRelativeTime } from '@/lib/utils';
import styles from '../projects/page.module.css';

export default function AdminTeamsPage() {
  const { showToast } = useToast();
  const supabase = useMemo(() => createClient(), []);

  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTeams = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select(`
          id,
          status,
          created_at,
          projects (id, title),
          profiles:owner_id (id, full_name, email),
          team_members (id, user_id),
          manual_members (id)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTeams(data || []);
    } catch (err) {
      console.error('Error fetching teams:', err);
      showToast({ title: 'Error', message: err.message, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [supabase, showToast]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) fetchTeams();
    });
    return () => { active = false; };
  }, [fetchTeams]);

  const handleDeleteTeam = async (teamId, projectTitle, members) => {
    if (!confirm(`Are you sure you want to delete this team for "${projectTitle}"? This cannot be undone.`)) return;

    try {
      // 1. Notify all registered members
      const notifications = members
        .filter((m) => m.user_id)
        .map((m) => ({
          user_id: m.user_id,
          type: 'team_deleted',
          title: 'Team deleted by administrator',
          body: `The team for project "${projectTitle}" has been deleted by an administrator.`,
          metadata: {},
        }));

      if (notifications.length > 0) {
        await supabase.from('notifications').insert(notifications);
      }

      // 2. Delete team from DB
      const { error } = await supabase.from('teams').delete().eq('id', teamId);
      if (error) throw error;

      showToast({ title: 'Team deleted', variant: 'success' });
      fetchTeams();
    } catch (err) {
      showToast({ title: 'Error', message: err.message, variant: 'error' });
    }
  };

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Teams Overview</h1>
      </div>

      {loading ? (
        <div className={styles.list}>
          <Card className={styles.row} style={{ height: '70px' }}>Loading teams...</Card>
        </div>
      ) : teams.length === 0 ? (
        <div className={styles.list}>
          <Card className={styles.row} style={{ justifyContent: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
            No teams have been created yet.
          </Card>
        </div>
      ) : (
        <div className={styles.list}>
          {teams.map((team) => {
            const projectTitle = team.projects?.title || 'Unknown Project';
            const ownerName = team.profiles?.full_name || 'Unknown Owner';
            const registeredCount = team.team_members?.length || 0;
            const manualCount = team.manual_members?.length || 0;
            const totalMembers = registeredCount + manualCount;

            return (
              <Card key={team.id} className={styles.row}>
                <div className={styles.rowInfo}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                    <FileText size={16} style={{ color: 'var(--color-primary)' }} />
                    <p className={styles.rowTitle} style={{ fontSize: 'var(--text-base)' }}>
                      {projectTitle}
                    </p>
                    <Badge variant={team.status === 'recruiting' ? 'success' : 'default'} size="sm">
                      {team.status === 'recruiting' ? 'Recruiting' : 'Closed'}
                    </Badge>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <p className={styles.rowMeta} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <User size={12} /> Owner: {ownerName}
                    </p>
                    <p className={styles.rowMeta} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Users size={12} /> Members: {totalMembers} ({registeredCount} registered, {manualCount} manual)
                    </p>
                    <p className={styles.rowMeta}>
                      Created {formatRelativeTime(team.created_at)}
                    </p>
                  </div>
                </div>
                <div className={styles.rowActions}>
                  {team.projects?.id && (
                    <Link href={`/projects/${team.projects.id}`}>
                      <button className={styles.iconBtn} title="View team page">
                        <Eye size={16} />
                      </button>
                    </Link>
                  )}
                  <button
                    className={styles.iconBtn}
                    onClick={() => handleDeleteTeam(team.id, projectTitle, team.team_members || [])}
                    title="Delete team"
                    style={{ color: 'var(--color-error)' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
