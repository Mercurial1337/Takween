'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Trash2, Mail, ShieldCheck, UserPlus, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import Button from '@/components/ui/Button/Button';
import Card from '@/components/ui/Card/Card';
import Input from '@/components/ui/Input/Input';
import Modal from '@/components/ui/Modal/Modal';
import Pagination from '@/components/ui/Pagination/Pagination';
import { formatRelativeTime } from '@/lib/utils';
import styles from '../projects/page.module.css';

const PAGE_SIZE = 10;

export default function InvitesClient() {
  const { showToast } = useToast();
  const supabase = useMemo(() => createClient(), []);

  const [invites, setInvites] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => { setSearchDebounced(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchInvites = useCallback(async () => {
    setLoading(true);
    try {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('admin_invites')
        .select('*', { count: 'exact' });

      if (searchDebounced) {
        query = query.ilike('email', `%${searchDebounced}%`);
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      setInvites(data || []);
      if (count !== null) setTotalCount(count);
    } catch (err) {
      console.error('Error fetching invites:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase, page, searchDebounced]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchInvites();
  }, [fetchInvites]);

  const handleOpenModal = () => {
    setEmail('');
    setShowModal(true);
  };

  const handleSaveInvite = async () => {
    if (!email.trim() || !email.includes('@')) {
      showToast({ title: 'Invalid Email', message: 'Please enter a valid email address.', variant: 'error' });
      return;
    }

    setSaving(true);
    try {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, role, full_name')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();

      if (existingProfile) {
        if (existingProfile.role === 'admin') {
          showToast({ title: 'Already Admin', message: `${existingProfile.full_name} is already an admin.`, variant: 'info' });
          setShowModal(false);
          return;
        }

        const confirmElevate = confirm(
          `${existingProfile.full_name} is already registered as a student. Do you want to directly promote them to an Admin?`
        );

        if (confirmElevate) {
          const { error: updateErr } = await supabase
            .from('profiles')
            .update({ role: 'admin' })
            .eq('id', existingProfile.id);

          if (updateErr) throw updateErr;
          showToast({ title: 'User Promoted', message: `${existingProfile.full_name} is now an admin.`, variant: 'success' });
          setShowModal(false);
        }
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      const { error: inviteErr } = await supabase
        .from('admin_invites')
        .insert({
          email: email.trim().toLowerCase(),
          invited_by: user?.id || null
        });

      if (inviteErr) throw inviteErr;

      showToast({ title: 'Admin Invited', message: `Pending invite created for ${email.trim()}.`, variant: 'success' });
      setShowModal(false);
      fetchInvites();
    } catch (err) {
      showToast({ title: 'Error', message: err.message, variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteInvite = async (invitedEmail) => {
    if (!confirm(`Revoke invite for ${invitedEmail}?`)) return;

    try {
      const { error } = await supabase
        .from('admin_invites')
        .delete()
        .eq('email', invitedEmail);

      if (error) throw error;
      showToast({ title: 'Invite Revoked', variant: 'info' });
      fetchInvites();
    } catch (err) {
      showToast({ title: 'Error', message: err.message, variant: 'error' });
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Admin Invites ({totalCount})</h1>
        <Button onClick={handleOpenModal} icon={UserPlus} size="sm">Invite Admin</Button>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <Input id="invite-search" placeholder="Search by email..." value={search} onChange={(e) => setSearch(e.target.value)} icon={Search} />
      </div>

      {loading && invites.length === 0 ? (
        <div className={styles.list}>
          <Card className={styles.row} style={{ height: '70px' }}>Loading invites...</Card>
        </div>
      ) : invites.length === 0 ? (
        <div className={styles.list}>
          <Card className={styles.row} style={{ justifyContent: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
            No pending admin invites.
          </Card>
        </div>
      ) : (
        <>
          <div className={styles.list}>
            {invites.map((invite) => (
              <Card key={invite.email} className={styles.row}>
                <div className={styles.rowInfo}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Mail size={16} className={styles.rowIcon} style={{ color: 'var(--color-primary)' }} />
                    <p className={styles.rowTitle}>{invite.email}</p>
                  </div>
                  <p className={styles.rowMeta}>Invited {formatRelativeTime(invite.created_at)}</p>
                </div>
                <div className={styles.rowActions}>
                  <button
                    className={styles.iconBtn}
                    onClick={() => handleDeleteInvite(invite.email)}
                    title="Revoke invite"
                  >
                    <Trash2 size={16} />
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

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Invite New Admin"
        footer={
          <div className={styles.modalFooter}>
            <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSaveInvite} loading={saving} icon={ShieldCheck}>Invite</Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)' }}>
            Enter the email address of the person you want to invite. When they register with this email, they will automatically be granted the Admin role.
          </p>
          <Input
            id="invite-email"
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@university.edu"
            required
          />
        </div>
      </Modal>
    </div>
  );
}
