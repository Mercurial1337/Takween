import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import ProjectDetailClient from './ProjectDetailClient';
import Skeleton from '@/components/ui/Skeleton/Skeleton';

export async function generateMetadata({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  
  const { data: project } = await supabase
    .from('projects')
    .select('title, description')
    .eq('id', id)
    .single();

  if (!project) {
    return {
      title: 'Project Not Found',
    };
  }

  return {
    title: project.title,
    description: project.description.slice(0, 155),
  };
}

function ProjectDetailFallback() {
  return (
    <div>
      <Skeleton variant="text" width="120px" height="20px" />
      <Skeleton variant="text" width="400px" height="36px" />
      <Skeleton variant="text" width="200px" height="20px" />
      <Skeleton variant="rectangular" height="500px" />
    </div>
  );
}

export default async function ProjectDetailPage({ params }) {
  const { id } = await params;
  return (
    <Suspense fallback={<ProjectDetailFallback />}>
      <ProjectDetailClient id={id} />
    </Suspense>
  );
}
