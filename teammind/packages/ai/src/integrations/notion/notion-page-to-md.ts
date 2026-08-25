import { ConversionResult } from '../../types';
import { NotionToMarkdown } from './notion-to-md-conterter';
import { CachingRateLimitedNotionClient } from './tm-advanced-notion-client';

export class NotionToGFMConverter {
  private n2mConverter: NotionToMarkdown;

  constructor(client: CachingRateLimitedNotionClient) {
    this.n2mConverter = new NotionToMarkdown({ notionClient: client });
  }

  public async convert(
    pageId: string,
    userMap?: Map<string, { displayName: string }>,
  ): Promise<ConversionResult> {
    try {
      const mdBlocks = await this.n2mConverter.pageToMarkdown(pageId, {
        userMap,
      });

      const markdown = this.n2mConverter.toMarkdownString(mdBlocks);
      const sourceMentionedUserIds = this.extractUserIdsFromMarkdown(
        markdown.parent ?? '',
      );

      return {
        markdown: markdown.parent,
        sourceMentionedUserIds,
      };
    } catch (error) {
      const errorMessage = (error as Error).message;
      throw new Error(`Failed to convert Notion content: ${errorMessage}`);
    }
  }

  /**
   * Extract user IDs from the generated markdown by looking for user mention patterns
   */
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
