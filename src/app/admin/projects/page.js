import ProjectsClient from './ProjectsClient';

export const metadata = {
  title: 'Manage Projects | Admin | Takween',
  description: 'Manage academic projects and course descriptions on Takween.',
};

export default function AdminProjectsPage() {
  return <ProjectsClient />;
}
