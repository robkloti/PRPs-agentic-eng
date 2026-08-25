import { SupabaseClient } from '@supabase/supabase-js';

import { Database } from '@tm/supabase/database';

import { DocumentAccessManager, SupabaseVectorStore } from '../../../storage';
import { JiraMetadata, ProcessingJiraIssue } from '../../../types';
import { JiraApi } from './jira-api';
import { JiraHTMLToGFMConverter } from './jira-content-to-md';

const CONFIG = {
  BATCH_SIZE: 50,
  API_LIMIT: 100,
  MIN_CONTENT_CHAR_LIMIT: 10,
} as const;

interface JiraLoaderConfig {
  userId: string;
  cloudId: string;
  baseUrl: string;
  accessToken: string;
  supabase: SupabaseClient<Database>;
  selectedBoards: Array<{
    id: number;
    name: string;
    location: {
      projectId: number;
      projectKey: string;
    };
  }>;
}

interface FetchIssuesResult {
  results: ProcessingJiraIssue[];
  next_cursor?: string;
}

interface FetchIssuesOptions {
  cursor?: string;
  modifiedSince?: Date;
}

interface AccessOperation {
  id: string;
  projectKey: string;
  updatedAt: string;
}

export class JiraLoader {
  private readonly cloudId: string;
  private readonly accessToken: string;
  private readonly baseUrl: string;
  private readonly userId: string;
  private readonly selectedBoards: JiraLoaderConfig['selectedBoards'];
  private readonly vectorStore: SupabaseVectorStore;
  private readonly accessManager: DocumentAccessManager;
  private readonly converter = new JiraHTMLToGFMConverter();

  constructor(config: JiraLoaderConfig) {
    this.cloudId = config.cloudId;
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl;
    this.userId = config.userId;
    this.selectedBoards = config.selectedBoards;
    this.accessManager = new DocumentAccessManager(config.supabase);
    this.vectorStore = new SupabaseVectorStore(config.supabase);
  }

  public async load(options?: { modifiedSince?: Date }): Promise<void> {
    try {
      await this.loadIssueBatches(options);
    } catch (error) {
      console.error('Error loading Jira issues:', error);
      throw error;
    }
  }

  private async loadIssueBatches(options?: {
    modifiedSince?: Date;
  }): Promise<void> {
    const allIssues: ProcessingJiraIssue[] = [];
    let cursor: string | undefined;

    do {
      try {
        const { results: issues, next_cursor } = await this.fetchIssues({
          cursor,
          modifiedSince: options?.modifiedSince,
        });

        if (issues.length === 0) break;
        allIssues.push(...issues);
        cursor = next_cursor;

        console.log(
          `[JIRA LOADER] Loaded ${allIssues.length} issues so far...`,
        );
      } catch (error) {
        console.error('[JIRA LOADER] Error fetching issues:', error);
        continue;
      }
    } while (cursor);

    // Process issues in batches
    for (let i = 0; i < allIssues.length; i += CONFIG.BATCH_SIZE) {
      try {
        const batch = allIssues.slice(i, i + CONFIG.BATCH_SIZE);

        const existingDocs =
          await this.vectorStore.getExistingDocumentsBySourceId<JiraMetadata>(
            batch.map((issue) => issue.id),
            'jira',
            {
              board_id: this.selectedBoards.map((board) => board.id.toString()),
            },
          );

        const { toStore, toAddAccess } = this.classifyIssues(
          batch,
          existingDocs,
        );

        console.log(
          `[JIRA LOADER] Processing batch ${i / CONFIG.BATCH_SIZE + 1}: ` +
            `${batch.length} issues | ` +
            `${existingDocs.size} existing | ` +
            `${toStore.length} to store | ` +
            `${toAddAccess.length} to add access`,
        );

        // Handle access updates
        if (toAddAccess.length > 0) {
          await this.accessManager.manageUserAccess(this.userId, 'add', {
            source: 'jira',
            source_ids: toAddAccess.map((op) => op.id),
            metadata: {
              project_key: toAddAccess.map((op) => op.projectKey),
            },
          });
        }

        // Create new documents
        if (toStore.length > 0) {
          await Promise.all(
            toStore.map(async (issue) => {
              const { markdown: content, sourceMentionedUserIds } =
                this.converter.convert(issue);

              if (!content || content.length < CONFIG.MIN_CONTENT_CHAR_LIMIT) {
                console.warn(
                  `Skipping content storage for issue ${issue.id}: Empty content`,
                );
                return;
              }

              await this.vectorStore.storeDocument({
                title: issue.fields.summary,
                content,
                hierarchy_path: `${issue.fields.project.name} > ${issue.fields.issuetype.name}`,
                source: 'jira',
                last_updated_source_user_id: issue.fields.creator.accountId,
                source_author_id: issue.fields.creator.accountId,
                source_mentioned_user_ids: sourceMentionedUserIds,
                source_updated_at: new Date(issue.fields.updated).toISOString(),
                source_id: issue.id,
                source_parent_id: issue.fields.project.id,
                metadata: {
                  key: issue.key,
                  url: `${this.baseUrl}/browse/${issue.key}`,
                  project_id: issue.fields.project.id,
                  project_key: issue.fields.project.key,
                  board_id: this.getBoardIdForProject(issue.fields.project.id),
                  issue_type: issue.fields.issuetype.name,
                  status: issue.fields.status.name,
                  priority: issue.fields.priority.name,
                  cloud_id: this.cloudId,
                },
                user_ids_access: [this.userId],
              });
            }),
          );
        }
      } catch (error) {
        console.error('[JIRA LOADER] Error processing batch:', error);
        continue;
      }
    }
  }

