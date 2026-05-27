'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Building2, ArrowLeft, Plus, UserPlus, UserMinus,
  Crown, Trash2, LogOut, MessageSquare, Check, X, HandHelping, AlertTriangle, Send
} from 'lucide-react';
import { Github, Linkedin } from '@/components/ui/Icons/Icons';
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
  const [activeTab, setActiveTab] = useState('teams'); // 'teams' or 'students'
  const [projectSeekers, setProjectSeekers] = useState([]);
  const [showSeekerModal, setShowSeekerModal] = useState(false);
  const [seekerMessage, setSeekerMessage] = useState('');

  // Modals
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinMessage, setJoinMessage] = useState('');
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [addMemberMode, setAddMemberMode] = useState('registered'); // 'registered' or 'manual'
  const [addMemberEmail, setAddMemberEmail] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualWhatsapp, setManualWhatsapp] = useState('');

  // Merge request state
  const [mergeRequests, setMergeRequests] = useState([]);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeTargetTeam, setMergeTargetTeam] = useState(null);
  const [mergeMessage, setMergeMessage] = useState('');

  // Invite to team state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteTarget, setInviteTarget] = useState(null);
  const [inviteMessage, setInviteMessage] = useState('');

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

  // The team the current user owns in this project (if any)
  const userOwnedTeam = useMemo(() => {
    if (!user) return null;
    return teams.find(t => t.owner_id === user.id) || null;
  }, [user, teams]);

  // Check if the user's team already has a pending merge request
  const userTeamPendingMerge = useMemo(() => {
    if (!userOwnedTeam) return null;
    return mergeRequests.find(
      mr => mr.source_team_id === userOwnedTeam.id && mr.status === 'pending'
    ) || null;
  }, [userOwnedTeam, mergeRequests]);

  // Check if current user is seeking a team for this project
  const userSeekerRecord = useMemo(() => {
    if (!user) return null;
    return projectSeekers.find(s => s.user_id === user.id) || null;
  }, [user, projectSeekers]);

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
            .select('*, profiles:user_id (id, full_name, avatar_url, level_id, levels:level_id (name), linkedin_url, github_url, whatsapp_number, email, profile_skills (skill_id, skills (name)))')
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

            // Fetch merge requests involving any teams in this project
            const { data: mergeData } = await supabase
              .from('team_merge_requests')
              .select('*')
              .or(`source_team_id.in.(${teamIds.join(',')}),target_team_id.in.(${teamIds.join(',')})`);
            if (mergeData) setMergeRequests(mergeData);
          }
        } else {
          setAllMembers([]);
          setAllManualMembers([]);
          setAllRequests([]);
          setMyRequests([]);
          setMergeRequests([]);
        }
      }

      // Get project seekers (available students)
      const { data: seekersData } = await supabase
        .from('project_seekers')
        .select('*, profiles:user_id (id, full_name, avatar_url, email, level_id, levels:level_id (name), linkedin_url, github_url, whatsapp_number, profile_skills (skill_id, skills (name)))')
        .eq('project_id', id)
        .order('created_at', { ascending: false });
      if (seekersData) setProjectSeekers(seekersData);

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

  // Request merge
  const handleMergeRequest = async () => {
    if (!mergeTargetTeam || !userOwnedTeam) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.from('team_merge_requests').insert({
        source_team_id: userOwnedTeam.id,
        target_team_id: mergeTargetTeam.id,
        message: mergeMessage || null,
      });
      if (error) throw error;

      // Notify target team owner
      await supabase.from('notifications').insert({
        user_id: mergeTargetTeam.owner_id,
        type: 'merge_received',
        title: 'Team merge request',
        body: `${profile?.full_name}'s team wants to merge into your team for ${project.title}.`,
        metadata: { source_team_id: userOwnedTeam.id, target_team_id: mergeTargetTeam.id },
      });

      // Send email to target team owner
      const sourceCount = allMembers.filter(m => m.team_id === userOwnedTeam.id).length
        + allManualMembers.filter(m => m.team_id === userOwnedTeam.id).length;
      try {
        await fetch('/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'merge_received',
            recipientEmail: mergeTargetTeam.profiles?.email,
            recipientName: mergeTargetTeam.profiles?.full_name,
            actorName: profile?.full_name,
            projectName: project.title,
            teamName: `${profile?.full_name}'s Team`,
            sourceMemberCount: sourceCount,
            message: mergeMessage || null,
          })
        });
      } catch (emailErr) {
        console.error('Failed to send merge email:', emailErr);
      }

      showToast({ title: 'Merge request sent', message: 'The target team owner will review your request.', variant: 'success' });
      setShowMergeModal(false);
      setMergeMessage('');
      setMergeTargetTeam(null);
      await fetchProject();
    } catch (err) {
      showToast({ title: 'Error', message: err.message, variant: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkAsSeeker = async () => {
    setActionLoading(true);
    try {
      const { error } = await supabase.from('project_seekers').insert({
        project_id: project.id,
        user_id: user.id,
        message: seekerMessage || null,
      });
      if (error) throw error;
      showToast({ title: 'Availability updated', message: 'You are now listed in the Available Students tab.', variant: 'success' });
      setShowSeekerModal(false);
      setSeekerMessage('');
      await fetchProject();
    } catch (err) {
      showToast({ title: 'Error', message: err.message, variant: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleWithdrawSeeker = async () => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('project_seekers')
        .delete()
        .match({ project_id: project.id, user_id: user.id });
      if (error) throw error;
      showToast({ title: 'Availability withdrawn', message: 'You have been removed from the Available Students tab.', variant: 'success' });
      await fetchProject();
    } catch (err) {
      showToast({ title: 'Error', message: err.message, variant: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Invite a seeker to the user's team
  const handleInviteSeeker = async () => {
    if (!inviteTarget || !userOwnedTeam) return;
    setActionLoading(true);
    try {
      // Insert into team_invites
      const { error } = await supabase.from('team_invites').insert({
        team_id: userOwnedTeam.id,
        user_id: inviteTarget.user_id,
        invited_by: user.id,
        message: inviteMessage || null,
      });
      if (error) {
        if (error.message?.includes('duplicate') || error.code === '23505') {
          throw new Error('You have already sent a pending invite to this student.');
        }
        throw error;
      }

      // Create DB notification
      await supabase.from('notifications').insert({
        user_id: inviteTarget.user_id,
        type: 'invite_received',
        title: 'Team invitation received',
        body: `${profile?.full_name} has invited you to join their team for ${project.title}.`,
        metadata: { team_id: userOwnedTeam.id },
      });

      // Send email notification
      try {
        await fetch('/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'invite_received',
            recipientEmail: inviteTarget.profiles?.email,
            recipientName: inviteTarget.profiles?.full_name,
            actorName: profile?.full_name,
            projectName: project.title,
            message: inviteMessage || null,
          }),
        });
      } catch (emailErr) {
        console.error('Failed to send invite email:', emailErr);
      }

      showToast({ title: 'Invitation sent', message: `${inviteTarget.profiles?.full_name} has been invited to your team.`, variant: 'success' });
      setShowInviteModal(false);
      setInviteMessage('');
      setInviteTarget(null);
    } catch (err) {
      showToast({ title: 'Cannot send invite', message: err.message, variant: 'error' });
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

      {/* Tabs UI */}
      <div className={styles.tabsContainer}>
        <div className={styles.tabsList}>
          <button
            className={`${styles.tabBtn} ${activeTab === 'teams' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('teams')}
          >
            <Users size={16} /> Teams
            <Badge variant="default" size="sm">{filteredTeams.length}</Badge>
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'students' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('students')}
          >
            <UserPlus size={16} /> Available Students
            <Badge variant="default" size="sm">{projectSeekers.length}</Badge>
          </button>
        </div>

        {/* Looking for a Team action for students */}
        {user && profile?.role === 'student' && !userHasTeam && (
          <div className={styles.seekerAction}>
            {userSeekerRecord ? (
              <Button variant="outline" size="sm" onClick={handleWithdrawSeeker} loading={actionLoading} icon={X}>
                Withdraw Availability
              </Button>
            ) : (
              <Button size="sm" onClick={() => setShowSeekerModal(true)} icon={Check}>
                I&apos;m looking for a team
              </Button>
            )}
          </div>
        )}
      </div>

      {activeTab === 'teams' && (
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

                    // Merge button logic: show only if current user owns a DIFFERENT team in this project
                    const canRequestMerge = userOwnedTeam
                      && userOwnedTeam.id !== t.id
                      && !userTeamPendingMerge
                      && t.status === 'recruiting';

                    // Check combined capacity for the merge button
                    const myTeamCount = userOwnedTeam
                      ? allMembers.filter(m => m.team_id === userOwnedTeam.id).length
                      + allManualMembers.filter(m => m.team_id === userOwnedTeam.id).length
                      : 0;
                    const combinedFits = (myTeamCount + tCount) <= project.max_team_size;

                    // Check if there's already a pending merge request involving this pair
                    const existingMergeWithThisTeam = mergeRequests.some(
                      mr => mr.status === 'pending' && (
                        (mr.source_team_id === userOwnedTeam?.id && mr.target_team_id === t.id) ||
                        (mr.source_team_id === t.id && mr.target_team_id === userOwnedTeam?.id)
                      )
                    );

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

                        <div className={styles.teamCardBottom}>
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

                          {canRequestMerge && !existingMergeWithThisTeam && combinedFits && (
                            <button
                              className={styles.mergeBtn}
                              onClick={(e) => {
                                e.stopPropagation();
                                setMergeTargetTeam(t);
                                setShowMergeModal(true);
                              }}
                              title="Request to merge your team into this team"
                            >
                              <HandHelping size={14} />
                              <span>Join as Team</span>
                            </button>
                          )}
                          {existingMergeWithThisTeam && (
                            <Badge variant="warning" size="sm">Merge Pending</Badge>
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
                                  {memberProfile?.github_url && (
                                    <a
                                      href={memberProfile.github_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={styles.socialIcon}
                                      title="GitHub"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Github size={14} />
                                    </a>
                                  )}
                                  {memberProfile?.linkedin_url && (
                                    <a
                                      href={memberProfile.linkedin_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={`${styles.socialIcon} ${styles.socialIconLinkedin}`}
                                      title="LinkedIn"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Linkedin size={14} />
                                    </a>
                                  )}
                                </div>
                                {canViewFullDetails && memberProfile?.levels?.name && (
                                  <p className={styles.memberLevel}>{memberProfile.levels.name}</p>
                                )}
                                {canViewFullDetails && memberProfile?.profile_skills?.length > 0 && (
                                  <div className={styles.memberSkills}>
                                    {memberProfile.profile_skills.map((ps) => (
                                      <Badge key={ps.skill_id} variant="default" size="sm">
                                        {ps.skills?.name}
                                      </Badge>
                                    ))}
                                  </div>
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
      )}

      {activeTab === 'students' && (
        <div className={styles.studentsSection}>
          {projectSeekers.length === 0 ? (
            <Card className={styles.noTeamCard}>
              <div className={styles.noTeamContent}>
                <UserPlus size={32} className={styles.noTeamIcon} />
                <h3>No available students found</h3>
                <p>No students have marked themselves as available for this project yet.</p>
              </div>
            </Card>
          ) : (
            <div className={styles.seekersGrid}>
              {projectSeekers.map((seeker) => (
                <Card key={seeker.id} className={styles.seekerCard}>
                  <div className={styles.seekerHeader}>
                    <Link href={`/profile/${seeker.user_id}`} className={styles.seekerLink}>
                      <Avatar name={seeker.profiles?.full_name} src={seeker.profiles?.avatar_url} size="lg" />
                    </Link>
                    <div>
                      <Link href={`/profile/${seeker.user_id}`} className={styles.seekerLinkName}>
                        <h4 className={styles.seekerName}>{seeker.profiles?.full_name}</h4>
                      </Link>
                      {seeker.profiles?.levels?.name && (
                        <p className={styles.seekerLevel}>{seeker.profiles.levels.name}</p>
                      )}
                      {(seeker.profiles?.github_url || seeker.profiles?.linkedin_url) && (
                        <div className={styles.seekerSocialLinks}>
                          {seeker.profiles?.github_url && (
                            <a
                              href={seeker.profiles.github_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={styles.socialIcon}
                              title="GitHub"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Github size={14} />
                            </a>
                          )}
                          {seeker.profiles?.linkedin_url && (
                            <a
                              href={seeker.profiles.linkedin_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`${styles.socialIcon} ${styles.socialIconLinkedin}`}
                              title="LinkedIn"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Linkedin size={14} />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {seeker.message && (
                    <div className={styles.seekerMessage}>
                      <MessageSquare size={14} />
                      <p>&quot;{seeker.message}&quot;</p>
                    </div>
                  )}
                  {seeker.profiles?.profile_skills?.length > 0 && (
                    <div className={styles.seekerSkills}>
                      {seeker.profiles.profile_skills.map((ps) => (
                        <Badge key={ps.skill_id} variant="default" size="sm">
                          {ps.skills?.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {user && userOwnedTeam && seeker.user_id !== user.id && (
                    <div className={styles.seekerActions}>
                      <Button
                        size="sm"
                        icon={Send}
                        variant="primary"
                        onClick={() => {
                          setInviteTarget(seeker);
                          setShowInviteModal(true);
                        }}
                      >
                        Invite to Team
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

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

      {/* Merge Request Modal */}
      <Modal
        isOpen={showMergeModal}
        onClose={() => { setShowMergeModal(false); setMergeTargetTeam(null); setMergeMessage(''); }}
        title="Request Team Merge"
        footer={
          <div className={styles.modalFooter}>
            <Button variant="ghost" onClick={() => { setShowMergeModal(false); setMergeTargetTeam(null); setMergeMessage(''); }}>Cancel</Button>
            <Button onClick={handleMergeRequest} loading={actionLoading} icon={HandHelping}>Send Request</Button>
          </div>
        }
      >
        {mergeTargetTeam && userOwnedTeam && (() => {
          const sourceCount = allMembers.filter(m => m.team_id === userOwnedTeam.id).length
            + allManualMembers.filter(m => m.team_id === userOwnedTeam.id).length;
          const targetCount = allMembers.filter(m => m.team_id === mergeTargetTeam.id).length
            + allManualMembers.filter(m => m.team_id === mergeTargetTeam.id).length;
          const combinedTotal = sourceCount + targetCount;
          const maxSize = project?.max_team_size || 0;
          const fits = combinedTotal <= maxSize;

          return (
            <div className={styles.mergeModalContent}>
              <p className={styles.modalText}>
                Request to merge <strong>your team</strong> into <strong>{mergeTargetTeam.profiles?.full_name}&apos;s team</strong> for <strong>{project.title}</strong>.
              </p>

              <div className={styles.mergeCapacityCard}>
                <div className={styles.mergeCapacityRow}>
                  <span>Your team</span>
                  <Badge variant="primary" size="sm">{sourceCount} members</Badge>
                </div>
                <div className={styles.mergeCapacityRow}>
                  <span>Target team</span>
                  <Badge variant="primary" size="sm">{targetCount} members</Badge>
                </div>
                <div className={`${styles.mergeCapacityRow} ${styles.mergeCapacityTotal}`}>
                  <span>Combined total</span>
                  <Badge variant={fits ? 'success' : 'error'} size="sm">
                    {combinedTotal} / {maxSize}
                  </Badge>
                </div>
              </div>

              {!fits && (
                <div className={styles.mergeWarning}>
                  <AlertTriangle size={16} />
                  <span>Combined team size exceeds the project limit. This merge cannot proceed.</span>
                </div>
              )}

              <div className={styles.mergeInfoBox}>
                <p><strong>What happens on merge:</strong></p>
                <ul>
                  <li>All your team members will join the target team</li>
                  <li>You will become a regular member (not owner)</li>
                  <li>Your current team will be dissolved</li>
                  <li>Pending join requests to your team will be auto-declined</li>
                </ul>
              </div>

              <Input
                id="merge-message"
                label="Message to team owner (optional)"
                value={mergeMessage}
                onChange={(e) => setMergeMessage(e.target.value)}
                placeholder="Explain why you'd like to merge teams..."
              />
            </div>
          );
        })()}
      </Modal>

      {/* Seeker Modal */}
      <Modal
        isOpen={showSeekerModal}
        onClose={() => { setShowSeekerModal(false); setSeekerMessage(''); }}
        title="Mark as Available"
        footer={
          <div className={styles.modalFooter}>
            <Button variant="ghost" onClick={() => { setShowSeekerModal(false); setSeekerMessage(''); }}>Cancel</Button>
            <Button onClick={handleMarkAsSeeker} loading={actionLoading} icon={Check}>Mark as Available</Button>
          </div>
        }
      >
        <div className={styles.modalContent}>
          <p className={styles.modalText} style={{ marginBottom: 'var(--space-md)' }}>
            By marking yourself as available, you will appear in the &quot;Available Students&quot; tab for this project. Team owners will be able to see your profile and invite you to their team.
          </p>
          <Input
            id="seeker-message"
            label="Short Message (optional)"
            value={seekerMessage}
            onChange={(e) => setSeekerMessage(e.target.value)}
            placeholder="e.g., I'm a backend developer looking for a team..."
          />
        </div>
      </Modal>

      {/* Invite to Team Modal */}
      <Modal
        isOpen={showInviteModal}
        onClose={() => { setShowInviteModal(false); setInviteTarget(null); setInviteMessage(''); }}
        title="Invite Student to Team"
        footer={
          <div className={styles.modalFooter}>
            <Button variant="ghost" onClick={() => { setShowInviteModal(false); setInviteTarget(null); setInviteMessage(''); }}>Cancel</Button>
            <Button onClick={handleInviteSeeker} loading={actionLoading} icon={Send}>Send Invitation</Button>
          </div>
        }
      >
        <div className={styles.modalContent}>
          {inviteTarget && (
            <div className={styles.seekerHeader} style={{ marginBottom: 'var(--space-md)' }}>
              <Avatar name={inviteTarget.profiles?.full_name} src={inviteTarget.profiles?.avatar_url} size="md" />
              <div>
                <h4 className={styles.seekerName}>{inviteTarget.profiles?.full_name}</h4>
                {inviteTarget.profiles?.levels?.name && (
                  <p className={styles.seekerLevel}>{inviteTarget.profiles.levels.name}</p>
                )}
              </div>
            </div>
          )}
          <p className={styles.modalText} style={{ marginBottom: 'var(--space-md)' }}>
            Send an invitation to this student to join your team for <strong>{project.title}</strong>. They will receive a notification and can accept or decline.
          </p>
          <Input
            id="invite-message"
            label="Message (optional)"
            value={inviteMessage}
            onChange={(e) => setInviteMessage(e.target.value)}
            placeholder="e.g., We need your skills on our team!"
          />
        </div>
      </Modal>
    </div>
  );
}
