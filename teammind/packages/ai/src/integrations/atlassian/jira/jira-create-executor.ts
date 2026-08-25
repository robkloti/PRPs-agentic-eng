import {
  AtlassianConfig,
  TicketAction,
  TicketCreateResult,
} from '../../../types';
import { CreateActionExecutor, CreateExecutionResult } from '../../shared';
import { JiraApi } from './jira-api';

/**
 * Jira execution result extending the base result
 */

export interface JiraCreateResult
  extends TicketCreateResult,
    CreateExecutionResult {
  self: string;
}

/**
 * Executor implementation for Jira operations
 */
export class JiraExecutor
  implements
    CreateActionExecutor<AtlassianConfig, TicketAction, JiraCreateResult>
{
  async execute(
    ticket: TicketAction,
    config: AtlassianConfig,
    _userId: string,
  ): Promise<JiraCreateResult> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fnTranslate = require('md-to-adf');
    const adfDocument = fnTranslate(ticket.content);

    const apiResult = await JiraApi.createIssue(
      config,
      {
        projectId: ticket.parentId,
        summary: ticket.title,
        description: adfDocument,
      },
      config.baseUrl,
    );

    return {
      id: apiResult.id,
      key: apiResult.key,
      title: ticket.title,
      url: apiResult.url,
      self: apiResult.self,
      source: 'jira',
    };
  }
}
