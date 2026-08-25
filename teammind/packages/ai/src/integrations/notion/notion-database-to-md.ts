import {
  GetDatabaseResponse,
  PageObjectResponse,
  RichTextItemResponse,
} from '@notionhq/client/build/src/api-endpoints';

import { ConversionResult } from '../../types';
import * as md from './notion-to-md-conterter/utils/md';
import { CachingRateLimitedNotionClient } from './tm-advanced-notion-client';

export class NotionDatabaseToGFMConverter {
  private client: CachingRateLimitedNotionClient;

  constructor(client: CachingRateLimitedNotionClient) {
    this.client = client;
  }

  public async convert(
    databaseId: string,
    userMap: Map<string, { displayName: string }>,
  ): Promise<ConversionResult> {
    try {
      // 1. Get database schema
      const databaseSchema = await this.client.databases.retrieve({
        database_id: databaseId,
      });

      // 2. Query database content (rows)
      const databaseContent = await this.client.databases.query({
        database_id: databaseId,
        page_size: 100, // Reasonable limit for most databases
      });

      // 3. Convert to markdown table
      const markdown = this.convertToMarkdown(
        databaseSchema,
        databaseContent.results as PageObjectResponse[],
        userMap,
      );
      const sourceMentionedUserIds = this.extractUserIdsFromMarkdown(markdown);

      return {
        markdown,
        sourceMentionedUserIds,
      };
    } catch (error) {
      const errorMessage = (error as Error).message;
      throw new Error(`Failed to convert Notion database: ${errorMessage}`);
    }
  }

  private convertToMarkdown(
    schema: GetDatabaseResponse,
    rows: PageObjectResponse[],
    userMap: Map<string, { displayName: string }>,
  ): string {
    // Extract title from schema
    let title = 'Untitled Database';

    if ('title' in schema && Array.isArray(schema.title)) {
      title =
        schema.title
          .map((rt: RichTextItemResponse) => rt.plain_text)
          .join('') || title;
    }

    // Add title
    let markdown = `# ${title}\n\n`;

    // Extract column headers from schema
    const properties = schema.properties ?? {};
    const headers = Object.keys(properties).map(
      (key) => properties[key]?.name ?? key,
    );

    // Process each row
    const tableData = [headers];

    for (const row of rows) {
      if (!row.properties) continue;

      const rowData: string[] = [];

      // Extract values for each column
      for (const propName of Object.keys(properties)) {
        if (!row.properties[propName]) {
          rowData.push('');
          continue;
        }
        rowData.push(
          this.formatPropertyValue(row.properties[propName], userMap),
        );
      }

      tableData.push(rowData);
    }

    // Convert to markdown table
    markdown += md.table(tableData);

    return markdown;
  }

