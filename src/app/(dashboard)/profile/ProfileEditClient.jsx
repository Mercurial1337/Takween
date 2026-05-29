'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { User, Mail, Phone, Globe, Code2, Save, Search } from 'lucide-react';
import { Linkedin, Github } from '@/components/ui/Icons/Icons';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { profileUpdateSchema } from '@/lib/validators';
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
  const router = useRouter();
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
  const [errors, setErrors] = useState({});
  const [countryCode, setCountryCode] = useState('+20');
  const [showCustomCode, setShowCustomCode] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const phone = profile.whatsapp_number || '';
    // Detect country code from stored number
    const knownCodes = ['+20', '+966', '+967', '+970', '+962', '+971', '+249'];
    let detectedCode = '+20';
    let visiblePhone = phone;
    
    const match = phone.match(/^(\+\d{1,4})(.*)$/);
    if (match) {
      detectedCode = match[1];
      visiblePhone = match[2];
    }
    
    const isCustom = !knownCodes.includes(detectedCode);

    Promise.resolve().then(() => {
      setCountryCode(detectedCode);
      if (isCustom && detectedCode !== '+20') {
        setShowCustomCode(true);
      }
      setFormData({
        full_name: profile.full_name || '',
        whatsapp_number: visiblePhone,
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
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setErrors({});

    // Format URLs before validation
    const formattedLinkedin = formData.linkedin_url ? (formData.linkedin_url.startsWith('http') ? formData.linkedin_url : `https://${formData.linkedin_url}`) : '';
    const formattedGithub = formData.github_url ? (formData.github_url.startsWith('http') ? formData.github_url : `https://${formData.github_url}`) : '';

    const urlErrors = {};
    if (formattedLinkedin) {
      try {
        const linkedinCheck = profileUpdateSchema.shape.linkedin_url;
        linkedinCheck.parse(formattedLinkedin);
      } catch {
        urlErrors.linkedin_url = 'Must be a valid LinkedIn URL (e.g. linkedin.com/in/...)';
      }
    }
    if (formattedGithub) {
      try {
        const githubCheck = profileUpdateSchema.shape.github_url;
        githubCheck.parse(formattedGithub);
      } catch {
        urlErrors.github_url = 'Must be a valid GitHub URL (e.g. github.com/...)';
      }
    }
    if (Object.keys(urlErrors).length > 0) {
      setErrors(urlErrors);
      setSaving(false);
      return;
    }

    try {
      // Format WhatsApp number before validation & submission
      let rawPhone = formData.whatsapp_number.trim().replace(/[^\d]/g, '');
      let formattedWhatsapp = rawPhone;
      if (rawPhone) {
        if (rawPhone.startsWith('0')) {
          rawPhone = rawPhone.substring(1);
        }
        formattedWhatsapp = countryCode + rawPhone;
      }

      // Check if selected level requires a department
      const selectedLvl = levels.find((l) => l.id === formData.level_id);
      const requiresDepartment = selectedLvl ? !!selectedLvl.requires_department : false;
      const finalDeptId = requiresDepartment ? (formData.department_id || null) : null;

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          whatsapp_number: formattedWhatsapp,
          level_id: formData.level_id || null,
          department_id: finalDeptId,
          linkedin_url: formattedLinkedin || null,
          github_url: formattedGithub || null,
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

  const selectedLvl = levels.find((l) => l.id === formData.level_id);
  const requiresDepartment = selectedLvl ? !!selectedLvl.requires_department : false;

  return (
    <div className={styles.page}>
      <PageHeader title="Profile" description="Manage your personal information and skills." />

      <Card className={styles.profileCard}>
        <div className={styles.avatarSection}>
          <Avatar name={profile?.full_name} src={profile?.avatar_url} size="xl" />
          <div>
            <h2 className={styles.profileName}>{profile?.full_name}</h2>
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
              value={formData.whatsapp_number}
              onChange={(e) => updateField('whatsapp_number', e.target.value.replace(/\D/g, '').slice(0, 11))}
              required
              placeholder="01000666777"
              helperText="E.g, 01........ (11 numbers total)"
              leftElement={
                showCustomCode ? (
                  <input
                    type="text"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    style={{
                      border: 'none',
                      background: 'none',
                      fontSize: 'var(--text-sm)',
                      color: 'var(--color-text)',
                      fontWeight: 500,
                      outline: 'none',
                      width: '65px',
                      padding: 0
                    }}
                    placeholder="+"
                    autoFocus
                    onBlur={(e) => {
                      if (!e.target.value || e.target.value === '+') {
                        setShowCustomCode(false);
                        setCountryCode('+20');
                      }
                    }}
                  />
                ) : (
                  <select
                    value={countryCode}
                    onChange={(e) => {
                      if (e.target.value === 'other') {
                        setShowCustomCode(true);
                        setCountryCode('+');
                      } else {
                        setCountryCode(e.target.value);
                      }
                    }}
                    aria-label="Country code"
                    style={{
                      appearance: 'none',
                      WebkitAppearance: 'none',
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      fontSize: 'var(--text-sm)',
                      color: 'var(--color-text)',
                      fontWeight: 500,
                      padding: '0 2px 0 0',
                      outline: 'none',
                      minWidth: '62px',
                    }}
                  >
                    <option value="+20">🇪🇬 EG +20</option>
                    <option value="+966">🇸🇦 SA +966</option>
                    <option value="+967">🇾🇪 YE +967</option>
                    <option value="+970">🇵🇸 PS +970</option>
                    <option value="+962">🇯🇴 JO +962</option>
                    <option value="+971">🇦🇪 AE +971</option>
                    <option value="+249">🇸🇩 SD +249</option>
                    <option value="other">🌍 Other</option>
                  </select>
                )
              }
            />
          </div>

          <Select
            id="profile-level"
            label="Academic Level"
            placeholder="Select your level"
            options={levels.map((l) => ({ value: l.id, label: l.name }))}
            value={formData.level_id}
            onChange={(e) => {
              const val = e.target.value;
              const lvl = levels.find((l) => l.id === val);
              const reqs = lvl ? !!lvl.requires_department : false;
              setFormData((prev) => ({
                ...prev,
                level_id: val,
                department_id: reqs ? prev.department_id : '',
              }));
            }}
          />

          {requiresDepartment && (
            <Select
              id="profile-department"
              label="Department"
              placeholder="Select your department"
              options={departments.map((d) => ({ value: d.id, label: d.name }))}
              value={formData.department_id}
              onChange={(e) => updateField('department_id', e.target.value)}
              required
            />
          )}

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
              error={errors.linkedin_url}
              placeholder="linkedin.com/in/..."
            />
            <Input
              id="profile-github"
              label="GitHub URL"
              icon={Github}
              value={formData.github_url}
              onChange={(e) => updateField('github_url', e.target.value)}
              error={errors.github_url}
              placeholder="github.com/..."
            />
          </div>

          <div className={styles.actions}>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => router.push('/update-password')}
            >
              Change Password
            </Button>
            <Button onClick={handleSave} loading={saving} icon={Save}>
              Save Changes
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
