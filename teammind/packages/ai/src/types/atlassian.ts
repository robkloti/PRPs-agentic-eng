import { ConvertedContent } from './document';

export interface AtlassianSite {
  url: string;
  name: string;
  avatarUrl: string;
  type: string;
  icon: string | null;
  status: string;
  authorId: string;
  createdAt: string;
  description: string | null;
  _links: {
    webui: string;
  };
}

export interface AtlassianRequestConfig {
  cloudId: string;
  accessToken: string;
}

export interface AtlassianRequestOptions {
  config: AtlassianRequestConfig;
  fetchOptions?: RequestInit;
}

// Specific scope types
type JiraScope =
  | 'read:jira-work'
  | 'read:project:jira'
  | 'write:jira-work'
  | 'read:board-scope:jira-software';

type ConfluenceScope =
  | 'read:content-details:confluence'
  | 'read:page:confluence'
  | 'write:confluence-content'
  | 'read:space:confluence'
  | 'read:confluence-user'
  | 'read:confluence-space.summary'
  | 'write:page:confluence'
  | 'read:confluence-content.all';

// Site specific interfaces
export interface JiraSite extends AtlassianSite {
  id: number;
  scopes: JiraScope[];
  location: {
    name: string;
    avatarURI: string;
    projectId: number;
    projectKey: string;
    displayName: string;
    projectName: string;
    projectTypeKey: string;
  };
  isPrivate: boolean;
}

export interface ConfluenceSite extends AtlassianSite {
  id: string;
  scopes: ConfluenceScope[];
  key: string;
  homepageId: string;
  currentActiveAlias: string;
}

// Combined type for all Atlassian sites
export type AtlassianSites = (JiraSite | ConfluenceSite)[];

export interface AtlassianConfig {
  cloudId: string;
  baseUrl: string;
  accessToken: string;
  selectedSpacesOrBoards: ConfluenceSite[] | JiraSite[];
}

// Confluence
export interface ConfluenceUser {
  accountId: string;
  accountType: string;
  displayName: string;
  publicName: string;
}

export interface ConfluenceV2Response {
  id: string;
  status: 'current' | 'draft' | 'archived';
  title: string;
  spaceId: string;
  parentId: string;
  parentType: string;
  position: number;
  authorId: string;
  ownerId: string;
  lastOwnerId: string;
  createdAt: string;
  body: {
    storage: {
      value: string;
    };
    atlas_doc_format: Record<string, unknown>;
  };
  version: {
    createdAt: string;
    message: string;
    number: number;
    minorEdit: boolean;
    authorId: string;
  };
  _links: {
    webui: string;
    editui: string;
    tinyui: string;
  };
}

// V1 API response type (from search endpoint)
interface ConfluenceV1Response {
  id: string;
  status: 'current' | 'draft' | 'archived';
  title: string;
  space?: {
    id: number;
  };
  ancestors?: Array<{
    id: string;
  }>;
  history?: {
    lastUpdated?: {
      by?: {
        accountId: string;
      };
      when?: string;
    };
    createdBy?: {
      accountId: string;
      date?: string;
    };
  };
  extensions?: {
    position: number;
  };
  body: {
    storage: {
      value: string;
    };
    atlas_doc_format?: Record<string, unknown>;
  };
  version: {
    by?: {
      accountId: string;
    };
    when?: string;
    number: number;
    message?: string;
    minorEdit: boolean;
  };
  _links: {
    webui: string;
    editui: string;
    tinyui: string;
  };
}

export type ConfluenceResponse = ConfluenceV1Response | ConfluenceV2Response;

export function isV1Response(
  page: ConfluenceResponse,
): page is ConfluenceV1Response {
  return 'space' in page || 'ancestors' in page;
}

