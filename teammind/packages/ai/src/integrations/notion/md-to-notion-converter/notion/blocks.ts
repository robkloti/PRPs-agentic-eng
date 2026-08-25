import { AppendBlockChildrenParameters } from '@notionhq/client/build/src/api-endpoints';

import { richText, supportedCodeLang } from './common';

export type Block = AppendBlockChildrenParameters['children'][number];
export type BlockWithoutChildren = Exclude<
  (Block & {
    type: 'paragraph';
  })['paragraph']['children'],
  undefined
>[number];
export type RichText = (Block & {
  type: 'paragraph';
})['paragraph']['rich_text'][number];

export function divider(): Block {
  return {
    object: 'block',
    type: 'divider',
    divider: {},
  };
}

export function paragraph(text: RichText[]): Block {
  return {
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: text,
    },
  };
}

export function code(
  text: RichText[],
  lang: supportedCodeLang = 'plain text',
): Block {
  return {
    object: 'block',
    type: 'code',
    code: {
      rich_text: text,
      language: lang,
    },
  };
}

export function blockquote(
  text: RichText[] = [],
  children: Block[] = [],
): Block {
  return {
    object: 'block',
    type: 'quote',
    quote: {
      // By setting an empty rich text we prevent the "Empty quote" line from showing up at all
      rich_text: text.length ? text : [richText('')],
      // @ts-expect-error Typings are not perfect
      children,
    },
  };
}

export function image(url: string): Block {
  return {
    object: 'block',
    type: 'image',
    image: {
      type: 'external',
      external: {
        url: url,
      },
    },
  };
}

export function table_of_contents(): Block {
  return {
    object: 'block',
    type: 'table_of_contents',
    table_of_contents: {},
  };
}

export function headingOne(text: RichText[], isToggleable = false): Block {
  return {
    object: 'block',
    type: 'heading_1',
    heading_1: {
      rich_text: text,
      is_toggleable: isToggleable,
    },
  };
}

export function headingTwo(text: RichText[], isToggleable = false): Block {
  return {
    object: 'block',
    type: 'heading_2',
    heading_2: {
      rich_text: text,
      is_toggleable: isToggleable,
    },
  };
}

export function headingThree(text: RichText[], isToggleable = false): Block {
  return {
    object: 'block',
    type: 'heading_3',
    heading_3: {
      rich_text: text,
      is_toggleable: isToggleable,
    },
  };
}

export function bulletedListItem(
  text: RichText[],
  children: BlockWithoutChildren[] = [],
): Block {
  return {
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: {
      rich_text: text,
      children: children.length ? children : undefined,
    },
  };
}

export function numberedListItem(
  text: RichText[],
  children: BlockWithoutChildren[] = [],
): Block {
  return {
    object: 'block',
    type: 'numbered_list_item',
    numbered_list_item: {
      rich_text: text,
      children: children.length ? children : undefined,
    },
  };
}

export function toDo(
  checked: boolean,
  text: RichText[],
  children: BlockWithoutChildren[] = [],
): Block {
  return {
    object: 'block',
    type: 'to_do',
    to_do: {
      rich_text: text,
      checked: checked,
      children: children.length ? children : undefined,
    },
  };
}

export function table(
  children: BlockWithoutChildren[],
  tableWidth: number,
): Block {
  return {
    object: 'block',
    type: 'table',
    table: {
      table_width: tableWidth,
      has_column_header: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      children: children?.length ? (children as any) : [],
    },
  };
}

export function tableRow(cells: RichText[][] = []): BlockWithoutChildren {
  return {
    object: 'block',
    type: 'table_row',
    table_row: {
      cells: cells.length ? cells : [],
    },
  };
}

export function equation(value: string): Block {
  return {
    type: 'equation',
    equation: {
      expression: value,
    },
  };
}

// New block types

export function toggle(text: RichText[], children: Block[] = []): Block {
  return {
    object: 'block',
    type: 'toggle',
    toggle: {
      rich_text: text.length ? text : [richText('')],
      color: 'default',
      // @ts-expect-error Typings are not perfect
      children: children.length ? children : undefined,
    },
  };
}

export function callout(
  text: RichText[] = [],
  icon: { emoji: string } = { emoji: '💡' },
  color = 'default',
  children: Block[] = [],
): Block {
  return {
    object: 'block',
    type: 'callout',
    callout: {
      rich_text: text.length ? text : [richText('')],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      icon: icon as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      color: color as any,
      // @ts-expect-error Typings are not perfect
      children: children.length ? children : undefined,
    },
  };
}

export function bookmark(url: string, caption: RichText[] = []): Block {
  return {
    object: 'block',
    type: 'bookmark',
    bookmark: {
      url,
      caption,
    },
  };
}
