import FeedbackDetailClient from './FeedbackDetailClient';

export const metadata = {
  title: 'Feedback Details | Admin | Takween',
  description: 'View details for a specific feedback submission.',
};

export default async function FeedbackDetailPage(props) {
  const params = await props.params;
  return <FeedbackDetailClient id={params.id} />;
}
