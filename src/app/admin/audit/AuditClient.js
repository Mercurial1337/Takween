'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Clock, User, FileText, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Card from '@/components/ui/Card/Card';
import Badge from '@/components/ui/Badge/Badge';
import Pagination from '@/components/ui/Pagination/Pagination';
import Skeleton from '@/components/ui/Skeleton/Skeleton';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import Input from '@/components/ui/Input/Input';
import Select from '@/components/ui/Select/Select';
import styles from './page.module.css';

const PAGE_SIZE = 20;

const ACTION_VARIANTS = {
  create: 'success',
  update: 'primary',
  delete: 'error',
};

export default function AuditClient() {
  const supabase = useMemo(() => createClient(), []);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filterAction, setFilterAction] = useState('all');
  const [filterEntity, setFilterEntity] = useState('all');
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('audit_logs')
        .select('*, profiles:admin_id (full_name, avatar_url)', { count: 'exact' });

      if (filterAction !== 'all') query = query.eq('action', filterAction);
      if (filterEntity !== 'all') query = query.eq('entity_type', filterEntity);

      const { data, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (data) setLogs(data);
      if (count !== null) setTotalCount(count);
    } catch (err) {
      console.error('Audit log fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase, page, filterAction, filterEntity]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLogs();
  }, [fetchLogs]);

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading && logs.length === 0) {
    return (
      <div>
        <h1 className={styles.title}>Audit Logs</h1>
        <div className={styles.list}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} variant="rectangular" height="72px" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Audit Logs ({totalCount})</h1>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ minWidth: '160px' }}>
          <Select
            id="audit-filter-action"
            label="Action"
            options={[
              { value: 'all', label: 'All Actions' },
              { value: 'create', label: 'Create' },
              { value: 'update', label: 'Update' },
              { value: 'delete', label: 'Delete' },
            ]}
            value={filterAction}
            onChange={handleFilterChange(setFilterAction)}
          />
        </div>
        <div style={{ minWidth: '160px' }}>
          <Select
            id="audit-filter-entity"
            label="Entity Type"
            options={[
              { value: 'all', label: 'All Entities' },
              { value: 'project', label: 'Project' },
              { value: 'department', label: 'Department' },
              { value: 'level', label: 'Level' },
              { value: 'skill', label: 'Skill' },
            ]}
            value={filterEntity}
            onChange={handleFilterChange(setFilterEntity)}
          />
        </div>
      </div>

      {logs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No audit logs"
          description="Admin actions will be logged here automatically."
        />
      ) : (
        <>
          <div className={styles.list}>
            {logs.map((log) => (
              <Card key={log.id} className={styles.logCard}>
                <div className={styles.logMain}>
                  <div className={styles.logAction}>
                    <Badge variant={ACTION_VARIANTS[log.action] || 'default'} size="sm">
                      {log.action}
                    </Badge>
                    <span className={styles.logEntity}>
                      {log.entity_type}
                    </span>
                  </div>
                  <div className={styles.logMeta}>
                    <span className={styles.logAdmin}>
                      <User size={12} />
                      {log.profiles?.full_name || 'Unknown admin'}
                    </span>
                    <span className={styles.logTime}>
                      <Clock size={12} />
                      {formatDate(log.created_at)}
                    </span>
                  </div>
                </div>
                {log.details && Object.keys(log.details).length > 0 && (
                  <div className={styles.logDetails}>
                    {Object.entries(log.details).map(([key, value]) => (
                      <span key={key} className={styles.detailChip}>
                        <strong>{key}:</strong> {String(value)}
                      </span>
                    ))}
                  </div>
                )}
              </Card>
            ))}
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
