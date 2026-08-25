import { CachingRateLimitedNotionClient } from '../../tm-advanced-notion-client';
import { ListBlockChildrenResponseResults } from '../types';

export const getBlockChildren = async (
  notionClient: CachingRateLimitedNotionClient,
  block_id: string,
  totalPage: number | null,
) => {
  const result: ListBlockChildrenResponseResults = [];
  let pageCount = 0;
  let start_cursor = undefined;

  do {
    const response = await notionClient.blocks.children.list({
      start_cursor: start_cursor,
      block_id: block_id,
    });
    result.push(...response.results);

    start_cursor = response?.next_cursor;
    pageCount += 1;
  } while (
    start_cursor != null &&
    (totalPage == null || pageCount < totalPage)
  );

  modifyNumberedListObject(result);
  return result;
};

export const modifyNumberedListObject = (
  blocks: ListBlockChildrenResponseResults,
) => {
  let numberedListIndex = 0;

  for (const block of blocks) {
    if ('type' in block && block.type === 'numbered_list_item') {
      // add numbers
      // @ts-expect-error Expected error for numbered_list_item type
      block.numbered_list_item.number = ++numberedListIndex;
    } else {
      numberedListIndex = 0;
    }
  }
};
