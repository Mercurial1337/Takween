'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { User, Mail, Lock, Phone, Globe, Code2, CheckCircle2, Eye, EyeOff } from 'lucide-react';
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
    department_id: '',
    skills: [],
    linkedin_url: '',
    github_url: '',
  });
  const [countryCode, setCountryCode] = useState('+20');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [levels, setLevels] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [skillSuggestions, setSkillSuggestions] = useState([]);
  const [verificationSent, setVerificationSent] = useState(false);
  const [submitStatus, setSubmitStatus] = useState({ type: null, message: '' });
  const router = useRouter();
  const { showToast } = useToast();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let retryCount = 0;
    let retryTimer = null;
    let isMounted = true;

    const fetchData = async () => {
      try {
        const [levelsRes, deptsRes, skillsRes] = await Promise.all([
          supabase.from('levels').select('*').order('sort_order'),
          supabase.from('departments').select('*').order('name'),
          supabase.from('skills').select('*').order('name'),
        ]);

        if (!isMounted) return;

        let hasFailure = false;

        if (levelsRes.error) {
          console.error('Error fetching levels:', levelsRes.error);
          hasFailure = true;
        } else if (levelsRes.data) {
          setLevels(levelsRes.data);
          if (levelsRes.data.length === 0) {
            console.warn('Levels data is empty. Seed data might be missing or env variables not set.');
            hasFailure = true;
          }
        }

        if (deptsRes.error) {
          console.error('Error fetching departments:', deptsRes.error);
          hasFailure = true;
        } else if (deptsRes.data) {
          setDepartments(deptsRes.data);
        }

        if (skillsRes.error) {
          console.error('Error fetching skills:', skillsRes.error);
          hasFailure = true;
        } else if (skillsRes.data) {
          setSkillSuggestions(skillsRes.data);
        }

        // Retry on failure with exponential backoff (max 3 retries)
        if (hasFailure && retryCount < 3) {
          retryCount++;
          const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 4000);
          console.warn(`Retrying reference data fetch (attempt ${retryCount}/3) in ${delay}ms...`);
          retryTimer = setTimeout(() => {
            if (isMounted) fetchData();
          }, delay);
        } else if (hasFailure && retryCount >= 3) {
          showToast({ title: 'Connection Error', message: 'Failed to load form data. Please refresh the page.', variant: 'error' });
        }
      } catch (err) {
        console.error('Unexpected error fetching reference data:', err);
        if (isMounted && retryCount < 3) {
          retryCount++;
          const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 4000);
          retryTimer = setTimeout(() => {
            if (isMounted) fetchData();
          }, delay);
        }
      }
    };
    fetchData();

    return () => {
      isMounted = false;
      if (retryTimer) clearTimeout(retryTimer);
    };
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

    // Format WhatsApp number before validation & submission
    let rawPhone = formData.whatsapp_number.trim().replace(/[^\d]/g, '');
    let formattedWhatsapp = rawPhone;
    if (rawPhone) {
      if (rawPhone.startsWith('0')) {
        rawPhone = rawPhone.substring(1);
      }
      formattedWhatsapp = countryCode + rawPhone;
    }

    // Custom check for department requirement based on academic level (required for Year 3 and above)
    const selectedLvl = levels.find((l) => l.id === formData.level_id);
    const requiresDepartment = selectedLvl ? selectedLvl.sort_order >= 3 : false;

    const dataToValidate = {
      ...formData,
      whatsapp_number: formattedWhatsapp,
      department_id: requiresDepartment ? formData.department_id : null
    };

    // Validate
    const result = registerSchema.safeParse(dataToValidate);
    
    const fieldErrors = {};
    if (!result.success) {
      // Use Zod v4 .issues array — take only the first error per field
      for (const issue of result.error.issues) {
        const field = issue.path?.[0];
        if (field && !fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
    }

    // Conditionally require department only if academic level requires it
    if (requiresDepartment && !formData.department_id) {
      fieldErrors.department_id = 'Please select your department';
    }

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      setSubmitStatus({ type: 'error', message: 'Please correct the errors in the form.' });
      return;
    }

    setLoading(true);
    setSubmitStatus({ type: null, message: '' });
    try {
      // 1. Sign up (include metadata so the DB trigger can create the profile and skills automatically)
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: dataToValidate.email,
        password: dataToValidate.password,
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
          data: {
            full_name: dataToValidate.full_name,
            whatsapp_number: formattedWhatsapp,
            level_id: dataToValidate.level_id || null,
            department_id: dataToValidate.department_id || null,
            linkedin_url: dataToValidate.linkedin_url || null,
            github_url: dataToValidate.github_url || null,
            skills: dataToValidate.skills,
          },
        },
      });

      if (signUpError) {
        showToast({ title: 'Registration failed', message: signUpError.message, variant: 'error' });
        setSubmitStatus({ type: 'error', message: signUpError.message });
        return;
      }

      // Check if a session was created. If not, confirmation is required by Supabase.
      if (!authData.session) {
        setVerificationSent(true);
        showToast({
          title: 'Verification email sent',
          message: 'Please check your inbox to confirm your email.',
          variant: 'success',
        });
        setSubmitStatus({ type: 'success', message: 'Verification email sent. Please check your inbox!' });
        return;
      }

      const userId = authData.user?.id;
      if (!userId) {
        showToast({ title: 'Registration failed', message: 'Could not create account.', variant: 'error' });
        setSubmitStatus({ type: 'error', message: 'Could not create account.' });
        return;
      }

      // 2. Client-side fallback / direct upsert (if session exists, e.g. email confirmation is turned off)
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: userId,
        full_name: dataToValidate.full_name,
        email: dataToValidate.email,
        whatsapp_number: formattedWhatsapp,
        level_id: dataToValidate.level_id || null,
        department_id: dataToValidate.department_id || null,
        linkedin_url: dataToValidate.linkedin_url || null,
        github_url: dataToValidate.github_url || null,
      });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        showToast({ title: 'Profile setup failed', message: profileError.message, variant: 'error' });
        setSubmitStatus({ type: 'error', message: profileError.message });
        return;
      }

      // 3. Handle skills fallback
      if (formData.skills.length > 0) {
        const skillIds = [];
        for (const skillName of formData.skills) {
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
          await supabase.from('profile_skills').upsert(
            skillIds.map((skillId) => ({ profile_id: userId, skill_id: skillId }))
          );
        }
      }

      showToast({ title: 'Welcome to Takween', message: 'Your account has been created.', variant: 'success' });
      setSubmitStatus({ type: 'success', message: 'Your account has been created! Redirecting...' });
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      showToast({ title: 'Something went wrong', message: 'Please try again later.', variant: 'error' });
      setSubmitStatus({ type: 'error', message: 'Something went wrong. Please try again later.' });
    } finally {
      setLoading(false);
    }
  };

  const selectedLvl = levels.find((l) => l.id === formData.level_id);
  const requiresDepartment = selectedLvl ? selectedLvl.sort_order >= 3 : false;

  if (verificationSent) {
    return (
      <div className={styles.successState}>
        <CheckCircle2 size={64} className={styles.successIcon} />
        <h2 className={styles.successTitle}>Verify Your Email</h2>
        <p className={styles.successText}>
          We have sent a verification link to <strong>{formData.email}</strong>. 
          Please check your inbox and click the link to confirm your account and start using Takween.
        </p>
        <Button onClick={() => router.push('/login')} style={{ marginTop: 'var(--space-md)' }} fullWidth>
          Go to Login
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      {submitStatus.message && (
        <div style={{
          padding: 'var(--space-md)',
          borderRadius: 'var(--radius-md)',
          backgroundColor: submitStatus.type === 'error' ? 'var(--color-error-bg)' : 'var(--color-success-bg)',
          border: `1px solid ${submitStatus.type === 'error' ? 'var(--color-error)' : 'var(--color-success)'}`,
          color: submitStatus.type === 'error' ? 'var(--color-error)' : 'var(--color-success)',
          fontSize: 'var(--text-sm)',
          fontWeight: 'var(--font-semibold)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <span style={{ fontSize: '18px', display: 'flex', alignItems: 'center' }}>
            {submitStatus.type === 'error' ? '⚠️' : '✅'}
          </span>
          <span>{submitStatus.message}</span>
        </div>
      )}
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
              type={showPassword ? 'text' : 'password'}
              icon={Lock}
              value={formData.password}
              onChange={(e) => updateField('password', e.target.value)}
              error={errors.password}
              required
              autoComplete="new-password"
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
            />
            <Input
              id="reg-confirm"
              label="Confirm Password"
              type={showConfirmPassword ? 'text' : 'password'}
              icon={Lock}
              value={formData.confirm_password}
              onChange={(e) => updateField('confirm_password', e.target.value)}
              error={errors.confirm_password}
              required
              autoComplete="new-password"
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
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
            value={formData.whatsapp_number}
            onChange={(e) => updateField('whatsapp_number', e.target.value.replace(/^0/, ''))}
            error={errors.whatsapp_number}
            helperText="E.g. for +20 1009426569, select EG +20 and type 1009426569. We automatically remove leading zeros."
            required
            autoComplete="tel"
            placeholder="1009426569"
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
          <Select
            id="reg-level"
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
              if (errors.level_id) {
                setErrors((prev) => ({ ...prev, level_id: undefined }));
              }
              if (!reqs && errors.department_id) {
                setErrors((prev) => ({ ...prev, department_id: undefined }));
              }
            }}
            error={errors.level_id}
            required
          />
          {requiresDepartment && (
            <Select
              id="reg-department"
              label="Department"
              placeholder="Select your department"
              options={departments.map((d) => ({ value: d.id, label: d.name }))}
              value={formData.department_id}
              onChange={(e) => updateField('department_id', e.target.value)}
              error={errors.department_id}
              required
            />
          )}
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
