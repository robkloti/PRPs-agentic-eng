import { Database } from '@tm/supabase/database';

export type DocumentSource = Database['public']['Enums']['document_source'];

export type DocumentSourceCount = {
  [key in DocumentSource]: number;
};

export type Transcript = {
  speaker: string;
  text: string;
}[];
