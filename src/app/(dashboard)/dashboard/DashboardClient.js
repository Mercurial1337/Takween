'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Users, FolderOpen, Bell, ArrowRight, Plus, Check, X, Merge, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { createClient } from '@/lib/supabase/client';
import PageHeader from '@/components/layout/PageHeader/PageHeader';
import Card from '@/components/ui/Card/Card';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import Skeleton from '@/components/ui/Skeleton/Skeleton';
import Modal from '@/components/ui/Modal/Modal';
import Avatar from '@/components/ui/Avatar/Avatar';
import Input from '@/components/ui/Input/Input';
import styles from './page.module.css';

export default function DashboardClient() {
  const { user, profile, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [teams, setTeams] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Merge request state
  const [pendingMergeRequests, setPendingMergeRequests] = useState([]);
  const [selectedMergeRequest, setSelectedMergeRequest] = useState(null);
  const [mergeMembers, setMergeMembers] = useState([]);
  const [mergeReplyMessage, setMergeReplyMessage] = useState('');

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!user) return;

    const fetchDashboardData = async () => {
      try {
        // Fetch user's teams
        const { data: memberData } = await supabase
          .from('team_members')
          .select(`
            team_id,
            role,
            teams (
              id,
              status,
              project_id,
              owner_id,
              projects (
                id,
                title,
                department_id,
                min_team_size,
                max_team_size,
                departments (name)
              )
            )
          `)
          .eq('user_id', user.id);

        if (memberData) {
          // For each team, get member count
          const teamsWithCounts = await Promise.all(
            memberData.map(async (m) => {
              const { count: registeredCount } = await supabase
                .from('team_members')
                .select('*', { count: 'exact', head: true })
                .eq('team_id', m.team_id);

              const { count: manualCount } = await supabase
                .from('manual_members')
                .select('*', { count: 'exact', head: true })
                .eq('team_id', m.team_id);

              return {
                ...m.teams,
                role: m.role,
                memberCount: (registeredCount || 0) + (manualCount || 0),
              };
            })
          );
          setTeams(teamsWithCounts);
        }

        // Fetch pending join requests (for teams user owns)
        const { data: requestData } = await supabase
          .from('join_requests')
          .select(`
            id,
            user_id,
            team_id,
            message,
            status,
            created_at,
            profiles:user_id (id, full_name, email, avatar_url, levels:level_id (name)),
            teams:team_id (
              id,
              projects (id, title)
            )
          `)
          .eq('status', 'pending')
          .in('team_id', (memberData || []).filter(m => m.role === 'owner').map(m => m.team_id));

        if (requestData) setPendingRequests(requestData);

        // Fetch unread notifications count
        const { count } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false);

        setUnreadNotifications(count || 0);

        // Fetch pending merge requests where user is the target team owner
        const ownedTeamIds = (memberData || [])
          .filter(m => m.role === 'owner')
          .map(m => m.team_id);

        if (ownedTeamIds.length > 0) {
          const { data: mergeData } = await supabase
            .from('team_merge_requests')
            .select(`
              id,
              source_team_id,
              target_team_id,
              message,
              status,
              created_at
            `)
            .eq('status', 'pending')
            .in('target_team_id', ownedTeamIds);

          if (mergeData && mergeData.length > 0) {
            // Enrich with source team data
            const enrichedMerge = await Promise.all(
              mergeData.map(async (mr) => {
                // Source team info
                const { data: sourceTeam } = await supabase
                  .from('teams')
                  .select(`
                    id,
                    owner_id,
                    project_id,
                    profiles:owner_id (id, full_name, email, avatar_url),
                    projects:project_id (id, title, max_team_size)
                  `)
                  .eq('id', mr.source_team_id)
                  .single();

                // Source team member count
                const { count: srcRegistered } = await supabase
                  .from('team_members')
                  .select('*', { count: 'exact', head: true })
                  .eq('team_id', mr.source_team_id);
                const { count: srcManual } = await supabase
                  .from('manual_members')
                  .select('*', { count: 'exact', head: true })
                  .eq('team_id', mr.source_team_id);

                // Target team member count
                const { count: tgtRegistered } = await supabase
                  .from('team_members')
                  .select('*', { count: 'exact', head: true })
                  .eq('team_id', mr.target_team_id);
                const { count: tgtManual } = await supabase
                  .from('manual_members')
                  .select('*', { count: 'exact', head: true })
                  .eq('team_id', mr.target_team_id);

                return {
                  ...mr,
                  sourceTeam: sourceTeam,
                  sourceMemberCount: (srcRegistered || 0) + (srcManual || 0),
                  targetMemberCount: (tgtRegistered || 0) + (tgtManual || 0),
                  maxTeamSize: sourceTeam?.projects?.max_team_size || 0,
                  projectTitle: sourceTeam?.projects?.title || 'Unknown',
                };
              })
            );
            setPendingMergeRequests(enrichedMerge);
          }
        }
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    Promise.resolve().then(() => {
      fetchDashboardData();
    });
  }, [user, supabase]);

  const handleRequestAction = async (action) => {
    if (!selectedRequest) return;
    setActionLoading(true);
    try {
      await supabase
        .from('join_requests')
        .update({ status: action })
        .eq('id', selectedRequest.id);

      if (action === 'accepted') {
        await supabase.from('team_members').insert({
          team_id: selectedRequest.team_id,
          user_id: selectedRequest.user_id,
          role: 'member',
        });
      }

      // Notify the requester
      const projectTitle = selectedRequest.teams?.projects?.title || 'a project';
      let bodyText = action === 'accepted'
        ? `You have been accepted to the team for ${projectTitle}.`
        : `Your request to join the team for ${projectTitle} was declined.`;
      
      if (replyMessage) {
        bodyText += `\nMessage from owner: "${replyMessage}"`;
      }

      await supabase.from('notifications').insert({
        user_id: selectedRequest.user_id,
        type: action === 'accepted' ? 'request_accepted' : 'request_rejected',
        title: action === 'accepted' ? 'Request accepted' : 'Request rejected',
        body: bodyText,
        metadata: { team_id: selectedRequest.team_id },
      });

      // Send email to requester via API
      try {
        if (selectedRequest.profiles?.email) {
          await fetch('/api/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: action === 'accepted' ? 'request_accepted' : 'request_rejected',
              recipientEmail: selectedRequest.profiles.email,
              recipientName: selectedRequest.profiles.full_name,
              actorName: profile?.full_name,
              projectName: projectTitle,
              message: replyMessage || null
            })
          });
        }
      } catch (emailErr) {
        console.error('Failed to send email:', emailErr);
      }

      showToast({
        title: action === 'accepted' ? 'Request accepted' : 'Request rejected',
        variant: action === 'accepted' ? 'success' : 'info',
      });
      
      setPendingRequests(prev => prev.filter(req => req.id !== selectedRequest.id));
      setSelectedRequest(null);
      setReplyMessage('');
    } catch (err) {
      showToast({ title: 'Error', message: err.message, variant: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle merge request actions
  const handleMergeAction = async (action) => {
    if (!selectedMergeRequest) return;
    setActionLoading(true);
    try {
      const projectTitle = selectedMergeRequest.projectTitle;
      const sourceOwnerName = selectedMergeRequest.sourceTeam?.profiles?.full_name || 'Unknown';
      const sourceOwnerEmail = selectedMergeRequest.sourceTeam?.profiles?.email;
      const sourceOwnerId = selectedMergeRequest.sourceTeam?.owner_id;

      if (action === 'accepted') {
        // Call the stored procedure
        const { error: rpcError } = await supabase.rpc('merge_teams', {
          p_request_id: selectedMergeRequest.id,
        });
        if (rpcError) throw rpcError;

        // Notify source team owner
        if (sourceOwnerId) {
          await supabase.from('notifications').insert({
            user_id: sourceOwnerId,
            type: 'merge_accepted',
            title: 'Team merge accepted',
            body: `Your team merge request for ${projectTitle} has been accepted by ${profile?.full_name}.${mergeReplyMessage ? ` Message: "${mergeReplyMessage}"` : ''}`,
            metadata: { target_team_id: selectedMergeRequest.target_team_id },
          });
        }

        // Send email
        if (sourceOwnerEmail) {
          try {
            await fetch('/api/email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'merge_accepted',
                recipientEmail: sourceOwnerEmail,
                recipientName: sourceOwnerName,
                actorName: profile?.full_name,
                projectName: projectTitle,
                message: mergeReplyMessage || null,
              }),
            });
          } catch (emailErr) {
            console.error('Failed to send merge accepted email:', emailErr);
          }
        }

        showToast({ title: 'Teams merged', message: 'All members have been transferred to your team.', variant: 'success' });
      } else {
        // Reject: just update the status
        await supabase
          .from('team_merge_requests')
          .update({ status: 'rejected' })
          .eq('id', selectedMergeRequest.id);

        // Notify source team owner
        if (sourceOwnerId) {
          await supabase.from('notifications').insert({
            user_id: sourceOwnerId,
            type: 'merge_rejected',
            title: 'Team merge declined',
            body: `Your team merge request for ${projectTitle} was declined.${mergeReplyMessage ? ` Message: "${mergeReplyMessage}"` : ''}`,
            metadata: { target_team_id: selectedMergeRequest.target_team_id },
          });
        }

        // Send email
        if (sourceOwnerEmail) {
          try {
            await fetch('/api/email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'merge_rejected',
                recipientEmail: sourceOwnerEmail,
                recipientName: sourceOwnerName,
                actorName: profile?.full_name,
                projectName: projectTitle,
                message: mergeReplyMessage || null,
              }),
            });
          } catch (emailErr) {
            console.error('Failed to send merge rejected email:', emailErr);
          }
        }

        showToast({ title: 'Merge request declined', variant: 'info' });
      }

      setPendingMergeRequests(prev => prev.filter(mr => mr.id !== selectedMergeRequest.id));
      setSelectedMergeRequest(null);
      setMergeReplyMessage('');
      setMergeMembers([]);
    } catch (err) {
      showToast({ title: 'Error', message: err.message, variant: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // When a merge request is selected for review, fetch the source team members
  const openMergeReview = async (mr) => {
    setSelectedMergeRequest(mr);
    setMergeReplyMessage('');

    // Fetch source team members for display
    const { data: members } = await supabase
      .from('team_members')
      .select('*, profiles:user_id (id, full_name, avatar_url, levels:level_id (name))')
      .eq('team_id', mr.source_team_id);
    setMergeMembers(members || []);
  };

  if (authLoading || loading) {
    return (
      <div>
        <Skeleton variant="text" width="200px" height="32px" />
        <div className={styles.skeletonGrid}>
          <Skeleton variant="rectangular" height="160px" />
          <Skeleton variant="rectangular" height="160px" />
          <Skeleton variant="rectangular" height="160px" />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      <PageHeader
        title={`Welcome, ${profile?.full_name?.split(' ')[0] || 'Student'}`}
        description="Here's an overview of your teams and activity."
      />

      {/* Quick Stats */}
      <div className={styles.statsRow}>
        <Card className={styles.statCard}>
          <div className={styles.statIcon} style={{ backgroundColor: 'var(--color-surface)' }}>
            <Users size={20} style={{ color: 'var(--color-primary)' }} />
          </div>
          <div>
            <p className={styles.statNumber}>{teams.length}</p>
            <p className={styles.statLabel}>My Teams</p>
          </div>
        </Card>
        <Card className={styles.statCard}>
          <div className={styles.statIcon} style={{ backgroundColor: 'var(--color-warning-bg)' }}>
            <FolderOpen size={20} style={{ color: 'var(--color-accent)' }} />
          </div>
          <div>
            <p className={styles.statNumber}>{pendingRequests.length}</p>
            <p className={styles.statLabel}>Pending Requests</p>
          </div>
        </Card>
        <Card className={styles.statCard}>
          <div className={styles.statIcon} style={{ backgroundColor: 'var(--color-error-bg)' }}>
            <Bell size={20} style={{ color: 'var(--color-error)' }} />
          </div>
          <div>
            <p className={styles.statNumber}>{unreadNotifications}</p>
            <p className={styles.statLabel}>Unread Notifications</p>
          </div>
        </Card>
      </div>

      {/* My Teams */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>My Teams</h2>
          <Link href="/projects" className={styles.viewAll}>
            Browse Projects <ArrowRight size={16} />
          </Link>
        </div>

        {teams.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No teams yet"
            description="Browse available projects and create or join a team to get started."
            action={{ label: 'Browse Projects', onClick: () => window.location.href = '/projects' }}
          />
        ) : (
          <div className={styles.teamGrid}>
            {teams.map((team) => (
              <Link key={team.id} href={`/projects/${team.project_id}`} className={styles.teamCardLink}>
                <Card hoverable className={styles.teamCard}>
                  <div className={styles.teamCardHeader}>
                    <h3 className={styles.teamCardTitle}>{team.projects?.title}</h3>
                    <Badge variant={team.status === 'recruiting' ? 'success' : 'default'} size="sm">
                      {team.status === 'recruiting' ? 'Recruiting' : 'Closed'}
                    </Badge>
                  </div>
                  <p className={styles.teamCardDept}>
                    {team.projects?.departments?.name || 'Universal (All Departments)'}
                  </p>
                  <div className={styles.teamCardFooter}>
                    <span className={styles.teamCardMembers}>
                      <Users size={14} /> {team.memberCount}/{team.projects?.max_team_size} members ({team.projects?.min_team_size || 1}-{team.projects?.max_team_size} target)
                    </span>
                    <Badge variant={team.role === 'owner' ? 'accent' : 'primary'} size="sm">
                      {team.role === 'owner' ? 'Owner' : 'Member'}
                    </Badge>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Pending Join Requests</h2>
          </div>
          <div className={styles.requestList}>
            {pendingRequests.map((req) => (
              <Card key={req.id} className={styles.requestCard}>
                <div>
                  <p className={styles.requestName}>
                    <Link href={`/profile/${req.user_id}`} style={{ color: 'var(--color-primary)', textDecoration: 'none' }} title="View Profile">
                      {req.profiles?.full_name}
                    </Link>
                  </p>
                  <p className={styles.requestProject}>wants to join {req.teams?.projects?.title}</p>
                  {req.message && <p className={styles.requestMessage}>&ldquo;{req.message}&rdquo;</p>}
                </div>
                <button 
                  className={styles.requestLink} 
                  style={{ border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', color: 'var(--color-primary)', fontWeight: 'var(--font-medium)', padding: 'var(--space-xs)' }}
                  onClick={() => { setSelectedRequest(req); setReplyMessage(''); }}
                >
                  Review <ArrowRight size={14} />
                </button>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Pending Team Merge Requests */}
      {pendingMergeRequests.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              Team Merge Requests
              <Badge variant="accent" size="sm" style={{ marginLeft: 'var(--space-sm)' }}>New</Badge>
            </h2>
          </div>
          <div className={styles.requestList}>
            {pendingMergeRequests.map((mr) => (
              <Card key={mr.id} className={styles.mergeRequestCard}>
                <div>
                  <div className={styles.mergeRequestHeader}>
                    <Badge variant="accent" size="sm">
                      <Merge size={10} /> Team Merge
                    </Badge>
                  </div>
                  <p className={styles.requestName}>
                    {mr.sourceTeam?.profiles?.full_name}&apos;s Team
                  </p>
                  <p className={styles.requestProject}>
                    wants to merge into your team for {mr.projectTitle}
                  </p>
                  <p className={styles.mergeRequestMeta}>
                    <Users size={12} />
                    {mr.sourceMemberCount} members → {mr.targetMemberCount + mr.sourceMemberCount}/{mr.maxTeamSize} total
                  </p>
                  {mr.message && <p className={styles.requestMessage}>&ldquo;{mr.message}&rdquo;</p>}
                </div>
                <button
                  className={styles.requestLink}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', color: 'var(--color-primary)', fontWeight: 'var(--font-medium)', padding: 'var(--space-xs)' }}
                  onClick={() => openMergeReview(mr)}
                >
                  Review <ArrowRight size={14} />
                </button>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Review Request Modal */}
      <Modal
        isOpen={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
        title="Review Join Request"
        footer={
          <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end', width: '100%' }}>
            <Button 
              variant="outline" 
              onClick={() => handleRequestAction('rejected')} 
              loading={actionLoading}
              icon={X}
            >
              Reject
            </Button>
            <Button 
              variant="primary" 
              onClick={() => handleRequestAction('accepted')} 
              loading={actionLoading}
              icon={Check}
            >
              Accept
            </Button>
          </div>
        }
      >
        {selectedRequest && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <Link href={`/profile/${selectedRequest.user_id}`} title="View Profile">
                <Avatar 
                  name={selectedRequest.profiles?.full_name} 
                  src={selectedRequest.profiles?.avatar_url} 
                  size="md" 
                />
              </Link>
              <div>
                <p style={{ fontWeight: 'var(--font-semibold)', margin: 0 }}>
                  <Link href={`/profile/${selectedRequest.user_id}`} style={{ color: 'var(--color-text)', textDecoration: 'none' }} title="View Profile">
                    {selectedRequest.profiles?.full_name}
                  </Link>
                </p>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', margin: 0 }}>
                  {selectedRequest.profiles?.levels?.name || 'Student'}
                </p>
              </div>
            </div>
            
            <div style={{ padding: 'var(--space-sm)', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}>
              <p style={{ fontSize: 'var(--text-sm)', margin: '0 0 var(--space-xs) 0', color: 'var(--color-text-muted)' }}>
                Message from {selectedRequest.profiles?.full_name.split(' ')[0]}:
              </p>
              <p style={{ margin: 0, fontStyle: selectedRequest.message ? 'normal' : 'italic', color: selectedRequest.message ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
                {selectedRequest.message ? `"${selectedRequest.message}"` : "No message provided."}
              </p>
            </div>

            <Input
              id="reply-message"
              label="Reply Message (Optional)"
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              placeholder="e.g. Welcome to the team! I'll add you to our group."
            />
          </div>
        )}
      </Modal>

      {/* Merge Review Modal */}
      <Modal
        isOpen={!!selectedMergeRequest}
        onClose={() => { setSelectedMergeRequest(null); setMergeMembers([]); setMergeReplyMessage(''); }}
        title="Review Team Merge Request"
        size="md"
        footer={
          <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end', width: '100%' }}>
            <Button
              variant="outline"
              onClick={() => handleMergeAction('rejected')}
              loading={actionLoading}
              icon={X}
            >
              Decline
            </Button>
            <Button
              variant="primary"
              onClick={() => handleMergeAction('accepted')}
              loading={actionLoading}
              icon={Check}
              disabled={selectedMergeRequest && (selectedMergeRequest.sourceMemberCount + selectedMergeRequest.targetMemberCount) > selectedMergeRequest.maxTeamSize}
            >
              Accept Merge
            </Button>
          </div>
        }
      >
        {selectedMergeRequest && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {/* Source team owner */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <Link href={`/profile/${selectedMergeRequest.sourceTeam?.profiles?.id}`} title="View Profile">
                <Avatar
                  name={selectedMergeRequest.sourceTeam?.profiles?.full_name}
                  src={selectedMergeRequest.sourceTeam?.profiles?.avatar_url}
                  size="md"
                />
              </Link>
              <div>
                <p style={{ fontWeight: 'var(--font-semibold)', margin: 0 }}>
                  <Link href={`/profile/${selectedMergeRequest.sourceTeam?.profiles?.id}`} style={{ color: 'var(--color-text)', textDecoration: 'none' }}>
                    {selectedMergeRequest.sourceTeam?.profiles?.full_name}&apos;s Team
                  </Link>
                </p>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', margin: 0 }}>
                  wants to merge into your team for <strong>{selectedMergeRequest.projectTitle}</strong>
                </p>
              </div>
            </div>

            {/* Capacity check */}
            <div className={styles.mergeCapacityCard}>
              <div className={styles.mergeCapacityRow}>
                <span>Incoming members</span>
                <Badge variant="primary" size="sm">{selectedMergeRequest.sourceMemberCount}</Badge>
              </div>
              <div className={styles.mergeCapacityRow}>
                <span>Your current team</span>
                <Badge variant="primary" size="sm">{selectedMergeRequest.targetMemberCount}</Badge>
              </div>
              <div className={`${styles.mergeCapacityRow} ${styles.mergeCapacityTotal}`}>
                <span>Combined total</span>
                <Badge
                  variant={(selectedMergeRequest.sourceMemberCount + selectedMergeRequest.targetMemberCount) <= selectedMergeRequest.maxTeamSize ? 'success' : 'error'}
                  size="sm"
                >
                  {selectedMergeRequest.sourceMemberCount + selectedMergeRequest.targetMemberCount} / {selectedMergeRequest.maxTeamSize}
                </Badge>
              </div>
            </div>

            {(selectedMergeRequest.sourceMemberCount + selectedMergeRequest.targetMemberCount) > selectedMergeRequest.maxTeamSize && (
              <div className={styles.mergeWarning}>
                <AlertTriangle size={16} />
                <span>Combined team size exceeds the project limit. This merge cannot be accepted.</span>
              </div>
            )}

            {/* Source team member list */}
            {mergeMembers.length > 0 && (
              <div>
                <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-sm)' }}>
                  Members that will join your team:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                  {mergeMembers.map((m) => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', padding: 'var(--space-xs) var(--space-sm)', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-sm)' }}>
                      <Avatar name={m.profiles?.full_name} src={m.profiles?.avatar_url} size="sm" />
                      <div>
                        <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', margin: 0 }}>
                          {m.profiles?.full_name}
                          {m.role === 'owner' && (
                            <Badge variant="accent" size="sm" style={{ marginLeft: 'var(--space-xs)' }}>Current Owner</Badge>
                          )}
                        </p>
                        {m.profiles?.levels?.name && (
                          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', margin: 0 }}>{m.profiles.levels.name}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Message from requester */}
            <div style={{ padding: 'var(--space-sm)', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}>
              <p style={{ fontSize: 'var(--text-sm)', margin: '0 0 var(--space-xs) 0', color: 'var(--color-text-muted)' }}>
                Message from {selectedMergeRequest.sourceTeam?.profiles?.full_name?.split(' ')[0]}:
              </p>
              <p style={{ margin: 0, fontStyle: selectedMergeRequest.message ? 'normal' : 'italic', color: selectedMergeRequest.message ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
                {selectedMergeRequest.message ? `"${selectedMergeRequest.message}"` : 'No message provided.'}
              </p>
            </div>

            <Input
              id="merge-reply-message"
              label="Reply Message (Optional)"
              value={mergeReplyMessage}
              onChange={(e) => setMergeReplyMessage(e.target.value)}
              placeholder="e.g. Welcome aboard! We're excited to have your team join us."
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
