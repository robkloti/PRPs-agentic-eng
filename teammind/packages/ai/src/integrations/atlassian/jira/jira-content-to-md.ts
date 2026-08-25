/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import TurndownService from 'turndown';

import { ConversionResult, JiraIssue } from '../../../types';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const turndownPluginGfm = require('@guyplusplus/turndown-plugin-gfm');

export class JiraHTMLToGFMConverter {
  public convert(input: string | JiraIssue): ConversionResult {
    const mentionedUserIds = new Set<string>();

    // If input is a string, treat it as HTML
    if (typeof input === 'string') {
      try {
        const sanitizedHtml = this.sanitizeHtml(input);
        const markdown = this.convertHtmlContent(
          sanitizedHtml,
          mentionedUserIds,
        );
        return {
          markdown,
          sourceMentionedUserIds: Array.from(mentionedUserIds),
        };
      } catch (error) {
        console.error('Failed to convert HTML to Markdown:', error);
        return {
          markdown: input,
          sourceMentionedUserIds: Array.from(mentionedUserIds),
        };
      }
    }

    // Otherwise, treat it as a JiraIssue
    const issue = input;
    this.addCoreUserIds(issue, mentionedUserIds);
    let markdown = '';

    // Primary Content (Most semantically relevant)
    markdown += `# ${issue.fields.summary ?? 'Untitled Issue'}\n\n`;

    // Description (Core semantic content)
    if (issue.renderedFields?.description) {
      const descriptionMarkdown = this.convertHtmlContent(
        issue.renderedFields.description,
        mentionedUserIds,
      );
      markdown += `${descriptionMarkdown}\n\n`;
    }

    // Related Issues (Semantic connections)
    const hasRelatedIssues =
      issue.fields.parent ??
      (issue.fields.subtasks?.length ?? 0) > 0 ??
      (issue.fields.issuelinks?.length ?? 0) > 0;

    if (hasRelatedIssues) {
      markdown += '## Related Issues\n\n';

      // Parent issue
      if (issue.fields.parent) {
        markdown += `**Parent:** ${issue.fields.parent.key} - ${issue.fields.parent.fields?.summary ?? 'No Summary'}\n\n`;
      }

      // Subtasks
      if (issue.fields.subtasks?.length > 0) {
        markdown += '**Subtasks:**\n';
        issue.fields.subtasks.forEach((subtask) => {
          markdown += `* ${subtask.key} - ${subtask.fields?.summary ?? 'No Summary'} (${subtask.fields?.status?.name ?? 'Unknown Status'})\n`;
        });
        markdown += '\n';
      }

      // Issue links
      if (issue.fields.issuelinks?.length > 0) {
        markdown += '**Linked Issues:**\n';
        issue.fields.issuelinks.forEach((link) => {
          if (link.inwardIssue) {
            markdown += `* ${link.type?.inward ?? 'Related to'}: ${link.inwardIssue.key} - ${link.inwardIssue.fields?.summary ?? 'No Summary'}\n`;
          }
          if (link.outwardIssue) {
            markdown += `* ${link.type?.outward ?? 'Related to'}: ${link.outwardIssue.key} - ${link.outwardIssue.fields?.summary ?? 'No Summary'}\n`;
          }
        });
        markdown += '\n';
      }
    }

    // Metadata (Less relevant for semantic search - kept at bottom)
    markdown += '---\n\n';
    markdown += '## Metadata\n\n';

    // Project Info
    markdown += '### Project Information\n';
    markdown += `* **Project:** ${issue.fields.project?.name ?? 'Unknown'} (${issue.fields.project?.key ?? 'Unknown'})\n`;
    markdown += `* **Type:** ${issue.fields.issuetype?.name ?? 'Unknown'}\n`;
    markdown += `* **Status:** ${issue.fields.status?.name ?? 'Unknown'}\n`;
    markdown += `* **Priority:** ${issue.fields.priority?.name ?? 'Unknown'}\n\n`;

    // People
    markdown += '### People\n';
    markdown += `* **Creator:** ${issue.fields.creator?.displayName ?? 'Unknown'}\n`;
    markdown += `* **Reporter:** ${issue.fields.reporter?.displayName ?? 'Unassigned'}\n`;
    markdown += `* **Assignee:** ${issue.fields.assignee?.displayName ?? 'Unassigned'}\n\n`;

    // Timestamps
    markdown += '### Dates\n';
    markdown += `* **Created:** ${issue.fields.created ?? 'Unknown'}\n`;
    markdown += `* **Updated:** ${issue.fields.updated ?? 'Unknown'}\n`;
    if (issue.fields.duedate) {
      markdown += `* **Due Date:** ${issue.fields.duedate}\n`;
    }
    if (issue.fields.resolutiondate) {
      markdown += `* **Resolution Date:** ${issue.fields.resolutiondate}\n`;
    }
    markdown += '\n';

    // Progress
    const hasProgressInfo =
      issue.fields.timeestimate ??
      issue.fields.timespent ??
      issue.fields.progress?.percent;

    if (hasProgressInfo) {
      markdown += '### Progress\n';
      if (issue.fields.timeestimate) {
        markdown += `* **Time Estimate:** ${issue.fields.timeestimate}\n`;
      }
      if (issue.fields.timespent) {
        markdown += `* **Time Spent:** ${issue.fields.timespent}\n`;
      }
      if (issue.fields.progress?.percent) {
        markdown += `* **Progress:** ${issue.fields.progress.percent}%\n`;
      }
      markdown += '\n';
    }

    // Labels
    if (issue.fields.labels?.length) {
      markdown += '### Labels\n';
      markdown += `${issue.fields.labels.join(', ')}\n`;
    }

    return {
      markdown,
      sourceMentionedUserIds: Array.from(mentionedUserIds),
    };
  }

