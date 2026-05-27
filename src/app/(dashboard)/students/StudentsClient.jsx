'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Search, Building2, Users, Award, Code2, UserPlus, Send, Filter, GraduationCap } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useDebounce } from '@/hooks/useDebounce';
import PageHeader from '@/components/layout/PageHeader/PageHeader';
import Card from '@/components/ui/Card/Card';
import Badge from '@/components/ui/Badge/Badge';
import Input from '@/components/ui/Input/Input';
import Select from '@/components/ui/Select/Select';
import Button from '@/components/ui/Button/Button';
import Avatar from '@/components/ui/Avatar/Avatar';
import Modal from '@/components/ui/Modal/Modal';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import Skeleton from '@/components/ui/Skeleton/Skeleton';
import styles from './StudentsClient.module.css';

export default function StudentsClient() {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const supabase = useMemo(() => createClient(), []);

  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 350);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteTarget, setInviteTarget] = useState(null);
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteTeamId, setInviteTeamId] = useState('');
  const [myTeams, setMyTeams] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetchRefs = async () => {
      const [deptsRes, levelsRes] = await Promise.all([
        supabase.from('departments').select('*').order('name'),
        supabase.from('levels').select('*').order('sort_order'),
      ]);
      if (deptsRes.data) setDepartments(deptsRes.data);
      if (levelsRes.data) setLevels(levelsRes.data);
    };
    fetchRefs();
  }, [supabase]);

  useEffect(() => {
    if (!user) return;
    const fetchMyTeams = async () => {
      const { data } = await supabase
        .from('teams')
        .select(`
          id,
          status,
          department_id,
          project_id,
          projects (id, title, max_team_size, department_id),
          team_members (count),
          manual_members (count)
        `)
        .eq('owner_id', user.id)
        .eq('status', 'recruiting');
      if (data) setMyTeams(data);
    };
    fetchMyTeams();
  }, [user, supabase]);

  const fetchStudents = useCallback(async () => {
    try {
      let query = supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          avatar_url,
          level_id,
          department_id,
          linkedin_url,
          github_url,
          levels:level_id (name, sort_order),
          departments:department_id (name),
          profile_skills (skill_id, skills (name))
        `)
        .eq('is_looking_for_team', true)
        .eq('role', 'student');

      if (debouncedSearch) {
        query = query.ilike('full_name', `%${debouncedSearch}%`);
      }

      if (departmentFilter) {
        query = query.eq('department_id', departmentFilter);
      }

      if (levelFilter) {
        query = query.eq('level_id', levelFilter);
      }

      const { data } = await query.order('full_name');
      if (data) setStudents(data);
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase, debouncedSearch, departmentFilter, levelFilter]);

  useEffect(() => {
    // eslint-disable-next-line
    setLoading(true);
    fetchStudents();
  }, [fetchStudents]);

  const openInviteModal = (student) => {
    setInviteTarget(student);
    setInviteMessage('');
    setInviteTeamId('');
    setShowInviteModal(true);
  };

  const handleSendInvite = async () => {
    if (!inviteTeamId || !inviteTarget) return;
    setActionLoading(true);
    try {
      const { data: existing } = await supabase
        .from('team_invites')
        .select('id')
        .eq('team_id', inviteTeamId)
        .eq('user_id', inviteTarget.id)
        .eq('status', 'pending');

      if (existing && existing.length > 0) {
        showToast({ title: 'Already invited', message: 'This student already has a pending invite for this team.', variant: 'warning' });
        setActionLoading(false);
        return;
      }

      const selectedTeam = myTeams.find(t => t.id === inviteTeamId);
      const { data: memberCheck } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', inviteTeamId)
        .eq('user_id', inviteTarget.id);

      if (memberCheck && memberCheck.length > 0) {
        showToast({ title: 'Already a member', message: 'This student is already on this team.', variant: 'warning' });
        setActionLoading(false);
        return;
      }

      // Create the invite
      const { error } = await supabase.from('team_invites').insert({
        team_id: inviteTeamId,
        user_id: inviteTarget.id,
        invited_by: user.id,
        message: inviteMessage || null,
      });
      if (error) throw error;

      // Send notification
      const projectName = selectedTeam?.projects?.title || 'a project';
      await supabase.from('notifications').insert({
        user_id: inviteTarget.id,
        type: 'invite_received',
        title: 'Team invitation',
        body: `${profile?.full_name} has invited you to join their team for ${projectName}.`,
        metadata: { team_id: inviteTeamId, invited_by: user.id },
      });

      // Send email
      try {
        await fetch('/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'invite_received',
            recipientEmail: inviteTarget.email,
            recipientName: inviteTarget.full_name,
            actorName: profile?.full_name,
            projectName,
            message: inviteMessage || null,
          }),
        });
      } catch (emailErr) {
        console.error('Failed to send invite email:', emailErr);
      }

      showToast({ title: 'Invite sent', message: `${inviteTarget.full_name} has been invited to your team.`, variant: 'success' });
      setShowInviteModal(false);
      setInviteTarget(null);
      setInviteMessage('');
      setInviteTeamId('');
    } catch (err) {
      showToast({ title: 'Error', message: err.message, variant: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const availableTeamsForInvite = useMemo(() => {
    if (!inviteTarget || !myTeams.length) return [];
    return myTeams.filter(t => {
      const memberCount = (t.team_members?.[0]?.count || 0) + (t.manual_members?.[0]?.count || 0);
      const maxSize = t.projects?.max_team_size || 0;
      if (memberCount >= maxSize) return false;

      const teamDeptId = t.department_id;
      const studentDeptId = inviteTarget.department_id;
      if (teamDeptId && studentDeptId && teamDeptId !== studentDeptId) return false;

      return true;
    });
  }, [inviteTarget, myTeams]);

  const isTeamOwner = user && myTeams.length > 0;

  if (loading) {
    return (
      <div>
        <Skeleton variant="text" width="300px" height="32px" />
        <Skeleton variant="text" width="200px" height="20px" />
        <div className={styles.skeletonGrid}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} variant="rectangular" height="220px" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Student Directory"
        description="Find students who are looking for a team to join."
      />

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchWrapper}>
          <Input
            id="student-search"
            icon={Search}
            placeholder="Search students by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className={styles.filterWrapper}>
          <Select
            id="dept-filter"
            placeholder="All Departments"
            options={departments.map((d) => ({ value: d.id, label: d.name }))}
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
          />
        </div>
        <div className={styles.filterWrapper}>
          <Select
            id="level-filter"
            placeholder="All Levels"
            options={levels.map((l) => ({ value: l.id, label: l.name }))}
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
          />
        </div>
        {(searchQuery || departmentFilter || levelFilter) && (
          <button
            className={styles.clearBtn}
            onClick={() => { setSearchQuery(''); setDepartmentFilter(''); setLevelFilter(''); }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Results */}
      {students.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No students found"
          description={
            searchQuery || departmentFilter || levelFilter
              ? 'Try adjusting your filters to find more students.'
              : 'No students are currently looking for a team. Check back later!'
          }
        />
      ) : (
        <>
          <p className={styles.resultCount}>
            {students.length} student{students.length !== 1 ? 's' : ''} looking for a team
          </p>
          <div className={styles.grid}>
            {students.map((student) => {
              const skills = student.profile_skills?.map(ps => ps.skills?.name).filter(Boolean) || [];
              const profileLink = user ? `/profile/${student.id}` : `/login?redirect=/students`;

              return (
                <Card key={student.id} className={styles.studentCard}>
                  <div className={styles.cardContent}>
                    <div className={styles.studentHeader}>
                      <Link href={profileLink} className={styles.avatarLink}>
                        <Avatar name={student.full_name} src={student.avatar_url} size="lg" />
                      </Link>
                      <div className={styles.studentInfo}>
                        <Link href={profileLink} className={styles.studentNameLink}>
                          <h3 className={styles.studentName}>
                            {user ? student.full_name : student.full_name.split(' ')[0]}
                          </h3>
                        </Link>
                        {student.levels?.name && (
                          <span className={styles.levelTag}>
                            <GraduationCap size={13} />
                            {student.levels.name}
                          </span>
                        )}
                        {student.departments?.name && (
                          <span className={styles.deptTag}>
                            <Building2 size={13} />
                            {student.departments.name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Skills */}
                    {skills.length > 0 && (
                      <div className={styles.skillsSection}>
                        <div className={styles.skillsList}>
                          {skills.slice(0, 5).map((skill) => (
                            <Badge key={skill} variant="default" size="sm">{skill}</Badge>
                          ))}
                          {skills.length > 5 && (
                            <Badge variant="default" size="sm">+{skills.length - 5}</Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className={styles.cardActions}>
                    <Link href={profileLink} className={styles.viewProfileBtn}>
                      View Profile
                    </Link>
                    {isTeamOwner && student.id !== user?.id && (
                      <Button
                        size="sm"
                        icon={UserPlus}
                        onClick={() => openInviteModal(student)}
                      >
                        Invite
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Invite Modal */}
      <Modal
        isOpen={showInviteModal}
        onClose={() => { setShowInviteModal(false); setInviteTarget(null); }}
        title="Invite Student to Team"
        footer={
          <div className={styles.modalFooter}>
            <Button variant="ghost" onClick={() => { setShowInviteModal(false); setInviteTarget(null); }}>Cancel</Button>
            <Button
              onClick={handleSendInvite}
              loading={actionLoading}
              icon={Send}
              disabled={!inviteTeamId}
            >
              Send Invite
            </Button>
          </div>
        }
      >
        {inviteTarget && (
          <div className={styles.inviteModalContent}>
            <div className={styles.inviteStudentPreview}>
              <Avatar name={inviteTarget.full_name} src={inviteTarget.avatar_url} size="md" />
              <div>
                <p className={styles.inviteStudentName}>{inviteTarget.full_name}</p>
                <p className={styles.inviteStudentMeta}>
                  {inviteTarget.levels?.name}
                  {inviteTarget.departments?.name && ` · ${inviteTarget.departments.name}`}
                </p>
              </div>
            </div>

            {availableTeamsForInvite.length === 0 ? (
              <div className={styles.noTeamsMsg}>
                <p>No eligible teams available to invite this student.</p>
                <p className={styles.noTeamsMsgSub}>
                  Your teams may be full or in a different department.
                </p>
              </div>
            ) : (
              <>
                <Select
                  id="invite-team"
                  label="Select Team"
                  placeholder="Choose a team..."
                  options={availableTeamsForInvite.map(t => ({
                    value: t.id,
                    label: `${t.projects?.title} (${(t.team_members?.[0]?.count || 0) + (t.manual_members?.[0]?.count || 0)}/${t.projects?.max_team_size})`,
                  }))}
                  value={inviteTeamId}
                  onChange={(e) => setInviteTeamId(e.target.value)}
                  required
                />
                <Input
                  id="invite-message"
                  label="Message (optional)"
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  placeholder="Hi! We'd love to have you on our team..."
                />
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
