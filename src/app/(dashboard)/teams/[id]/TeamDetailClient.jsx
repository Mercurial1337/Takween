'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { createClient } from '@/lib/supabase/client';
import {
  Users, Building2, ArrowLeft, Plus, Trash2, LogOut,
  Check, X, Crown, ShieldAlert, Send, UsersRound, AlertTriangle
} from 'lucide-react';
import { Github, Linkedin, Whatsapp } from '@/components/ui/Icons/Icons';
import Card from '@/components/ui/Card/Card';
import Button from '@/components/ui/Button/Button';
import Badge from '@/components/ui/Badge/Badge';
import Avatar from '@/components/ui/Avatar/Avatar';
import Skeleton from '@/components/ui/Skeleton/Skeleton';
import Modal from '@/components/ui/Modal/Modal';
import Input from '@/components/ui/Input/Input';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import Breadcrumbs from '@/components/ui/Breadcrumbs/Breadcrumbs';
import styles from './page.module.css';

const ensureAbsoluteUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `https://${url}`;
};

const PROFILE_SELECT = `
  id, full_name, avatar_url, role,
  whatsapp_number, linkedin_url, github_url,
  department_id, departments:department_id (name),
  level_id, levels:level_id (name),
  profile_skills (skill_id, skills (name))
`;

