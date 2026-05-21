import DashboardClient from './DashboardClient';

export const metadata = {
  title: 'Dashboard',
  description: 'Manage your teams, review incoming join requests, track project status, and view notifications on Takween.',
};

export default function DashboardPage() {
  return <DashboardClient />;
}
