import path from 'path';
import gfm from 'remark-gfm';
import remarkMath from 'remark-math';
import markdown from 'remark-parse';
import { unified } from 'unified';
import { URL } from 'url';

import * as md from '../markdown';
import * as notion from '../notion';
import { LIMITS, isSupportedCodeLang } from '../notion';

function ensureLength(text: string, copy?: object) {
  const chunks = text.match(/[^]{1,2000}/g) ?? [];
  return chunks.flatMap((item: string) => notion.richText(item, copy));
}

function ensureCodeBlockLanguage(lang?: string) {
  if (lang) {
    lang = lang.toLowerCase();
    return isSupportedCodeLang(lang) ? lang : notion.parseCodeLanguage(lang);
  }

  return undefined;
}

function parseInline(
  element: md.PhrasingContent,
  options?: notion.RichTextOptions,
): notion.RichText[] {
  if (element.type === 'text') {
    const { cleanText, markerId } = extractMarker(element.value);
    // If a marker was found, replace the text with the cleaned version
    if (markerId !== null) {
      element.value = cleanText;
      // Skip empty text nodes
      if (!cleanText) return [];
    }
  }

  const copy = {
    annotations: {
      ...(options?.annotations ?? {}),
    },
    url: options?.url,
  };

  switch (element.type) {
    case 'text':
      return ensureLength(element.value, copy);

    case 'delete':
      copy.annotations.strikethrough = true;
      return element.children.flatMap((child) => parseInline(child, copy));

    case 'emphasis':
      copy.annotations.italic = true;
      return element.children.flatMap((child) => parseInline(child, copy));

    case 'strong':
      copy.annotations.bold = true;
      return element.children.flatMap((child) => parseInline(child, copy));

    case 'link':
      copy.url = element.url;
      return element.children.flatMap((child) => parseInline(child, copy));

    case 'inlineCode':
      copy.annotations.code = true;
      return [notion.richText(element.value, copy)];

    case 'inlineMath':
      return [notion.richText(element.value, { ...copy, type: 'equation' })];

    default:
      return [];
  }
}

function parseImage(image: md.Image, options: BlocksOptions): notion.Block {
  // https://developers.notion.com/reference/block#image-blocks
  const allowedTypes = [
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.tif',
    '.tiff',
    '.bmp',
    '.svg',
    '.heic',
    '.webp',
  ];

  function dealWithError() {
    return notion.paragraph([notion.richText(image.url)]);
  }

  try {
    if (options.strictImageUrls ?? true) {
      const parsedUrl = new URL(image.url);
      const fileType = path.extname(parsedUrl.pathname);
      if (allowedTypes.includes(fileType)) {
        return notion.image(image.url);
      } else {
        return dealWithError();
      }
    } else {
      return notion.image(image.url);
    }
  } catch (error: unknown) {
    console.error(error);
    return dealWithError();
  }
}

function parseParagraph(
  element: md.Paragraph,
  options: BlocksOptions,
): notion.Block[] {
  // Paragraphs can also be legacy 'TOC' from some markdown, so we check first
  const mightBeToc =
    element.children.length > 2 &&
    element.children[0]!.type === 'text' &&
    element.children[0].value === '[[' &&
    element.children[1]!.type === 'emphasis';
  if (mightBeToc) {
    const emphasisItem = element.children[1] as md.Emphasis;
    const emphasisTextItem = emphasisItem.children[0] as md.Text;
    if (emphasisTextItem.value === 'TOC') {
      return [notion.table_of_contents()];
    }
  }

  // Check if the paragraph might be a bookmark
  if (element.children.length === 1 && element.children[0]!.type === 'link') {
    const link = element.children[0];
    // If the link text is the same as the URL, or option is enabled, treat it as a bookmark
    if (
      (options.parseLinksAsBookmarks || options.alwaysParseLinksAsBookmarks) &&
      link.children.length > 0 &&
      link.children[0]!.type === 'text'
    ) {
      const linkText = link.children[0];
      if (linkText.value === link.url || options.alwaysParseLinksAsBookmarks) {
        return [notion.bookmark(link.url)];
      }
    }
  }

  // Check if the paragraph might be a callout
  if (element.children.length > 0 && element.children[0]!.type === 'text') {
    const firstText = element.children[0];
    // Match both unicode emojis and emoji codes like :warning:
    const calloutMatch = /^(?:(\p{Emoji})|:(\w+)(?::(\w+))?:)\s+(.*)/u.exec(
      firstText.value,
    );
    if (calloutMatch && options.parseEmojiPrefixAsCallout) {
      const emoji = calloutMatch[1] ?? calloutMatch[2] ?? '💡';
      const color = calloutMatch[3] ?? 'default'; // Extract color from syntax like :warning:blue:
      // Update text to remove the callout prefix
      firstText.value = calloutMatch[4] ?? '';
      const richText = element.children.flatMap((child) => parseInline(child));
      return [notion.callout(richText, { emoji }, color)];
    }
  }

  // Notion doesn't deal with inline images, so we need to parse them all out
  // of the paragraph into individual blocks
  const images: notion.Block[] = [];
  const paragraphs: Array<notion.RichText[]> = [];
  element.children.forEach((item) => {
    if (item.type === 'image') {
      images.push(parseImage(item, options));
    } else {
      const richText = parseInline(item);
      if (richText.length) {
        paragraphs.push(richText);
      }
    }
  });

  if (paragraphs.length) {
    return [notion.paragraph(paragraphs.flat()), ...images];
  } else {
    return images;
  }
}

