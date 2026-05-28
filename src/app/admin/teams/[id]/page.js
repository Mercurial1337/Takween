import TeamManageClient from './TeamManageClient';

export const metadata = {
  title: 'Manage Team | Admin | Takween',
  description: 'View and manage team details, members, and requests.',
};

export default async function AdminTeamPage({ params }) {
  const { id } = await params;
  return <TeamManageClient id={id} />;
}
