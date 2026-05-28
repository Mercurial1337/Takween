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

export default function DepartmentsClient() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const supabase = useMemo(() => createClient(), []);
  
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  
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

    let query = supabase.from('departments').select('*', { count: 'exact' });
    if (searchDebounced) {
      query = query.ilike('name', `%${searchDebounced}%`);
    }
    const { data, count } = await query.order('name').range(from, to);
      
    if (data) setItems(data);
    if (count !== null) setTotalCount(count);
  }, [supabase, page, searchDebounced]);

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchData();
    });
  }, [fetchData]);

  const openCreate = () => { setEditing(null); setName(''); setShowModal(true); };
  const openEdit = (item) => { setEditing(item); setName(item.name); setShowModal(true); };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await supabase.from('departments').update({ name: name.trim() }).eq('id', editing.id);
        showToast({ title: 'Department updated', variant: 'success' });
        if (user) logAdminAction({ adminId: user.id, action: 'update', entityType: 'department', entityId: editing.id, details: { name: name.trim(), previousName: editing.name }, supabase });
      } else {
        const { data } = await supabase.from('departments').insert({ name: name.trim() }).select().single();
        showToast({ title: 'Department created', variant: 'success' });
        if (data && user) logAdminAction({ adminId: user.id, action: 'create', entityType: 'department', entityId: data.id, details: { name: name.trim() }, supabase });
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      showToast({ title: 'Error', message: err.message, variant: 'error' });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this department?')) return;
    const item = items.find((i) => i.id === id);
    await supabase.from('departments').delete().eq('id', id);
    if (user) logAdminAction({ adminId: user.id, action: 'delete', entityType: 'department', entityId: id, details: { name: item?.name }, supabase });
    showToast({ title: 'Department deleted', variant: 'success' });
    fetchData();
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Departments ({totalCount})</h1>
        <Button onClick={openCreate} icon={Plus} size="sm">New Department</Button>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <Input id="dept-search" placeholder="Search departments..." value={search} onChange={(e) => setSearch(e.target.value)} icon={Search} />
      </div>

      <div className={styles.list}>
        {items.map((item) => (
          <Card key={item.id} className={styles.row}>
            <div className={styles.rowInfo}>
              <p className={styles.rowTitle}>{item.name}</p>
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

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Department' : 'New Department'}
        footer={<div className={styles.modalFooter}><Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button><Button onClick={handleSave} loading={saving}>{editing ? 'Save' : 'Create'}</Button></div>}>
        <Input id="dept-name" label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
      </Modal>
    </div>
  );
}
