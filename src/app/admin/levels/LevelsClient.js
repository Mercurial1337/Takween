'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { logAdminAction } from '@/lib/supabase/audit';
import Button from '@/components/ui/Button/Button';
import Card from '@/components/ui/Card/Card';
import Input from '@/components/ui/Input/Input';
import Modal from '@/components/ui/Modal/Modal';
import styles from '../projects/page.module.css';

export default function LevelsClient() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    const { data } = await supabase.from('levels').select('*').order('sort_order');
    if (data) setItems(data);
  }, [supabase]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) fetchData();
    });
    return () => { active = false; };
  }, [fetchData]);

  const openCreate = () => { setEditing(null); setName(''); setSortOrder(items.length); setShowModal(true); };
  const openEdit = (item) => { setEditing(item); setName(item.name); setSortOrder(item.sort_order); setShowModal(true); };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await supabase.from('levels').update({ name: name.trim(), sort_order: Number(sortOrder) }).eq('id', editing.id);
        showToast({ title: 'Level updated', variant: 'success' });
        if (user) logAdminAction({ adminId: user.id, action: 'update', entityType: 'level', entityId: editing.id, details: { name: name.trim(), sort_order: Number(sortOrder) }, supabase });
      } else {
        const { data } = await supabase.from('levels').insert({ name: name.trim(), sort_order: Number(sortOrder) }).select().single();
        showToast({ title: 'Level created', variant: 'success' });
        if (data && user) logAdminAction({ adminId: user.id, action: 'create', entityType: 'level', entityId: data.id, details: { name: name.trim(), sort_order: Number(sortOrder) }, supabase });
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

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Academic Levels</h1>
        <Button onClick={openCreate} icon={Plus} size="sm">New Level</Button>
      </div>
      <div className={styles.list}>
        {items.map((item) => (
          <Card key={item.id} className={styles.row}>
            <div className={styles.rowInfo}>
              <p className={styles.rowTitle}>{item.name}</p>
              <p className={styles.rowMeta}>Sort order: {item.sort_order}</p>
            </div>
            <div className={styles.rowActions}>
              <button className={styles.iconBtn} onClick={() => openEdit(item)}><Pencil size={16} /></button>
              <button className={styles.iconBtn} onClick={() => handleDelete(item.id)}><Trash2 size={16} /></button>
            </div>
          </Card>
        ))}
      </div>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Level' : 'New Level'}
        footer={<div className={styles.modalFooter}><Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button><Button onClick={handleSave} loading={saving}>{editing ? 'Save' : 'Create'}</Button></div>}>
        <div className={styles.form}>
          <Input id="level-name" label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input id="level-order" label="Sort Order" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}
