'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import PageHeader from '@/components/layout/PageHeader/PageHeader';
import Badge from '@/components/ui/Badge/Badge';
import Avatar from '@/components/ui/Avatar/Avatar';
import Skeleton from '@/components/ui/Skeleton/Skeleton';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import Pagination from '@/components/ui/Pagination/Pagination';
import Card from '@/components/ui/Card/Card';
import Input from '@/components/ui/Input/Input';
import Select from '@/components/ui/Select/Select';
import Button from '@/components/ui/Button/Button';
import { MessageSquare, ArrowRight, Search, CheckCircle, Trash2 } from 'lucide-react';
import styles from './page.module.css';
import { formatRelativeTime } from '@/lib/utils';

const PAGE_SIZE = 10;

export default function AdminFeedbackClient() {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [selected, setSelected] = useState(new Set());
  
  const { showToast } = useToast();
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => { setSearchDebounced(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    try {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('feedback')
        .select(`*, profiles (full_name, avatar_url)`, { count: 'exact' });

      if (searchDebounced) query = query.ilike('subject', `%${searchDebounced}%`);
      if (filterStatus !== 'all') query = query.eq('status', filterStatus);
      if (filterType !== 'all') query = query.eq('type', filterType);

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      setFeedback(data || []);
      if (count !== null) setTotalCount(count);
      setSelected(new Set());
    } catch (err) {
      console.error(err);
      showToast({ title: 'Error', message: 'Failed to load feedback.', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [supabase, showToast, page, searchDebounced, filterStatus, filterType]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchFeedback();
  }, [fetchFeedback]);

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === feedback.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(feedback.map(f => f.id)));
    }
  };

  const bulkResolve = async () => {
    if (selected.size === 0) return;
    try {
      const { error } = await supabase
        .from('feedback')
        .update({ status: 'Resolved' })
        .in('id', Array.from(selected));
      if (error) throw error;
      showToast({ title: 'Bulk Updated', message: `${selected.size} item(s) resolved.`, variant: 'success' });
      fetchFeedback();
    } catch (err) {
      showToast({ title: 'Error', message: err.message, variant: 'error' });
    }
  };

  const bulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} feedback item(s)?`)) return;
    try {
      const { error } = await supabase
        .from('feedback')
        .delete()
        .in('id', Array.from(selected));
      if (error) throw error;
      showToast({ title: 'Deleted', message: `${selected.size} item(s) deleted.`, variant: 'success' });
      fetchFeedback();
    } catch (err) {
      showToast({ title: 'Error', message: err.message, variant: 'error' });
    }
  };

  const updateStatus = async (e, id, newStatus) => {
    e.stopPropagation();
    try {
      const { error } = await supabase.from('feedback').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      setFeedback(prev => prev.map(f => f.id === id ? { ...f, status: newStatus } : f));
      showToast({ title: 'Success', message: `Marked as ${newStatus}`, variant: 'success' });
    } catch (err) {
      showToast({ title: 'Error', message: 'Failed to update status.', variant: 'error' });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'New': return 'error';
      case 'Read': return 'warning';
      case 'Resolved': return 'success';
      default: return 'primary';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'Bug': return 'error';
      case 'Feature': return 'primary';
      case 'General': return 'secondary';
      default: return 'secondary';
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (loading && feedback.length === 0) {
    return (
      <div className={styles.page}>
        <PageHeader title="User Feedback" description="Manage feedback and requests" />
        <Skeleton variant="rectangular" height="400px" />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader 
        title={`User Feedback (${totalCount})`}
        description="Review bug reports, feature requests, and general feedback." 
      />

      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <Input id="feedback-search" placeholder="Search by subject..." value={search} onChange={(e) => setSearch(e.target.value)} icon={Search} />
        </div>
        <div style={{ minWidth: '140px' }}>
          <Select id="feedback-filter-status" label="" options={[
            { value: 'all', label: 'All Status' },
            { value: 'New', label: 'New' },
            { value: 'Read', label: 'Read' },
            { value: 'Resolved', label: 'Resolved' },
          ]} value={filterStatus} onChange={handleFilterChange(setFilterStatus)} />
        </div>
        <div style={{ minWidth: '140px' }}>
          <Select id="feedback-filter-type" label="" options={[
            { value: 'all', label: 'All Types' },
            { value: 'Bug', label: 'Bug' },
            { value: 'Feature', label: 'Feature' },
            { value: 'General', label: 'General' },
          ]} value={filterType} onChange={handleFilterChange(setFilterType)} />
        </div>
      </div>

      {selected.size > 0 && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>{selected.size} selected</span>
          <Button size="sm" variant="ghost" icon={CheckCircle} onClick={bulkResolve}>Resolve Selected</Button>
          <Button size="sm" variant="ghost" icon={Trash2} onClick={bulkDelete} style={{ color: 'var(--color-error)' }}>Delete Selected</Button>
        </div>
      )}

      {feedback.length === 0 ? (
        <EmptyState 
          icon={MessageSquare} 
          title="No Feedback Found" 
          description="No feedback matches your filters." 
        />
      ) : (
        <>
          <div style={{ marginBottom: '8px' }}>
            <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
              <input type="checkbox" checked={selected.size === feedback.length && feedback.length > 0} onChange={toggleSelectAll} />
              Select all on this page
            </label>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            {feedback.map(item => (
              <Card 
                key={item.id} 
                onClick={() => router.push(`/admin/feedback/${item.id}`)}
                style={{ 
                  cursor: 'pointer', 
                  padding: '16px 20px', 
                  border: item.status === 'New' ? '1px solid var(--color-error)' : undefined
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    type="checkbox"
                    checked={selected.has(item.id)}
                    onChange={(e) => { e.stopPropagation(); toggleSelect(item.id); }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Avatar src={item.profiles?.avatar_url} name={item.profiles?.full_name} size="sm" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, fontSize: '14px' }}>{item.subject}</span>
                      <Badge variant={getTypeColor(item.type)} size="sm">{item.type}</Badge>
                      <Badge variant={getStatusColor(item.status)} size="sm">{item.status}</Badge>
                    </div>
                    <p style={{ 
                      color: 'var(--color-text-muted)', fontSize: '13px', margin: 0,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                    }}>
                      {item.profiles?.full_name || 'Anonymous'} · {formatRelativeTime(item.created_at)} · {item.message?.substring(0, 80)}...
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    {item.status !== 'Read' && item.status !== 'Resolved' && (
                      <button onClick={(e) => updateStatus(e, item.id, 'Read')}
                        style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'none', cursor: 'pointer' }}>
                        Read
                      </button>
                    )}
                    {item.status !== 'Resolved' && (
                      <button onClick={(e) => updateStatus(e, item.id, 'Resolved')}
                        style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '4px', backgroundColor: 'var(--color-success)', color: 'white', border: 'none', cursor: 'pointer' }}>
                        Resolve
                      </button>
                    )}
                  </div>
                  <ArrowRight size={14} color="var(--color-text-muted)" />
                </div>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          )}
        </>
      )}
    </div>
  );
}
