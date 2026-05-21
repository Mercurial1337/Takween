import SkillsClient from './SkillsClient';

export const metadata = {
  title: 'Manage Skills | Admin | Takween',
  description: 'Manage predefined student skills and tags on Takween.',
};

export default function AdminSkillsPage() {
  return <SkillsClient />;
}
