'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { User, Mail, Lock, Phone, Globe, Code2 } from 'lucide-react';
import { Linkedin, Github } from '@/components/ui/Icons/Icons';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import { registerSchema } from '@/lib/validators';
import Input from '@/components/ui/Input/Input';
import Button from '@/components/ui/Button/Button';
import Select from '@/components/ui/Select/Select';
import TagInput from '@/components/ui/TagInput/TagInput';
import styles from './RegisterForm.module.css';

export default function RegisterForm() {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
    whatsapp_number: '',
    level_id: '',
    skills: [],
    linkedin_url: '',
    github_url: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [levels, setLevels] = useState([]);
  const [skillSuggestions, setSkillSuggestions] = useState([]);
  const router = useRouter();
  const { showToast } = useToast();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const fetchData = async () => {
      const [levelsRes, skillsRes] = await Promise.all([
        supabase.from('levels').select('*').order('sort_order'),
        supabase.from('skills').select('*').order('name'),
      ]);
      if (levelsRes.data) setLevels(levelsRes.data);
      if (skillsRes.data) setSkillSuggestions(skillsRes.data);
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate
    const result = registerSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0];
        if (!fieldErrors[field]) fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      // 1. Sign up
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (signUpError) {
        showToast({ title: 'Registration failed', message: signUpError.message, variant: 'error' });
        return;
      }

      const userId = authData.user?.id;
      if (!userId) {
        showToast({ title: 'Registration failed', message: 'Could not create account.', variant: 'error' });
        return;
      }

      // 2. Create profile
      const { error: profileError } = await supabase.from('profiles').insert({
        id: userId,
        full_name: formData.full_name,
        email: formData.email,
        whatsapp_number: formData.whatsapp_number,
        level_id: formData.level_id,
        linkedin_url: formData.linkedin_url || null,
        github_url: formData.github_url || null,
      });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        showToast({ title: 'Profile setup failed', message: profileError.message, variant: 'error' });
        return;
      }

      // 3. Handle skills
      if (formData.skills.length > 0) {
        const skillIds = [];
        for (const skillName of formData.skills) {
          // Check if skill exists
          let { data: existing } = await supabase
            .from('skills')
            .select('id')
            .eq('name', skillName)
            .single();

          if (existing) {
            skillIds.push(existing.id);
          } else {
            // Create new custom skill
            const { data: newSkill } = await supabase
              .from('skills')
              .insert({ name: skillName, is_predefined: false })
              .select('id')
              .single();
            if (newSkill) skillIds.push(newSkill.id);
          }
        }

        // Insert profile_skills
        if (skillIds.length > 0) {
          await supabase.from('profile_skills').insert(
            skillIds.map((skillId) => ({ profile_id: userId, skill_id: skillId }))
          );
        }
      }

      showToast({ title: 'Welcome to Takween', message: 'Your account has been created.', variant: 'success' });
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      showToast({ title: 'Something went wrong', message: 'Please try again later.', variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      {/* Account Details */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Account Details</h3>
        <div className={styles.fields}>
          <Input
            id="reg-name"
            label="Full Name"
            icon={User}
            value={formData.full_name}
            onChange={(e) => updateField('full_name', e.target.value)}
            error={errors.full_name}
            required
            autoComplete="name"
          />
          <Input
            id="reg-email"
            label="Email"
            type="email"
            icon={Mail}
            value={formData.email}
            onChange={(e) => updateField('email', e.target.value)}
            error={errors.email}
            required
            autoComplete="email"
          />
          <div className={styles.row}>
            <Input
              id="reg-password"
              label="Password"
              type="password"
              icon={Lock}
              value={formData.password}
              onChange={(e) => updateField('password', e.target.value)}
              error={errors.password}
              required
              autoComplete="new-password"
            />
            <Input
              id="reg-confirm"
              label="Confirm Password"
              type="password"
              icon={Lock}
              value={formData.confirm_password}
              onChange={(e) => updateField('confirm_password', e.target.value)}
              error={errors.confirm_password}
              required
              autoComplete="new-password"
            />
          </div>
        </div>
      </div>

      {/* Contact & Academic */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Contact & Academic Info</h3>
        <div className={styles.fields}>
          <Input
            id="reg-whatsapp"
            label="WhatsApp Number"
            icon={Phone}
            value={formData.whatsapp_number}
            onChange={(e) => updateField('whatsapp_number', e.target.value)}
            error={errors.whatsapp_number}
            helperText="Only visible to your team members"
            required
            autoComplete="tel"
          />
          <Select
            id="reg-level"
            label="Academic Level"
            placeholder="Select your level"
            options={levels.map((l) => ({ value: l.id, label: l.name }))}
            value={formData.level_id}
            onChange={(e) => updateField('level_id', e.target.value)}
            error={errors.level_id}
            required
          />
        </div>
      </div>

      {/* Skills */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Skills</h3>
        <TagInput
          value={formData.skills}
          onChange={(skills) => updateField('skills', skills)}
          suggestions={skillSuggestions}
          placeholder="Search or add skills..."
          error={errors.skills}
        />
      </div>

      {/* Optional Links */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          Links <span className={styles.optional}>(optional)</span>
        </h3>
        <div className={styles.fields}>
          <Input
            id="reg-linkedin"
            label="LinkedIn URL"
            icon={Linkedin}
            value={formData.linkedin_url}
            onChange={(e) => updateField('linkedin_url', e.target.value)}
            error={errors.linkedin_url}
            placeholder="https://linkedin.com/in/..."
          />
          <Input
            id="reg-github"
            label="GitHub URL"
            icon={Github}
            value={formData.github_url}
            onChange={(e) => updateField('github_url', e.target.value)}
            error={errors.github_url}
            placeholder="https://github.com/..."
          />
        </div>
      </div>

      <Button type="submit" variant="primary" fullWidth loading={loading} size="lg">
        Create Account
      </Button>
    </form>
  );
}
