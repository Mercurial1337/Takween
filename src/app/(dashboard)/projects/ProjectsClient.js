'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Search, Building2, Users, UsersRound } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';
import PageHeader from '@/components/layout/PageHeader/PageHeader';
import Card from '@/components/ui/Card/Card';
import Badge from '@/components/ui/Badge/Badge';
import Input from '@/components/ui/Input/Input';
import Select from '@/components/ui/Select/Select';
import Pagination from '@/components/ui/Pagination/Pagination';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import Skeleton from '@/components/ui/Skeleton/Skeleton';
import styles from './page.module.css';

const PAGE_SIZE = 9;

export default function ProjectsClient() {
  const [projects, setProjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const supabase = useMemo(() => createClient(), []);
  const debouncedSearch = useDebounce(searchQuery, 350);
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, departmentFilter]);

  const fetchProjects = useCallback(async () => {
    try {
      let query = supabase
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
        `, { count: 'exact' })
        .eq('status', 'open');

      // Server-side full-text search using ilike
      if (debouncedSearch) {
        const q = `%${debouncedSearch}%`;
        query = query.or(`title.ilike.${q},description.ilike.${q}`);
      }

      // Server-side department filter
      if (departmentFilter) {
        query = query.or(`department_id.eq.${departmentFilter},department_id.is.null`);
      }

      // Pagination
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (data) setProjects(data);
      if (count !== null) setTotalCount(count);
    } catch (err) {
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase, debouncedSearch, departmentFilter, page]);

  // Fetch departments once
  useEffect(() => {
    const fetchDepartments = async () => {
      const { data } = await supabase.from('departments').select('*').order('name');
      if (data) setDepartments(data);
    };
    fetchDepartments();
  }, [supabase]);

  // Re-fetch projects whenever search or filter changes
  useEffect(() => {
    setLoading(true);
    fetchProjects();
  }, [fetchProjects]);

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
      {projects.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No projects found"
          description={searchQuery || departmentFilter ? 'Try adjusting your filters.' : 'No projects are available right now. Check back later.'}
        />
      ) : (
        <>
        <div className={styles.grid}>
          {projects.map((project) => {
            const teamCount = project.teams?.length || 0;

            return (
              <Link key={project.id} href={`/projects/${project.id}`} className={styles.cardLink}>
                <Card hoverable className={styles.projectCard}>
                  <div className={styles.cardTop}>
                    <h3 className={styles.projectTitle}>{project.title}</h3>
                    {teamCount > 0 ? (
                      <Badge variant={teamCount >= project.max_team_size ? 'warning' : 'success'} size="sm">
                        {teamCount >= project.max_team_size ? 'Full' : 'Open'}
                      </Badge>
                    ) : (
                      <Badge variant="primary" size="sm">No Team</Badge>
                    )}
                  </div>

                  <div className={styles.deptTag}>
                    <Building2 size={12} />
                    {project.departments?.name || 'Universal (All Departments)'}
                  </div>

                  <p className={styles.projectDesc}>
                    {project.description.length > 120
                      ? project.description.slice(0, 120) + '...'
                      : project.description}
                  </p>

                  <div className={styles.cardFooter}>
                    <span className={styles.teamCount}>
                      <UsersRound size={14} />
                      {teamCount} {teamCount === 1 ? 'team' : 'teams'}
                    </span>
                    <span className={styles.memberRange}>
                      <Users size={13} />
                      {project.min_team_size || 1}–{project.max_team_size} members
                    </span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
        </>
      )}
    </div>
  );
}
