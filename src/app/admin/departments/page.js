import DepartmentsClient from './DepartmentsClient';

export const metadata = {
  title: 'Manage Departments | Admin | Takween',
  description: 'Manage university departments and categories for projects on Takween.',
};

export default function AdminDepartmentsPage() {
  return <DepartmentsClient />;
}
