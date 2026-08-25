import { AdminGuard } from '@tm/admin/components/admin-guard';
import { PageBody, PageHeader } from '@tm/ui/page';

import { AdminCreateTeamForm } from '~/admin/accounts/create-team/_components/admin-create-team-form';

function CreateTeamPage() {
  return (
    <>
      <PageHeader
        title={'Create Team Account'}
        description={'Create a new team account and invite the owner'}
      />

      <PageBody>
        <AdminCreateTeamForm />
      </PageBody>
    </>
  );
}

export default AdminGuard(CreateTeamPage);