  private convertHtmlContent(
    html: string,
    mentionedUserIds: Set<string>,
  ): string {
    const turndownService = this.createTurndownService(mentionedUserIds);
    return turndownService.turndown(html);
  }

  private addCoreUserIds(
    issue: JiraIssue,
    mentionedUserIds: Set<string>,
  ): void {
    // Add creator if exists
    if (issue.fields.creator?.accountId) {
      mentionedUserIds.add(issue.fields.creator.accountId);
    }

    // Add reporter if exists
    if (issue.fields.reporter?.accountId) {
      mentionedUserIds.add(issue.fields.reporter.accountId);
    }

    // Add assignee if exists
    if (issue.fields.assignee?.accountId) {
      mentionedUserIds.add(issue.fields.assignee.accountId);
    }
  }

  private createTurndownService(
    mentionedUserIds: Set<string>,
  ): TurndownService {
    const service = new TurndownService({
      headingStyle: 'atx',
      hr: '---',
      bulletListMarker: '-',
      codeBlockStyle: 'fenced',
      emDelimiter: '*',
      strongDelimiter: '**',
      linkStyle: 'inlined',
      linkReferenceStyle: 'full',
    });

    service.use([
      turndownPluginGfm.gfm,
      turndownPluginGfm.tables,
      turndownPluginGfm.strikethrough,
    ]);

    this.addCustomRules(service, mentionedUserIds);

    return service;
  }

  private addCustomRules(
    service: TurndownService,
    mentionedUserIds: Set<string>,
  ): void {
    // Handle Jira status lozenge
    service.addRule('status-lozenge', {
      filter(node: any) {
        return (
          node.nodeName === 'SPAN' && node.classList.contains('aui-lozenge')
        );
      },
      replacement(content: string): string {
        return `[${content}]`;
      },
    });

    // Enhanced user mention handling
    service.addRule('user-mention', {
      filter(node: any) {
        return (
          node.nodeName === 'A' &&
          (node.classList.contains('user-hover') ??
            node.hasAttribute('data-account-id'))
        );
      },
      replacement(content: string, node: any): string {
        // Try different attributes to find the user ID
        const userId =
          node.getAttribute('data-account-id') ??
          node.getAttribute('accountid') ??
          node.getAttribute('rel')?.split(' ')[0] ??
          node.getAttribute('href')?.split('accountId=')[1]?.split('&')[0];

        if (userId) {
          // Decode URI component to handle percent-encoded IDs
          try {
            const decodedUserId = decodeURIComponent(userId);
            mentionedUserIds.add(decodedUserId);
          } catch {
            // If decoding fails, use the original ID
            mentionedUserIds.add(userId);
          }
        }

        return `@${content}`;
      },
    });

    // Handle code blocks with language specification
    service.addRule('code-block', {
      filter(node: any) {
        return node.nodeName === 'PRE' && node.firstChild.nodeName === 'CODE';
      },
      replacement(content: string, node: any): string {
        const code = node.firstChild;
        const language = code.className.replace('language-', '');
        return `\`\`\`${language}\n${content}\n\`\`\`\n\n`;
      },
    });

    // Handle Jira panels
    service.addRule('panel', {
      filter(node: any) {
        return node.nodeName === 'DIV' && node.classList.contains('panel');
      },
      replacement(content: string, node: any): string {
        // Get the background color from style attribute
        const backgroundColor = node
          .getAttribute('style')
          ?.match(/background-color:\s*([^;]+)/)?.[1]
          ?.trim()
          .toLowerCase();

        // Determine the panel type based on background color
        let type = 'Panel';
        switch (backgroundColor) {
          case '#e3fcef':
            type = 'Success';
            break;
          case '#deebff':
            type = 'Info';
            break;
          case '#fffae6':
            type = 'Warning';
            break;
          case '#ffebe6':
            type = 'Error';
            break;
          // Add more color mappings if needed
        }

        // Get panel classes for reference
        const classes = Array.from(node.classList).join(' ');

        // Clean up the content by removing extra newlines and spaces
        const cleanContent = content
          .trim()
          .replace(/\n\s*\n/g, '\n') // Replace multiple newlines with single newline
          .replace(/^\s+|\s+$/gm, ''); // Remove leading/trailing spaces from each line

        // Include both type and classes in the header if they differ
        const header =
          classes && classes !== `panel-${type.toLowerCase()}`
            ? `**${type}** [${classes}]`
            : `**${type}**`;

        return `> ${header}\n> ${cleanContent.split('\n').join('\n> ')}\n\n`;
      },
    });
  }

  private sanitizeHtml(html: string): string {
    return html
      .replace(/\uFEFF/g, '') // Remove BOM
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\r/g, '\n')
      .replace(/\t/g, '    ') // Convert tabs to spaces
      .replace(/\u00A0/g, ' '); // Convert non-breaking spaces to regular spaces
  }
}