  private classifyIssues(
    issues: ProcessingJiraIssue[],
    existingDocs: Map<
      string, // source_id
      JiraMetadata & { user_ids_access: string[]; source_updated_at: string }
    >,
  ): {
    toStore: ProcessingJiraIssue[];
    toAddAccess: AccessOperation[];
  } {
    const toStore: ProcessingJiraIssue[] = [];
    const toAddAccess: AccessOperation[] = [];

    issues.forEach((issue) => {
      const existingDoc = existingDocs.get(issue.id);

      if (!existingDoc) {
        // New document - create it
        toStore.push(issue);
        return;
      }

      const existingUpdateTime = new Date(existingDoc.source_updated_at);
      const newUpdateTime = new Date(issue.fields.updated);

      if (existingUpdateTime.getTime() === newUpdateTime.getTime()) {
        // Same version - just update access if needed
        if (!existingDoc.user_ids_access.includes(this.userId)) {
          toAddAccess.push({
            id: issue.id,
            projectKey: issue.fields.project.key,
            updatedAt: issue.fields.updated,
          });
        }
        return;
      }

      // Different version - update it
      toStore.push(issue);
    });

    return { toStore, toAddAccess };
  }

  private async fetchIssues(
    options: FetchIssuesOptions = {},
  ): Promise<FetchIssuesResult> {
    const url = new URL(
      `https://api.atlassian.com/ex/jira/${this.cloudId}/rest/api/3/search`,
    );

    const jql = this.buildJQLQuery(options.modifiedSince);

    url.searchParams.append('jql', jql);
    url.searchParams.append('maxResults', CONFIG.API_LIMIT.toString());
    url.searchParams.append('expand', 'renderedFields');
    url.searchParams.append(
      'fields',
      [
        'summary',
        'description',
        'created',
        'updated',
        'status',
        'priority',
        'issuetype',
        'project',
        'creator',
        'reporter',
        'assignee',
        'labels',
        'parent',
        'subtasks',
        'issuelinks',
        'timeestimate',
        'timespent',
        'duedate',
        'resolutiondate',
        'progress',
      ].join(','),
    );

    if (options.cursor) {
      url.searchParams.append('startAt', options.cursor);
    }

    try {
      const response = await this.makeRequest(url);
      const data = await response.json();

      return {
        results: data.issues,
        next_cursor:
          data.total > parseInt(options.cursor ?? '0') + CONFIG.API_LIMIT
            ? (parseInt(options.cursor ?? '0') + CONFIG.API_LIMIT).toString()
            : undefined,
      };
    } catch (error) {
      console.error('Error in fetchIssues:', error);
      throw error;
    }
  }

  private async makeRequest(url: URL): Promise<Response> {
    try {
      return await JiraApi.makeRawRequest(url, {
        config: {
          cloudId: this.cloudId,
          accessToken: this.accessToken,
        },
        fetchOptions: {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        },
      });
    } catch (error) {
      console.error('[JIRA LOADER] Error making request:', error);
      throw error;
    }
  }

  private buildJQLQuery(modifiedSince?: Date): string {
    const projectKeys = this.selectedBoards
      .map((board) => `"${board.location.projectKey}"`)
      .join(',');

    let jql = `project in (${projectKeys})`;

    if (modifiedSince) {
      // Format using YYYY-MM-DD which works better with JQL
      const formattedDate = modifiedSince.toISOString().split('T')[0];
      // Note: no quotes around the date, and no space after AND
      jql += ` AND updated>=${formattedDate}`;
    }

    jql += ' ORDER BY updated DESC';

    return jql;
  }

  private getBoardIdForProject(projectId: string): string {
    const board = this.selectedBoards.find(
      (b) => b.location.projectId.toString() === projectId,
    );
    return board ? board.id.toString() : '';
  }
}
