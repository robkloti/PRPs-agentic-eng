// https://developers.notion.com/reference/block
export const notionPageFormat = `# Notion Block API Definition (Rich Text Layouts)

A block object represents a piece of content within Notion. The API translates headings, toggles, paragraphs, lists, media, and more into different block type objects.

## Common Block Properties

📘 Fields marked with an \`*\` are available to integrations with any capabilities. Other properties require read content capabilities.

| Field            | Type                         | Description                                                                                                | Example Value                                                      |
| :--------------- | :--------------------------- | :--------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------- |
| object*          | string                       | Always \`"block"\`.                                                                                          | \`"block"\`                                                          |
| id*              | string (UUIDv4)              | Identifier for the block.                                                                                  | \`"7af38973-3787-41b3-bd75-0ed3a1edfac9"\`                           |
| parent           | object                       | Information about the block's parent. See Parent object.                                                   | \`{ "type": "block_id", "block_id": "7d50a184-5bbe-4d90-8f29-6bec57ed817b" }\` |
| type             | string (enum)                | Type of block. Relevant values include: \`paragraph\`, \`heading_1\`, \`heading_2\`, \`heading_3\`, \`bulleted_list_item\`, \`numbered_list_item\`, \`to_do\`, \`toggle\`, \`callout\`, \`quote\`, \`divider\`, \`table\`, \`table_row\`, \`column_list\`, \`column\`, \`table_of_contents\`. See full list in source for all types. | \`"paragraph"\`                                                      |
| created_time     | string (ISO 8601 date time)  | Date and time when this block was created.                                                                 | \`"2020-03-17T19:10:04.968Z"\`                                       |
| created_by       | Partial User                 | User who created the block.                                                                                | \`{"object": "user","id": "45ee8d13-687b-47ce-a5ca-6e2e45548c4b"}\`  |
| last_edited_time | string (ISO 8601 date time)  | Date and time when this block was last updated.                                                            | \`"2020-03-17T19:10:04.968Z"\`                                       |
| last_edited_by   | Partial User                 | User who last edited the block.                                                                            | \`{"object": "user","id": "45ee8d13-687b-47ce-a5ca-6e2e45548c4b"}\`  |
| archived         | boolean                      | The archived status of the block.                                                                          | \`false\`                                                            |
| in_trash         | boolean                      | Whether the block has been deleted.                                                                        | \`false\`                                                            |
| has_children     | boolean                      | Whether or not the block has children blocks nested within it.                                             | \`true\`                                                             |
| {type}           | block type object            | An object containing type-specific block information.                                                      | Varies depending on the \`type\`.                                    |

## Block Type Objects

Every block object has a key corresponding to the value of \`type\`. Under the key is an object with type-specific block information. Many block types support rich text and children blocks.

Possible \`color\` enum values for supported blocks:
\`"blue"\`, \`"blue_background"\`, \`"brown"\`, \`"brown_background"\`, \`"default"\`, \`"gray"\`, \`"gray_background"\`, \`"green"\`, \`"green_background"\`, \`"orange"\`, \`"orange_background"\`, \`"yellow"\`, \`"pink"\`, \`"pink_background"\`, \`"purple"\`, \`"purple_background"\`, \`"red"\`, \`"red_background"\`, \`"yellow_background"\`

---

### Paragraph

Paragraph block objects contain the following information within the \`paragraph\` property:

| Field     | Type                        | Description                                    |
| :-------- | :-------------------------- | :--------------------------------------------- |
| rich_text | array of rich text objects  | The rich text displayed in the paragraph block. |
| color     | string (enum)               | The color of the block.                        |
| children  | array of block objects (opt) | The nested child blocks (if any).              |

**Example Paragraph block object:**

\`\`\`json
{
  "object": "block",
  "id": "...",
  "parent": { "...": "..." },
  "created_time": "...",
  "last_edited_time": "...",
  "created_by": { "...": "..." },
  "last_edited_by": { "...": "..." },
  "has_children": false,
  "archived": false,
  "in_trash": false,
  "type": "paragraph",
  "paragraph": {
    "rich_text": [{
      "type": "text",
      "text": {
        "content": "Lacinato kale",
        "link": null
      },
      "annotations": {
        "bold": false,
        "italic": false,
        "strikethrough": false,
        "underline": false,
        "code": false,
        "color": "default"
      },
      "plain_text": "Lacinato kale",
      "href": null
    }],
    "color": "default"
  }
}
\`\`\`

---

### Headings (\`heading_1\`, \`heading_2\`, \`heading_3\`)

All heading block objects contain the following information within their corresponding type property (e.g., \`heading_1\`):

| Field         | Type                       | Description                                                                                           |
| :------------ | :------------------------- | :---------------------------------------------------------------------------------------------------- |
| rich_text     | array of rich text objects | The rich text of the heading.                                                                         |
| color         | string (enum)              | The color of the block.                                                                               |
| is_toggleable | boolean                    | Whether or not the heading block is a toggle heading. If \`true\`, it can support children blocks. |

**Example Heading 2 block object:**

\`\`\`json
{
  "object": "block",
  "id": "c02fc1d3-db8b-45c5-a222-27595b15aea7",
  "parent": { "...": "..." },
  "created_time": "2022-03-01T19:05:00.000Z",
  "last_edited_time": "2022-07-06T19:41:00.000Z",
  "created_by": { "...": "..." },
  "last_edited_by": { "...": "..." },
  "has_children": false,
  "archived": false,
  "in_trash": false,
  "type": "heading_2",
  "heading_2": {
    "rich_text": [
      {
        "type": "text",
        "text": {
          "content": "Lacinato kale",
          "link": null
        },
        "annotations": {
          "bold": false,
          "italic": false,
          "strikethrough": false,
          "underline": false,
          "code": false,
          "color": "green"
        },
        "plain_text": "Lacinato kale",
        "href": null
      }
    ],
    "color": "default",
    "is_toggleable": false
  }
}
\`\`\`

---

### Bulleted List Item (\`bulleted_list_item\`)

Bulleted list item block objects contain the following information within the \`bulleted_list_item\` property:

| Field     | Type                        | Description                                       |
| :-------- | :-------------------------- | :------------------------------------------------ |
| rich_text | array of rich text objects  | The rich text in the bulleted_list_item block.    |
| color     | string (enum)               | The color of the block.                           |
| children  | array of block objects (opt) | The nested child blocks (if any).                 |

**Example Bulleted list item block object:**

\`\`\`json
{
  "object": "block",
  "id": "...",
  "parent": { "...": "..." },
  "created_time": "...",
  "last_edited_time": "...",
  "created_by": { "...": "..." },
  "last_edited_by": { "...": "..." },
  "has_children": true,
  "archived": false,
  "in_trash": false,
  "type": "bulleted_list_item",
  "bulleted_list_item": {
    "rich_text": [{
      "type": "text",
      "text": {
        "content": "Lacinato kale",
        "link": null
      },
      "annotations": { "...": "..." },
      "plain_text": "Lacinato kale",
      "href": null
    }],
    "color": "default",
    "children":[{
      "object": "block",
      "id": "...",
      "type": "paragraph",
      "paragraph": { "rich_text": [ { "type": "text", "text": { "content": "Nested item" }} ] }
    }]
  }
}
\`\`\`

---

### Numbered List Item (\`numbered_list_item\`)

Numbered list item block objects contain the following information within the \`numbered_list_item\` property:

| Field     | Type                        | Description                                      |
| :-------- | :-------------------------- | :----------------------------------------------- |
| rich_text | array of rich text objects  | The rich text displayed in the numbered_list_item block. |
| color     | string (enum)               | The color of the block.                          |
| children  | array of block objects (opt) | The nested child blocks (if any).                |

**Example Numbered list item block object:**

\`\`\`json
{
  "object": "block",
  "id": "...",
  "parent": { "...": "..." },
  "created_time": "...",
  "last_edited_time": "...",
  "created_by": { "...": "..." },
  "last_edited_by": { "...": "..." },
  "has_children": false,
  "archived": false,
  "in_trash": false,
  "type": "numbered_list_item",
  "numbered_list_item": {
    "rich_text": [
      {
        "type": "text",
        "text": {
          "content": "Finish reading the docs",
          "link": null
        },
        "annotations": { "...": "..." },
        "plain_text": "Finish reading the docs",
        "href": null
      }
    ],
    "color": "default"
  }
}
\`\`\`

---

### To Do (\`to_do\`)

To do block objects contain the following information within the \`to_do\` property:

| Field     | Type                        | Description                       |
| :-------- | :-------------------------- | :-------------------------------- |
| rich_text | array of rich text objects  | The rich text displayed in the To do block. |
| checked   | boolean (optional)          | Whether the To do is checked.     |
| color     | string (enum)               | The color of the block.           |
| children  | array of block objects (opt) | The nested child blocks (if any). |

**Example To do block object:**

\`\`\`json
{
  "object": "block",
  "id": "...",
  "parent": { "...": "..." },
  "created_time": "...",
  "last_edited_time": "...",
  "created_by": { "...": "..." },
  "last_edited_by": { "...": "..." },
  "has_children": true,
  "archived": false,
  "in_trash": false,
  "type": "to_do",
  "to_do": {
    "rich_text": [{
      "type": "text",
      "text": {
        "content": "Finish Q3 goals",
        "link": null
      },
      "annotations": { "...": "..." },
      "plain_text": "Finish Q3 goals",
      "href": null
    }],
    "checked": false,
    "color": "default",
    "children":[{
      "object": "block",
      "id": "...",
      "type": "paragraph",
      "paragraph": { "rich_text": [ { "type": "text", "text": { "content": "Nested note" }} ] }
    }]
  }
}
\`\`\`

---

### Toggle (\`toggle\`)

Toggle block objects contain the following information within the \`toggle\` property:

| Field     | Type                        | Description                       |
| :-------- | :-------------------------- | :-------------------------------- |
| rich_text | array of rich text objects  | The rich text displayed in the Toggle block. |
| color     | string (enum)               | The color of the block.           |
| children  | array of block objects (opt) | The nested child blocks (if any). |

**Example Toggle block object:**

\`\`\`json
{
  "object": "block",
  "id": "...",
  "parent": { "...": "..." },
  "created_time": "...",
  "last_edited_time": "...",
  "created_by": { "...": "..." },
  "last_edited_by": { "...": "..." },
  "has_children": true,
  "archived": false,
  "in_trash": false,
  "type": "toggle",
  "toggle": {
    "rich_text": [{
      "type": "text",
      "text": {
        "content": "Additional project details",
        "link": null
      },
      "annotations": { "...": "..." },
      "plain_text": "Additional project details",
      "href": null
    }],
    "color": "default",
    "children":[{
      "object": "block",
      "id": "...",
      "type": "paragraph",
      "paragraph": { "rich_text": [ { "type": "text", "text": { "content": "Details here." }} ] }
    }]
  }
}
\`\`\`

---

### Callout (\`callout\`)

Callout block objects contain the following information within the \`callout\` property:

| Field     | Type                        | Description                                                            |
| :-------- | :-------------------------- | :--------------------------------------------------------------------- |
| rich_text | array of rich text objects  | The rich text in the callout block.                                    |
| icon      | object (emoji or file)      | An emoji or file object that represents the callout's icon.            |
| color     | string (enum)               | The color of the block (usually corresponds to background color). |
| children  | array of block objects (opt) | The nested child blocks (if any).                                      |

**Example Callout block object:**

\`\`\`json
{
  "object": "block",
  "id": "...",
  "parent": { "...": "..." },
  "created_time": "...",
  "last_edited_time": "...",
  "created_by": { "...": "..." },
  "last_edited_by": { "...": "..." },
  "has_children": false,
  "archived": false,
  "in_trash": false,
  "type": "callout",
   "callout": {
   	"rich_text": [{
      "type": "text",
      "text": {
        "content": "Important Note",
        "link": null
      },
      "annotations": { "...": "..." },
      "plain_text": "Important Note",
      "href": null
    }],
     "icon": {
       "type": "emoji",
       "emoji": "⭐"
     },
     "color": "gray_background"
   }
}
\`\`\`

---

### Quote (\`quote\`)

Quote block objects contain the following information within the \`quote\` property:

| Field     | Type                        | Description                       |
| :-------- | :-------------------------- | :-------------------------------- |
| rich_text | array of rich text objects  | The rich text displayed in the quote block. |
| color     | string (enum)               | The color of the block.           |
| children  | array of block objects (opt) | The nested child blocks (if any). |

**Example Quote block object:**

\`\`\`json
{
  "object": "block",
  "id": "...",
  "parent": { "...": "..." },
  "created_time": "...",
  "last_edited_time": "...",
  "created_by": { "...": "..." },
  "last_edited_by": { "...": "..." },
  "has_children": false,
  "archived": false,
  "in_trash": false,
	"type": "quote",
   "quote": {
   	"rich_text": [{
      "type": "text",
      "text": {
        "content": "To be or not to be...",
        "link": null
      },
      "annotations": { "...": "..." },
      "plain_text": "To be or not to be...",
      "href": null
    }],
    "color": "default"
   }
}
\`\`\`

---

### Divider (\`divider\`)

Divider block objects do not contain any specific information within the \`divider\` property. They represent a visual horizontal line.

**Example Divider block object:**

\`\`\`json
{
  "object": "block",
  "id": "...",
  "parent": { "...": "..." },
  "created_time": "...",
  "last_edited_time": "...",
  "created_by": { "...": "..." },
  "last_edited_by": { "...": "..." },
  "has_children": false,
  "archived": false,
  "in_trash": false,
  "type": "divider",
  "divider": {}
}
\`\`\`

---

### Column List (\`column_list\`) and Column (\`column\`)

Column lists are parent blocks for columns. They do not contain any information within the \`column_list\` property. Columns are children of \`column_list\` and act as containers for other blocks. Columns do not contain any information within the \`column\` property.

-   A \`column_list\` must have at least two \`column\` children when created.
-   Each \`column\` must have at least one child block when created within a \`column_list\`.

**Example Column List block object:**

\`\`\`json
{
  "object": "block",
  "id": "...",
  "parent": { "...": "..." },
  "created_time": "...",
  "last_edited_time": "...",
  "created_by": { "...": "..." },
  "last_edited_by": { "...": "..." },
  "has_children": true, // Will contain Column blocks
  "archived": false,
  "in_trash": false,
  "type": "column_list",
  "column_list": {}
}
\`\`\`

**Example Column block object (child of a \`column_list\`):**

\`\`\`json
{
  "object": "block",
  "id": "...",
  "parent": { "type": "block_id", "block_id": "<column_list_id>" },
  "created_time": "...",
  "last_edited_time": "...",
  "created_by": { "...": "..." },
  "last_edited_by": { "...": "..." },
  "has_children": true, // Will contain content blocks
  "archived": false,
  "in_trash": false,
  "type": "column",
  "column": {}
}
\`\`\`

---

### Table (\`table\`)

Table block objects are parent blocks for \`table_row\` children. They contain the following fields within the \`table\` property:

| Field             | Type    | Description                                                                 |
| :---------------- | :------ | :-------------------------------------------------------------------------- |
| table_width       | integer | The number of columns in the table. (Cannot be changed after creation).     |
| has_column_header | boolean | Whether the table has a visually distinct column header row (first row).    |
| has_row_header    | boolean | Whether the table has a visually distinct row header column (first column). |
| children          | array   | Contains \`table_row\` block objects.                                         |

**Example Table block object:**

\`\`\`json
{
  "object": "block",
  "id": "...",
  "parent": { "...": "..." },
  "created_time": "...",
  "last_edited_time": "...",
  "created_by": { "...": "..." },
  "last_edited_by": { "...": "..." },
  "has_children": true, // Contains table_row blocks
  "archived": false,
  "in_trash": false,
  "type": "table",
  "table": {
    "table_width": 2,
    "has_column_header": false,
    "has_row_header": false
  }
}
\`\`\`

---

### Table Row (\`table_row\`)

Table row block objects are children of \`table\` blocks. They contain the following fields within the \`table_row\` property:

| Field | Type                              | Description                                                            |
| :---- | :-------------------------------- | :--------------------------------------------------------------------- |
| cells | array of array of rich text objects | An array of cell contents. Each inner array represents a cell's content. The outer array length matches \`table_width\`. |

**Example Table row block object (child of a \`table\`):**

\`\`\`json
{
  "object": "block",
  "id": "...",
  "parent": { "type": "block_id", "block_id": "<table_id>" },
  "created_time": "...",
  "last_edited_time": "...",
  "created_by": { "...": "..." },
  "last_edited_by": { "...": "..." },
  "has_children": false,
  "archived": false,
  "in_trash": false,
  "type": "table_row",
  "table_row": {
    "cells": [
      [ // Cell 1
        {
          "type": "text",
          "text": { "content": "Row 1, Col 1", "link": null },
          "annotations": { "...": "..." },
          "plain_text": "Row 1, Col 1",
          "href": null
        }
      ],
      [ // Cell 2
        {
          "type": "text",
          "text": { "content": "Row 1, Col 2", "link": null },
          "annotations": { "...": "..." },
          "plain_text": "Row 1, Col 2",
          "href": null
        }
      ]
      // Array length matches table.table_width
    ]
  }
}
\`\`\`
📘 When creating a \`table\` block, it must have at least one \`table_row\` child whose \`cells\` array length matches the \`table_width\`.

---

### Table of Contents (\`table_of_contents\`)

Table of contents block objects contain the following information within the \`table_of_contents\` property:

| Field | Type          | Description             |
| :---- | :------------ | :---------------------- |
| color | string (enum) | The color of the block. |

**Example Table of contents block object:**

\`\`\`json
{
  "object": "block",
  "id": "...",
  "parent": { "...": "..." },
  "created_time": "...",
  "last_edited_time": "...",
  "created_by": { "...": "..." },
  "last_edited_by": { "...": "..." },
  "has_children": false,
  "archived": false,
  "in_trash": false,
	"type": "table_of_contents",
  "table_of_contents": {
  	"color": "default"
  }
}

\`\`\`
`;
