import InvitesClient from './InvitesClient';

export const metadata = {
  title: 'Admin Invites | Admin | Takween',
  description: 'Invite new administrators or promote existing users to administrators on Takween.',
};

export default function AdminInvitesPage() {
  return <InvitesClient />;
}
