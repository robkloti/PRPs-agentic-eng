import {
  AtlassianRequestConfig,
  AtlassianRequestOptions,
  JiraSite,
} from '../../../types';
import { refreshAtlassianToken } from '../_utils';

/**
 * Interface for creating a Jira issue with simplified fields
 */
export interface CreateJiraIssueRequest {
  projectId: string;
  summary: string;
  description: string;
}

/**
 * Response from creating a Jira issue
 */
export interface CreateJiraIssueResponse {
  id: string;
  key: string;
  self: string;
  url: string;
}

export class JiraApi {
  public static async makeRawRequest(
    url: URL,
    options: AtlassianRequestOptions,
  ): Promise<Response> {
    const { config, fetchOptions = {} } = options;

    const response = await fetch(url.toString(), {
      ...fetchOptions,
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        Accept: 'application/json',
        ...fetchOptions.headers,
      },
    });

    // Handle 401 with token refresh
    if (response.status === 401) {
      const newToken = await refreshAtlassianToken(config);

      if (newToken) {
        // Retry the original request with the new token
        return fetch(url.toString(), {
          ...fetchOptions,
          headers: {
            Authorization: `Bearer ${newToken}`,
            Accept: 'application/json',
            ...fetchOptions.headers,
          },
        });
      }
    }

    return response;
  }

  /**
   * Makes a request to the Jira API and parses the JSON response
   */
  public static async makeRequest<T>(
    url: URL,
    options: AtlassianRequestOptions,
  ): Promise<T> {
    const response = await this.makeRawRequest(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Jira API request failed: ${response.status} ${response.statusText}\n${errorText}`,
      );
    }

    // Check if the response is 204 No Content or has no content
    if (
      response.status === 204 ||
      response.headers.get('content-length') === '0'
    ) {
      return {} as T;
    }

    return (await response.json()) as T;
  }

  public static async getBoards(
    config: AtlassianRequestConfig,
  ): Promise<JiraSite[]> {
    const url = new URL(
      `https://api.atlassian.com/ex/jira/${config.cloudId}/rest/agile/1.0/board`,
    );

    const response = await this.makeRequest<{ values: JiraSite[] }>(url, {
      config,
    });

    return response.values ?? [];
  }

  /**
   * Get the current state of an issue from Jira
   */
  public static async getIssue(
    config: AtlassianRequestConfig,
    issueId: string,
  ): Promise<{
    id: string;
    key: string;
    fields: {
      updated: string; // ISO timestamp
      summary: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      description: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [key: string]: any;
    };
  }> {
    const url = new URL(
      `https://api.atlassian.com/ex/jira/${config.cloudId}/rest/api/3/issue/${issueId}`,
    );

    return this.makeRequest(url, { config });
  }

  /**
   * Delete an issue in Jira
   */
  public static async deleteIssue(
    config: AtlassianRequestConfig,
    issueId: string,
  ): Promise<void> {
    const url = new URL(
      `https://api.atlassian.com/ex/jira/${config.cloudId}/rest/api/3/issue/${issueId}`,
    );

    await this.makeRequest(url, {
      config,
      fetchOptions: { method: 'DELETE' },
    });
  }

  /**
   * Check if an issue has been modified since a given timestamp
   */
  public static async hasIssueBeenModified(
    config: AtlassianRequestConfig,
    issueId: string,
    since: string,
  ): Promise<boolean> {
    try {
      const issue = await this.getIssue(config, issueId);
      const lastUpdated = new Date(issue.fields.updated);
      const sinceDate = new Date(since);

      return lastUpdated > sinceDate;
    } catch {
      // If we can't get the issue (e.g., 404), consider it modified
      return true;
    }
  }

  /**
   * Create a new issue in Jira with minimal required fields
   *
   * @param config - Jira API connection configuration
   * @param issueData - Basic data for the new issue
   * @param baseUrl - Optional base URL for constructing the browser URL
   * @returns Created issue information including URL
   */
  public static async createIssue(
    config: AtlassianRequestConfig,
    issueData: CreateJiraIssueRequest,
    baseUrl?: string,
  ): Promise<CreateJiraIssueResponse> {
    const url = new URL(
      `https://api.atlassian.com/ex/jira/${config.cloudId}/rest/api/3/issue`,
    );

    // Prepare the minimal required fields for issue creation
    const requestBody = {
      fields: {
        project: {
          id: issueData.projectId,
        },
        summary: issueData.summary,
        description: issueData.description, // This should be ADF formatted
        issuetype: {
          name: 'Task', // Issue type is required by Jira API
        },
      },
    };

    const response = await this.makeRequest<{
      id: string;
      key: string;
      self: string;
    }>(url, {
      config,
      fetchOptions: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      },
    });

    // Use the provided base URL if available, or fallback to a constructed URL
    let browserUrl: string;

    if (baseUrl) {
      // Use the stored base URL and just add the browse path and issue key
      // Make sure to handle trailing slashes properly
      const cleanBaseUrl = baseUrl.endsWith('/')
        ? baseUrl.slice(0, -1)
        : baseUrl;

      browserUrl = `${cleanBaseUrl}/browse/${response.key}`;
    } else {
      // Fallback method for backward compatibility
      // Extract the domain from the self URL to construct the browser URL
      const selfUrl = new URL(response.self);
      const domain = selfUrl.hostname;
      browserUrl = `https://${domain}/browse/${response.key}`;
    }

    return {
      ...response,
      url: browserUrl,
    };
  }
}
