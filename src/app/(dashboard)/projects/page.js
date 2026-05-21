import ProjectsClient from './ProjectsClient';

export const metadata = {
  title: 'Browse Projects',
  description: 'Explore course and graduation projects, filter by department, search, and find teams looking for members on Takween.',
};

export default function ProjectsPage() {
  return <ProjectsClient />;
}
