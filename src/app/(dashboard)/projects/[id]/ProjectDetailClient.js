'use client';

import { useEffect, useState, useMemo, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Building2, ArrowLeft, Plus, UserPlus, UserMinus,
  Crown, Trash2, LogOut, MessageSquare, Check, X
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import Card from '@/components/ui/Card/Card';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import Avatar from '@/components/ui/Avatar/Avatar';
import Modal from '@/components/ui/Modal/Modal';
import Input from '@/components/ui/Input/Input';
import Skeleton from '@/components/ui/Skeleton/Skeleton';
import styles from './page.module.css';
import Link from 'next/link';

export default function ProjectDetailClient({ id }) {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [project, setProject] = useState(null);
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [manualMembers, setManualMembers] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [userRequest, setUserRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinMessage, setJoinMessage] = useState('');
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualWhatsapp, setManualWhatsapp] = useState('');

  const isOwner = team && user && team.owner_id === user.id;
  const isMember = members.some((m) => m.user_id === user?.id);
  const totalMembers = members.length + manualMembers.length;
  const isFull = totalMembers >= (project?.max_team_size || 0);

  const fetchProject = useCallback(async () => {
    try {
      // Get project
      const { data: proj } = await supabase
        .from('projects')
        .select('*, departments (name)')
        .eq('id', id)
        .single();
      setProject(proj);

      // Get team for this project
      const { data: teamData } = await supabase
        .from('teams')
        .select('*')
        .eq('project_id', id)
        .single();

      if (teamData) {
        setTeam(teamData);
        // Get members
        const { data: memberData } = await supabase
          .from('team_members')
          .select('*, profiles:user_id (id, full_name, avatar_url, level_id, levels:level_id (name), linkedin_url, github_url, whatsapp_number, email)')
          .eq('team_id', teamData.id)
          .order('joined_at');
        if (memberData) setMembers(memberData);

        // Get manual members
        const { data: manualData } = await supabase
          .from('manual_members')
          .select('*')
          .eq('team_id', teamData.id);
        if (manualData) setManualMembers(manualData);

        // Get join requests (for owner)
        if (user) {
          const { data: reqData } = await supabase
            .from('join_requests')
            .select('*, profiles:user_id (id, full_name, avatar_url)')
            .eq('team_id', teamData.id)
            .eq('status', 'pending');
          if (reqData) setJoinRequests(reqData);

          // Check if user has a pending request
          const { data: myReq } = await supabase
            .from('join_requests')
            .select('*')
            .eq('team_id', teamData.id)
            .eq('user_id', user.id)
            .eq('status', 'pending')
            .single();
          setUserRequest(myReq);
        }
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [id, user, supabase]);

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchProject();
    });
  }, [fetchProject]);

  // Create team
  const handleCreateTeam = async () => {
    if (!user) { router.push('/login'); return; }
    setActionLoading(true);
    try {
      const { data: newTeam, error } = await supabase
        .from('teams')
        .insert({ project_id: id, owner_id: user.id })
        .select()
        .single();
      if (error) throw error;

      await supabase.from('team_members').insert({
        team_id: newTeam.id, user_id: user.id, role: 'owner',
      });

      showToast({ title: 'Team created', message: 'You are now the team owner.', variant: 'success' });
      fetchProject();
    } catch (err) {
      showToast({ title: 'Error', message: err.message, variant: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Send join request
  const handleJoinRequest = async () => {
    if (!user) { router.push('/login'); return; }
    setActionLoading(true);
    try {
      const { error } = await supabase.from('join_requests').insert({
        team_id: team.id, user_id: user.id, message: joinMessage || null,
      });
      if (error) throw error;

      // Notify team owner
      await supabase.from('notifications').insert({
        user_id: team.owner_id,
        type: 'request_received',
        title: 'New join request',
        body: `${profile?.full_name} wants to join your team for ${project.title}.`,
        metadata: { team_id: team.id, user_id: user.id },
      });

      showToast({ title: 'Request sent', message: 'The team owner will review your request.', variant: 'success' });
      setShowJoinModal(false);
      setJoinMessage('');
      fetchProject();
    } catch (err) {
      showToast({ title: 'Error', message: err.message, variant: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Accept/Reject request
  const handleRequestAction = async (requestId, action, requestUserId) => {
    setActionLoading(true);
    try {
      await supabase
        .from('join_requests')
        .update({ status: action })
        .eq('id', requestId);

      if (action === 'accepted') {
        await supabase.from('team_members').insert({
          team_id: team.id, user_id: requestUserId, role: 'member',
        });
      }

      // Notify the requester
      await supabase.from('notifications').insert({
        user_id: requestUserId,
        type: action === 'accepted' ? 'request_accepted' : 'request_rejected',
        title: action === 'accepted' ? 'Request accepted' : 'Request rejected',
        body: action === 'accepted'
          ? `You have been accepted to the team for ${project.title}.`
          : `Your request to join the team for ${project.title} was declined.`,
        metadata: { team_id: team.id },
      });

      showToast({
        title: action === 'accepted' ? 'Member added' : 'Request rejected',
        variant: action === 'accepted' ? 'success' : 'info',
      });
      fetchProject();
    } catch (err) {
      showToast({ title: 'Error', message: err.message, variant: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Add manual member
  const handleAddManual = async () => {
    setActionLoading(true);
    try {
      const { error } = await supabase.from('manual_members').insert({
        team_id: team.id,
        full_name: manualName,
        whatsapp_number: manualWhatsapp || null,
        added_by: user.id,
      });
      if (error) throw error;
      showToast({ title: 'Member added', variant: 'success' });
      setShowManualModal(false);
      setManualName('');
      setManualWhatsapp('');
      fetchProject();
    } catch (err) {
      showToast({ title: 'Error', message: err.message, variant: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Remove member
  const handleRemoveMember = async (memberId, memberUserId, isManual = false) => {
    setActionLoading(true);
    try {
      if (isManual) {
        await supabase.from('manual_members').delete().eq('id', memberId);
      } else {
        await supabase.from('team_members').delete().eq('id', memberId);
        await supabase.from('notifications').insert({
          user_id: memberUserId,
          type: 'member_removed',
          title: 'Removed from team',
          body: `You have been removed from the team for ${project.title}.`,
          metadata: { team_id: team.id },
        });
      }
      showToast({ title: 'Member removed', variant: 'success' });
      fetchProject();
    } catch (err) {
      showToast({ title: 'Error', message: err.message, variant: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Leave team
  const handleLeaveTeam = async () => {
    setActionLoading(true);
    try {
      const myMembership = members.find((m) => m.user_id === user.id);
      if (!myMembership) return;

      await supabase.from('team_members').delete().eq('id', myMembership.id);

      // If owner is leaving, transfer ownership
      if (isOwner) {
        const nextOwner = members
          .filter((m) => m.user_id !== user.id)
          .sort((a, b) => new Date(a.joined_at) - new Date(b.joined_at))[0];

        if (nextOwner) {
          await supabase.from('teams').update({ owner_id: nextOwner.user_id }).eq('id', team.id);
          await supabase.from('team_members').update({ role: 'owner' }).eq('id', nextOwner.id);
          await supabase.from('notifications').insert({
            user_id: nextOwner.user_id,
            type: 'ownership_transferred',
            title: 'You are now the team owner',
            body: `Ownership of the team for ${project.title} has been transferred to you.`,
            metadata: { team_id: team.id },
          });
        }
      }

      showToast({ title: 'Left team', variant: 'success' });
      fetchProject();
    } catch (err) {
      showToast({ title: 'Error', message: err.message, variant: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Delete team
  const handleDeleteTeam = async () => {
    if (!confirm('Are you sure you want to delete this team? This cannot be undone.')) return;
    setActionLoading(true);
    try {
      // Notify all members
      for (const m of members.filter((m) => m.user_id !== user.id)) {
        await supabase.from('notifications').insert({
          user_id: m.user_id,
          type: 'team_deleted',
          title: 'Team deleted',
          body: `The team for ${project.title} has been deleted by the owner.`,
          metadata: {},
        });
      }
      await supabase.from('teams').delete().eq('id', team.id);
      showToast({ title: 'Team deleted', variant: 'success' });
      fetchProject();
    } catch (err) {
      showToast({ title: 'Error', message: err.message, variant: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <Skeleton variant="text" width="60px" height="20px" />
        <Skeleton variant="text" width="400px" height="36px" />
        <Skeleton variant="text" width="200px" height="20px" />
        <Skeleton variant="rectangular" height="300px" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className={styles.notFound}>
        <h2>Project not found</h2>
        <Link href="/projects">Back to Projects</Link>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Link href="/projects" className={styles.backLink}>
        <ArrowLeft size={16} /> Back to Projects
      </Link>

      {/* Project Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{project.title}</h1>
          <div className={styles.deptTag}>
            <Building2 size={14} />
            {project.departments?.name || 'Universal (All Departments)'}
          </div>
        </div>
        <div className={styles.meta}>
          <Badge variant="primary" size="sm">
            {project.min_team_size || 1} - {project.max_team_size} members
          </Badge>
        </div>
      </div>

      <p className={styles.description}>{project.description}</p>

      {/* Team Section */}
      <div className={styles.teamSection}>
        {!team ? (
          <Card className={styles.noTeamCard}>
            <div className={styles.noTeamContent}>
              <Users size={32} className={styles.noTeamIcon} />
              <h3>No team has been created yet</h3>
              <p>Be the first to create a team for this project.</p>
              {user ? (
                <Button onClick={handleCreateTeam} loading={actionLoading} icon={Plus}>
                  Create Team
                </Button>
              ) : (
                <Link href="/login">
                  <Button>Sign In to Create Team</Button>
                </Link>
              )}
            </div>
          </Card>
        ) : (
          <>
            {/* Team Header */}
            <div className={styles.teamHeader}>
              <div>
                <h2 className={styles.teamTitle}>Team</h2>
                <p className={styles.teamMeta}>
                  <Users size={14} /> {totalMembers}/{project.max_team_size} members
                  {' · '}
                  <Badge variant={team.status === 'recruiting' ? 'success' : 'default'} size="sm">
                    {team.status === 'recruiting' ? 'Recruiting' : 'Closed'}
                  </Badge>
                </p>
              </div>

              <div className={styles.teamActions}>
                {!isMember && !userRequest && !isFull && team.status === 'recruiting' && user && (
                  <Button onClick={() => setShowJoinModal(true)} icon={UserPlus} size="sm">
                    Request to Join
                  </Button>
                )}
                {!isMember && !user && (
                  <Link href={`/login?redirect=/projects/${id}`}>
                    <Button size="sm">Sign In to Join</Button>
                  </Link>
                )}
                {userRequest && (
                  <Badge variant="warning">Request Pending</Badge>
                )}
                {isOwner && !isFull && (
                  <Button onClick={() => setShowManualModal(true)} variant="secondary" icon={Plus} size="sm">
                    Add Member
                  </Button>
                )}
              </div>
            </div>

            {/* Members List */}
            <div className={styles.membersList}>
              {members.map((m) => {
                const memberProfile = m.profiles;
                const canViewFullDetails = !!user;
                const displayName = canViewFullDetails ? memberProfile?.full_name : memberProfile?.full_name?.split(' ')[0];
                const profileLink = canViewFullDetails ? `/profile/${memberProfile?.id}` : `/login?redirect=/projects/${id}`;

                return (
                  <Card key={m.id} className={styles.memberCard}>
                    <div className={styles.memberInfo}>
                      <Link href={profileLink} className={styles.memberLink}>
                        <Avatar name={memberProfile?.full_name} src={memberProfile?.avatar_url} size="md" />
                      </Link>
                      <div>
                        <div className={styles.memberNameRow}>
                          <Link href={profileLink} className={styles.memberNameLink}>
                            <span className={styles.memberName}>{displayName}</span>
                          </Link>
                          {m.role === 'owner' && (
                            <Badge variant="accent" size="sm">
                              <Crown size={10} /> Owner
                            </Badge>
                          )}
                        </div>
                        {canViewFullDetails && memberProfile?.levels?.name && (
                          <p className={styles.memberLevel}>{memberProfile.levels.name}</p>
                        )}
                        {isMember && memberProfile?.whatsapp_number && (
                          <div className={styles.memberContactInfo}>
                            <a
                              href={`https://wa.me/${memberProfile.whatsapp_number.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={styles.contactBadge}
                              title="WhatsApp"
                            >
                              <MessageSquare size={12} /> {memberProfile.whatsapp_number}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                    {isOwner && m.user_id !== user.id && (
                      <button
                        className={styles.removeBtn}
                        onClick={() => handleRemoveMember(m.id, m.user_id)}
                        title="Remove member"
                      >
                        <UserMinus size={16} />
                      </button>
                    )}
                  </Card>
                );
              })}

              {/* Manual Members */}
              {manualMembers.map((m) => (
                <Card key={m.id} className={styles.memberCard}>
                  <div className={styles.memberInfo}>
                    <Avatar name={m.full_name} size="md" />
                    <div>
                      <div className={styles.memberNameRow}>
                        <span className={styles.memberName}>{m.full_name}</span>
                        <Badge variant="default" size="sm">Manual</Badge>
                      </div>
                      {m.notes && <p className={styles.memberLevel}>{m.notes}</p>}
                      {isMember && m.whatsapp_number && (
                        <div className={styles.memberContactInfo}>
                          <a
                            href={`https://wa.me/${m.whatsapp_number.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.contactBadge}
                            title="WhatsApp"
                          >
                            <MessageSquare size={12} /> {m.whatsapp_number}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                  {isOwner && (
                    <button
                      className={styles.removeBtn}
                      onClick={() => handleRemoveMember(m.id, null, true)}
                      title="Remove member"
                    >
                      <UserMinus size={16} />
                    </button>
                  )}
                </Card>
              ))}
            </div>

            {/* Pending Requests (owner only) */}
            {isOwner && joinRequests.length > 0 && (
              <div className={styles.requestsSection}>
                <h3 className={styles.requestsTitle}>
                  Pending Requests
                  <Badge variant="warning" size="sm">{joinRequests.length}</Badge>
                </h3>
                {joinRequests.map((req) => (
                  <Card key={req.id} className={styles.requestCard}>
                    <div className={styles.requestInfo}>
                      <Avatar name={req.profiles?.full_name} src={req.profiles?.avatar_url} size="sm" />
                      <div>
                        <span className={styles.requestName}>{req.profiles?.full_name}</span>
                        {req.message && (
                          <p className={styles.requestMsg}>
                            <MessageSquare size={12} /> {req.message}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className={styles.requestActions}>
                      <button
                        className={styles.acceptBtn}
                        onClick={() => handleRequestAction(req.id, 'accepted', req.user_id)}
                        disabled={isFull}
                        title={isFull ? 'Team is full' : 'Accept'}
                      >
                        <Check size={16} />
                      </button>
                      <button
                        className={styles.rejectBtn}
                        onClick={() => handleRequestAction(req.id, 'rejected', req.user_id)}
                        title="Reject"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Team Owner Actions */}
            {isMember && (
              <div className={styles.ownerActions}>
                {isOwner ? (
                  <Button variant="danger" icon={Trash2} size="sm" onClick={handleDeleteTeam}>
                    Delete Team
                  </Button>
                ) : (
                  <Button variant="ghost" icon={LogOut} size="sm" onClick={handleLeaveTeam}>
                    Leave Team
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Join Request Modal */}
      <Modal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        title="Request to Join Team"
        footer={
          <div className={styles.modalFooter}>
            <Button variant="ghost" onClick={() => setShowJoinModal(false)}>Cancel</Button>
            <Button onClick={handleJoinRequest} loading={actionLoading}>Send Request</Button>
          </div>
        }
      >
        <p className={styles.modalText}>
          Send a request to join the team for <strong>{project.title}</strong>.
          The team owner will review your request.
        </p>
        <Input
          id="join-message"
          label="Message (optional)"
          value={joinMessage}
          onChange={(e) => setJoinMessage(e.target.value)}
          placeholder="Introduce yourself or explain why you want to join..."
        />
      </Modal>

      {/* Add Manual Member Modal */}
      <Modal
        isOpen={showManualModal}
        onClose={() => setShowManualModal(false)}
        title="Add Team Member"
        footer={
          <div className={styles.modalFooter}>
            <Button variant="ghost" onClick={() => setShowManualModal(false)}>Cancel</Button>
            <Button onClick={handleAddManual} loading={actionLoading} disabled={!manualName.trim()}>
              Add Member
            </Button>
          </div>
        }
      >
        <p className={styles.modalText}>
          Add a member who doesn&apos;t have a Takween account.
          They will count toward the team size limit.
        </p>
        <div className={styles.modalFields}>
          <Input
            id="manual-name"
            label="Full Name"
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            required
          />
          <Input
            id="manual-whatsapp"
            label="WhatsApp Number (optional)"
            value={manualWhatsapp}
            onChange={(e) => setManualWhatsapp(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