export function convertV1ToRawPage(
  v1Page: ConfluenceV1Response,
): ConfluenceV2Response {
  return {
    id: v1Page.id,
    status: v1Page.status,
    title: v1Page.title,
    spaceId: v1Page.space?.id?.toString() ?? '',
    parentId: v1Page.ancestors?.length
      ? v1Page.ancestors[v1Page.ancestors.length - 1]!.id
      : '',
    parentType: v1Page.ancestors?.length ? 'page' : '',
    position: v1Page.extensions?.position ?? 0,
    authorId: v1Page.version?.by?.accountId ?? '',
    ownerId:
      v1Page.history?.lastUpdated?.by?.accountId ??
      v1Page.history?.createdBy?.accountId ??
      '',
    lastOwnerId: v1Page.history?.lastUpdated?.by?.accountId ?? '',
    createdAt: v1Page.history?.createdBy?.date ?? v1Page.version?.when ?? '',
    body: {
      storage: {
        value: v1Page.body.storage.value,
      },
      atlas_doc_format: v1Page.body.atlas_doc_format ?? {},
    },
    version: {
      createdAt: v1Page.version?.when ?? '',
      message: v1Page.version?.message ?? '',
      number: v1Page.version.number,
      minorEdit: v1Page.version.minorEdit,
      authorId: v1Page.version?.by?.accountId ?? '',
    },
    _links: v1Page._links,
  };
}

export interface ConfluenceDocumentMetadata {
  url: string;
  status: string;
  version: number;
  space_id: string;
  cloud_id: string;
}

export interface ProcessingConfluencePage extends ConfluenceV2Response {
  hierarchy_path?: string;
  processedContent: ConvertedContent;
}

// Jira
export type JiraStatusCategory = {
  self: string;
  id: number;
  key: string;
  colorName: string;
  name: string;
};

export type JiraStatus = {
  self: string;
  description: string;
  iconUrl: string;
  name: string;
  id: string;
  statusCategory: JiraStatusCategory;
};

export type JiraUser = {
  accountId: string;
  accountType: string;
  active: boolean;
  avatarUrls: {
    '16x16': string;
    '24x24': string;
    '32x32': string;
    '48x48': string;
  };
  displayName: string;
  emailAddress: string;
  self: string;
  timeZone: string;
};

export type JiraIssueType = {
  avatarId: number;
  description: string;
  entityId: string;
  hierarchyLevel: number;
  iconUrl: string;
  id: string;
  name: string;
  self: string;
  subtask: boolean;
};

export type JiraPriority = {
  iconUrl: string;
  id: string;
  name: string;
  self: string;
};

export type JiraProgress = {
  progress: number;
  total: number;
  percent?: number;
};

export type JiraProject = {
  avatarUrls: {
    '16x16': string;
    '24x24': string;
    '32x32': string;
    '48x48': string;
  };
  id: string;
  key: string;
  name: string;
  projectTypeKey: string;
  self: string;
  simplified: boolean;
};

export type JiraSubTask = {
  id: string;
  key: string;
  self: string;
  fields: {
    issuetype: JiraIssueType;
    priority: JiraPriority;
    status: JiraStatus;
    summary: string;
  };
};

export type JiraIssueLinkType = {
  id: string;
  name: string;
  inward: string;
  outward: string;
  self: string;
};

export type JiraBriefIssue = {
  id: string;
  key: string;
  self: string;
  fields: {
    summary: string;
    status: JiraStatus;
    priority: JiraPriority;
    issuetype: JiraIssueType;
  };
};

export type JiraIssueLink = {
  id: string;
  self: string;
  type: JiraIssueLinkType;
  inwardIssue?: JiraBriefIssue;
  outwardIssue?: JiraBriefIssue;
};

export type JiraIssue = {
  expand: string;
  id: string;
  self: string;
  key: string;
  renderedFields: {
    description: string;
  };
  fields: {
    assignee?: JiraUser;
    created: string;
    description: string;
    issuelinks: JiraIssueLink[];
    issuetype: JiraIssueType;
    labels?: string[];
    priority: JiraPriority;
    progress: JiraProgress;
    project: JiraProject;
    reporter?: JiraUser;
    creator: JiraUser;
    resolutiondate?: string;
    status: JiraStatus;
    subtasks: JiraSubTask[];
    summary: string;
    timeestimate?: number;
    timespent?: number;
    updated: string;
    duedate?: string;
    parent?: JiraBriefIssue;
  };
};

export interface ProcessingJiraIssue extends JiraIssue {
  processedContent?: {
    markdown: string;
    sourceMentionedUserIds: string[];
  };
}

export interface JiraMetadata {
  url: string;
  key: string;
  project_id: string;
  project_key: string;
  board_id: string;
  issue_type: string;
  status: string;
  priority: string;
  cloud_id: string;
}
