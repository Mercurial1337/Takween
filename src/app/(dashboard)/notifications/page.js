import NotificationsClient from './NotificationsClient';

export const metadata = {
  title: 'Notifications | Takween',
  description: 'View your team invitations, join requests, status updates, and messages on Takween.',
};

export default function NotificationsPage() {
  return <NotificationsClient />;
}
