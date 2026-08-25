import {
  ListBlockChildrenResponse,
  RichTextItemResponse,
} from '@notionhq/client/build/src/api-endpoints';

import { CachingRateLimitedNotionClient } from '../tm-advanced-notion-client';
import {
  Annotations,
  BlockType,
  ConfigurationOptions,
  CustomTransformer,
  Equation,
  ListBlockChildrenResponseResult,
  ListBlockChildrenResponseResults,
  MdBlock,
  MdStringObject,
  Mention,
  NotionToMarkdownOptions,
  PageToMarkdownOptions,
  Text,
} from './types';
import * as md from './utils/md';
import { getBlockChildren } from './utils/notion';

/**
 * Converts a Notion page to Markdown.
 */
export class NotionToMarkdown {
  private notionClient: CachingRateLimitedNotionClient;
  private config: ConfigurationOptions;
  private customTransformers: Record<string, CustomTransformer>;

  constructor(options: NotionToMarkdownOptions) {
    this.notionClient = options.notionClient;
    const defaultConfig: ConfigurationOptions = {
      separateChildPage: true,
      convertImagesToBase64: false,
      parseChildPages: false,
    };
    this.config = { ...defaultConfig, ...options.config };
    this.customTransformers = {};
  }

  setCustomTransformer(
    type: BlockType,
    transformer: CustomTransformer,
  ): NotionToMarkdown {
    this.customTransformers[type] = transformer;

    return this;
  }

  /**
   * Converts Markdown Blocks to string
   * @param {MdBlock[]} mdBlocks - Array of markdown blocks
   * @param {number} nestingLevel - Defines max depth of nesting
   * @returns {MdStringObject} - Returns markdown string with child pages separated
   */
  toMarkdownString(
    mdBlocks: MdBlock[] = [],
    pageIdentifier = 'parent',
    nestingLevel = 0,
  ): MdStringObject {
    let mdOutput: MdStringObject = {};

    mdBlocks.forEach((mdBlocks) => {
      // NOTE: toggle in the child blocks logic
      // adding a toggle check prevents duplicate
      // rendering of toggle title

      // process parent blocks
      if (
        mdBlocks.parent &&
        mdBlocks.type !== 'toggle' &&
        mdBlocks.type !== 'child_page'
      ) {
        if (
          mdBlocks.type !== 'to_do' &&
          mdBlocks.type !== 'bulleted_list_item' &&
          mdBlocks.type !== 'numbered_list_item' &&
          mdBlocks.type !== 'quote'
        ) {
          // initialize if key doesn't exist
          mdOutput[pageIdentifier] = mdOutput[pageIdentifier] ?? '';

          // add extra line breaks non list blocks
          mdOutput[pageIdentifier] += `\n${md.addTabSpace(
            mdBlocks.parent,
            nestingLevel,
          )}\n\n`;
        } else {
          // initialize if key doesn't exist
          mdOutput[pageIdentifier] = mdOutput[pageIdentifier] ?? '';

          mdOutput[pageIdentifier] += `${md.addTabSpace(
            mdBlocks.parent,
            nestingLevel,
          )}\n`;
        }
      }

      // process child blocks
      if (mdBlocks.children && mdBlocks.children.length > 0) {
        if (
          mdBlocks.type === 'synced_block' ||
          mdBlocks.type === 'column_list' ||
          mdBlocks.type === 'column'
        ) {
          const mdstr = this.toMarkdownString(
            mdBlocks.children,
            pageIdentifier,
          );
          mdOutput[pageIdentifier] = mdOutput[pageIdentifier] ?? '';

          Object.keys(mdstr).forEach((key) => {
            if (mdOutput[key]) {
              mdOutput[key] += mdstr[key];
            } else {
              mdOutput[key] = mdstr[key]!;
            }
          });
        } else if (mdBlocks.type === 'child_page') {
          const childPageTitle = mdBlocks.parent;
          const mdstr = this.toMarkdownString(
            mdBlocks.children,
            childPageTitle,
          );

          if (this.config.separateChildPage) {
            mdOutput = { ...mdOutput, ...mdstr };
          } else {
            mdOutput[pageIdentifier] = mdOutput[pageIdentifier] ?? '';
            if (mdstr[childPageTitle]) {
              // child page heading followed by child page content
              mdOutput[pageIdentifier] +=
                `\n${childPageTitle}\n${mdstr[childPageTitle]}`;
            }
          }
        } else if (mdBlocks.type === 'toggle') {
          // convert children md object to md string
          const toggle_children_md_string = this.toMarkdownString(
            mdBlocks.children,
          );

          mdOutput[pageIdentifier] = mdOutput[pageIdentifier] ?? '';
          mdOutput[pageIdentifier] += md.toggle(
            mdBlocks.parent,
            toggle_children_md_string.parent,
          );
        } else if (mdBlocks.type === 'quote') {
          const mdstr = this.toMarkdownString(
            mdBlocks.children,
            pageIdentifier,
            nestingLevel,
          );

          const formattedContent = mdstr
            .parent!.split('\n')
            .map((line) => (line.trim() ? `> ${line}` : '>'))
            .join('\n')
            .trim();

          mdOutput[pageIdentifier] = mdOutput[pageIdentifier] ?? '';

          if (pageIdentifier !== 'parent' && mdstr.parent) {
            mdOutput[pageIdentifier] += formattedContent;
          } else if (mdstr[pageIdentifier]) {
            mdOutput[pageIdentifier] += formattedContent;
          }

          mdOutput[pageIdentifier] += '\n';
        } else if (mdBlocks.type === 'callout') {
          // do nothing the callout block is already processed
        } else {
          const mdstr = this.toMarkdownString(
            mdBlocks.children,
            pageIdentifier,
            nestingLevel + 1,
          );

          mdOutput[pageIdentifier] = mdOutput[pageIdentifier] ?? '';
          if (pageIdentifier !== 'parent' && mdstr.parent) {
            mdOutput[pageIdentifier] += mdstr.parent;
          } else if (mdstr[pageIdentifier]) {
            mdOutput[pageIdentifier] += mdstr[pageIdentifier];
          }
        }
      }
    });

    return mdOutput;
  }

