import type { User } from '@supabase/supabase-js';

import { AppLogo } from '~/components/app-logo';
import { ProfileAccountDropdownContainer } from '~/components/personal-account-dropdown-container';

interface TeamsNavigationMenuProps {
  user: User;
}

export function TeamsNavigationMenu({ user }: TeamsNavigationMenuProps) {
  return (
    <div className={'flex w-full items-center justify-between'}>
      <div className={'flex items-center space-x-8'}>
        <AppLogo hideTextOnMobile={true} />
      </div>

      <div className={'flex justify-end space-x-2.5'}>
        <ProfileAccountDropdownContainer collapsed={true} user={user} />
      </div>
    </div>
  );
}