  private formatPropertyValue(
    property: Record<string, unknown>,
    userMap: Map<string, { displayName: string }>,
  ): string {
    if (!property) return '';

    // Handle different property types
    const type = property.type as string | undefined;
    if (!type) return '';

    switch (type) {
      case 'title': {
        const titleProp = property as { title?: RichTextItemResponse[] };
        return this.formatRichTextWithMentions(titleProp.title, userMap);
      }
      case 'rich_text': {
        const textProp = property as { rich_text?: RichTextItemResponse[] };
        return this.formatRichTextWithMentions(textProp.rich_text, userMap);
      }
      case 'number': {
        const numProp = property as { number?: number };
        return numProp.number?.toString() ?? '';
      }
      case 'select': {
        const selectProp = property as { select?: { name?: string } };
        return selectProp.select?.name ?? '';
      }
      case 'multi_select': {
        const multiSelectProp = property as {
          multi_select?: Array<{ name: string }>;
        };
        return (
          multiSelectProp.multi_select
            ?.map((select) => select.name)
            .join(', ') ?? ''
        );
      }
      case 'date': {
        const dateProp = property as {
          date?: { start?: string; end?: string };
        };

        if (!dateProp.date) return '';

        if (dateProp.date.end) {
          return `${dateProp.date.start ?? ''} to ${dateProp.date.end ?? ''}`;
        }
        return dateProp.date.start ?? '';
      }
      case 'checkbox': {
        const checkboxProp = property as { checkbox?: boolean };
        return checkboxProp.checkbox ? '✓' : '✗';
      }
      case 'url': {
        const urlProp = property as { url?: string };
        return urlProp.url ?? '';
      }
      case 'email': {
        const emailProp = property as { email?: string };
        return emailProp.email ?? '';
      }
      case 'phone_number': {
        const phoneProp = property as { phone_number?: string };
        return phoneProp.phone_number ?? '';
      }
      case 'formula': {
        const formulaProp = property as { formula?: Record<string, unknown> };
        return this.formatFormulaValue(formulaProp.formula);
      }
      case 'relation': {
        const relationProp = property as {
          relation?: Array<{ id: string }>;
        };
        return relationProp.relation?.map((rel) => rel.id).join(', ') ?? '';
      }
      case 'created_time': {
        const createdTimeProp = property as { created_time?: string };
        return createdTimeProp.created_time ?? '';
      }
      case 'created_by': {
        const createdByProp = property as {
          created_by?: { name?: string };
        };
        return createdByProp.created_by?.name ?? '';
      }
      case 'last_edited_time': {
        const lastEditedTimeProp = property as { last_edited_time?: string };
        return lastEditedTimeProp.last_edited_time ?? '';
      }
      case 'last_edited_by': {
        const lastEditedByProp = property as {
          last_edited_by?: { name?: string };
        };
        return lastEditedByProp.last_edited_by?.name ?? '';
      }
      case 'files': {
        const filesProp = property as {
          files?: Array<{ name: string }>;
        };
        return filesProp.files?.map((file) => file.name).join(', ') ?? '';
      }
      case 'people': {
        const peopleProp = property as {
          people?: Array<{ name?: string; id: string }>;
        };
        return (
          peopleProp.people
            ?.map((person) => person.name ?? person.id)
            .join(', ') ?? ''
        );
      }
      default:
        return '';
    }
  }

  private formatRichTextWithMentions(
    richText?: RichTextItemResponse[],
    userMap?: Map<string, { displayName: string }>,
  ): string {
    if (!richText?.length) return '';

    let result = '';

    for (const item of richText) {
      // Check if this is a user mention
      if (item.type === 'mention' && item.mention?.type === 'user') {
        const userId = item.mention.user?.id;
        if (userId && userMap) {
          const user = userMap.get(userId);
          const displayName = user?.displayName ?? item.plain_text;
          result += `<a href="/mentions/notion/${userId}" class="user-mention">@${displayName}</a>`;
          continue;
        }
      }

      // Otherwise, just use the plain text
      result += item.plain_text;
    }

    return result;
  }

  private formatFormulaValue(formula?: Record<string, unknown>): string {
    if (!formula) return '';

    const type = formula.type as string | undefined;
    if (!type) return '';

    switch (type) {
      case 'string': {
        const stringProp = formula as { string?: string };
        return stringProp.string ?? '';
      }
      case 'number': {
        const numberProp = formula as { number?: number };
        return numberProp.number?.toString() ?? '';
      }
      case 'boolean': {
        const booleanProp = formula as { boolean?: boolean };
        return booleanProp.boolean ? '✓' : '✗';
      }
      case 'date': {
        const dateProp = formula as {
          date?: { start?: string };
        };
        return dateProp.date?.start ?? '';
      }
      default:
        return '';
    }
  }

  private extractUserIdsFromMarkdown(markdown: string): string[] {
    const userIds = new Set<string>();
    const mentionRegex =
      /<a href="\/mentions\/notion\/([a-zA-Z0-9-]+)" class="user-mention">@.+?<\/a>/g;
    let match;

    while ((match = mentionRegex.exec(markdown)) !== null) {
      if (match[1]) {
        userIds.add(match[1]);
      }
    }

    return Array.from(userIds);
  }
}
