import {
  AtlassianRequestConfig,
  AtlassianRequestOptions,
  ConfluenceSite,
  ConfluenceUser,
  ConfluenceV2Response,
} from '../../../types';
import { refreshAtlassianToken } from '../_utils';

interface ConfluenceBulkUserResponse {
  results: ConfluenceUser[];
  _links?: {
    next?: string;
  };
}

export interface ConfluencePageCreationRequest {
  spaceId: string;
  status: 'current' | 'draft' | 'archived';
  title: string;
  parentId?: string;
  body: {
    storage: {
      value: string;
      representation: 'storage';
    };
  };
}

export interface ConfluencePageUpdateRequest
  extends ConfluencePageCreationRequest {
  id: string;
  version: {
    number: number;
    message?: string;
  };
}

export interface ConfluencePageResponse extends ConfluenceV2Response {
  parent?: ConfluenceV2Response;
}

export class ConfluenceApi {
  /**
   * Makes a raw request to the Confluence API with token refresh support
   */
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
   * Makes a request to the Confluence API and parses the JSON response
   */
  public static async makeRequest<T>(
    url: URL,
    options: AtlassianRequestOptions,
  ): Promise<T> {
    const response = await this.makeRawRequest(url, options);

    if (!response.ok) {
      throw new Error(
        `Confluence API request failed: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as T;
    return data;
  }

  public static async getSpaces(
    config: AtlassianRequestConfig,
  ): Promise<ConfluenceSite[]> {
    const url = new URL(
      `https://api.atlassian.com/ex/confluence/${config.cloudId}/wiki/api/v2/spaces?limit=250`,
    );

    const response = await this.makeRequest<{ results: ConfluenceSite[] }>(
      url,
      { config },
    );

    return response.results ?? [];
  }

  /**
   * Fetches user details in bulk for the given user IDs
   * Handles batching automatically since the API has a limit on query parameter length
   */
  public static async fetchUsersBulk(
    userIds: string[],
    config: AtlassianRequestConfig,
  ): Promise<Map<string, ConfluenceUser>> {
    const userMap = new Map<string, ConfluenceUser>();
    const batchSize = 100; // Practical limit to avoid extremely long URLs

    for (let i = 0; i < userIds.length; i += batchSize) {
      const batchIds = userIds.slice(i, i + batchSize);
      const url = new URL(
        `https://api.atlassian.com/ex/confluence/${config.cloudId}/wiki/rest/api/user/bulk`,
      );

      // Add each accountId as a separate query parameter
      batchIds.forEach((id) => {
        url.searchParams.append('accountId', id);
      });

      const data = await this.makeRequest<ConfluenceBulkUserResponse>(url, {
        config,
        fetchOptions: { method: 'GET' },
      });

      for (const user of data.results) {
        userMap.set(user.accountId, user);
      }
    }

    return userMap;
  }

  /**
   * Fetches a page by ID with optional parent page details
   */
  public static async getPageById(
    pageId: string,
    config: AtlassianRequestConfig,
    includeParent = false,
  ): Promise<ConfluencePageResponse> {
    const url = new URL(
      `https://api.atlassian.com/ex/confluence/${config.cloudId}/api/v2/pages/${pageId}`,
    );

    url.searchParams.append('body-format', 'storage');

    const page = await this.makeRequest<ConfluencePageResponse>(url, {
      config,
    });

    if (includeParent && page.parentId) {
      const parentPage = await this.getPageById(page.parentId, config, false);
      return {
        ...page,
        parent: parentPage,
      };
    }

    return page;
  }

  /**
   * Creates a new page in Confluence
   */
  public static async createPage(
    request: ConfluencePageCreationRequest,
    config: AtlassianRequestConfig,
  ): Promise<ConfluencePageResponse> {
    const url = new URL(
      `https://api.atlassian.com/ex/confluence/${config.cloudId}/api/v2/pages`,
    );

    return this.makeRequest<ConfluencePageResponse>(url, {
      config,
      fetchOptions: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      },
    });
  }

  /**
   * Updates an existing page in Confluence
   */
  public static async updatePage(
    request: ConfluencePageUpdateRequest,
    config: AtlassianRequestConfig,
  ): Promise<ConfluencePageResponse> {
    const url = new URL(
      `https://api.atlassian.com/ex/confluence/${config.cloudId}/api/v2/pages/${request.id}`,
    );

    return this.makeRequest<ConfluencePageResponse>(url, {
      config,
      fetchOptions: {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      },
    });
  }
}
