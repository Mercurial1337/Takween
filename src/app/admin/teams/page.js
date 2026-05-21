import TeamsClient from './TeamsClient';

export const metadata = {
  title: 'Manage Teams | Admin | Takween',
  description: 'Overview of all active project teams and their members on Takween.',
};

export default function AdminTeamsPage() {
  return <TeamsClient />;
}
