'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
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
import Select from '@/components/ui/Select/Select';
import Skeleton from '@/components/ui/Skeleton/Skeleton';
import styles from './page.module.css';
import Link from 'next/link';

export default function ProjectDetailClient({ id }) {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [project, setProject] = useState(null);
  const [teams, setTeams] = useState([]);
  const [allMembers, setAllMembers] = useState([]);
  const [allManualMembers, setAllManualMembers] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [deptFilter, setDeptFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinMessage, setJoinMessage] = useState('');
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [addMemberMode, setAddMemberMode] = useState('registered'); // 'registered' or 'manual'
  const [addMemberEmail, setAddMemberEmail] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualWhatsapp, setManualWhatsapp] = useState('');

  // Visibility logic
  const filteredTeams = useMemo(() => {
    if (!project) return [];
    
    const isGraduationProject = project.title?.toLowerCase().includes('graduation');
    const projectRequiresDepartment = isGraduationProject || !!project.department_id;
    
    // If student, strictly segregate to their department if the project requires it
    if (user && profile && profile.role === 'student' && projectRequiresDepartment) {
      const studentDeptId = profile.department_id;
      if (!studentDeptId) return []; // Require department to see teams
      return teams.filter(t => t.department_id === studentDeptId);
    }
    
    // If admin, guest, or project is universal, support filter dropdown or show all
    if (deptFilter && deptFilter !== 'all') {
      return teams.filter(t => t.department_id === deptFilter);
    }
    
    return teams;
  }, [teams, project, user, profile, deptFilter]);

  const selectedTeam = useMemo(() => {
    if (selectedTeamId) {
      return teams.find(t => t.id === selectedTeamId) || filteredTeams[0] || null;
    }
    // Auto-select user's team if they are in one
    if (user) {
      const myMembership = allMembers.find(m => m.user_id === user.id);
      if (myMembership) {
        const myTeam = teams.find(t => t.id === myMembership.team_id);
        if (myTeam) return myTeam;
      }
    }
    return filteredTeams[0] || null;
  }, [selectedTeamId, filteredTeams, teams, user, allMembers]);

  // Selected Team Specific Computed Properties
  const teamMembers = useMemo(() => {
    if (!selectedTeam) return [];
    return allMembers.filter(m => m.team_id === selectedTeam.id);
  }, [selectedTeam, allMembers]);

  const teamManualMembers = useMemo(() => {
    if (!selectedTeam) return [];
    return allManualMembers.filter(m => m.team_id === selectedTeam.id);
  }, [selectedTeam, allManualMembers]);

  const teamRequests = useMemo(() => {
    if (!selectedTeam) return [];
    return allRequests.filter(r => r.team_id === selectedTeam.id);
  }, [selectedTeam, allRequests]);

  const userTeamRequest = useMemo(() => {
    if (!selectedTeam || !user) return null;
    return myRequests.find(r => r.team_id === selectedTeam.id) || null;
  }, [selectedTeam, user, myRequests]);

  const isOwner = selectedTeam && user && selectedTeam.owner_id === user.id;
  const isMember = teamMembers.some((m) => m.user_id === user?.id);
  const totalMembers = teamMembers.length + teamManualMembers.length;
  const isFull = totalMembers >= (project?.max_team_size || 0);

  // User status on the project
  const userMembership = useMemo(() => {
    if (!user) return null;
    return allMembers.find(m => m.user_id === user.id);
  }, [user, allMembers]);

  const userHasTeam = !!userMembership;

  const fetchProject = useCallback(async () => {
    try {
      // Get project
      const { data: proj } = await supabase
        .from('projects')
        .select('*, departments (name)')
        .eq('id', id)
        .single();
      setProject(proj);

      // Get all departments
      const { data: depts } = await supabase
        .from('departments')
        .select('*')
        .order('name');
      if (depts) setDepartments(depts);

      // Get all teams for this project
      const { data: teamsData } = await supabase
        .from('teams')
        .select(`
          *,
          profiles:owner_id (id, full_name, avatar_url, whatsapp_number, email),
          departments:department_id (id, name)
        `)
        .eq('project_id', id)
        .order('created_at', { ascending: false });

      if (teamsData) {
        setTeams(teamsData);
        
        if (teamsData.length > 0) {
          const teamIds = teamsData.map(t => t.id);

          // Get members
          const { data: memberData } = await supabase
            .from('team_members')
            .select('*, profiles:user_id (id, full_name, avatar_url, level_id, levels:level_id (name), linkedin_url, github_url, whatsapp_number, email)')
            .in('team_id', teamIds)
            .order('joined_at');
          if (memberData) setAllMembers(memberData);

          // Get manual members
          const { data: manualData } = await supabase
            .from('manual_members')
            .select('*')
            .in('team_id', teamIds);
          if (manualData) setAllManualMembers(manualData);

          // Get requests and user requests
          if (user) {
            const ownedTeamIds = teamsData.filter(t => t.owner_id === user.id).map(t => t.id);
            if (ownedTeamIds.length > 0) {
              const { data: reqData } = await supabase
                .from('join_requests')
                .select('*, profiles:user_id (id, full_name, avatar_url, email)')
                .in('team_id', ownedTeamIds)
                .eq('status', 'pending');
              if (reqData) setAllRequests(reqData);
            }

            const { data: myReqs } = await supabase
              .from('join_requests')
              .select('*')
              .in('team_id', teamIds)
              .eq('user_id', user.id)
              .eq('status', 'pending');
            if (myReqs) setMyRequests(myReqs);
          }
        } else {
          setAllMembers([]);
          setAllManualMembers([]);
          setAllRequests([]);
          setMyRequests([]);
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
    
    const isGraduationProject = project?.title?.toLowerCase().includes('graduation');
    const projectRequiresDepartment = isGraduationProject || !!project?.department_id;

    if (projectRequiresDepartment && (!profile || !profile.department_id)) {
      showToast({ title: 'Department required', message: 'Please select your department in your profile settings to create a team.', variant: 'warning' });
      return;
    }
    setActionLoading(true);
    try {
      const { data: newTeam, error } = await supabase
        .from('teams')
        .insert({ 
          project_id: id, 
          owner_id: user.id,
          department_id: profile?.department_id || null
        })
        .select()
        .single();
      if (error) throw error;

      await supabase.from('team_members').insert({
        team_id: newTeam.id, user_id: user.id, role: 'owner',
      });

      showToast({ title: 'Team created', message: 'You are now the team owner.', variant: 'success' });
      await fetchProject();
      setSelectedTeamId(newTeam.id);
    } catch (err) {
      showToast({ title: 'Error', message: err.message, variant: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Send join request
  const handleJoinRequest = async () => {
    if (!user) { router.push('/login'); return; }
    
    const isGraduationProject = project?.title?.toLowerCase().includes('graduation');
    const projectRequiresDepartment = isGraduationProject || !!project?.department_id;

    if (projectRequiresDepartment) {
      if (!profile || !profile.department_id) {
        showToast({ title: 'Department required', message: 'Please set your department in your profile settings before requesting to join.', variant: 'warning' });
        return;
      }
      if (profile.department_id !== selectedTeam.department_id) {
        showToast({ title: 'Department mismatch', message: 'You can only request to join teams within your own department.', variant: 'error' });
        return;
      }
    }
    setActionLoading(true);
    try {
      const { error } = await supabase.from('join_requests').insert({
        team_id: selectedTeam.id, user_id: user.id, message: joinMessage || null,
      });
      if (error) throw error;

      // Notify team owner via DB notification
      await supabase.from('notifications').insert({
        user_id: selectedTeam.owner_id,
        type: 'request_received',
        title: 'New join request',
        body: `${profile?.full_name} wants to join your team for ${project.title}.`,
        metadata: { team_id: selectedTeam.id, user_id: user.id },
      });

      // Send email to team owner via API
      try {
        await fetch('/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'request_received',
            recipientEmail: selectedTeam.profiles?.email,
            recipientName: selectedTeam.profiles?.full_name,
            actorName: profile?.full_name,
            projectName: project.title,
            message: joinMessage || null
          })
        });
      } catch (emailErr) {
        console.error('Failed to send email:', emailErr);
      }

      showToast({ title: 'Request sent', message: 'The team owner will review your request.', variant: 'success' });
      setShowJoinModal(false);
      setJoinMessage('');
      await fetchProject();
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
          team_id: selectedTeam.id, user_id: requestUserId, role: 'member',
        });
      }

      // Notify the requester via DB
      await supabase.from('notifications').insert({
        user_id: requestUserId,
        type: action === 'accepted' ? 'request_accepted' : 'request_rejected',
        title: action === 'accepted' ? 'Request accepted' : 'Request rejected',
        body: action === 'accepted'
          ? `You have been accepted to the team for ${project.title}.`
          : `Your request to join the team for ${project.title} was declined.`,
        metadata: { team_id: selectedTeam.id },
      });

      // Send email to requester via API
      try {
        const reqObj = allRequests.find(r => r.id === requestId);
        if (reqObj && reqObj.profiles?.email) {
          await fetch('/api/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: action === 'accepted' ? 'request_accepted' : 'request_rejected',
              recipientEmail: reqObj.profiles.email,
              recipientName: reqObj.profiles.full_name,
              actorName: profile?.full_name,
              projectName: project.title,
              message: null // ProjectDetailClient currently has no reply message UI
            })
          });
        }
      } catch (emailErr) {
        console.error('Failed to send email:', emailErr);
      }

      showToast({
        title: action === 'accepted' ? 'Member added' : 'Request rejected',
        variant: action === 'accepted' ? 'success' : 'info',
      });
      await fetchProject();
    } catch (err) {
      showToast({ title: 'Error', message: err.message, variant: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Add member (handles both registered by email and manual)
  const handleAddMember = async () => {
    setActionLoading(true);
    try {
      if (addMemberMode === 'registered') {
        // 1. Find user by email
        const { data: userProfile, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('email', addMemberEmail.trim())
          .maybeSingle();

        if (profileError) throw profileError;
        if (!userProfile) {
          throw new Error('No registered user found with this email address. They must sign up first, or you can add them manually.');
        }

        // 2. Add to team members
        const { error: insertError } = await supabase.from('team_members').insert({
          team_id: selectedTeam.id,
          user_id: userProfile.id,
          role: 'member',
        });

        if (insertError) {
          // Improve error message if it's a known constraint
          if (insertError.message.includes('already a member')) {
            throw new Error('This user is already a member of a team in this project.');
          }
          if (insertError.message.includes('department')) {
            throw new Error('This user is in a different department and cannot join this team.');
          }
          throw insertError;
        }

        // 3. Notify the added user
        await supabase.from('notifications').insert({
          user_id: userProfile.id,
          type: 'request_accepted', // reusing this type for being added
          title: 'Added to team',
          body: `You have been added to a team for ${project.title} by ${profile?.full_name}.`,
          metadata: { team_id: selectedTeam.id },
        });

        showToast({ title: 'Member added', message: `${userProfile.full_name} has been added to the team.`, variant: 'success' });
      } else {
        // Manual member
        const { error } = await supabase.from('manual_members').insert({
          team_id: selectedTeam.id,
          full_name: manualName,
          whatsapp_number: manualWhatsapp || null,
          added_by: user.id,
        });
        if (error) throw error;
        showToast({ title: 'Manual member added', variant: 'success' });
      }

      // Reset and close
      setShowAddMemberModal(false);
      setAddMemberEmail('');
      setManualName('');
      setManualWhatsapp('');
      await fetchProject();
    } catch (err) {
      showToast({ title: 'Cannot add member', message: err.message, variant: 'error' });
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
          metadata: { team_id: selectedTeam.id },
        });
      }
      showToast({ title: 'Member removed', variant: 'success' });
      await fetchProject();
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
      const myMembership = teamMembers.find((m) => m.user_id === user.id);
      if (!myMembership) return;

      await supabase.from('team_members').delete().eq('id', myMembership.id);

      // If owner is leaving, transfer ownership
      if (isOwner) {
        const nextOwner = teamMembers
          .filter((m) => m.user_id !== user.id)
          .sort((a, b) => new Date(a.joined_at) - new Date(b.joined_at))[0];

        if (nextOwner) {
          await supabase.from('teams').update({ owner_id: nextOwner.user_id }).eq('id', selectedTeam.id);
          await supabase.from('team_members').update({ role: 'owner' }).eq('id', nextOwner.id);
          await supabase.from('notifications').insert({
            user_id: nextOwner.user_id,
            type: 'ownership_transferred',
            title: 'You are now the team owner',
            body: `Ownership of the team for ${project.title} has been transferred to you.`,
            metadata: { team_id: selectedTeam.id },
          });
        }
      }

      showToast({ title: 'Left team', variant: 'success' });
      await fetchProject();
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
      for (const m of teamMembers.filter((m) => m.user_id !== user.id)) {
        await supabase.from('notifications').insert({
          user_id: m.user_id,
          type: 'team_deleted',
          title: 'Team deleted',
          body: `The team for ${project.title} has been deleted by the owner.`,
          metadata: {},
        });
      }
      await supabase.from('teams').delete().eq('id', selectedTeam.id);
      showToast({ title: 'Team deleted', variant: 'success' });
      setSelectedTeamId(null);
      await fetchProject();
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

  const isGraduationProject = project?.title?.toLowerCase().includes('graduation');
  const projectRequiresDepartment = isGraduationProject || !!project?.department_id;

  // Segment banner check for student
  if (user && profile && profile.role === 'student' && projectRequiresDepartment && !profile.department_id) {
    return (
      <div className={styles.page}>
        <Link href="/projects" className={styles.backLink}>
          <ArrowLeft size={16} /> Back to Projects
        </Link>
        <Card className={styles.warningCard}>
          <Building2 size={48} className={styles.warningIcon} />
          <h2>Department Required</h2>
          <p className={styles.warningText}>
            You must set your academic department in your profile before you can browse or join graduation project teams.
          </p>
          <Link href="/profile">
            <Button icon={Plus}>Update Profile Department</Button>
          </Link>
        </Card>
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

      {/* Filter and Top Bar */}
      {(profile?.role === 'admin' || !user) && teams.length > 0 && (
        <div className={styles.filterBar}>
          <div className={styles.filterWrapper}>
            <Select
              id="dept-filter"
              placeholder="All Departments"
              options={departments.map((d) => ({ value: d.id, label: d.name }))}
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Teams display */}
      <div className={styles.teamSection}>
        {filteredTeams.length === 0 ? (
          <Card className={styles.noTeamCard}>
            <div className={styles.noTeamContent}>
              <Users size={32} className={styles.noTeamIcon} />
              <h3>No teams found</h3>
              <p>
                {user && profile?.role === 'student'
                  ? `Be the first to create a team for the ${profile.departments?.name || 'CS'} department.`
                  : 'There are no teams available matching the criteria.'}
              </p>
              {user ? (
                !userHasTeam && profile?.role === 'student' && (
                  <Button onClick={handleCreateTeam} loading={actionLoading} icon={Plus}>
                    Create Team
                  </Button>
                )
              ) : (
                <Link href="/login">
                  <Button>Sign In to Create Team</Button>
                </Link>
              )}
            </div>
          </Card>
        ) : (
          <div className={styles.layoutGrid}>
            {/* Left Pane: Team List */}
            <div className={styles.leftPane}>
              <div className={styles.paneHeader}>
                <h3>
                  {user && profile?.role === 'student'
                    ? `${profile.departments?.name || ''} Teams`
                    : 'Teams'}
                  {' '}({filteredTeams.length})
                </h3>
                {user && !userHasTeam && profile?.role === 'student' && (
                  <Button onClick={handleCreateTeam} loading={actionLoading} icon={Plus} size="sm">
                    Create Team
                  </Button>
                )}
              </div>

              <div className={styles.teamCardsList}>
                {filteredTeams.map((t) => {
                  const isSelected = selectedTeam && t.id === selectedTeam.id;
                  const tMembers = allMembers.filter((m) => m.team_id === t.id);
                  const tManual = allManualMembers.filter((m) => m.team_id === t.id);
                  const tCount = tMembers.length + tManual.length;
                  const isTFull = tCount >= project.max_team_size;

                  return (
                    <Card
                      key={t.id}
                      onClick={() => setSelectedTeamId(t.id)}
                      className={`${styles.teamListItemCard} ${isSelected ? styles.teamListItemActive : ''}`}
                      hoverable
                    >
                      <div className={styles.teamCardHeader}>
                        <h4 className={styles.teamCardOwner}>
                          {t.profiles?.full_name || 'Anonymous'}&apos;s Team
                        </h4>
                        <Badge variant={isTFull ? 'default' : 'success'} size="sm">
                          {isTFull ? 'Full' : 'Recruiting'}
                        </Badge>
                      </div>

                      <div className={styles.teamCardMeta}>
                        <span className={styles.teamCardDept}>
                          <Building2 size={12} />
                          {t.departments?.name || 'Universal'}
                        </span>
                        <span className={styles.teamCardSize}>
                          <Users size={12} />
                          {tCount} / {project.max_team_size} members
                        </span>
                      </div>

                      <div className={styles.avatarGroup}>
                        {tMembers.slice(0, 4).map((m) => (
                          <div key={m.id} className={styles.avatarGroupItem} title={m.profiles?.full_name}>
                            <Avatar name={m.profiles?.full_name} src={m.profiles?.avatar_url} size="xs" />
                          </div>
                        ))}
                        {tCount > 4 && (
                          <span className={styles.avatarGroupMore}>+{tCount - 4}</span>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Right Pane: Selected Team Details */}
            <div className={styles.rightPane}>
              {selectedTeam ? (
                <div className={styles.teamDetailsCard}>
                  {/* Team Details Header */}
                  <div className={styles.teamHeader}>
                    <div>
                      <h2 className={styles.teamTitle}>
                        {selectedTeam.profiles?.full_name}&apos;s Team Details
                      </h2>
                      <p className={styles.teamMeta}>
                        <Users size={14} /> {totalMembers}/{project.max_team_size} members
                        {' · '}
                        <Badge variant={selectedTeam.status === 'recruiting' ? 'success' : 'default'} size="sm">
                          {selectedTeam.status === 'recruiting' ? 'Recruiting' : 'Closed'}
                        </Badge>
                        {selectedTeam.departments?.name && (
                          <>
                            {' · '}
                            <Badge variant="accent" size="sm">
                              {selectedTeam.departments.name}
                            </Badge>
                          </>
                        )}
                      </p>
                    </div>

                    <div className={styles.teamActions}>
                      {!isMember && !userTeamRequest && !isFull && selectedTeam.status === 'recruiting' && user && !userHasTeam && (
                        <Button onClick={() => setShowJoinModal(true)} icon={UserPlus} size="sm">
                          Request to Join
                        </Button>
                      )}
                      {!isMember && !user && (
                        <Link href={`/login?redirect=/projects/${id}`}>
                          <Button size="sm">Sign In to Join</Button>
                        </Link>
                      )}
                      {userTeamRequest && (
                        <Badge variant="warning">Request Pending</Badge>
                      )}
                      {isOwner && !isFull && (
                        <Button onClick={() => setShowAddMemberModal(true)} variant="secondary" icon={Plus} size="sm">
                          Add Member
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Members List */}
                  <div className={styles.membersList}>
                    {teamMembers.map((m) => {
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
                    {teamManualMembers.map((m) => (
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
                  {isOwner && teamRequests.length > 0 && (
                    <div className={styles.requestsSection}>
                      <h3 className={styles.requestsTitle}>
                        Pending Requests
                        <Badge variant="warning" size="sm">{teamRequests.length}</Badge>
                      </h3>
                      {teamRequests.map((req) => (
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

                  {/* Actions (Leave/Delete) */}
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
                </div>
              ) : (
                <Card className={styles.noTeamSelectedCard}>
                  <Users size={32} className={styles.noTeamSelectedIcon} />
                  <h3>No team selected</h3>
                  <p>Please select a team from the list on the left to view members and details.</p>
                </Card>
              )}
            </div>
          </div>
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

      {/* Add Member Modal */}
      <Modal
        isOpen={showAddMemberModal}
        onClose={() => setShowAddMemberModal(false)}
        title="Add Team Member"
        footer={
          <div className={styles.modalFooter}>
            <Button variant="ghost" onClick={() => setShowAddMemberModal(false)}>Cancel</Button>
            <Button 
              onClick={handleAddMember} 
              loading={actionLoading} 
              disabled={
                addMemberMode === 'registered' 
                  ? !addMemberEmail.trim() 
                  : !manualName.trim()
              }
            >
              Add Member
            </Button>
          </div>
        }
      >
        <div className={styles.tabContainer} style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)', padding: '4px', backgroundColor: 'var(--color-surface-hover)', borderRadius: 'var(--radius-md)' }}>
          <button
            type="button"
            style={{
              flex: 1,
              padding: 'var(--space-sm) var(--space-md)',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: addMemberMode === 'registered' ? 'var(--color-surface)' : 'transparent',
              color: addMemberMode === 'registered' ? 'var(--color-text)' : 'var(--color-text-muted)',
              fontWeight: addMemberMode === 'registered' ? 'var(--font-medium)' : 'var(--font-normal)',
              boxShadow: addMemberMode === 'registered' ? 'var(--shadow-sm)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onClick={() => setAddMemberMode('registered')}
          >
            Registered User
          </button>
          <button
            type="button"
            style={{
              flex: 1,
              padding: 'var(--space-sm) var(--space-md)',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: addMemberMode === 'manual' ? 'var(--color-surface)' : 'transparent',
              color: addMemberMode === 'manual' ? 'var(--color-text)' : 'var(--color-text-muted)',
              fontWeight: addMemberMode === 'manual' ? 'var(--font-medium)' : 'var(--font-normal)',
              boxShadow: addMemberMode === 'manual' ? 'var(--shadow-sm)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onClick={() => setAddMemberMode('manual')}
          >
            Manual Entry
          </button>
        </div>

        {addMemberMode === 'registered' ? (
          <div>
            <p className={styles.modalText} style={{ marginBottom: 'var(--space-md)' }}>
              Add a member who already has a Takween account using their email address. They will be added to the team immediately.
            </p>
            <Input
              id="member-email"
              label="User Email Address"
              type="email"
              value={addMemberEmail}
              onChange={(e) => setAddMemberEmail(e.target.value)}
              placeholder="student@example.com"
              required
            />
          </div>
        ) : (
          <div>
            <p className={styles.modalText} style={{ marginBottom: 'var(--space-md)' }}>
              Add a member who doesn&apos;t have a Takween account. They will count toward the team size limit.
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
          </div>
        )}
      </Modal>
    </div>
  );
}
