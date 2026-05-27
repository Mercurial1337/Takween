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

  useEffect(() => {
    if (!profile) return;
    const phone = profile.whatsapp_number || '';
    // Detect country code from stored number
    const knownCodes = ['+966', '+971', '+974', '+965', '+973', '+968', '+962', '+961', '+44', '+49', '+33', '+90', '+91', '+20', '+1'];
    let detectedCode = '+20';
    let visiblePhone = phone;
    for (const code of knownCodes) {
      if (phone.startsWith(code)) {
        detectedCode = code;
        visiblePhone = phone.substring(code.length);
        break;
      }
    }
    Promise.resolve().then(() => {
      setCountryCode(detectedCode);
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

    // Validate URL fields before saving
    const urlErrors = {};
    if (formData.linkedin_url) {
      try {
        const linkedinCheck = profileUpdateSchema.shape.linkedin_url;
        linkedinCheck.parse(formData.linkedin_url);
      } catch {
        urlErrors.linkedin_url = 'Must be a valid LinkedIn URL (e.g. https://linkedin.com/in/...)';
      }
    }
    if (formData.github_url) {
      try {
        const githubCheck = profileUpdateSchema.shape.github_url;
        githubCheck.parse(formData.github_url);
      } catch {
        urlErrors.github_url = 'Must be a valid GitHub URL (e.g. https://github.com/...)';
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

      // Check if selected level requires a department (sort_order >= 3)
      const selectedLvl = levels.find((l) => l.id === formData.level_id);
      const requiresDepartment = selectedLvl ? selectedLvl.sort_order >= 3 : false;
      const finalDeptId = requiresDepartment ? (formData.department_id || null) : null;

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          whatsapp_number: formattedWhatsapp,
          level_id: formData.level_id || null,
          department_id: finalDeptId,
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

  const selectedLvl = levels.find((l) => l.id === formData.level_id);
  const requiresDepartment = selectedLvl ? selectedLvl.sort_order >= 3 : false;

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
              value={formData.whatsapp_number}
              onChange={(e) => updateField('whatsapp_number', e.target.value.replace(/^0/, ''))}
              required
              placeholder="1009426569"
              helperText="E.g. for +20 1009426569, select EG +20 and type 1009426569. We automatically remove leading zeros."
              leftElement={
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
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
                  <option value="+20">EG +20</option>
                  <option value="+966">SA +966</option>
                  <option value="+971">AE +971</option>
                  <option value="+974">QA +974</option>
                  <option value="+965">KW +965</option>
                  <option value="+973">BH +973</option>
                  <option value="+968">OM +968</option>
                  <option value="+962">JO +962</option>
                  <option value="+961">LB +961</option>
                  <option value="+1">US +1</option>
                  <option value="+44">UK +44</option>
                  <option value="+49">DE +49</option>
                  <option value="+33">FR +33</option>
                  <option value="+90">TR +90</option>
                  <option value="+91">IN +91</option>
                </select>
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
              const reqs = lvl ? lvl.sort_order >= 3 : false;
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
              placeholder="https://linkedin.com/in/..."
            />
            <Input
              id="profile-github"
              label="GitHub URL"
              icon={Github}
              value={formData.github_url}
              onChange={(e) => updateField('github_url', e.target.value)}
              error={errors.github_url}
              placeholder="https://github.com/..."
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
