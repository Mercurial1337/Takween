import { createClient } from '@/lib/supabase/server';
import ProjectDetailClient from './ProjectDetailClient';

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

export default async function ProjectDetailPage({ params }) {
  const { id } = await params;
  return <ProjectDetailClient id={id} />;
}