  /**
   * Retrieves Notion Blocks based on ID and converts them to Markdown Blocks
   * @param {string} id - notion page id (not database id)
   * @param {PageToMarkdownOptions} options - Options for converting page to markdown
   * @returns {Promise<MdBlock[]>} - List of markdown blocks
   */
  async pageToMarkdown(
    id: string,
    options: PageToMarkdownOptions = {},
  ): Promise<MdBlock[]> {
    if (!this.notionClient) {
      throw new Error(
        'notion client is not provided, for more details check out https://github.com/souvikinator/notion-to-md',
      );
    }
    const blocks = await getBlockChildren(
      this.notionClient,
      id,
      options.totalPage ?? null,
    );

    const parsedData = await this.blocksToMarkdown(blocks, options);

    return parsedData;
  }

  /**
   * Converts list of Notion Blocks to Markdown Blocks
   * @param {ListBlockChildrenResponseResults | undefined} blocks - List of notion blocks
   * @param {PageToMarkdownOptions} options - Options for converting blocks to markdown
   * @param {MdBlock[]} mdBlocks - Array of markdown blocks
   * @returns {Promise<MdBlock[]>} - Array of markdown blocks with their children
   */
  async blocksToMarkdown(
    blocks?: ListBlockChildrenResponseResults,
    options: PageToMarkdownOptions = {},
    mdBlocks: MdBlock[] = [],
  ): Promise<MdBlock[]> {
    if (!this.notionClient) {
      throw new Error('notion client is not provided');
    }

    if (!blocks) return mdBlocks;

    for (const block of blocks) {
      if (
        // @ts-expect-error We set the type to unsupported to handle unsupported blocks
        block.type === 'unsupported' ||
        // @ts-expect-error We set the type to child_page to handle child pages
        (block.type === 'child_page' && !this.config.parseChildPages)
      ) {
        continue;
      }

      if ('has_children' in block && block.has_children) {
        const block_id =
          block.type == 'synced_block' &&
          block.synced_block?.synced_from?.block_id
            ? block.synced_block.synced_from.block_id
            : block.id;
        // Get children of this block.
        const child_blocks = await getBlockChildren(
          this.notionClient,
          block_id,
          options.totalPage ?? null,
        );

        // Push this block to mdBlocks.
        mdBlocks.push({
          type: block.type,
          blockId: block.id,
          parent: await this.blockToMarkdown(block, options),
          children: [],
        });

        // Recursively call blocksToMarkdown to get children of this block.
        // check for custom transformer before parsing child
        if (
          !(block.type in this.customTransformers) &&
          !this.customTransformers[block.type]
        ) {
          const l = mdBlocks.length;
          await this.blocksToMarkdown(
            child_blocks,
            options,
            mdBlocks[l - 1]?.children,
          );
        }

        continue;
      }

      const tmp = await this.blockToMarkdown(block, options);
      mdBlocks.push({
        // @ts-expect-error We set the type
        type: block.type,
        blockId: block.id,
        parent: tmp,
        children: [],
      });
    }
    return mdBlocks;
  }