function MemberCard({ profile, userId, roleLabel, isLeader, removable, onRemove }) {
  if (!profile) return null;

  const levelDept = [profile.levels?.name, profile.departments?.name].filter(Boolean).join(', ');
  const skills = profile.profile_skills || [];
  const hasLinks = profile.github_url || profile.linkedin_url || profile.whatsapp_number;

  return (
    <Card className={styles.memberCard}>
      <div className={styles.memberHeader}>
        <Link href={`/profile/${userId}`} className={styles.memberHeaderLink}>
          <Avatar src={profile.avatar_url} name={profile.full_name} size="lg" />
        </Link>
        <div>
          <Link href={`/profile/${userId}`} className={styles.memberNameLink}>
            <h4 className={styles.memberName}>
              {profile.full_name}
              {isLeader && <Crown size={14} className={styles.crownIcon} />}
            </h4>
          </Link>
          {levelDept && <p className={styles.memberLevel}>{levelDept}</p>}

          {/* Social Icons */}
          {hasLinks && (
            <div className={styles.socialLinks}>
              {profile.github_url && (
                <a href={ensureAbsoluteUrl(profile.github_url)} target="_blank" rel="noopener noreferrer" className={styles.socialIcon} title="GitHub">
                  <Github size={14} />
                </a>
              )}
              {profile.linkedin_url && (
                <a href={ensureAbsoluteUrl(profile.linkedin_url)} target="_blank" rel="noopener noreferrer" className={`${styles.socialIcon} ${styles.socialIconLinkedin}`} title="LinkedIn">
                  <Linkedin size={14} />
                </a>
              )}
              {profile.whatsapp_number && (
                <a href={`https://wa.me/${profile.whatsapp_number.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className={`${styles.socialIcon} ${styles.socialIconWhatsapp}`} title="WhatsApp">
                  <Whatsapp size={14} />
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Skills */}
      {skills.length > 0 && (
        <div className={styles.memberSkills}>
          {skills.map((ps, i) => (
            <Badge key={i} variant="default" size="sm">{ps.skills?.name}</Badge>
          ))}
        </div>
      )}

      {/* Owner can remove (non-owner) members */}
      {removable && (
        <div className={styles.memberActions}>
          <Button variant="danger-ghost" size="sm" onClick={() => onRemove(userId)}>
            Remove
          </Button>
        </div>
      )}
    </Card>
  );
}

function ManualMemberCard({ member }) {
  const hasLinks = member.whatsapp_number || member.linkedin_url || member.github_url;

  return (
    <Card className={styles.memberCard}>
      <div className={styles.memberHeader}>
        <Avatar name={member.full_name} size="lg" />
        <div>
          <h4 className={styles.memberName}>{member.full_name}</h4>
          <p className={styles.memberLevel}>{member.notes || 'Not registered'}</p>
          {hasLinks && (
            <div className={styles.socialLinks}>
              {member.github_url && (
                <a href={ensureAbsoluteUrl(member.github_url)} target="_blank" rel="noopener noreferrer" className={styles.socialIcon} title="GitHub">
                  <Github size={14} />
                </a>
              )}
              {member.linkedin_url && (
                <a href={ensureAbsoluteUrl(member.linkedin_url)} target="_blank" rel="noopener noreferrer" className={`${styles.socialIcon} ${styles.socialIconLinkedin}`} title="LinkedIn">
                  <Linkedin size={14} />
                </a>
              )}
              {member.whatsapp_number && (
                <a href={`https://wa.me/${member.whatsapp_number.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className={`${styles.socialIcon} ${styles.socialIconWhatsapp}`} title="WhatsApp">
                  <Whatsapp size={14} />
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function TeamDetailClient({ id }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  // Data
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [manualMembers, setManualMembers] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinMessage, setJoinMessage] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Track if initial fetch has run
  const didFetch = useRef(false);

  // Merge state
  const [userOwnedTeam, setUserOwnedTeam] = useState(null);
  const [userTeamMembersCount, setUserTeamMembersCount] = useState(0);
  const [pendingOutgoingMerge, setPendingOutgoingMerge] = useState(null);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeMessage, setMergeMessage] = useState('');

  const fetchTeamData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Team details + owner profile
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select(`
          *,
          projects (id, title, max_team_size),
          departments (id, name),
          profiles:owner_id (${PROFILE_SELECT})
        `)
        .eq('id', id)
        .single();

      if (teamError) throw teamError;
      setTeam(teamData);

      const ownerId = teamData.owner_id;

      // 2 + 3. Parallel fetch members, manual members, and (optionally) join requests
      const queries = [
        supabase
          .from('team_members')
          .select(`*, profiles:user_id (${PROFILE_SELECT})`)
          .eq('team_id', id)
          .order('joined_at'),
        supabase
          .from('manual_members')
          .select('*')
          .eq('team_id', id),
      ];

      // Only fetch join requests if the current user is the team owner
      if (user?.id === ownerId) {
        queries.push(
          supabase
            .from('join_requests')
            .select(`*, profiles:user_id (${PROFILE_SELECT})`)
            .eq('team_id', id)
            .eq('status', 'pending')
        );
      }

      const results = await Promise.all(queries);

      const membersData = results[0].data || [];
      const manualData  = results[1].data || [];
      const requestData = results[2]?.data || [];

      // Filter the owner out of team_members to avoid duplication
      setMembers(membersData.filter(m => m.user_id !== ownerId));
      setManualMembers(manualData);
      setJoinRequests(requestData);

      // Fetch user's owned team in the same project
      if (user && user.id !== ownerId) {
        const { data: myTeam } = await supabase
          .from('teams')
          .select('id, owner_id')
          .eq('project_id', teamData.project_id)
          .eq('owner_id', user.id)
          .maybeSingle();

        if (myTeam) {
          setUserOwnedTeam(myTeam);

          // Get counts for myTeam
          const { count: regCount } = await supabase.from('team_members').select('*', { count: 'exact', head: true }).eq('team_id', myTeam.id);
          const { count: manCount } = await supabase.from('manual_members').select('*', { count: 'exact', head: true }).eq('team_id', myTeam.id);
          setUserTeamMembersCount((regCount || 0) + (manCount || 0));

          // Get pending outgoing merge
          const { data: outgoingMerge } = await supabase
            .from('team_merge_requests')
            .select('id, target_team_id, status')
            .eq('source_team_id', myTeam.id)
            .eq('status', 'pending')
            .maybeSingle();
          setPendingOutgoingMerge(outgoingMerge || null);
        } else {
          setUserOwnedTeam(null);
          setPendingOutgoingMerge(null);
        }
      }

    } catch (err) {
      console.error('Team fetch error:', err);
      showToast({ title: 'Error', message: 'Failed to load team details.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [id, supabase, user, showToast]);

  useEffect(() => {
    if (!didFetch.current) {
      didFetch.current = true;
      fetchTeamData();
    }
  }, [fetchTeamData]);

  const ownerId      = team?.owner_id;
  const ownerProfile = team?.profiles;
  const isOwner      = Boolean(user && ownerId && user.id === ownerId);
  const isMember     = isOwner || members.some(m => m.user_id === user?.id);
  const totalSize    = 1 + members.length + manualMembers.length;
  const maxSize      = team?.projects?.max_team_size;
  const isFull       = maxSize ? totalSize >= maxSize : false;
  const teamDisplayName = `${ownerProfile?.full_name || 'Unknown'}'s Team`;

  const handleJoinRequest = async () => {
    if (!user) {
      return showToast({ title: 'Login Required', message: 'Please log in to join teams.', type: 'error' });
    }
    if (!joinMessage.trim()) {
      return showToast({ title: 'Error', message: 'Please provide a message.', type: 'error' });
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('join_requests').insert({
        team_id: id,
        user_id: user.id,
        message: joinMessage.trim(),
        status: 'pending',
      });
      if (error) throw error;

      showToast({ title: 'Success', message: 'Join request sent successfully.', type: 'success' });
      setShowJoinModal(false);
      setJoinMessage('');
      fetchTeamData();
    } catch (err) {
      console.error(err);
      showToast({ title: 'Error', message: 'Failed to send request.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRespondToRequest = async (requestId, action) => {
    try {
      const { error } = await supabase
        .from('join_requests')
        .update({ status: action })
        .eq('id', requestId);
      if (error) throw error;

      if (action === 'accepted') {
        const req = joinRequests.find(r => r.id === requestId);
        if (req) {
          await supabase.from('team_members').insert({
            team_id: id,
            user_id: req.user_id,
            role: 'member',
          });
        }
      }

      showToast({ title: 'Done', message: `Request ${action}.`, type: 'success' });
      fetchTeamData();
    } catch (err) {
      console.error(err);
      showToast({ title: 'Error', message: 'Failed to process request.', type: 'error' });
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!confirm('Are you sure you want to remove this member?')) return;
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .match({ team_id: id, user_id: userId });
      if (error) throw error;
      showToast({ title: 'Success', message: 'Member removed.', type: 'success' });
      fetchTeamData();
    } catch (err) {
      console.error(err);
      showToast({ title: 'Error', message: 'Failed to remove member.', type: 'error' });
    }
  };

  const handleLeaveTeam = async () => {
    if (!confirm('Are you sure you want to leave this team?')) return;
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .match({ team_id: id, user_id: user.id });
      if (error) throw error;
      showToast({ title: 'Success', message: 'You have left the team.', type: 'success' });
      router.push(`/projects/${team.project_id}`);
    } catch (err) {
      console.error(err);
      showToast({ title: 'Error', message: 'Failed to leave team.', type: 'error' });
    }
  };

  const handleDeleteTeam = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('teams').delete().eq('id', id);
      if (error) throw error;
      showToast({ title: 'Success', message: 'Team deleted.', type: 'success' });
      router.push(`/projects/${team.project_id}`);
    } catch (err) {
      console.error(err);
      showToast({ title: 'Error', message: 'Failed to delete team.', type: 'error' });
      setIsSubmitting(false);
    }
  };

  const handleSendMergeRequest = async () => {
    if (!user || !userOwnedTeam || !team) return;

    if (pendingOutgoingMerge) {
      showToast({ title: 'Request pending', message: 'You already have a pending merge request.', variant: 'warning' });
      return;
    }

    const combinedSize = userTeamMembersCount + totalSize;
    if (maxSize && combinedSize > maxSize) {
      showToast({ title: 'Team too large', message: `Combined size (${combinedSize}) exceeds the limit (${maxSize}).`, variant: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('team_merge_requests').insert({
        source_team_id: userOwnedTeam.id,
        target_team_id: team.id,
        message: mergeMessage || null,
      });

      if (error) {
        if (error.message?.includes('duplicate') || error.code === '23505') {
          throw new Error('A pending merge request already exists.');
        }
        throw error;
      }

      // Notify target owner
      if (team.owner_id) {
        await supabase.from('notifications').insert({
          user_id: team.owner_id,
          type: 'merge_received',
          title: 'Team join request received',
          body: `${user.user_metadata?.full_name || 'Someone'}'s team wants to join your team for ${team.projects?.title}.`,
          metadata: { source_team_id: userOwnedTeam.id, target_team_id: team.id },
        });

        if (ownerProfile?.email) {
          try {
            await fetch('/api/email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'merge_received',
                recipientId: team.owner_id,
                recipientName: ownerProfile.full_name,
                actorName: user.user_metadata?.full_name || 'Someone',
                projectName: team.projects?.title,
                message: mergeMessage || null,
                sourceMemberCount: userTeamMembersCount,
              }),
            });
          } catch (e) {
             console.error('Email error:', e);
          }
        }
      }

      showToast({ title: 'Request sent', message: `Merge request sent to ${ownerProfile?.full_name}.`, type: 'success' });
      setShowMergeModal(false);
      setMergeMessage('');
      fetchTeamData();
    } catch (err) {
      console.error(err);
      showToast({ title: 'Cannot send request', message: err.message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <Skeleton variant="text" width="120px" height="20px" />
        <Skeleton variant="rectangular" height="160px" style={{ marginTop: 16 }} />
        <Skeleton variant="rectangular" height="200px" style={{ marginTop: 24 }} />
      </div>
    );
  }

  if (!team) {
    return (
      <div className={styles.page}>
        <EmptyState
          icon={Users}
          title="Team not found"
          description="This team may have been deleted or you may not have access."
          action={{ label: 'Go back', onClick: () => router.back() }}
        />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Breadcrumbs */}
      <Breadcrumbs items={[
        { href: '/projects', label: 'Projects' },
        { href: `/projects/${team.project_id}`, label: team.projects?.title || 'Project' },
        { href: `/teams/${id}`, label: teamDisplayName },
      ]} />

      {/* Team Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>{teamDisplayName}</h1>
          <div className={styles.meta}>
            <Badge variant={team.status === 'recruiting' ? 'success' : 'secondary'}>
              {team.status === 'recruiting' ? 'Recruiting' : 'Closed'}
            </Badge>
            {team.departments && (
              <span className={styles.metaItem}>
                <Building2 size={14} />
                {team.departments.name}
              </span>
            )}
            <span className={styles.metaItem}>
              <Users size={14} />
              {totalSize}{maxSize ? ` / ${maxSize}` : ''} members
            </span>
          </div>
          {team.description && <p className={styles.description}>{team.description}</p>}
        </div>

        <div className={styles.actions}>
          {userOwnedTeam && !isOwner && !isFull && team.status !== 'closed' && (
             pendingOutgoingMerge?.target_team_id === team.id ? (
               <Badge variant="default">Request Pending</Badge>
             ) : (
               <Button
                 icon={UsersRound}
                 variant="outline"
                 disabled={!!pendingOutgoingMerge}
                 onClick={() => setShowMergeModal(true)}
                 title={pendingOutgoingMerge ? 'You have a pending request elsewhere' : 'Join as a team'}
               >
                 Join as Team
               </Button>
             )
          )}
          {!isMember && !userOwnedTeam && !isFull && team.status === 'recruiting' && (
            <Button icon={Plus} onClick={() => setShowJoinModal(true)}>
              Request to Join
            </Button>
          )}
          {isMember && !isOwner && (
            <Button variant="outline" icon={LogOut} onClick={handleLeaveTeam}>
              Leave Team
            </Button>
          )}
          {isOwner && (
            <Button variant="outline" icon={Trash2} onClick={() => setShowDeleteModal(true)}
              style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)' }}>
              Delete Team
            </Button>
          )}
        </div>
      </div>

      {/* Members Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            Team Members ({totalSize})
          </h2>
        </div>

        <div className={styles.membersGrid}>
          {/* Owner */}
          <MemberCard
            profile={ownerProfile}
            userId={ownerId}
            roleLabel="Team Leader"
            isLeader
            removable={false}
            onRemove={handleRemoveMember}
          />

          {/* Registered members */}
          {members.map(m => (
            <MemberCard
              key={m.id}
              profile={m.profiles}
              userId={m.user_id}
              roleLabel="Member"
              isLeader={false}
              removable={isOwner}
              onRemove={handleRemoveMember}
            />
          ))}

          {/* Manual members */}
          {manualMembers.map(m => (
            <ManualMemberCard key={m.id} member={m} />
          ))}
        </div>
      </div>

      {/* Pending Join Requests (owner only) */}
      {isOwner && joinRequests.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              Pending Join Requests ({joinRequests.length})
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {joinRequests.map(req => (
              <div key={req.id} className={styles.requestRow}>
                <div className={styles.requestUserInfo}>
                  <Avatar src={req.profiles?.avatar_url} name={req.profiles?.full_name} size="sm" />
                  <div>
                    <p className={styles.requestUserName}>{req.profiles?.full_name}</p>
                    {req.message && <p className={styles.requestMessage}>{req.message}</p>}
                  </div>
                </div>
                <div className={styles.requestActions}>
                  <Button size="sm" icon={Check} onClick={() => handleRespondToRequest(req.id, 'accepted')}>
                    Accept
                  </Button>
                  <Button size="sm" variant="outline" icon={X}
                    onClick={() => handleRespondToRequest(req.id, 'rejected')}
                    style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)' }}>
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Join Request Modal */}
      <Modal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} title="Request to Join">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', margin: 0 }}>
            Introduce yourself to the team leader.
          </p>
          <Input
            id="join-message"
            label="Message"
            placeholder="Hi, I'd like to join because..."
            value={joinMessage}
            onChange={(e) => setJoinMessage(e.target.value)}
            icon={Send}
            required
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
            <Button variant="ghost" onClick={() => setShowJoinModal(false)}>Cancel</Button>
            <Button onClick={handleJoinRequest} loading={isSubmitting}>Send Request</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Team Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Team">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', color: 'var(--color-error)' }}>
            <ShieldAlert size={20} />
            <strong>This action cannot be undone.</strong>
          </div>
          <p style={{ margin: 0 }}>
            All members will be removed and the team will be permanently deleted.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
            <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleDeleteTeam} loading={isSubmitting}>Delete Team</Button>
          </div>
        </div>
      </Modal>

      {/* Merge Request Modal */}
      <Modal isOpen={showMergeModal} onClose={() => { setShowMergeModal(false); setMergeMessage(''); }} title="Request to Join as Team">
        {team && userOwnedTeam && (() => {
          const combinedSize = userTeamMembersCount + totalSize;
          const exceedsLimit = maxSize ? combinedSize > maxSize : false;

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                By sending this request, you are asking <strong>{ownerProfile?.full_name}</strong> to accept all your team members into their team.
                If accepted, your team will be dissolved and all members will be transferred.
              </p>

              {/* Capacity breakdown */}
              <div style={{ backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                  <span>Your team members</span>
                  <Badge variant="primary" size="sm">{userTeamMembersCount}</Badge>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                  <span>Their team members</span>
                  <Badge variant="primary" size="sm">{totalSize}</Badge>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 'var(--space-sm)', borderTop: '1px solid var(--color-border-light)', fontWeight: 'var(--font-semibold)' }}>
                  <span>Combined total</span>
                  <Badge variant={exceedsLimit ? 'error' : 'success'} size="sm">
                    {combinedSize} {maxSize ? `/ ${maxSize}` : ''}
                  </Badge>
                </div>
              </div>

              {exceedsLimit && (
                <div style={{ display: 'flex', gap: 'var(--space-sm)', padding: 'var(--space-sm)', backgroundColor: 'var(--color-error-bg)', color: 'var(--color-error)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)' }}>
                  <AlertTriangle size={16} style={{ marginTop: 2, flexShrink: 0 }} />
                  <span>Combined team size exceeds the project limit. This request cannot be sent.</span>
                </div>
              )}

              <Input
                id="merge-message"
                label="Message (optional)"
                placeholder="e.g., We have complementary skills..."
                value={mergeMessage}
                onChange={(e) => setMergeMessage(e.target.value)}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
                <Button variant="ghost" onClick={() => setShowMergeModal(false)}>Cancel</Button>
                <Button onClick={handleSendMergeRequest} loading={isSubmitting} disabled={exceedsLimit} icon={UsersRound}>
                  Send Request
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>

    </div>
  );
}
