'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Users, UserPlus, Trash2, Save, Check, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import Card from '@/components/ui/Card/Card';
import Button from '@/components/ui/Button/Button';
import Badge from '@/components/ui/Badge/Badge';
import Input from '@/components/ui/Input/Input';
import Select from '@/components/ui/Select/Select';
import Modal from '@/components/ui/Modal/Modal';
import Avatar from '@/components/ui/Avatar/Avatar';
import Skeleton from '@/components/ui/Skeleton/Skeleton';
import { formatRelativeTime } from '@/lib/utils';
import styles from '../../projects/page.module.css';

export default function TeamManageClient({ id }) {
  const router = useRouter();
  const { showToast } = useToast();
  const supabase = useMemo(() => createClient(), []);

  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [manualMembers, setManualMembers] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Edit state
  const [status, setStatus] = useState('recruiting');
  const [ownerId, setOwnerId] = useState('');

  // Add member modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addType, setAddType] = useState('registered');
  const [searchEmail, setSearchEmail] = useState('');
  const [foundUser, setFoundUser] = useState(null);
  const [manualName, setManualName] = useState('');
  const [manualWhatsapp, setManualWhatsapp] = useState('');
  const [manualNotes, setManualNotes] = useState('');

  // Edit manual member modal
  const [showEditManualModal, setShowEditManualModal] = useState(false);
  const [editingManual, setEditingManual] = useState(null);
  const [editManualName, setEditManualName] = useState('');
  const [editManualWhatsapp, setEditManualWhatsapp] = useState('');
  const [editManualNotes, setEditManualNotes] = useState('');

  // Edit registered member modal
  const [showEditMemberModal, setShowEditMemberModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [editMemberRole, setEditMemberRole] = useState('member');

  const fetchTeam = useCallback(async () => {
    setLoading(true);
    try {
      const { data: t, error } = await supabase
        .from('teams')
        .select(`*, projects(id, title, department_id, departments(name)), profiles:owner_id(id, full_name, email, avatar_url)`)
        .eq('id', id)
        .single();
      if (error) throw error;
      setTeam(t);
      setStatus(t.status);
      setOwnerId(t.owner_id);

      const [membersRes, manualRes, requestsRes] = await Promise.all([
        supabase.from('team_members').select('*, profiles:user_id(id, full_name, email, avatar_url)').eq('team_id', id),
        supabase.from('manual_members').select('*').eq('team_id', id),
        supabase.from('join_requests').select('*, profiles:user_id(id, full_name, email, avatar_url)').eq('team_id', id).eq('status', 'pending'),
      ]);
      setMembers(membersRes.data || []);
      setManualMembers(manualRes.data || []);
      setJoinRequests(requestsRes.data || []);
    } catch (err) {
      showToast({ title: 'Error', message: err.message, variant: 'error' });
      router.push('/admin/teams');
    } finally {
      setLoading(false);
    }
  }, [supabase, id, showToast, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTeam();
  }, [fetchTeam]);

  // --- Team Attribute Actions ---
  const handleSaveAttributes = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('teams').update({ status, owner_id: ownerId }).eq('id', id);
      if (error) throw error;
      showToast({ title: 'Team updated', variant: 'success' });
      fetchTeam();
    } catch (err) {
      showToast({ title: 'Error', message: err.message, variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (!confirm('Are you sure you want to delete this team? This cannot be undone.')) return;
    try {
      const notifications = members.filter(m => m.user_id).map(m => ({
        user_id: m.user_id, type: 'team_deleted',
        title: 'Team deleted by administrator',
        body: `The team for project "${team.projects?.title}" has been deleted by an administrator.`,
        metadata: {},
      }));
      if (notifications.length > 0) await supabase.from('notifications').insert(notifications);
      const { error } = await supabase.from('teams').delete().eq('id', id);
      if (error) throw error;
      showToast({ title: 'Team deleted', variant: 'success' });
      router.push('/admin/teams');
    } catch (err) {
      showToast({ title: 'Error', message: err.message, variant: 'error' });
    }
  };

  // --- Member Actions ---
  const handleRemoveMember = async (memberId, memberName) => {
    if (!confirm(`Remove ${memberName} from this team?`)) return;
    try {
      const { error } = await supabase.from('team_members').delete().eq('id', memberId);
      if (error) throw error;
      showToast({ title: 'Member removed', variant: 'success' });
      fetchTeam();
    } catch (err) {
      showToast({ title: 'Error', message: err.message, variant: 'error' });
    }
  };

  const handleRemoveManualMember = async (memberId, memberName) => {
    if (!confirm(`Remove ${memberName} from this team?`)) return;
    try {
      const { error } = await supabase.from('manual_members').delete().eq('id', memberId);
      if (error) throw error;
      showToast({ title: 'Manual member removed', variant: 'success' });
      fetchTeam();
    } catch (err) {
      showToast({ title: 'Error', message: err.message, variant: 'error' });
    }
  };

  // --- Search & Add ---
  const handleSearchUser = async () => {
    if (!searchEmail.trim()) return;
    const { data } = await supabase.from('profiles').select('id, full_name, email, avatar_url').ilike('email', `%${searchEmail.trim()}%`).limit(1).maybeSingle();
    if (data) { setFoundUser(data); } else {
      setFoundUser(null);
      showToast({ title: 'Not found', message: 'No user with that email.', variant: 'error' });
    }
  };

  const handleAddRegistered = async () => {
    if (!foundUser) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('team_members').insert({ team_id: id, user_id: foundUser.id, role: 'member' });
      if (error) throw error;
      showToast({ title: 'Member added', variant: 'success' });
      setShowAddModal(false); setFoundUser(null); setSearchEmail('');
      fetchTeam();
    } catch (err) {
      showToast({ title: 'Error', message: err.message, variant: 'error' });
    } finally { setSaving(false); }
  };

  const handleAddManual = async () => {
    if (!manualName.trim()) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('manual_members').insert({
        team_id: id, full_name: manualName.trim(),
        whatsapp_number: manualWhatsapp.trim() || null, notes: manualNotes.trim() || null,
        added_by: user?.id || null,
      });
      if (error) throw error;
      showToast({ title: 'Manual member added', variant: 'success' });
      setShowAddModal(false); setManualName(''); setManualWhatsapp(''); setManualNotes('');
      fetchTeam();
    } catch (err) {
      showToast({ title: 'Error', message: err.message, variant: 'error' });
    } finally { setSaving(false); }
  };

  // --- Edit Member ---
  const openEditMember = (m) => {
    setEditingMember(m);
    setEditMemberRole(m.role);
    setShowEditMemberModal(true);
  };

  const handleSaveMemberRole = async () => {
    if (!editingMember) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('team_members').update({ role: editMemberRole }).eq('id', editingMember.id);
      if (error) throw error;
      showToast({ title: 'Member role updated', variant: 'success' });
      setShowEditMemberModal(false);
      fetchTeam();
    } catch (err) {
      showToast({ title: 'Error', message: err.message, variant: 'error' });
    } finally { setSaving(false); }
  };

  const openEditManual = (m) => {
    setEditingManual(m);
    setEditManualName(m.full_name);
    setEditManualWhatsapp(m.whatsapp_number || '');
    setEditManualNotes(m.notes || '');
    setShowEditManualModal(true);
  };

  const handleSaveManualEdit = async () => {
    if (!editingManual || !editManualName.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('manual_members').update({
        full_name: editManualName.trim(),
        whatsapp_number: editManualWhatsapp.trim() || null,
        notes: editManualNotes.trim() || null,
      }).eq('id', editingManual.id);
      if (error) throw error;
      showToast({ title: 'Manual member updated', variant: 'success' });
      setShowEditManualModal(false);
      fetchTeam();
    } catch (err) {
      showToast({ title: 'Error', message: err.message, variant: 'error' });
    } finally { setSaving(false); }
  };

  // --- Join Request Actions ---
  const handleRequest = async (requestId, action, userName) => {
    try {
      const { error } = await supabase.from('join_requests').update({ status: action }).eq('id', requestId);
      if (error) throw error;
      if (action === 'accepted') {
        const req = joinRequests.find(r => r.id === requestId);
        if (req) {
          await supabase.from('team_members').insert({ team_id: id, user_id: req.user_id, role: 'member' });
        }
      }
      showToast({ title: `Request ${action}`, message: `${userName}'s request has been ${action}.`, variant: 'success' });
      fetchTeam();
    } catch (err) {
      showToast({ title: 'Error', message: err.message, variant: 'error' });
    }
  };

  if (loading) {
    return (
      <div>
        <Skeleton variant="rectangular" height="40px" style={{ marginBottom: '24px', maxWidth: '200px' }} />
        <Skeleton variant="rectangular" height="300px" />
      </div>
    );
  }

  if (!team) return null;

  const ownerOptions = members.filter(m => m.profiles).map(m => ({ value: m.user_id, label: `${m.profiles.full_name} (${m.profiles.email})` }));

  return (
    <div>
      {/* Back Button */}
      <div style={{ marginBottom: '24px' }}>
        <Button variant="ghost" onClick={() => router.push('/admin/teams')} icon={ArrowLeft} style={{ padding: '0 8px' }}>
          Back to Teams
        </Button>
      </div>

      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Manage Team: {team.projects?.title || 'Unknown'}</h1>
      </div>

      {/* Team Attributes */}
      <Card style={{ padding: '24px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', marginBottom: '16px' }}>Team Details</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Project</p>
            <p style={{ fontWeight: 600 }}>{team.projects?.title}</p>
          </div>
          <div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Department</p>
            <p style={{ fontWeight: 600 }}>{team.projects?.departments?.name || 'N/A'}</p>
          </div>
          <div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Created</p>
            <p>{formatRelativeTime(team.created_at)}</p>
          </div>
          <div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Current Owner</p>
            <p style={{ fontWeight: 600 }}>{team.profiles?.full_name}</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <div style={{ minWidth: '200px' }}>
            <Select id="team-status" label="Status" options={[
              { value: 'recruiting', label: 'Recruiting' },
              { value: 'closed', label: 'Closed' },
            ]} value={status} onChange={(e) => setStatus(e.target.value)} />
          </div>
          {ownerOptions.length > 0 && (
            <div style={{ minWidth: '280px' }}>
              <Select id="team-owner" label="Transfer Ownership" options={ownerOptions} value={ownerId} onChange={(e) => setOwnerId(e.target.value)} />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button icon={Save} onClick={handleSaveAttributes} loading={saving}>Save Changes</Button>
          <Button variant="outline" icon={Trash2} onClick={handleDeleteTeam}
            style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)' }}>
            Delete Team
          </Button>
        </div>
      </Card>

      {/* Registered Members */}
      <Card style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)' }}>
            Registered Members ({members.length})
          </h2>
          <Button size="sm" icon={UserPlus} onClick={() => { setAddType('registered'); setShowAddModal(true); setFoundUser(null); setSearchEmail(''); }}>
            Add Member
          </Button>
        </div>
        {members.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', padding: '16px 0' }}>No registered members.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {members.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Avatar src={m.profiles?.avatar_url} name={m.profiles?.full_name} size="sm" />
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '14px' }}>{m.profiles?.full_name}</p>
                    <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{m.profiles?.email}</p>
                  </div>
                  <Badge variant={m.role === 'owner' ? 'primary' : 'default'} size="sm">{m.role}</Badge>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button className={styles.iconBtn} onClick={() => openEditMember(m)} title="Edit role">
                    <Save size={14} />
                  </button>
                  <button className={styles.iconBtn} onClick={() => handleRemoveMember(m.id, m.profiles?.full_name)}
                    title="Remove" style={{ color: 'var(--color-error)' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Manual Members */}
      <Card style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)' }}>
            Manual Members ({manualMembers.length})
          </h2>
          <Button size="sm" icon={UserPlus} onClick={() => { setAddType('manual'); setShowAddModal(true); setManualName(''); setManualWhatsapp(''); setManualNotes(''); }}>
            Add Manual
          </Button>
        </div>
        {manualMembers.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', padding: '16px 0' }}>No manual members.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {manualMembers.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '14px' }}>{m.full_name}</p>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    {m.whatsapp_number || 'No WhatsApp'}{m.notes ? ` · ${m.notes}` : ''}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button className={styles.iconBtn} onClick={() => openEditManual(m)} title="Edit">
                    <Save size={14} />
                  </button>
                  <button className={styles.iconBtn} onClick={() => handleRemoveManualMember(m.id, m.full_name)}
                    title="Remove" style={{ color: 'var(--color-error)' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Pending Join Requests */}
      <Card style={{ padding: '24px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', marginBottom: '16px' }}>
          Pending Join Requests ({joinRequests.length})
        </h2>
        {joinRequests.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', padding: '16px 0' }}>No pending requests.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {joinRequests.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Avatar src={r.profiles?.avatar_url} name={r.profiles?.full_name} size="sm" />
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '14px' }}>{r.profiles?.full_name}</p>
                    <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      {r.profiles?.email} · {formatRelativeTime(r.created_at)}
                    </p>
                    {r.message && <p style={{ fontSize: '12px', marginTop: '4px' }}>{r.message}</p>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <Button size="sm" icon={Check} onClick={() => handleRequest(r.id, 'accepted', r.profiles?.full_name)}>Accept</Button>
                  <Button size="sm" variant="outline" icon={X} onClick={() => handleRequest(r.id, 'rejected', r.profiles?.full_name)}
                    style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)' }}>Reject</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Add Member Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)}
        title={addType === 'registered' ? 'Add Registered Member' : 'Add Manual Member'}
        footer={
          <div className={styles.modalFooter}>
            <Button variant="ghost" onClick={() => setShowAddModal(false)}>Cancel</Button>
            {addType === 'registered'
              ? <Button onClick={handleAddRegistered} loading={saving} disabled={!foundUser}>Add Member</Button>
              : <Button onClick={handleAddManual} loading={saving}>Add Manual</Button>}
          </div>
        }>
        {addType === 'registered' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1 }}>
                <Input id="search-email" label="Search by email" value={searchEmail} onChange={(e) => setSearchEmail(e.target.value)} placeholder="user@email.com" />
              </div>
              <Button onClick={handleSearchUser} style={{ alignSelf: 'flex-end' }}>Search</Button>
            </div>
            {foundUser && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-success)' }}>
                <Avatar src={foundUser.avatar_url} name={foundUser.full_name} size="sm" />
                <div>
                  <p style={{ fontWeight: 600 }}>{foundUser.full_name}</p>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{foundUser.email}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Input id="manual-name" label="Full Name" value={manualName} onChange={(e) => setManualName(e.target.value)} required />
            <Input id="manual-whatsapp" label="WhatsApp Number" value={manualWhatsapp} onChange={(e) => setManualWhatsapp(e.target.value)} />
            <Input id="manual-notes" label="Notes" value={manualNotes} onChange={(e) => setManualNotes(e.target.value)} />
          </div>
        )}
      </Modal>

      {/* Edit Registered Member Modal */}
      <Modal isOpen={showEditMemberModal} onClose={() => setShowEditMemberModal(false)} title="Edit Member Role"
        footer={
          <div className={styles.modalFooter}>
            <Button variant="ghost" onClick={() => setShowEditMemberModal(false)}>Cancel</Button>
            <Button onClick={handleSaveMemberRole} loading={saving}>Save</Button>
          </div>
        }>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {editingMember?.profiles && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <Avatar src={editingMember.profiles.avatar_url} name={editingMember.profiles.full_name} size="sm" />
              <p style={{ fontWeight: 600 }}>{editingMember.profiles.full_name}</p>
            </div>
          )}
          <Select id="member-role" label="Role" options={[
            { value: 'member', label: 'Member' },
            { value: 'owner', label: 'Owner' },
          ]} value={editMemberRole} onChange={(e) => setEditMemberRole(e.target.value)} />
        </div>
      </Modal>

      {/* Edit Manual Member Modal */}
      <Modal isOpen={showEditManualModal} onClose={() => setShowEditManualModal(false)} title="Edit Manual Member"
        footer={
          <div className={styles.modalFooter}>
            <Button variant="ghost" onClick={() => setShowEditManualModal(false)}>Cancel</Button>
            <Button onClick={handleSaveManualEdit} loading={saving}>Save</Button>
          </div>
        }>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Input id="edit-manual-name" label="Full Name" value={editManualName} onChange={(e) => setEditManualName(e.target.value)} required />
          <Input id="edit-manual-whatsapp" label="WhatsApp Number" value={editManualWhatsapp} onChange={(e) => setEditManualWhatsapp(e.target.value)} />
          <Input id="edit-manual-notes" label="Notes" value={editManualNotes} onChange={(e) => setEditManualNotes(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}
