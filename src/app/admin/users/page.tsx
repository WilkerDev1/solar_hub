import EmployeeManagementModule from '@/modules/admin/users/page';
import { DashboardShell } from '@/app/page';

export default function AdminUsersPage() {
  return (
    <DashboardShell defaultTab="admin">
      <EmployeeManagementModule />
    </DashboardShell>
  );
}
