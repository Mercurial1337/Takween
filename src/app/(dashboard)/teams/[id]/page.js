import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import TeamDetailClient from './TeamDetailClient';
import Skeleton from '@/components/ui/Skeleton/Skeleton';

export async function generateMetadata({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  
  const { data: team } = await supabase
    .from('teams')
    .select('description, profiles:owner_id (full_name)')
    .eq('id', id)
    .single();

  if (!team) {
    return {
      title: 'Team Not Found',
    };
  }

  const teamName = `${team.profiles?.full_name || 'Unknown'}'s Team`;

  return {
    title: `${teamName} | Takween`,
    description: team.description?.slice(0, 155) || 'Team details on Takween',
  };
}

function TeamDetailFallback() {
  return (
    <div>
      <Skeleton variant="text" width="200px" height="32px" />
      <Skeleton variant="text" width="400px" height="24px" />
      <Skeleton variant="rectangular" height="300px" />
    </div>
  );
}

export default async function TeamDetailPage({ params }) {
  const { id } = await params;
  return (
    <Suspense fallback={<TeamDetailFallback />}>
      <TeamDetailClient id={id} />
    </Suspense>
  );
}
