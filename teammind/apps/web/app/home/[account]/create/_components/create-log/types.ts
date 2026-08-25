import { Json } from '@tm/supabase/database';

import { Database } from '~/lib/database.types';

export type DocumentUpdateAction = Omit<
  Database['public']['Tables']['document_updates']['Row'],
  'meetings'
> & {
  meetings?: {
    title?: string | null;
    time_start: string | null;
    time_end: string | null;
    transcript?: Json;
  };
};
