'use client';

import { useEffect, useState, useMemo, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Mail, Phone, Globe, Code2, ArrowLeft, ShieldAlert, Award, MessageSquare } from 'lucide-react';
import { Github, Linkedin } from '@/components/ui/Icons/Icons';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Card from '@/components/ui/Card/Card';
import Button from '@/components/ui/Button/Button';
import Avatar from '@/components/ui/Avatar/Avatar';
import Badge from '@/components/ui/Badge/Badge';
import Skeleton from '@/components/ui/Skeleton/Skeleton';
import styles from './page.module.css';

export default function ProfileClient({ id }) {
  const { user } = useAuth();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [profile, setProfile] = useState(null);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isTeammate, setIsTeammate] = useState(false);

  const isSelf = user && user.id === id;

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        // Fetch profile and level name
        const { data: profileRows, error: profileErr } = await supabase
          .from('profiles')
          .select('*, levels:level_id (name)')
          .eq('id', id);

        if (profileErr) throw profileErr;
        const profileData = profileRows?.[0] || null;
        setProfile(profileData);

        // Fetch user's skills
        const { data: profileSkills } = await supabase
          .from('profile_skills')
          .select('skills (name)')
          .eq('profile_id', id);
        if (profileSkills) {
          setSkills(profileSkills.map((ps) => ps.skills.name));
        }

        // Check if teammate if not self
        if (user && !isSelf) {
          const { data: teammateCheck, error: rpcErr } = await supabase.rpc(
            'are_teammates',
            { user_a: user.id, user_b: id }
          );
          if (!rpcErr) {
            setIsTeammate(!!teammateCheck);
          }
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchProfileData();
  }, [id, user, isSelf, supabase]);

  if (loading) {
    return (
      <div className={styles.page}>
        <Skeleton variant="text" width="80px" height="24px" />
        <Skeleton variant="rectangular" height="350px" style={{ marginTop: '24px' }} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={styles.notFound}>
        <h2>Student not found</h2>
        <p>The profile you are looking for does not exist or has been removed.</p>
        <Link href="/projects" className={styles.backLink}>
          <ArrowLeft size={16} /> Back to Projects
        </Link>
      </div>
    );
  }

  const showContactInfo = isSelf || isTeammate;

  return (
    <div className={styles.page}>
      <button onClick={() => router.back()} className={styles.backLink}>
        <ArrowLeft size={16} /> Back
      </button>

      <Card className={styles.profileCard}>
        <div className={styles.profileHeader}>
          <Avatar name={profile.full_name} src={profile.avatar_url} size="xl" />
          <div className={styles.headerInfo}>
            <div className={styles.nameRow}>
              <h1 className={styles.title}>{profile.full_name}</h1>
              {isSelf && (
                <Badge variant="primary" size="sm">You</Badge>
              )}
              {isTeammate && (
                <Badge variant="success" size="sm">Teammate</Badge>
              )}
            </div>
            {profile.levels?.name && (
              <p className={styles.level}>
                <Award size={16} /> {profile.levels.name}
              </p>
            )}
          </div>
          {isSelf && (
            <div className={styles.editBtnContainer}>
              <Link href="/profile">
                <Button size="sm">Edit Profile</Button>
              </Link>
            </div>
          )}
        </div>

        <hr className={styles.divider} />

        <div className={styles.profileBody}>
          {/* Skills Section */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <Code2 size={18} /> Skills & Expertise
            </h3>
            {skills.length === 0 ? (
              <p className={styles.noSkills}>No skills added yet.</p>
            ) : (
              <div className={styles.skillsGrid}>
                {skills.map((skill) => (
                  <Badge key={skill} variant="default">
                    {skill}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Social Links Section */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <Globe size={18} /> Online Presence
            </h3>
            <div className={styles.linksGrid}>
              {profile.github_url ? (
                <a
                  href={profile.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.socialLink}
                >
                  <Github size={16} /> GitHub Profile
                </a>
              ) : (
                <span className={styles.noLink}>No GitHub link provided</span>
              )}
              {profile.linkedin_url ? (
                <a
                  href={profile.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.socialLink}
                >
                  <Linkedin size={16} /> LinkedIn Profile
                </a>
              ) : (
                <span className={styles.noLink}>No LinkedIn link provided</span>
              )}
            </div>
          </div>

          {/* Contact Details Section (Conditionally Protected) */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <Mail size={18} /> Contact Details
            </h3>
            {showContactInfo ? (
              <div className={styles.contactDetails}>
                <div className={styles.contactItem}>
                  <Mail size={16} />
                  <span>{profile.email}</span>
                </div>
                <div className={styles.contactItem}>
                  <Phone size={16} />
                  <span>{profile.whatsapp_number}</span>
                  <a
                    href={`https://wa.me/${profile.whatsapp_number.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.whatsappBtn}
                  >
                    <MessageSquare size={14} /> Message
                  </a>
                </div>
              </div>
            ) : (
              <div className={styles.protectedContact}>
                <ShieldAlert className={styles.lockIcon} size={20} />
                <div>
                  <p className={styles.protectedTitle}>Contact details hidden</p>
                  <p className={styles.protectedDesc}>
                    You must form a team with {profile.full_name.split(' ')[0]} to view their email and WhatsApp number.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
