'use client';

import { useState, useEffect, useMemo } from 'react';
import { User, Mail, Phone, Globe, Code2, Save } from 'lucide-react';
import { Linkedin, Github } from '@/components/ui/Icons/Icons';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import PageHeader from '@/components/layout/PageHeader/PageHeader';
import Card from '@/components/ui/Card/Card';
import Input from '@/components/ui/Input/Input';
import Select from '@/components/ui/Select/Select';
import TagInput from '@/components/ui/TagInput/TagInput';
import Button from '@/components/ui/Button/Button';
import Avatar from '@/components/ui/Avatar/Avatar';
import Skeleton from '@/components/ui/Skeleton/Skeleton';
import styles from './page.module.css';

export default function ProfileEditClient() {
  const { user, profile, refreshProfile, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const supabase = useMemo(() => createClient(), []);

  const [formData, setFormData] = useState({
    full_name: '',
    whatsapp_number: '',
    level_id: '',
    department_id: '',
    linkedin_url: '',
    github_url: '',
  });
  const [skills, setSkills] = useState([]);
  const [levels, setLevels] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [skillSuggestions, setSkillSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    Promise.resolve().then(() => {
      setFormData({
        full_name: profile.full_name || '',
        whatsapp_number: profile.whatsapp_number || '',
        level_id: profile.level_id || '',
        department_id: profile.department_id || '',
        linkedin_url: profile.linkedin_url || '',
        github_url: profile.github_url || '',
      });
    });
  }, [profile]);

  useEffect(() => {
    const fetchData = async () => {
      const [levelsRes, deptsRes, skillsRes] = await Promise.all([
        supabase.from('levels').select('*').order('sort_order'),
        supabase.from('departments').select('*').order('name'),
        supabase.from('skills').select('*').order('name'),
      ]);
      if (levelsRes.data) setLevels(levelsRes.data);
      if (deptsRes.data) setDepartments(deptsRes.data);
      if (skillsRes.data) setSkillSuggestions(skillsRes.data);

      // Fetch user's skills
      if (user) {
        const { data: profileSkills } = await supabase
          .from('profile_skills')
          .select('skills (name)')
          .eq('profile_id', user.id);
        if (profileSkills) {
          setSkills(profileSkills.map((ps) => ps.skills.name));
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [user, supabase]);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          whatsapp_number: formData.whatsapp_number,
          level_id: formData.level_id || null,
          department_id: formData.department_id || null,
          linkedin_url: formData.linkedin_url || null,
          github_url: formData.github_url || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      // Update skills — delete all and re-insert
      await supabase.from('profile_skills').delete().eq('profile_id', user.id);

      if (skills.length > 0) {
        const skillIds = [];
        for (const skillName of skills) {
          let { data: existing } = await supabase
            .from('skills')
            .select('id')
            .eq('name', skillName)
            .single();

          if (existing) {
            skillIds.push(existing.id);
          } else {
            const { data: newSkill } = await supabase
              .from('skills')
              .insert({ name: skillName, is_predefined: false })
              .select('id')
              .single();
            if (newSkill) skillIds.push(newSkill.id);
          }
        }

        if (skillIds.length > 0) {
          await supabase.from('profile_skills').insert(
            skillIds.map((skillId) => ({ profile_id: user.id, skill_id: skillId }))
          );
        }
      }

      await refreshProfile();
      showToast({ title: 'Profile updated', variant: 'success' });
    } catch (err) {
      showToast({ title: 'Error', message: err.message, variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div>
        <Skeleton variant="text" width="200px" height="32px" />
        <Skeleton variant="rectangular" height="400px" />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader title="Profile" description="Manage your personal information and skills." />

      <Card className={styles.profileCard}>
        <div className={styles.avatarSection}>
          <Avatar name={profile?.full_name} src={profile?.avatar_url} size="xl" />
          <div>
            <h2 className={styles.profileName}>{profile?.full_name}</h2>
            <p className={styles.profileEmail}>{profile?.email}</p>
          </div>
        </div>

        <div className={styles.form}>
          <div className={styles.row}>
            <Input
              id="profile-name"
              label="Full Name"
              icon={User}
              value={formData.full_name}
              onChange={(e) => updateField('full_name', e.target.value)}
              required
            />
            <Input
              id="profile-whatsapp"
              label="WhatsApp Number"
              icon={Phone}
              value={formData.whatsapp_number}
              onChange={(e) => updateField('whatsapp_number', e.target.value)}
              required
            />
          </div>

          <Select
            id="profile-level"
            label="Academic Level"
            placeholder="Select your level"
            options={levels.map((l) => ({ value: l.id, label: l.name }))}
            value={formData.level_id}
            onChange={(e) => updateField('level_id', e.target.value)}
          />

          <Select
            id="profile-department"
            label="Department"
            placeholder="Select your department"
            options={departments.map((d) => ({ value: d.id, label: d.name }))}
            value={formData.department_id}
            onChange={(e) => updateField('department_id', e.target.value)}
            required
          />

          <TagInput
            label="Skills"
            value={skills}
            onChange={setSkills}
            suggestions={skillSuggestions}
            placeholder="Search or add skills..."
          />

          <div className={styles.row}>
            <Input
              id="profile-linkedin"
              label="LinkedIn URL"
              icon={Linkedin}
              value={formData.linkedin_url}
              onChange={(e) => updateField('linkedin_url', e.target.value)}
              placeholder="https://linkedin.com/in/..."
            />
            <Input
              id="profile-github"
              label="GitHub URL"
              icon={Github}
              value={formData.github_url}
              onChange={(e) => updateField('github_url', e.target.value)}
              placeholder="https://github.com/..."
            />
          </div>

          <div className={styles.actions}>
            <Button onClick={handleSave} loading={saving} icon={Save}>
              Save Changes
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
