'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import Button from '@/components/ui/Button/Button';
import Card from '@/components/ui/Card/Card';
import Input from '@/components/ui/Input/Input';
import Select from '@/components/ui/Select/Select';
import Modal from '@/components/ui/Modal/Modal';
import Badge from '@/components/ui/Badge/Badge';
import styles from './page.module.css';

export default function ProjectsClient() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const supabase = useMemo(() => createClient(), []);

  const [projects, setProjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    title: '', description: '', department_id: '', max_team_size: 5, status: 'open',
  });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    const [projRes, deptRes] = await Promise.all([
      supabase.from('projects').select('*, departments (name)').order('created_at', { ascending: false }),
      supabase.from('departments').select('*').order('name'),
    ]);
    if (projRes.data) setProjects(projRes.data);
    if (deptRes.data) setDepartments(deptRes.data);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) fetchData();
    });
    return () => { active = false; };
  }, [fetchData]);

  const openCreate = () => {
    setEditing(null);
    setFormData({ title: '', description: '', department_id: '', max_team_size: 5, status: 'open' });
    setShowModal(true);
  };

  const openEdit = (project) => {
    setEditing(project);
    setFormData({
      title: project.title,
      description: project.description,
      department_id: project.department_id || '',
      max_team_size: project.max_team_size,
      status: project.status,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.description || !formData.department_id) {
      showToast({ title: 'Missing fields', message: 'Please fill in all required fields.', variant: 'error' });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase.from('projects').update({
          title: formData.title,
          description: formData.description,
          department_id: formData.department_id,
          max_team_size: Number(formData.max_team_size),
          status: formData.status,
        }).eq('id', editing.id);
        if (error) throw error;
        showToast({ title: 'Project updated', variant: 'success' });
      } else {
        const { error } = await supabase.from('projects').insert({
          title: formData.title,
          description: formData.description,
          department_id: formData.department_id,
          max_team_size: Number(formData.max_team_size),
          status: formData.status,
          created_by: user.id,
        });
        if (error) throw error;
        showToast({ title: 'Project created', variant: 'success' });
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      showToast({ title: 'Error', message: err.message, variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this project? This will also delete any associated teams.')) return;
    try {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;
      showToast({ title: 'Project deleted', variant: 'success' });
      fetchData();
    } catch (err) {
      showToast({ title: 'Error', message: err.message, variant: 'error' });
    }
  };

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Projects</h1>
        <Button onClick={openCreate} icon={Plus} size="sm">New Project</Button>
      </div>

      <div className={styles.list}>
        {projects.map((p) => (
          <Card key={p.id} className={styles.row}>
            <div className={styles.rowInfo}>
              <p className={styles.rowTitle}>{p.title}</p>
              <p className={styles.rowMeta}>
                {p.departments?.name} · Max {p.max_team_size}
              </p>
            </div>
            <div className={styles.rowActions}>
              <Badge variant={p.status === 'open' ? 'success' : 'default'} size="sm">
                {p.status}
              </Badge>
              <button className={styles.iconBtn} onClick={() => openEdit(p)} title="Edit">
                <Pencil size={16} />
              </button>
              <button className={styles.iconBtn} onClick={() => handleDelete(p.id)} title="Delete">
                <Trash2 size={16} />
              </button>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Edit Project' : 'New Project'}
        size="md"
        footer={
          <div className={styles.modalFooter}>
            <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>{editing ? 'Save' : 'Create'}</Button>
          </div>
        }
      >
        <div className={styles.form}>
          <Input
            id="proj-title"
            label="Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
          <div className={styles.textareaWrapper}>
            <label className={styles.label}>Description <span className={styles.req}>*</span></label>
            <textarea
              className={styles.textarea}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
            />
          </div>
          <Select
            id="proj-dept"
            label="Department"
            placeholder="Select department"
            options={departments.map((d) => ({ value: d.id, label: d.name }))}
            value={formData.department_id}
            onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
            required
          />
          <Input
            id="proj-size"
            label="Max Team Size"
            type="number"
            value={formData.max_team_size}
            onChange={(e) => setFormData({ ...formData, max_team_size: e.target.value })}
            required
          />
          <Select
            id="proj-status"
            label="Status"
            options={[{ value: 'open', label: 'Open' }, { value: 'closed', label: 'Closed' }]}
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          />
        </div>
      </Modal>
    </div>
  );
}
