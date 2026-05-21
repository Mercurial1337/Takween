'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import Button from '@/components/ui/Button/Button';
import Card from '@/components/ui/Card/Card';
import Input from '@/components/ui/Input/Input';
import Modal from '@/components/ui/Modal/Modal';
import Badge from '@/components/ui/Badge/Badge';
import styles from '../projects/page.module.css';

export default function AdminSkillsPage() {
  const { showToast } = useToast();
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    const { data } = await supabase.from('skills').select('*').order('name');
    if (data) setItems(data);
  }, [supabase]);

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
      await supabase.from('skills').insert({ name: name.trim(), is_predefined: true });
      showToast({ title: 'Skill added', variant: 'success' });
      setShowModal(false);
      setName('');
      fetchData();
    } catch (err) {
      showToast({ title: 'Error', message: err.message, variant: 'error' });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this skill?')) return;
    await supabase.from('skills').delete().eq('id', id);
    showToast({ title: 'Skill deleted', variant: 'success' });
    fetchData();
  };

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Skills ({items.length})</h1>
        <Button onClick={() => { setName(''); setShowModal(true); }} icon={Plus} size="sm">New Skill</Button>
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
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Skill"
        footer={<div className={styles.modalFooter}><Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button><Button onClick={handleCreate} loading={saving}>Create</Button></div>}>
        <Input id="skill-name" label="Skill Name" value={name} onChange={(e) => setName(e.target.value)} required />
      </Modal>
    </div>
  );
}
