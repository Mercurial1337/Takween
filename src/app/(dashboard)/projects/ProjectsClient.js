'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, Building2, Users, UsersRound } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';
import { useQueryState, useQueryUpdater } from '@/hooks/useQueryState';
import PageHeader from '@/components/layout/PageHeader/PageHeader';
import Card from '@/components/ui/Card/Card';
import Badge from '@/components/ui/Badge/Badge';
import Input from '@/components/ui/Input/Input';
import Select from '@/components/ui/Select/Select';
import Pagination from '@/components/ui/Pagination/Pagination';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import Skeleton from '@/components/ui/Skeleton/Skeleton';
import styles from './page.module.css';

const PAGE_SIZE = 5;

export default function ProjectsClient() {
  const searchParams = useSearchParams();
  const updateQuery = useQueryUpdater();

  const [projects, setProjects] = useState([]);
  const [featuredProject, setFeaturedProject] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const supabase = useMemo(() => createClient(), []);

  // URL-synced state
  const [departmentFilter, setDepartmentFilter] = useQueryState('dept', '');
  const [page, setPage] = useQueryState('page', '1');
  const pageNum = parseInt(page, 10) || 1;

  // Search: local state for typing, debounced value synced to URL
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const debouncedSearch = useDebounce(searchQuery, 350);
  const [prevDebouncedSearch, setPrevDebouncedSearch] = useState(debouncedSearch);

  // Sync debounced search to URL
  useEffect(() => {
    if (debouncedSearch !== prevDebouncedSearch) {
      setPrevDebouncedSearch(debouncedSearch);
      updateQuery({ q: debouncedSearch, page: '1' }, { q: '', page: '1' });
    }
  }, [debouncedSearch, prevDebouncedSearch, updateQuery]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Reset to page 1 when department filter changes
  const [prevDeptFilter, setPrevDeptFilter] = useState(departmentFilter);
  useEffect(() => {
    if (departmentFilter !== prevDeptFilter) {
      setPrevDeptFilter(departmentFilter);
      setPage('1');
    }
  }, [departmentFilter, prevDeptFilter, setPage]);

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
      const from = (pageNum - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, count } = await query
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (data) {
        // If we are on page 1 and there is no search/filter, extract the featured project
        if (pageNum === 1 && !debouncedSearch && !departmentFilter) {
          const featured = data.find(p => p.is_featured);
          if (featured) {
            setFeaturedProject(featured);
            setProjects(data.filter(p => p.id !== featured.id));
          } else {
            setFeaturedProject(null);
            setProjects(data);
          }
        } else {
          setFeaturedProject(null);
          setProjects(data);
        }
      }
      if (count !== null) {
        // We subtract 1 from totalCount if featuredProject is extracted, for accurate pagination?
        // Actually, let's keep totalCount as is.
        setTotalCount(count);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase, debouncedSearch, departmentFilter, pageNum]);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
            onClick={() => { setSearchQuery(''); updateQuery({ q: null, dept: null, page: null }); }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Results */}
      {featuredProject && (
        <Link href={`/projects/${featuredProject.id}`} className={styles.heroLink}>
          <div className={styles.heroCard}>
            <h2 className={styles.heroTitle}>
              {featuredProject.title}
              <span className={styles.heroTitleBadge}>Main Event</span>
            </h2>
            <p className={styles.heroDesc}>{featuredProject.description}</p>
            <div className={styles.heroFooter}>
              <div className={styles.heroStat}>
                <Building2 size={18} />
                {featuredProject.departments?.name || 'Universal'}
              </div>
              <div className={styles.heroStat}>
                <UsersRound size={18} />
                {featuredProject.teams?.length || 0} teams forming
              </div>
              <div className={styles.heroStat}>
                <Users size={18} />
                Up to {featuredProject.max_team_size} members per team
              </div>
            </div>
          </div>
        </Link>
      )}

      {projects.length === 0 && !featuredProject ? (
        <EmptyState
          icon={Search}
          title="No projects found"
          description={searchQuery || departmentFilter ? 'Try adjusting your filters.' : 'No projects are available right now. Check back later.'}
        />
      ) : projects.length > 0 && (
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
          currentPage={pageNum}
          totalPages={totalPages}
          onPageChange={(p) => setPage(String(p))}
        />
        </>
      )}
    </div>
  );
}
