import type { User } from '@supabase/supabase-js';

import { AppLogo } from '~/components/app-logo';

import { SiteHeaderAccountSection } from './site-header-account-section';
import { SiteNavigation } from './site-navigation';

export function SiteHeader(props: { user?: User | null }) {
  return (
    <div className={'fixed top-0 z-10 w-full backdrop-blur backdrop-filter'}>
      <div className={'px-2'}>
        <div className="grid h-14 grid-cols-[1fr,1fr] items-center md:grid-cols-3">
          <div className="flex justify-start">
            <div className="mr-2 mt-0.5 md:hidden">
              <SiteNavigation />
            </div>
            <AppLogo hideTextOnMobile={true} />
          </div>

          {/* Hide on mobile, show on medium screens */}
          <div className={'hidden justify-self-center md:block'}>
            <SiteNavigation />
          </div>

          <div className={'flex items-center justify-end space-x-1'}>
            <SiteHeaderAccountSection user={props.user ?? null} />
          </div>
        </div>
      </div>
    </div>
  );
}