function parseBlockquote(
  element: md.Blockquote,
  options: BlocksOptions,
): notion.Block {
  // Check if this blockquote should be a callout (starts with emoji)
  if (
    element.children.length > 0 &&
    element.children[0]!.type === 'paragraph'
  ) {
    const paragraph = element.children[0];
    if (
      paragraph.children.length > 0 &&
      paragraph.children[0]!.type === 'text'
    ) {
      const text = paragraph.children[0];
      // Match both unicode emojis and emoji codes like :warning:
      const emojiMatch = /^\s*(?:(\p{Emoji})|:(\w+):)\s+(.*)/u.exec(text.value);
      if (emojiMatch) {
        const emoji = emojiMatch[1] ?? emojiMatch[2] ?? '💡';
        // Update text to remove the emoji prefix
        text.value = emojiMatch[3] ?? '';
        const richText = paragraph.children.flatMap((child) =>
          parseInline(child),
        );
        return notion.callout(richText, { emoji }, 'default');
      }
    }
  }

  // Check if this blockquote should be a toggle
  if (options.parseBlockquotesAsToggle && element.children.length > 0) {
    const firstChild = element.children[0]!;

    if (firstChild.type === 'paragraph' && firstChild.children.length > 0) {
      const richText = firstChild.children.flatMap((child) =>
        parseInline(child),
      );
      const restOfContent = element.children
        .slice(1)
        .flatMap((child) => parseNode(child, options));

      // Special case: if the blockquote starts with "Toggle:" or ">"
      if (firstChild.children[0]!.type === 'text') {
        const firstText = firstChild.children[0];

        if (
          firstText.value.startsWith('Toggle:') ||
          firstText.value.startsWith('>')
        ) {
          // Remove the prefix
          firstText.value = firstText.value.replace(/^(Toggle:|>)\s*/, '');
          // Reparse the text with the prefix removed
          const toggleText = firstChild.children.flatMap((child) =>
            parseInline(child),
          );
          return notion.toggle(toggleText, restOfContent);
        }
      }

      if (options.alwaysParseBlockquotesAsToggle) {
        return notion.toggle(richText, restOfContent);
      }
    }
  }

  // Regular blockquote
  const children = element.children.flatMap((child) =>
    parseNode(child, options),
  );
  return notion.blockquote([], children);
}

function parseHeading(
  element: md.Heading,
  options: BlocksOptions,
): notion.Block {
  const text = element.children.flatMap((child) => parseInline(child));
  const isToggleable =
    options.toggleableHeadings ??
    (element.children.length > 0 &&
      element.children[0]!.type === 'text' &&
      element.children[0].value.startsWith('>'));

  // If toggleable with marker, remove the marker
  if (
    isToggleable &&
    element.children.length > 0 &&
    element.children[0]!.type === 'text' &&
    element.children[0].value.startsWith('>')
  ) {
    element.children[0].value = element.children[0].value.substring(1).trim();
    // Re-parse with the marker removed
    const updatedText = element.children.flatMap((child) => parseInline(child));

    switch (element.depth) {
      case 1:
        return notion.headingOne(updatedText, true);
      case 2:
        return notion.headingTwo(updatedText, true);
      default:
        return notion.headingThree(updatedText, true);
    }
  }

  switch (element.depth) {
    case 1:
      return notion.headingOne(text, isToggleable);
    case 2:
      return notion.headingTwo(text, isToggleable);
    default:
      return notion.headingThree(text, isToggleable);
  }
}

