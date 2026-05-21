'use client';

import { useEffect, useState, useMemo } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import Button from '@/components/ui/Button/Button';
import Card from '@/components/ui/Card/Card';
import Input from '@/components/ui/Input/Input';
import Modal from '@/components/ui/Modal/Modal';
import styles from '../projects/page.module.css';

export default function AdminDepartmentsPage() {
  const { showToast } = useToast();
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    const { data } = await supabase.from('departments').select('*').order('name');
    if (data) setItems(data);
  }, [supabase]);

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
      } else {
        await supabase.from('departments').insert({ name: name.trim() });
        showToast({ title: 'Department created', variant: 'success' });
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      showToast({ title: 'Error', message: err.message, variant: 'error' });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this department?')) return;
    await supabase.from('departments').delete().eq('id', id);
    showToast({ title: 'Department deleted', variant: 'success' });
    fetchData();
  };

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Departments</h1>
        <Button onClick={openCreate} icon={Plus} size="sm">New Department</Button>
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
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Department' : 'New Department'}
        footer={<div className={styles.modalFooter}><Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button><Button onClick={handleSave} loading={saving}>{editing ? 'Save' : 'Create'}</Button></div>}>
        <Input id="dept-name" label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
      </Modal>
    </div>
  );
}
