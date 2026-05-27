import StudentsClient from './StudentsClient';

export const metadata = {
  title: 'Student Directory — Takween',
  description: 'Find students who are looking for a team. Browse by department, academic level, and skills to invite them to your project team.',
};

export default function StudentsPage() {
  return <StudentsClient />;
}