function parseCode(element: md.Code): notion.Block {
  const text = ensureLength(element.value);
  const lang = ensureCodeBlockLanguage(element.lang);
  return notion.code(text, lang);
}

function parseList(element: md.List, options: BlocksOptions): notion.Block[] {
  return element.children.flatMap((item) => {
    const paragraph = item.children.shift();
    if (paragraph === undefined || paragraph.type !== 'paragraph') {
      return [] as notion.Block[];
    }

    // Check if the paragraph contains a marker
    let detailsBlockToAdd: notion.Block | null = null;

    // Check the last text node for a marker
    if (paragraph.children.length > 0) {
      const lastChild = paragraph.children[paragraph.children.length - 1];
      if (lastChild?.type === 'text') {
        const { cleanText, markerId } = extractMarker(lastChild.value);
        if (
          markerId !== null &&
          options.detailsBlocks &&
          markerId < options.detailsBlocks.length
        ) {
          // Update the text node with clean text
          lastChild.value = cleanText;

          // Get the details block
          const detailsBlock = options.detailsBlocks[markerId];
          if (detailsBlock) {
            const summaryText = [notion.richText(detailsBlock.summary)];
            try {
              const contentBlocks = markdownToBlocks(
                detailsBlock.content,
                { ...options, detailsBlocks: undefined }, // Prevent infinite recursion
              );
              detailsBlockToAdd = notion.toggle(summaryText, contentBlocks);
            } catch (error) {
              console.error('Error parsing details block:', error);
              // Fallback to simple paragraph
              detailsBlockToAdd = notion.paragraph([
                notion.richText(detailsBlock.content),
              ]);
            }
          }
        }
      }
    }

    // Process the text for the list item
    const text = paragraph.children.flatMap((child) => parseInline(child));

    // Process any children of the list item
    const parsedChildren = item.children.flatMap(
      (child) =>
        parseNode(child, options) as unknown as notion.BlockWithoutChildren,
    );

    // Create the list item
    const listItem =
      element.start !== null && element.start !== undefined
        ? notion.numberedListItem(text, parsedChildren)
        : item.checked !== null && item.checked !== undefined
          ? notion.toDo(item.checked, text, parsedChildren)
          : notion.bulletedListItem(text, parsedChildren);

    // Return the list item and any details block if found
    return detailsBlockToAdd ? [listItem, detailsBlockToAdd] : [listItem];
  });
}

function parseTableCell(node: md.TableCell): notion.RichText[][] {
  return [node.children.flatMap((child) => parseInline(child))];
}

function parseTableRow(node: md.TableRow): notion.BlockWithoutChildren[] {
  const tableCells = node.children.flatMap((child) => parseTableCell(child));
  return [notion.tableRow(tableCells)];
}

function parseTable(node: md.Table): notion.Block[] {
  // The width of the table is the amount of cells in the first row, as all rows must have the same number of cells
  const tableWidth = node.children?.length
    ? node.children[0]!.children.length
    : 0;

  const tableRows = node.children.flatMap((child) => parseTableRow(child));
  return [notion.table(tableRows, tableWidth)];
}

function parseMath(node: md.Math): notion.Block {
  const textWithKatexNewlines = node.value.split('\n').join('\\\\\n');
  return notion.equation(textWithKatexNewlines);
}

// Pre-process the content to find and extract details/summary blocks
function preprocessDetailsBlocks(content: string): {
  processedContent: string;
  detailsBlocks: Array<{
    marker: string;
    summary: string;
    content: string;
  }>;
} {
  const detailsBlocks: Array<{
    marker: string;
    summary: string;
    content: string;
  }> = [];
  let marker = 0;

  // Replace details/summary blocks with markers
  const processedContent = content.replace(
    /<details>\s*<summary>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/gi,
    (match, summary, content) => {
      const markerText = `DETAILS_BLOCK_MARKER_${marker}`;
      detailsBlocks.push({
        marker: markerText,
        summary: summary.trim(),
        content: content.trim(),
      });
      marker++;
      // Add newlines before and after to ensure the marker stands alone
      return `\n\n${markerText}\n\n`;
    },
  );

  return { processedContent, detailsBlocks };
}

