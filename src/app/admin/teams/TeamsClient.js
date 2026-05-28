'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Users, FileText, User, Download, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import Card from '@/components/ui/Card/Card';
import Button from '@/components/ui/Button/Button';
import Badge from '@/components/ui/Badge/Badge';
import Select from '@/components/ui/Select/Select';
import Pagination from '@/components/ui/Pagination/Pagination';
import { formatRelativeTime } from '@/lib/utils';
import styles from '../projects/page.module.css';

const PAGE_SIZE = 10;

export default function TeamsClient() {
  const router = useRouter();
  const { showToast } = useToast();
  const supabase = useMemo(() => createClient(), []);

  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters and Pagination State
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [projectsList, setProjectsList] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');

  useEffect(() => {
    supabase.from('projects').select('id, title').then(({ data }) => setProjectsList(data || []));
    supabase.from('departments').select('id, name').then(({ data }) => setDepartmentsList(data || []));
  }, [supabase]);

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('teams')
        .select(`
          id,
          status,
          created_at,
          projects!inner (id, title, department_id),
          profiles:owner_id (id, full_name, email),
          team_members (id, user_id),
          manual_members (id)
        `, { count: 'exact' });

      if (selectedProject !== 'all') {
        query = query.eq('project_id', selectedProject);
      }
      if (selectedDepartment !== 'all') {
        query = query.eq('projects.department_id', selectedDepartment);
      }

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      setTeams(data || []);
      if (count !== null) setTotalCount(count);
    } catch (err) {
      console.error('Error fetching teams:', err);
      showToast({ title: 'Error', message: err.message, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [supabase, showToast, page, selectedProject, selectedDepartment]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTeams();
  }, [fetchTeams]);

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setPage(1); // Reset to first page when filtering
  };



  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const handleExport = async () => {
    try {
      const { data } = await supabase.from('teams').select('id, status, created_at, projects(title), profiles:owner_id(full_name)');
      if (data) {
        const headers = ['Project', 'Owner', 'Status', 'Created'];
        const rows = data.map(t => [t.projects?.title || '', t.profiles?.full_name || '', t.status, new Date(t.created_at).toLocaleDateString()]);
        const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'takween_teams.csv'; a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      showToast({ title: 'Export failed', message: err.message, variant: 'error' });
    }
  };

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Teams Overview ({totalCount})</h1>
        <Button variant="ghost" size="sm" icon={Download} onClick={handleExport}>Export CSV</Button>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ minWidth: '200px' }}>
          <Select
            id="filter-project"
            label="Filter by Project"
            options={[
              { value: 'all', label: 'All Projects' },
              ...projectsList.map(p => ({ value: p.id, label: p.title }))
            ]}
            value={selectedProject}
            onChange={handleFilterChange(setSelectedProject)}
          />
        </div>
        <div style={{ minWidth: '200px' }}>
          <Select
            id="filter-department"
            label="Filter by Department"
            options={[
              { value: 'all', label: 'All Departments' },
              ...departmentsList.map(d => ({ value: d.id, label: d.name }))
            ]}
            value={selectedDepartment}
            onChange={handleFilterChange(setSelectedDepartment)}
          />
        </div>
      </div>

      {loading ? (
        <div className={styles.list}>
          <Card className={styles.row} style={{ height: '70px' }}>Loading teams...</Card>
        </div>
      ) : teams.length === 0 ? (
        <div className={styles.list}>
          <Card className={styles.row} style={{ justifyContent: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
            No teams match your filters or have been created yet.
          </Card>
        </div>
      ) : (
        <>
          <div className={styles.list}>
            {teams.map((team) => {
              const projectTitle = team.projects?.title || 'Unknown Project';
              const ownerName = team.profiles?.full_name || 'Unknown Owner';
              const registeredCount = team.team_members?.length || 0;
              const manualCount = team.manual_members?.length || 0;
              const totalMembers = registeredCount + manualCount;

              return (
                <Card
                  key={team.id}
                  className={styles.row}
                  onClick={() => router.push(`/admin/teams/${team.id}`)}
                  style={{ cursor: 'pointer' }}
                >
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
                  <ChevronRight size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                </Card>
              );
            })}
          </div>
          {totalPages > 1 && (
            <div style={{ marginTop: '24px' }}>
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
