'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Plus, Pencil, Trash2, Search, Download } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import Button from '@/components/ui/Button/Button';
import Card from '@/components/ui/Card/Card';
import Input from '@/components/ui/Input/Input';
import Select from '@/components/ui/Select/Select';
import Modal from '@/components/ui/Modal/Modal';
import Badge from '@/components/ui/Badge/Badge';
import Pagination from '@/components/ui/Pagination/Pagination';
import styles from './page.module.css';

const PAGE_SIZE = 10;

export default function ProjectsClient() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const supabase = useMemo(() => createClient(), []);

  const [projects, setProjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => { setSearchDebounced(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    title: '', description: '', department_id: 'universal', min_team_size: 1, max_team_size: 5, status: 'open',
  });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let projQuery = supabase.from('projects').select('*, departments (name)', { count: 'exact' });
    if (searchDebounced) {
      projQuery = projQuery.ilike('title', `%${searchDebounced}%`);
    }
    const [projRes, deptRes] = await Promise.all([
      projQuery.order('created_at', { ascending: false }).range(from, to),
      supabase.from('departments').select('*').order('name'),
    ]);
    if (projRes.data) setProjects(projRes.data);
    if (projRes.count !== null) setTotalCount(projRes.count);
    if (deptRes.data) setDepartments(deptRes.data);
    setLoading(false);
  }, [supabase, page, searchDebounced]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) fetchData();
    });
    return () => { active = false; };
  }, [fetchData]);

  const openCreate = () => {
    setEditing(null);
    setFormData({ title: '', description: '', department_id: 'universal', min_team_size: 1, max_team_size: 5, status: 'open' });
    setShowModal(true);
  };

  const openEdit = (project) => {
    setEditing(project);
    setFormData({
      title: project.title,
      description: project.description,
      department_id: project.department_id || 'universal',
      min_team_size: project.min_team_size || 1,
      max_team_size: project.max_team_size,
      status: project.status,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.description) {
      showToast({ title: 'Missing fields', message: 'Please fill in all required fields.', variant: 'error' });
      return;
    }

    const minSize = Number(formData.min_team_size);
    const maxSize = Number(formData.max_team_size);

    if (isNaN(minSize) || minSize < 1 || minSize > 20) {
      showToast({ title: 'Validation error', message: 'Minimum team size must be between 1 and 20.', variant: 'error' });
      return;
    }
    if (isNaN(maxSize) || maxSize < 1 || maxSize > 20) {
      showToast({ title: 'Validation error', message: 'Maximum team size must be between 1 and 20.', variant: 'error' });
      return;
    }
    if (minSize > maxSize) {
      showToast({ title: 'Validation error', message: 'Minimum team size cannot exceed maximum team size.', variant: 'error' });
      return;
    }

    const deptId = formData.department_id === 'universal' || formData.department_id === '' ? null : formData.department_id;

    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase.from('projects').update({
          title: formData.title,
          description: formData.description,
          department_id: deptId,
          min_team_size: minSize,
          max_team_size: maxSize,
          status: formData.status,
        }).eq('id', editing.id);
        if (error) throw error;
        showToast({ title: 'Project updated', variant: 'success' });
      } else {
        const { error } = await supabase.from('projects').insert({
          title: formData.title,
          description: formData.description,
          department_id: deptId,
          min_team_size: minSize,
          max_team_size: maxSize,
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

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Projects ({totalCount})</h1>
        <Button onClick={openCreate} icon={Plus} size="sm">New Project</Button>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <Input id="project-search" placeholder="Search projects..." value={search} onChange={(e) => setSearch(e.target.value)} icon={Search} />
      </div>

      <div className={styles.list}>
        {projects.map((p) => (
          <Card key={p.id} className={styles.row}>
            <div className={styles.rowInfo}>
              <p className={styles.rowTitle}>{p.title}</p>
              <p className={styles.rowMeta}>
                {p.departments?.name || 'Universal (All Departments)'} · {p.min_team_size || 1} - {p.max_team_size} members
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

      {totalPages > 1 && (
        <div style={{ marginTop: '24px' }}>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}

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
            options={[
              { value: 'universal', label: 'Universal (All Departments)' },
              ...departments.map((d) => ({ value: d.id, label: d.name }))
            ]}
            value={formData.department_id}
            onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
            required
          />
          <div className={styles.formRow}>
            <Input
              id="proj-min-size"
              label="Min Team Size"
              type="number"
              value={formData.min_team_size}
              onChange={(e) => setFormData({ ...formData, min_team_size: e.target.value })}
              required
            />
            <Input
              id="proj-max-size"
              label="Max Team Size"
              type="number"
              value={formData.max_team_size}
              onChange={(e) => setFormData({ ...formData, max_team_size: e.target.value })}
              required
            />
          </div>
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