/**
 * Pre-process the content to convert lines with 4+ spaces followed by list markers
 * into proper list items with reduced indentation.
 */
function preprocessIndentedLists(content: string): string {
  // Match lines that start with 4 or more spaces followed by a list marker (-, *, +)
  const indentedListRegex = /^([ ]{4,})([*+-])\s+(.*?)$/gm;

  // Replace with properly formatted list items (2 spaces for indentation)
  return content.replace(indentedListRegex, (match, spaces, marker, text) => {
    // Convert to a maximum of 2 spaces for indentation
    return `  ${marker} ${text}`;
  });
}

function extractMarker(text: string): {
  cleanText: string;
  markerId: number | null;
} {
  const markerMatch = /\s*(DETAILS_BLOCK_MARKER_(\d+))\s*$/i.exec(text);
  if (markerMatch) {
    const cleanText = text
      .replace(/\s*DETAILS_BLOCK_MARKER_\d+\s*$/, '')
      .trim();
    return { cleanText, markerId: parseInt(markerMatch[2]!, 10) };
  }
  return { cleanText: text, markerId: null };
}

function parseNode(
  node: md.FlowContent,
  options: BlocksOptions,
): notion.Block[] {
  // Special case for text nodes that might be our details block markers
  if (
    node.type === 'paragraph' &&
    node.children.length === 1 &&
    node.children[0]!.type === 'text'
  ) {
    const text = node.children[0].value;
    const markerMatch = /^DETAILS_BLOCK_MARKER_(\d+)$/i.exec(text.trim());

    if (markerMatch && options.detailsBlocks) {
      const markerId = parseInt(markerMatch[1]!, 10);
      // Validate the marker ID is within range
      if (markerId >= 0 && markerId < options.detailsBlocks.length) {
        const detailsBlock = options.detailsBlocks[markerId];

        if (detailsBlock) {
          // Create a toggle block for the details
          const summaryText = [notion.richText(detailsBlock.summary)];

          // Parse the content of the details block as markdown
          let contentBlocks: notion.Block[] = [];
          try {
            contentBlocks = markdownToBlocks(
              detailsBlock.content,
              { ...options, detailsBlocks: undefined }, // Avoid infinite recursion
            );
          } catch (error) {
            console.error('Error parsing details block:', error);
            // Fallback if parsing fails
            contentBlocks = [
              notion.paragraph([notion.richText(detailsBlock.content)]),
            ];
          }

          return [notion.toggle(summaryText, contentBlocks)];
        }
      }
    }
  }

  switch (node.type) {
    case 'heading':
      return [parseHeading(node, options)];

    case 'paragraph':
      return parseParagraph(node, options);

    case 'code':
      return [parseCode(node)];

    case 'blockquote':
      return [parseBlockquote(node, options)];

    case 'list':
      return parseList(node, options);

    case 'table':
      return parseTable(node);

    case 'math':
      return [parseMath(node)];

    case 'thematicBreak':
      return [notion.divider()];

    case 'html':
      // Simple HTML parsing - just convert to text for now
      return [notion.paragraph([notion.richText(node.value)])];

    default:
      return [];
  }
}

/** Options common to all methods. */
export interface CommonOptions {
  /**
   * Define how to behave when an item exceeds the Notion's request limits.
   * @see https://developers.notion.com/reference/request-limits#limits-for-property-values
   */
  notionLimits?: {
    /**
     * Whether the excess items or characters should be automatically truncated where possible.
     * If set to `false`, the resulting item will not be compliant with Notion's limits.
     * Please note that text will be truncated only if the parser is not able to resolve
     * the issue in any other way.
     */
    truncate?: boolean;
    /** The callback for when an item exceeds Notion's limits. */
    onError?: (err: Error) => void;
  };
}

export interface BlocksOptions extends CommonOptions {
  /** Whether to render invalid images as text */
  strictImageUrls?: boolean;

  /** Whether to parse blockquotes as toggle blocks */
  parseBlockquotesAsToggle?: boolean;

