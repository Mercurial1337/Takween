import UsersClient from './UsersClient';

export const metadata = {
  title: 'Manage Users | Admin | Takween',
  description: 'View and manage all registered users on Takween.',
};

export default function AdminUsersPage() {
  return <UsersClient />;
}
