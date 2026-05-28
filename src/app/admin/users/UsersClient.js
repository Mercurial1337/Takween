'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Search, Download, ShieldCheck, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import Card from '@/components/ui/Card/Card';
import Input from '@/components/ui/Input/Input';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import Pagination from '@/components/ui/Pagination/Pagination';
import Avatar from '@/components/ui/Avatar/Avatar';
import { formatRelativeTime } from '@/lib/utils';
import styles from '../projects/page.module.css';

const PAGE_SIZE = 10;

function downloadCSV(data, filename) {
  const headers = ['Name', 'Email', 'Role', 'WhatsApp', 'Joined'];
  const rows = data.map(u => [
    u.full_name,
    u.email,
    u.role,
    u.whatsapp_number || '',
    new Date(u.created_at).toLocaleDateString(),
  ]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function UsersClient() {
  const { showToast } = useToast();
  const supabase = useMemo(() => createClient(), []);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('profiles')
        .select('id, full_name, email, role, avatar_url, whatsapp_number, created_at', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (searchDebounced) {
        query = query.or(`full_name.ilike.%${searchDebounced}%,email.ilike.%${searchDebounced}%`);
      }

      const { data, count, error } = await query.range(from, to);
      if (error) throw error;
      setUsers(data || []);
      if (count !== null) setTotalCount(count);
    } catch (err) {
      showToast({ title: 'Error', message: err.message, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [supabase, showToast, page, searchDebounced]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUsers();
  }, [fetchUsers]);

  const toggleRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'student' : 'admin';
    const action = newRole === 'admin' ? 'promote to Admin' : 'demote to Student';
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);
      if (error) throw error;
      showToast({ title: 'Role Updated', message: `User ${action}d.`, variant: 'success' });
      fetchUsers();
    } catch (err) {
      showToast({ title: 'Error', message: err.message, variant: 'error' });
    }
  };

  const handleExport = async () => {
    try {
      let query = supabase.from('profiles').select('full_name, email, role, whatsapp_number, created_at').order('created_at', { ascending: false });
      if (searchDebounced) {
        query = query.or(`full_name.ilike.%${searchDebounced}%,email.ilike.%${searchDebounced}%`);
      }
      const { data } = await query;
      if (data) downloadCSV(data, 'takween_users.csv');
    } catch (err) {
      showToast({ title: 'Export failed', message: err.message, variant: 'error' });
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Users ({totalCount})</h1>
        <Button variant="ghost" size="sm" icon={Download} onClick={handleExport}>Export CSV</Button>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <Input
          id="user-search"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={Search}
        />
      </div>

      {loading && users.length === 0 ? (
        <Card className={styles.row} style={{ justifyContent: 'center', padding: '40px' }}>Loading users...</Card>
      ) : users.length === 0 ? (
        <Card className={styles.row} style={{ justifyContent: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
          No users found.
        </Card>
      ) : (
        <>
          <div className={styles.list}>
            {users.map((u) => (
              <Card key={u.id} className={styles.row}>
                <div className={styles.rowInfo}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Avatar src={u.avatar_url} name={u.full_name} size="sm" />
                    <div>
                      <p className={styles.rowTitle}>{u.full_name}</p>
                      <p className={styles.rowMeta}>{u.email} · Joined {formatRelativeTime(u.created_at)}</p>
                    </div>
                  </div>
                </div>
                <div className={styles.rowActions}>
                  <Badge variant={u.role === 'admin' ? 'error' : 'default'} size="sm">{u.role}</Badge>
                  <button
                    className={styles.iconBtn}
                    onClick={() => toggleRole(u.id, u.role)}
                    title={u.role === 'admin' ? 'Demote to Student' : 'Promote to Admin'}
                  >
                    <ShieldCheck size={16} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
          {totalPages > 1 && (
            <div style={{ marginTop: '16px' }}>
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
