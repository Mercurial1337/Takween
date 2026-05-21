import { createClient } from '@/lib/supabase/server';
import ProfileClient from './ProfileClient';

export async function generateMetadata({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', id)
    .single();

  if (!profile) {
    return {
      title: 'Student Profile',
    };
  }

  return {
    title: `${profile.full_name}`,
    description: `View ${profile.full_name}'s academic level, skills, and projects on Takween.`,
  };
}

export default async function PublicProfilePage({ params }) {
  const { id } = await params;
  return <ProfileClient id={id} />;
}
