import { Suspense } from 'react';
import ProjectsClient from './ProjectsClient';
import Skeleton from '@/components/ui/Skeleton/Skeleton';

export const metadata = {
  title: 'Browse Projects',
  description: 'Explore course and graduation projects, filter by department, search, and find teams looking for members on Takween.',
};

function ProjectsFallback() {
  return (
    <div>
      <Skeleton variant="text" width="300px" height="32px" />
      <Skeleton variant="text" width="200px" height="20px" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '24px' }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} variant="rectangular" height="200px" />
        ))}
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={<ProjectsFallback />}>
      <ProjectsClient />
    </Suspense>
  );
}
