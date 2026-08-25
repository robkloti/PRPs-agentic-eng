import { AdminDashboard } from '@tm/admin/components/admin-dashboard';
import { AdminGuard } from '@tm/admin/components/admin-guard';
import { PageBody, PageHeader } from '@tm/ui/page';

function AdminPage() {
  return (
    <>
      <PageHeader
        title={'Super Admin'}
        description={`Your SaaS stats at a glance`}
      />

      <PageBody>
        <AdminDashboard />
      </PageBody>
    </>
  );
}

export default AdminGuard(AdminPage);
