'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { logAdminAction } from '@/lib/supabase/audit';
import Button from '@/components/ui/Button/Button';
import Card from '@/components/ui/Card/Card';
import Input from '@/components/ui/Input/Input';
import Modal from '@/components/ui/Modal/Modal';
import Pagination from '@/components/ui/Pagination/Pagination';
import styles from '../projects/page.module.css';

const PAGE_SIZE = 10;

export default function LevelsClient() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState('');
  const [sortOrder, setSortOrder] = useState('');
  const [requiresDepartment, setRequiresDepartment] = useState(false);

  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => { setSearchDebounced(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchData = useCallback(async () => {
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase.from('levels').select('*', { count: 'exact' });
    if (searchDebounced) {
      query = query.ilike('name', `%${searchDebounced}%`);
    }
    const { data, count } = await query.order('sort_order').range(from, to);
    if (data) setItems(data);
    if (count !== null) setTotalCount(count);
  }, [supabase, page, searchDebounced]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) fetchData();
    });
    return () => { active = false; };
  }, [fetchData]);

  const openCreate = () => { setEditing(null); setName(''); setSortOrder(items.length); setRequiresDepartment(false); setShowModal(true); };
  const openEdit = (level) => { setEditing(level); setName(level.name); setSortOrder(level.sort_order); setRequiresDepartment(!!level.requires_department); setShowModal(true); };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await supabase.from('levels').update({ 
          name: name.trim(), 
          sort_order: Number(sortOrder),
          requires_department: requiresDepartment
        }).eq('id', editing.id);
        showToast({ title: 'Level updated', variant: 'success' });
        if (user) logAdminAction({ adminId: user.id, action: 'update', entityType: 'level', entityId: editing.id, details: { name: name.trim(), sort_order: Number(sortOrder), requires_department: requiresDepartment }, supabase });
      } else {
        const { data } = await supabase.from('levels').insert({ 
          name: name.trim(), 
          sort_order: Number(sortOrder),
          requires_department: requiresDepartment
        }).select().single();
        showToast({ title: 'Level created', variant: 'success' });
        if (data && user) logAdminAction({ adminId: user.id, action: 'create', entityType: 'level', entityId: data.id, details: { name: name.trim(), sort_order: Number(sortOrder), requires_department: requiresDepartment }, supabase });
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      showToast({ title: 'Error', message: err.message, variant: 'error' });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this level?')) return;
    const item = items.find((i) => i.id === id);
    await supabase.from('levels').delete().eq('id', id);
    if (user) logAdminAction({ adminId: user.id, action: 'delete', entityType: 'level', entityId: id, details: { name: item?.name }, supabase });
    showToast({ title: 'Level deleted', variant: 'success' });
    fetchData();
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Academic Levels ({totalCount})</h1>
        <Button onClick={openCreate} icon={Plus} size="sm">New Level</Button>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <Input id="level-search" placeholder="Search levels..." value={search} onChange={(e) => setSearch(e.target.value)} icon={Search} />
      </div>

      <div className={styles.list}>
        {items.map((item) => (
          <Card key={item.id} className={styles.row}>
            <div className={styles.rowInfo}>
              <p className={styles.rowTitle}>
                {item.name}
                {item.requires_department && <span className={styles.tag} style={{ marginLeft: '8px', fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', background: 'var(--bg-accent)', color: 'var(--text-accent)' }}>Requires Dept</span>}
              </p>
              <p className={styles.rowMeta}>Sort order: {item.sort_order}</p>
            </div>
            <div className={styles.rowActions}>
              <button className={styles.iconBtn} onClick={() => openEdit(item)}><Pencil size={16} /></button>
              <button className={styles.iconBtn} onClick={() => handleDelete(item.id)}><Trash2 size={16} /></button>
            </div>
          </Card>
        ))}
      </div>

      {totalPages > 1 && (
        <div style={{ marginTop: '16px' }}>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Level' : 'New Level'}
        footer={<div className={styles.modalFooter}><Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button><Button onClick={handleSave} loading={saving}>{editing ? 'Save' : 'Create'}</Button></div>}>
        <div className={styles.form}>
          <Input id="level-name" label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input id="level-order" label="Sort Order" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', marginBottom: '8px' }}>
            <input 
              type="checkbox" 
              id="requires-department" 
              checked={requiresDepartment}
              onChange={(e) => setRequiresDepartment(e.target.checked)}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="requires-department" style={{ cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Requires Department Selection
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
}
