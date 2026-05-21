'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Filter, Users, Building2, ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import PageHeader from '@/components/layout/PageHeader/PageHeader';
import Card from '@/components/ui/Card/Card';
import Badge from '@/components/ui/Badge/Badge';
import Input from '@/components/ui/Input/Input';
import Select from '@/components/ui/Select/Select';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import Skeleton from '@/components/ui/Skeleton/Skeleton';
import styles from './page.module.css';

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projectsRes, deptsRes] = await Promise.all([
          supabase
            .from('projects')
            .select(`
              *,
              departments (name),
              teams (
                id,
                status,
                owner_id,
                team_members (count),
                manual_members (count)
              )
            `)
            .eq('status', 'open')
            .order('created_at', { ascending: false }),
          supabase.from('departments').select('*').order('name'),
        ]);

        if (projectsRes.data) setProjects(projectsRes.data);
        if (deptsRes.data) setDepartments(deptsRes.data);
      } catch (err) {
        console.error('Error fetching projects:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [supabase]);

  const filteredProjects = useMemo(() => {
    let result = projects;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }

    if (departmentFilter) {
      result = result.filter((p) => p.department_id === departmentFilter);
    }

    return result;
  }, [projects, searchQuery, departmentFilter]);

  if (loading) {
    return (
      <div>
        <Skeleton variant="text" width="300px" height="32px" />
        <Skeleton variant="text" width="200px" height="20px" />
        <div className={styles.skeletonGrid}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} variant="rectangular" height="200px" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Projects"
        description="Browse available projects and find a team to join."
      />

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchWrapper}>
          <Input
            id="project-search"
            icon={Search}
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className={styles.filterWrapper}>
          <Select
            id="dept-filter"
            placeholder="All Departments"
            options={departments.map((d) => ({ value: d.id, label: d.name }))}
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
          />
        </div>
        {(searchQuery || departmentFilter) && (
          <button
            className={styles.clearBtn}
            onClick={() => { setSearchQuery(''); setDepartmentFilter(''); }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Results */}
      {filteredProjects.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No projects found"
          description={searchQuery || departmentFilter ? 'Try adjusting your filters.' : 'No projects are available right now. Check back later.'}
        />
      ) : (
        <div className={styles.grid}>
          {filteredProjects.map((project) => {
            const team = project.teams?.[0];
            const memberCount = team
              ? (team.team_members?.[0]?.count || 0) + (team.manual_members?.[0]?.count || 0)
              : 0;
            const isFull = memberCount >= project.max_team_size;

            return (
              <Link key={project.id} href={`/projects/${project.id}`} className={styles.cardLink}>
                <Card hoverable className={styles.projectCard}>
                  <div className={styles.cardTop}>
                    <h3 className={styles.projectTitle}>{project.title}</h3>
                    {team ? (
                      <Badge variant={isFull ? 'warning' : 'success'} size="sm">
                        {isFull ? 'Full' : 'Open'}
                      </Badge>
                    ) : (
                      <Badge variant="primary" size="sm">No Team</Badge>
                    )}
                  </div>

                  {project.departments?.name && (
                    <div className={styles.deptTag}>
                      <Building2 size={12} />
                      {project.departments.name}
                    </div>
                  )}

                  <p className={styles.projectDesc}>
                    {project.description.length > 120
                      ? project.description.slice(0, 120) + '...'
                      : project.description}
                  </p>

                  <div className={styles.cardFooter}>
                    <span className={styles.memberCount}>
                      <Users size={14} />
                      {memberCount}/{project.max_team_size} members
                    </span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
