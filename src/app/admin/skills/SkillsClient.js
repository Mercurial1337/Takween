'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Plus, Trash2, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { logAdminAction } from '@/lib/supabase/audit';
import Button from '@/components/ui/Button/Button';
import Card from '@/components/ui/Card/Card';
import Input from '@/components/ui/Input/Input';
import Modal from '@/components/ui/Modal/Modal';
import Badge from '@/components/ui/Badge/Badge';
import Pagination from '@/components/ui/Pagination/Pagination';
import styles from '../projects/page.module.css';

const PAGE_SIZE = 10;

export default function SkillsClient() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const supabase = useMemo(() => createClient(), []);
  
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
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

    let query = supabase.from('skills').select('*', { count: 'exact' });
    if (searchDebounced) {
      query = query.ilike('name', `%${searchDebounced}%`);
    }
    const { data, count } = await query.order('name').range(from, to);
      
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

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const { data } = await supabase.from('skills').insert({ name: name.trim(), is_predefined: true }).select().single();
      showToast({ title: 'Skill added', variant: 'success' });
      if (data && user) {
        logAdminAction({ adminId: user.id, action: 'create', entityType: 'skill', entityId: data.id, details: { name: name.trim() }, supabase });
      }
      setShowModal(false);
      setName('');
      fetchData();
    } catch (err) {
      showToast({ title: 'Error', message: err.message, variant: 'error' });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this skill?')) return;
    const item = items.find((i) => i.id === id);
    await supabase.from('skills').delete().eq('id', id);
    if (user) {
      logAdminAction({ adminId: user.id, action: 'delete', entityType: 'skill', entityId: id, details: { name: item?.name }, supabase });
    }
    showToast({ title: 'Skill deleted', variant: 'success' });
    fetchData();
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Skills ({totalCount})</h1>
        <Button onClick={() => { setName(''); setShowModal(true); }} icon={Plus} size="sm">New Skill</Button>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <Input id="skill-search" placeholder="Search skills..." value={search} onChange={(e) => setSearch(e.target.value)} icon={Search} />
      </div>

      <div className={styles.list}>
        {items.map((item) => (
          <Card key={item.id} className={styles.row}>
            <div className={styles.rowInfo}>
              <p className={styles.rowTitle}>
                {item.name}
                {item.is_predefined && <Badge variant="primary" size="sm" style={{ marginLeft: 8 }}>Predefined</Badge>}
              </p>
            </div>
            <div className={styles.rowActions}>
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

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Skill"
        footer={<div className={styles.modalFooter}><Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button><Button onClick={handleCreate} loading={saving}>Create</Button></div>}>
        <Input id="skill-name" label="Skill Name" value={name} onChange={(e) => setName(e.target.value)} required />
      </Modal>
    </div>
  );
}