  /**
   * Converts a Notion Block to a Markdown Block
   * @param {ListBlockChildrenResponseResult} block - single notion block
   * @param {PageToMarkdownOptions} options - Options for converting block to markdown
   * @returns {string} corresponding markdown string of the passed block
   */
  async blockToMarkdown(
    block: ListBlockChildrenResponseResult,
    options: PageToMarkdownOptions = {},
  ) {
    if (typeof block !== 'object' || !('type' in block)) return '';

    let parsedData = '';
    const { type } = block;
    if (type in this.customTransformers && !!this.customTransformers[type]) {
      const customTransformerValue = await this.customTransformers[type](block);
      if (typeof customTransformerValue === 'string')
        return customTransformerValue;
    }

    switch (type) {
      case 'image': {
        return ''; // Skip images entirely
      }

      case 'divider': {
        return md.divider();
      }

      case 'equation': {
        return md.equation(block.equation.expression);
      }

      case 'video':
      case 'file':
      case 'pdf': {
        return ''; // Skip these file types entirely
      }

      case 'bookmark':
      case 'embed':
      case 'link_preview':
      case 'link_to_page': {
        let blockContent;

        if (type === 'bookmark') blockContent = block.bookmark;
        if (type === 'embed') blockContent = block.embed;
        if (type === 'link_preview') blockContent = block.link_preview;
        if (type === 'link_to_page' && block.link_to_page.type === 'page_id') {
          blockContent = {
            url: `https://www.notion.so/${block.link_to_page.page_id}`,
          };
        }

        if (blockContent) {
          // Check if the URL points to a file
          const isFile =
            /\.(jpg|jpeg|png|gif|pdf|doc|docx|xls|xlsx|ppt|pptx|mp3|mp4|wav|avi|mov)$/i.test(
              blockContent.url,
            );

          if (isFile) {
            return ''; // Skip if it's a file link
          } else {
            return md.link(type, blockContent.url);
          }
        }
        return '';
      }

      case 'child_page': {
        if (!this.config.parseChildPages) return '';

        const pageTitle: string = block.child_page.title;

        if (this.config.separateChildPage) {
          return pageTitle;
        }

        return md.heading2(pageTitle);
      }
      case 'child_database': {
        const { id } = block;

        // Extract database title from block
        let dbTitle = 'Database';
        if (block.child_database?.title) {
          dbTitle = block.child_database.title;
        }

        // Create a URL to the database in Notion
        const dbUrl = `https://notion.so/${id.replace(/-/g, '')}`;

        // Return a markdown link to the database with descriptive text
        return `**[${dbTitle} - Notion Database](${dbUrl})**`;
      }

      case 'table': {
        const { id, has_children } = block;
        const tableArr: string[][] = [];
        if (has_children) {
          const tableRows = await getBlockChildren(this.notionClient, id, 100);
          const rowsPromise = tableRows?.map(async (row) => {
            const { type } = row as unknown as ListBlockChildrenResponse;
            const cells = (row as unknown as ListBlockChildrenResponse)[type]
              .cells as unknown as Array<RichTextItemResponse>[];

            /**
             * this is more like a hack since matching the type text was
             * difficult. So converting each cell to paragraph type to
             * reuse the blockToMarkdown function
             */
            const cellStringPromise = cells.map(
              async (cell: Array<RichTextItemResponse>) =>
                await this.blockToMarkdown({
                  type: 'paragraph',
                  paragraph: { rich_text: cell },
                } as ListBlockChildrenResponseResult),
            );

            const cellStringArr = await Promise.all(cellStringPromise);
            tableArr.push(cellStringArr);
          });
          await Promise.all(rowsPromise || []);
        }
        return md.table(tableArr);
      }
      // Rest of the types
      // "paragraph"
      // "heading_1"
      // "heading_2"
      // "heading_3"
      // "bulleted_list_item"
      // "numbered_list_item"
      // "quote"
      // "to_do"
      // "template"
      // "synced_block"
      // "child_page"
      // "child_database"
      // "code"
      // "callout"
      // "breadcrumb"
      // "table_of_contents"
      // "link_to_page"
      // "audio"
      // "unsupported"

      default: {
        // @ts-expect-error Type 'string' is not assignable to type 'never'
        const blockContent = block[type].text ?? block[type].rich_text ?? [];
        blockContent.map((content: Text | Equation | Mention) => {
          if (content.type === 'equation') {
            parsedData += md.inlineEquation(content.equation.expression);
            return;
          }

          // Handle user mentions with userMap from options
          if (content.type === 'mention' && content.mention.type === 'user') {
            const userId = content.mention.user?.id;
            if (userId && options.userMap) {
              const user = options.userMap.get(userId);
              const displayName = user?.displayName ?? content.plain_text;
              parsedData += `<a href="/mentions/notion/${userId}" class="user-mention">@${displayName}</a>`;
              return;
            }
          }

          const annotations = content.annotations;
          let plain_text = content.plain_text;

          plain_text = this.annotatePlainText(plain_text, annotations);

          if (content.href) plain_text = md.link(plain_text, content.href);

          parsedData += plain_text;
        });
      }
    }

    switch (type) {
      case 'code':
        {
          const codeContent = block.code.rich_text
            .map((t: RichTextItemResponse) => t.plain_text)
            .join('\n');
          const language = block.code.language || 'plaintext';
          parsedData = md.codeBlock(codeContent, language);
        }
        break;

      case 'heading_1':
        {
          parsedData = md.heading1(parsedData);
        }
        break;

      case 'heading_2':
        {
          parsedData = md.heading2(parsedData);
        }
        break;

      case 'heading_3':
        {
          parsedData = md.heading3(parsedData);
        }
        break;

      case 'quote':
        {
          parsedData = md.quote(parsedData);
        }
        break;

      case 'callout':
        {
          const { id, has_children } = block;
          let callout_string = '';

          if (!has_children) {
            return md.callout(parsedData, block[type].icon);
          }

          const callout_children_object = await getBlockChildren(
            this.notionClient,
            id,
            100,
          );

          // // parse children blocks to md object
          const callout_children = await this.blocksToMarkdown(
            callout_children_object,
          );

          callout_string += `${parsedData}\n`;
          callout_children.map((child) => {
            callout_string += `${child.parent}\n\n`;
          });

          parsedData = md.callout(callout_string.trim(), block[type].icon);
        }
        break;

      case 'bulleted_list_item':
        {
          parsedData = md.bullet(parsedData);
        }
        break;

      case 'numbered_list_item':
        {
          parsedData = md.bullet(parsedData, block.numbered_list_item.number);
        }
        break;

      case 'to_do':
        {
          parsedData = md.todo(parsedData, block.to_do.checked);
        }
        break;
    }

    return parsedData;
  }

  /**
   * Annoate text using provided annotations
   * @param {string} text - String to be annotated
   * @param {Annotations} annotations - Annotation object of a notion block
   * @returns {string} - Annotated text
   */
  private annotatePlainText(text: string, annotations: Annotations): string {
    // if text is all spaces, don't annotate
    if (/^\s*$/.exec(text)) return text;

    const leadingSpaceMatch = /^(\s*)/.exec(text);
    const trailingSpaceMatch = /(\s*)$/.exec(text);

    const leading_space = leadingSpaceMatch ? leadingSpaceMatch[0] : '';
    const trailing_space = trailingSpaceMatch ? trailingSpaceMatch[0] : '';

    text = text.trim();

    if (text !== '') {
      if (annotations.code) text = md.inlineCode(text);
      if (annotations.bold) text = md.bold(text);
      if (annotations.italic) text = md.italic(text);
      if (annotations.strikethrough) text = md.strikethrough(text);
      if (annotations.underline) text = md.underline(text);
    }

    return leading_space + text + trailing_space;
  }
}
