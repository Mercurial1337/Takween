'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryState, useQueryUpdater } from '@/hooks/useQueryState';
import {
  Users, Building2, ArrowLeft, Plus, UserPlus, Check, X, Send, Lock, MessageSquare,
  UsersRound, AlertTriangle
} from 'lucide-react';
import { Github, Linkedin, Whatsapp } from '@/components/ui/Icons/Icons';
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
import Pagination from '@/components/ui/Pagination/Pagination';
import Breadcrumbs from '@/components/ui/Breadcrumbs/Breadcrumbs';
import styles from './page.module.css';
import Link from 'next/link';

const ensureAbsoluteUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `https://${url}`;
};


export default function ProjectDetailClient({ id }) {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [project, setProject] = useState(null);
  const [teams, setTeams] = useState([]);
  const [allMembers, setAllMembers] = useState([]);
  const [allManualMembers, setAllManualMembers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [deptFilter, setDeptFilter] = useQueryState('dept', 'all');
  const [sortFilter, setSortFilter] = useQueryState('sort', 'newest');
  const [skillFilter, setSkillFilter] = useQueryState('skill', 'all');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useQueryState('tab', 'teams');
  const [projectSeekers, setProjectSeekers] = useState([]);

  // Pagination state (URL-synced)
  const TEAMS_PAGE_SIZE = 10;
  const STUDENTS_PAGE_SIZE = 10;
  const [teamPageStr, setTeamPage] = useQueryState('teamPage', '1');
  const [studentPageStr, setStudentPage] = useQueryState('studentPage', '1');
  const teamPage = parseInt(teamPageStr, 10) || 1;
  const studentPage = parseInt(studentPageStr, 10) || 1;
  const updateQuery = useQueryUpdater();
  const [showSeekerModal, setShowSeekerModal] = useState(false);
  const [seekerMessage, setSeekerMessage] = useState('');

  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [teamDescription, setTeamDescription] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteTarget, setInviteTarget] = useState(null);
  const [inviteMessage, setInviteMessage] = useState('');

  // Merge request ("Request to Join as Team") state
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeTarget, setMergeTarget] = useState(null);
  const [mergeMessage, setMergeMessage] = useState('');
  const [pendingOutgoingMerge, setPendingOutgoingMerge] = useState(null);

  // Visibility and Filtering logic
  const availableSkills = useMemo(() => {
    const skillsSet = new Map();
    allMembers.forEach(m => {
      m.profiles?.profile_skills?.forEach(ps => {
        if (ps.skills && ps.skills.name) {
          skillsSet.set(ps.skill_id, ps.skills.name);
        }
      });
    });
    return Array.from(skillsSet.entries()).map(([id, name]) => ({ id, name }));
  }, [allMembers]);

  const filteredTeams = useMemo(() => {
    if (!project) return [];

    const isGraduationProject = project.title?.toLowerCase().includes('graduation');
    const projectRequiresDepartment = isGraduationProject || !!project.department_id;

    let result = teams;

    // 1. Department Filtering
    if (user && profile && profile.role === 'student' && projectRequiresDepartment) {
      const studentDeptId = profile.department_id;
      if (!studentDeptId) return []; // Require department to see teams
    }

    if (deptFilter && deptFilter !== 'all') {
      result = result.filter(t => t.department_id === deptFilter);
    }

    // 2. Skills Filtering
    if (skillFilter && skillFilter !== 'all') {
      result = result.filter(t => {
        const membersInTeam = allMembers.filter(m => m.team_id === t.id);
        return membersInTeam.some(m =>
          m.profiles?.profile_skills?.some(ps => ps.skill_id === skillFilter)
        );
      });
    }

    // 3. Sorting
    result = [...result].sort((a, b) => {
      if (sortFilter === 'members_high' || sortFilter === 'members_low') {
        const aMembersCount = allMembers.filter(m => m.team_id === a.id).length + allManualMembers.filter(m => m.team_id === a.id).length;
        const bMembersCount = allMembers.filter(m => m.team_id === b.id).length + allManualMembers.filter(m => m.team_id === b.id).length;

        if (sortFilter === 'members_high') return bMembersCount - aMembersCount;
        if (sortFilter === 'members_low') return aMembersCount - bMembersCount;
      }
      return new Date(b.created_at) - new Date(a.created_at); // newest
    });

    return result;
  }, [teams, project, user, profile, deptFilter, skillFilter, sortFilter, allMembers, allManualMembers]);

  const filteredSeekers = useMemo(() => {
    let result = projectSeekers;

    // 1. Department Filtering
    if (deptFilter && deptFilter !== 'all') {
      result = result.filter(s => s.profiles?.department_id === deptFilter);
    }

    // 2. Skills Filtering
    if (skillFilter && skillFilter !== 'all') {
      result = result.filter(s =>
        s.profiles?.profile_skills?.some(ps => ps.skill_id === skillFilter)
      );
    }

    // 3. Sorting (newest first is default)
    result = [...result].sort((a, b) => {
      return new Date(b.created_at) - new Date(a.created_at);
    });

    return result;
  }, [projectSeekers, deptFilter, skillFilter]);

  // Paginated subsets
  const totalTeamPages = Math.ceil(filteredTeams.length / TEAMS_PAGE_SIZE);
  const paginatedTeams = useMemo(() => {
    const from = (teamPage - 1) * TEAMS_PAGE_SIZE;
    return filteredTeams.slice(from, from + TEAMS_PAGE_SIZE);
  }, [filteredTeams, teamPage]);

  const totalStudentPages = Math.ceil(filteredSeekers.length / STUDENTS_PAGE_SIZE);
  const paginatedSeekers = useMemo(() => {
    const from = (studentPage - 1) * STUDENTS_PAGE_SIZE;
    return filteredSeekers.slice(from, from + STUDENTS_PAGE_SIZE);
  }, [filteredSeekers, studentPage]);



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
          profiles:owner_id (id, full_name, avatar_url),
          departments:department_id (id, name)
        `)
        .eq('project_id', id)
        .order('created_at', { ascending: false });

      if (teamsData) {
        setTeams(teamsData);

        if (teamsData.length > 0) {
          const teamIds = teamsData.map(t => t.id);

          const { data: memberData } = await supabase
            .from('team_members')
            .select('*, profiles:user_id (id, full_name, avatar_url, whatsapp_number, level_id, levels:level_id (name), department_id, departments:department_id (name), linkedin_url, github_url, profile_skills (skill_id, skills (name)))')
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
          }
        } else {
          setAllMembers([]);
          setAllManualMembers([]);
        }
      }

      // Get project seekers (available students)
      const { data: seekersData } = await supabase
        .from('project_seekers')
        .select('*, profiles:user_id (id, full_name, avatar_url, whatsapp_number, level_id, levels:level_id (name), department_id, departments:department_id (name), linkedin_url, github_url, profile_skills (skill_id, skills (name)))')
        .eq('project_id', id)
        .order('created_at', { ascending: false });
      if (seekersData) setProjectSeekers(seekersData);

      // Fetch outgoing pending merge request (if user owns a team)
      if (user && teamsData) {
        const myTeam = teamsData.find(t => t.owner_id === user.id);
        if (myTeam) {
          const { data: outgoingMerge } = await supabase
            .from('team_merge_requests')
            .select('id, target_team_id, status')
            .eq('source_team_id', myTeam.id)
            .eq('status', 'pending')
            .maybeSingle();
          setPendingOutgoingMerge(outgoingMerge || null);
        } else {
          setPendingOutgoingMerge(null);
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
  const handleCreateTeam = async (e) => {
    if (e) e.preventDefault();
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
          department_id: profile?.department_id || null,
          description: teamDescription || null
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
      setShowCreateTeamModal(false);
      setTeamDescription('');
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
            recipientId: inviteTarget.user_id,
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

  // Send merge request ("Request to Join as Team")
  const handleSendMergeRequest = async () => {
    if (!user || !userOwnedTeam || !mergeTarget) return;

    // Validate: can't merge with your own team
    if (userOwnedTeam.id === mergeTarget.id) {
      showToast({ title: 'Error', message: 'You cannot send a merge request to your own team.', variant: 'error' });
      return;
    }

    // Validate: check if there's already a pending outgoing merge
    if (pendingOutgoingMerge) {
      showToast({ title: 'Request pending', message: 'You already have a pending merge request. Wait for a response or cancel it first.', variant: 'warning' });
      return;
    }

    // Calculate capacities
    const sourceCount = allMembers.filter(m => m.team_id === userOwnedTeam.id).length
      + allManualMembers.filter(m => m.team_id === userOwnedTeam.id).length;
    const targetCount = allMembers.filter(m => m.team_id === mergeTarget.id).length
      + allManualMembers.filter(m => m.team_id === mergeTarget.id).length;
    const combinedSize = sourceCount + targetCount;

    if (combinedSize > project.max_team_size) {
      showToast({
        title: 'Team too large',
        message: `Combined team size (${combinedSize}) exceeds the project limit (${project.max_team_size}).`,
        variant: 'error'
      });
      return;
    }

    setActionLoading(true);
    try {
      const { error } = await supabase.from('team_merge_requests').insert({
        source_team_id: userOwnedTeam.id,
        target_team_id: mergeTarget.id,
        message: mergeMessage || null,
      });

      if (error) {
        if (error.message?.includes('duplicate') || error.code === '23505') {
          throw new Error('A pending merge request already exists for this team.');
        }
        throw error;
      }

      // Notify the target team owner
      const targetOwnerId = mergeTarget.owner_id;
      if (targetOwnerId) {
        await supabase.from('notifications').insert({
          user_id: targetOwnerId,
          type: 'merge_received',
          title: 'Team join request received',
          body: `${profile?.full_name}'s team has requested to join your team for ${project.title}.`,
          metadata: { source_team_id: userOwnedTeam.id, target_team_id: mergeTarget.id },
        });

        // Send email notification
        try {
          await fetch('/api/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'merge_received',
              recipientId: targetOwnerId,
              recipientName: mergeTarget.profiles?.full_name,
              actorName: profile?.full_name,
              projectName: project.title,
              message: mergeMessage || null,
              sourceMemberCount: sourceCount,
            }),
          });
        } catch (emailErr) {
          console.error('Failed to send merge request email:', emailErr);
        }
      }

      showToast({
        title: 'Request sent',
        message: `Your team's join request has been sent to ${mergeTarget.profiles?.full_name}.`,
        variant: 'success'
      });
      setShowMergeModal(false);
      setMergeMessage('');
      setMergeTarget(null);
      await fetchProject();
    } catch (err) {
      showToast({ title: 'Cannot send request', message: err.message, variant: 'error' });
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
        <Breadcrumbs customLabels={{ [id]: project?.title || 'Project' }} />
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
      <Breadcrumbs customLabels={{ [id]: project.title }} />

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
      {teams.length > 0 && (
        <div className={styles.filterBar}>
          <div className={styles.filterWrapper}>
            <Select
              id="dept-filter"
              placeholder="All Departments"
              options={[{ value: 'all', label: 'All Departments' }, ...departments.map((d) => ({ value: d.id, label: d.name }))]}
              value={deptFilter}
              onChange={(e) => { updateQuery({ dept: e.target.value, teamPage: null, studentPage: null }); }}
            />
          </div>

          <div className={styles.filterWrapper}>
            <Select
              id="skill-filter"
              placeholder="All Skills"
              options={[{ value: 'all', label: 'All Skills' }, ...availableSkills.map((s) => ({ value: s.id, label: s.name }))]}
              value={skillFilter}
              onChange={(e) => { updateQuery({ skill: e.target.value, teamPage: null, studentPage: null }); }}
            />
          </div>

          <div className={styles.filterWrapper}>
            <Select
              id="sort-filter"
              placeholder="Sort By"
              options={[
                { value: 'newest', label: 'Newest First' },
                { value: 'members_high', label: 'Members (High to Low)' },
                { value: 'members_low', label: 'Members (Low to High)' }
              ]}
              value={sortFilter}
              onChange={(e) => { updateQuery({ sort: e.target.value, teamPage: null }); }}
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
            <Badge variant="default" size="sm">{filteredSeekers.length}</Badge>
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
                  There are no teams available matching the criteria.
                </p>
                {user ? (
                  !userHasTeam && profile?.role === 'student' && (
                    <Button onClick={() => setShowCreateTeamModal(true)} icon={Plus}>
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
            <div className={styles.teamsGrid}>
              {paginatedTeams.map((t) => {
                const tMembers = allMembers.filter((m) => m.team_id === t.id);
                const tManual = allManualMembers.filter((m) => m.team_id === t.id);
                const tCount = tMembers.length + tManual.length;
                const isTFull = tCount >= project.max_team_size;

                return (
                  <Card key={t.id} className={styles.teamListItemCard} hoverable>
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
                      <div className={styles.teamCardActions}>
                        {/* Request to Join as Team button — visible to owners of other teams */}
                        {userOwnedTeam && userOwnedTeam.id !== t.id && !isTFull && t.status !== 'closed' && (
                          pendingOutgoingMerge?.target_team_id === t.id ? (
                            <Badge variant="default" size="sm" className={styles.pendingMergeBadge}>
                              Request Pending
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              icon={UsersRound}
                              className={styles.mergeBtn}
                              disabled={!!pendingOutgoingMerge}
                              title={pendingOutgoingMerge ? 'You already have a pending request to another team' : 'Request to join this team with all your members'}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setMergeTarget(t);
                                setShowMergeModal(true);
                              }}
                            >
                              Join as Team
                            </Button>
                          )
                        )}
                        <Link href={`/teams/${t.id}`}>
                          <Button size="sm" variant="outline">
                            View Details
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </Card>
                );
              })}
              {totalTeamPages > 1 && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <Pagination
                    currentPage={teamPage}
                    totalPages={totalTeamPages}
                    onPageChange={(p) => setTeamPage(String(p))}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'students' && (
        <div className={styles.studentsSection}>
          {filteredSeekers.length === 0 ? (
            <Card className={styles.noTeamCard}>
              <div className={styles.noTeamContent}>
                <UserPlus size={32} className={styles.noTeamIcon} />
                <h3>No available students found</h3>
                <p>No students have marked themselves as available for this project yet.</p>
              </div>
            </Card>
          ) : (
            <>
            <div className={styles.seekersGrid}>
              {paginatedSeekers.map((seeker) => (
                <Card key={seeker.id} className={styles.seekerCard}>
                  <div className={styles.seekerHeader}>
                    <Link href={`/profile/${seeker.user_id}`} className={styles.seekerLink}>
                      <Avatar name={seeker.profiles?.full_name} src={seeker.profiles?.avatar_url} size="lg" />
                    </Link>
                    <div>
                      <Link href={`/profile/${seeker.user_id}`} className={styles.seekerLinkName}>
                        <h4 className={styles.seekerName}>{seeker.profiles?.full_name}</h4>
                      </Link>
                      {(seeker.profiles?.levels?.name || seeker.profiles?.departments?.name) && (
                        <p className={styles.seekerLevel}>
                          {[seeker.profiles?.levels?.name, seeker.profiles?.departments?.name].filter(Boolean).join(', ')}
                        </p>
                      )}
                      {(seeker.profiles?.github_url || seeker.profiles?.linkedin_url || seeker.profiles?.whatsapp_number) && (
                        user ? (
                          <div className={styles.seekerSocialLinks}>
                            {seeker.profiles?.github_url && (
                              <a
                                href={ensureAbsoluteUrl(seeker.profiles.github_url)}
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
                                href={ensureAbsoluteUrl(seeker.profiles.linkedin_url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`${styles.socialIcon} ${styles.socialIconLinkedin}`}
                                title="LinkedIn"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Linkedin size={14} />
                              </a>
                            )}
                            {seeker.profiles?.whatsapp_number && (
                              <a
                                href={`https://wa.me/${seeker.profiles.whatsapp_number.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`${styles.socialIcon} ${styles.socialIconWhatsapp}`}
                                title="WhatsApp"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Whatsapp size={14} />
                              </a>
                            )}
                          </div>
                        ) : (
                          <div className={styles.seekerSocialLinks} style={{ alignItems: 'center', gap: '6px', color: 'var(--color-text-muted)' }}>
                            <Lock size={14} />
                            <Link href={`/login?redirect=/projects/${id}`} style={{ fontSize: 'var(--text-xs)', textDecoration: 'underline', color: 'inherit' }}>
                              Sign in to view
                            </Link>
                          </div>
                        )
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
            {totalStudentPages > 1 && (
              <Pagination
                currentPage={studentPage}
                totalPages={totalStudentPages}
                onPageChange={(p) => setStudentPage(String(p))}
              />
            )}
            </>
          )}
        </div>
      )}



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
      {/* Create Team Modal */}
      {showCreateTeamModal && (
        <Modal
          isOpen={true}
          title="Create Team"
          onClose={() => { setShowCreateTeamModal(false); setTeamDescription(''); }}
        >
          <form onSubmit={handleCreateTeam} className={styles.modalForm}>
            <p className={styles.modalText}>
              You are about to create a team for <strong>{project.title}</strong>. You will automatically be added as the team owner.
            </p>
            <div className={styles.formGroup}>
              <label htmlFor="team-desc" className={styles.label}>Requirements & Description (Optional)</label>
              <textarea
                id="team-desc"
                value={teamDescription}
                onChange={(e) => setTeamDescription(e.target.value)}
                placeholder="What exactly do you need? (e.g. Need a React developer, or محتاجين حد شاطر في الـ Backend)"
                className={styles.textarea}
                rows={4}
              />
              <p className={styles.helperText} style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                This will be visible to students browsing teams to join. You can type in Arabic or English.
              </p>
            </div>
            <div className={styles.modalActions}>
              <Button type="button" variant="outline" onClick={() => setShowCreateTeamModal(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={actionLoading}>
                Create Team
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Request to Join as Team Modal */}
      <Modal
        isOpen={showMergeModal}
        onClose={() => { setShowMergeModal(false); setMergeTarget(null); setMergeMessage(''); }}
        title="Request to Join as Team"
        footer={
          <div className={styles.modalFooter}>
            <Button variant="ghost" onClick={() => { setShowMergeModal(false); setMergeTarget(null); setMergeMessage(''); }}>Cancel</Button>
            <Button onClick={handleSendMergeRequest} loading={actionLoading} icon={UsersRound}>Send Request</Button>
          </div>
        }
      >
        <div className={styles.modalContent}>
          {mergeTarget && (() => {
            const sourceCount = allMembers.filter(m => m.team_id === userOwnedTeam?.id).length
              + allManualMembers.filter(m => m.team_id === userOwnedTeam?.id).length;
            const targetCount = allMembers.filter(m => m.team_id === mergeTarget.id).length
              + allManualMembers.filter(m => m.team_id === mergeTarget.id).length;
            const combinedSize = sourceCount + targetCount;
            const exceedsLimit = combinedSize > project.max_team_size;

            return (
              <>
                {/* Target team info */}
                <div className={styles.mergeModalTeamInfo}>
                  <Avatar name={mergeTarget.profiles?.full_name} src={mergeTarget.profiles?.avatar_url} size="md" />
                  <div>
                    <h4 className={styles.mergeModalTeamName}>{mergeTarget.profiles?.full_name}&apos;s Team</h4>
                    <p className={styles.mergeModalTeamDetail}>
                      <Users size={12} /> {targetCount} / {project.max_team_size} members
                    </p>
                  </div>
                </div>

                {/* Capacity breakdown */}
                <div className={styles.mergeCapacityCard}>
                  <div className={styles.mergeCapacityRow}>
                    <span>Your team members</span>
                    <Badge variant="primary" size="sm">{sourceCount}</Badge>
                  </div>
                  <div className={styles.mergeCapacityRow}>
                    <span>Their team members</span>
                    <Badge variant="primary" size="sm">{targetCount}</Badge>
                  </div>
                  <div className={`${styles.mergeCapacityRow} ${styles.mergeCapacityTotal}`}>
                    <span>Combined total</span>
                    <Badge
                      variant={exceedsLimit ? 'error' : 'success'}
                      size="sm"
                    >
                      {combinedSize} / {project.max_team_size}
                    </Badge>
                  </div>
                </div>

                {exceedsLimit && (
                  <div className={styles.mergeWarning}>
                    <AlertTriangle size={16} />
                    <span>Combined team size exceeds the project limit. This request cannot be sent.</span>
                  </div>
                )}

                <p className={styles.modalText}>
                  By sending this request, you are asking <strong>{mergeTarget.profiles?.full_name}</strong> to accept all your team members into their team.
                  If accepted, your team will be dissolved and all members will be transferred.
                </p>

                <Input
                  id="merge-message"
                  label="Message (optional)"
                  value={mergeMessage}
                  onChange={(e) => setMergeMessage(e.target.value)}
                  placeholder="e.g., Our teams have complementary skills and we'd love to work together!"
                />
              </>
            );
          })()}
        </div>
      </Modal>

    </div>
  );
}