  /** Always parse blockquotes as toggle blocks regardless of prefix */
  alwaysParseBlockquotesAsToggle?: boolean;

  /** Make headings toggleable */
  toggleableHeadings?: boolean;

  /** Whether to parse links as bookmark blocks */
  parseLinksAsBookmarks?: boolean;

  /** Always parse links as bookmark blocks */
  alwaysParseLinksAsBookmarks?: boolean;

  /** Parse paragraphs starting with emoji as callout blocks */
  parseEmojiPrefixAsCallout?: boolean;

  /** Internal use - for processing details blocks */
  detailsBlocks?: Array<{ marker: string; summary: string; content: string }>;
}

/**
 * Parses Markdown content into Notion Blocks.
 *
 * @param body Any Markdown or GFM content
 * @param options Any additional option
 */
export function markdownToBlocks(
  body: string,
  options?: BlocksOptions,
): notion.Block[] {
  // First preprocess indented lists
  const contentWithFixedLists = preprocessIndentedLists(body);

  // Then preprocess content to handle details/summary blocks
  const { processedContent, detailsBlocks } = preprocessDetailsBlocks(
    contentWithFixedLists,
  );

  // Pass the details blocks to the parser options
  const parserOptions = {
    ...options,
    detailsBlocks,
  };

  const root = unified()
    .use(markdown)
    .use(gfm)
    .use(remarkMath)
    .parse(processedContent);

  const parsed = root.children.flatMap((item) =>
    parseNode(item as md.FlowContent, parserOptions ?? {}),
  );

  const truncate = !!(options?.notionLimits?.truncate ?? true),
    limitCallback =
      options?.notionLimits?.onError ??
      (() => {
        /**/
      });

  if (parsed.length > LIMITS.PAYLOAD_BLOCKS)
    limitCallback(
      new Error(
        `Resulting blocks array exceeds Notion limit (${LIMITS.PAYLOAD_BLOCKS})`,
      ),
    );

  return truncate ? parsed.slice(0, LIMITS.PAYLOAD_BLOCKS) : parsed;
}

export interface RichTextOptions extends CommonOptions {
  /**
   * How to behave when a non-inline element is detected:
   * - `ignore` (default): skip to the next element
   * - `throw`: throw an error
   */
  nonInline?: 'ignore' | 'throw';
}

export function parseRichText(
  root: md.Root,
  options?: RichTextOptions,
): notion.RichText[] {
  const richTexts: notion.RichText[] = [];

  root.children.forEach((child) => {
    if (child.type === 'paragraph')
      child.children.forEach((child) => richTexts.push(...parseInline(child)));
    else if (options?.nonInline === 'throw')
      throw new Error(`Unsupported markdown element: ${JSON.stringify(child)}`);
  });

  const truncate = !!(options?.notionLimits?.truncate ?? true),
    limitCallback =
      options?.notionLimits?.onError ??
      (() => {
        /**/
      });

  if (richTexts.length > LIMITS.RICH_TEXT_ARRAYS)
    limitCallback(
      new Error(
        `Resulting richTexts array exceeds Notion limit (${LIMITS.RICH_TEXT_ARRAYS})`,
      ),
    );

  return (
    truncate ? richTexts.slice(0, LIMITS.RICH_TEXT_ARRAYS) : richTexts
  ).map((rt) => {
    if (rt.type !== 'text') return rt;

    if (rt.text.content.length > LIMITS.RICH_TEXT.TEXT_CONTENT) {
      limitCallback(
        new Error(
          `Resulting text content exceeds Notion limit (${LIMITS.RICH_TEXT.TEXT_CONTENT})`,
        ),
      );
      if (truncate)
        rt.text.content =
          rt.text.content.slice(0, LIMITS.RICH_TEXT.TEXT_CONTENT - 3) + '...';
    }

    if (
      rt.text.link?.url &&
      rt.text.link.url.length > LIMITS.RICH_TEXT.LINK_URL
    )
      // There's no point in truncating URLs
      limitCallback(
        new Error(
          `Resulting text URL exceeds Notion limit (${LIMITS.RICH_TEXT.LINK_URL})`,
        ),
      );

    // Notion equations are not supported by this library, since they don't exist in Markdown

    return rt;
  });
}
