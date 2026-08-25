// https://confluence.atlassian.com/doc/confluence-storage-format-790796544.html

export const confluencePageFormat = `# Confluence Storage Format (XHTML-based) - Rich Text Layouts

This document outlines the XHTML-based storage format used by Confluence for content elements relevant to rich text layouts. Note that while based on XHTML, it includes custom Confluence elements (like macros) and might not strictly adhere to the XHTML standard.

---

## Headings

| Heading Level | Storage Format     |
| :------------ | :----------------- |
| Heading 1     | \`<h1>Heading 1</h1>\` |
| Heading 2     | \`<h2>Heading 2</h2>\` |
| Heading 3     | \`<h3>Heading 3</h3>\` |
| Heading 4     | \`<h4>Heading 4</h4>\` |
| Heading 5     | \`<h5>Heading 5</h5>\` |
| Heading 6     | \`<h6>Heading 6</h6>\` |

---

## Text Effects

| Effect         | Storage Format                                       |
| :------------- | :--------------------------------------------------- |
| Strong/Bold    | \`<strong>strong text</strong>\`                       |
| Emphasis/Italic| \`<em>Italics Text</em>\`                              |
| Strikethrough  | \`<span style="text-decoration: line-through;">strikethrough</span>\` |
| Underline      | \`<u>underline</u>\`                                   |
| Superscript    | \`<sup>superscript</sup>\`                              |
| Subscript      | \`<sub>subscript</sub>\`                                |
| Monospace      | \`<code>monospaced</code>\`                             |
| Preformatted   | \`<pre>preformatted text</pre>\`                       |
| Block Quote    | \`<blockquote><p>block quote</p></blockquote>\`      |
| Text Color     | \`<span style="color: rgb(255,0,0);">red text</span>\` |
| Small Text     | \`<small>small text</small>\`                          |
| Big Text       | \`<big>big text</big>\`                                |
| Center Align   | \`<p style="text-align: center;">centered text</p>\`   |
| Right Align    | \`<p style="text-align: right;">right aligned text</p>\`|

---

## Text Breaks

| Break Type      | Storage Format                         | Notes                         |
| :-------------- | :------------------------------------- | :---------------------------- |
| New Paragraph   | \`<p>Paragraph 1</p><p>Paragraph 2</p>\` | Standard paragraph separation |
| Line Break      | \`Line 1 <br /> Line 2\`                 | Use Shift+Enter in editor     |
| Horizontal Rule | \`<hr />\`                               | Visual divider                |
| Em Dash (—)     | \`&mdash;\`                              |                               |
| En Dash (–)     | \`&ndash;\`                              |                               |

---

## Lists

| List Type       | Storage Format Example                                    |
| :-------------- | :-------------------------------------------------------- |
| Unordered List  | \`<ul><li>round bullet list item</li></ul>\`                |
| Ordered List    | \`<ol><li>numbered list item</li></ol>\`                    |
| Task List       | \`<ac:task-list><ac:task><ac:task-status>incomplete</ac:task-status><ac:task-body>task list item</ac:task-body></ac:task></ac:task-list>\` |

---

## Links

Links use the \`<ac:link>\` tag for Confluence resources or standard \`<a>\` tags for external URLs. Resource Identifiers (\`<ri:...>\`) specify the target.

| Link Type                 | Storage Format Example                                                                                                |
| :------------------------ | :-------------------------------------------------------------------------------------------------------------------- |
| To Confluence Page        | \`<ac:link><ri:page ri:content-title="Page Title" /><ac:plain-text-link-body><![CDATA[Link Text]]></ac:plain-text-link-body></ac:link>\` |
| To Attachment             | \`<ac:link><ri:attachment ri:filename="file.txt" /><ac:plain-text-link-body><![CDATA[Link Text]]></ac:plain-text-link-body></ac:link>\` |
| To External Site          | \`<a href="http://www.example.com">Example Site</a>\`                                                                   |
| Anchor Link (same page)   | \`<ac:link ac:anchor="anchorName"><ac:plain-text-link-body><![CDATA[Link Text]]></ac:plain-text-link-body></ac:link>\`        |
| Anchor Link (another page)| \`<ac:link ac:anchor="anchorName"><ri:page ri:content-title="Target Page"/><ac:plain-text-link-body><![CDATA[Link Text]]></ac:plain-text-link-body></ac:link>\` |
| Link with Rich Body       | \`<ac:link><ri:page ri:content-title="Home"/><ac:link-body>Some <strong>Rich</strong> Text</ac:link-body></ac:link>\`      |

**Link Body Notes:**
*   \`<ac:plain-text-link-body>\` wraps plain text (use CDATA for special characters).
*   \`<ac:link-body>\` wraps rich text content (e.g., formatted text, images). Supported tags within \`<ac:link-body>\`: \`<b>\`, \`<strong>\`, \`<em>\`, \`<i>\`, \`<code>\`, \`<tt>\`, \`<sub>\`, \`<sup>\`, \`<br>\`, \`<span>\`.

---

## Tables

Standard HTML table tags are used. \`<th>\` for header cells, \`<td>\` for standard cells.

**Example: Simple Table (2x2 with header row)**
\`\`\`xml
<table>
  <tbody>
    <tr>
      <th>Header 1</th>
      <th>Header 2</th>
    </tr>
    <tr>
      <td>Row 1, Cell 1</td>
      <td>Row 1, Cell 2</td>
    </tr>
  </tbody>
</table>
\`\`\`

**Example: Table with Merged Cells**
(Using \`rowspan\` and \`colspan\` attributes on \`<td>\` or \`<th>\`)
\`\`\`xml
<table>
  <tbody>
    <tr>
      <th>Header 1</th>
      <th>Header 2</th>
    </tr>
    <tr>
      <td rowspan="2">Merged Row Cell</td>
      <td>Normal Cell 1</td>
    </tr>
    <tr>
      <td>Normal Cell 2</td>
    </tr>
     <tr>
      <td colspan="2">Merged Column Cell</td>
    </tr>
  </tbody>
</table>
\`\`\`

---

## Page Layouts

Uses custom \`ac:\` tags to define sections and columns.

*   \`<ac:layout>\`: Top-level container for layouts.
*   \`<ac:layout-section>\`: Represents a row within the layout.
    *   \`ac:type\`: Defines the column configuration for the section.
*   \`<ac:layout-cell>\`: Represents a column within a section. Content goes inside this tag.

**Section Types (\`ac:type\` values for \`<ac:layout-section>\`):**

| \`ac:type\`             | Expected Cells | Description                             |
| :-------------------- | :------------- | :-------------------------------------- |
| \`single\`              | 1              | One full-width cell.                    |
| \`two_equal\`           | 2              | Two cells of equal width.               |
| \`two_left_sidebar\`    | 2              | Narrow (~30%) left cell, wide right cell. |
| \`two_right_sidebar\`   | 2              | Wide left cell, narrow (~30%) right cell. |
| \`three_equal\`         | 3              | Three cells of equal width.             |
| \`three_with_sidebars\` | 3              | Narrow (~20%), wide, narrow (~20%).     |

**Example Layout Structure:**
\`\`\`xml
<ac:layout>
  <ac:layout-section ac:type="single">
     <ac:layout-cell>
        <p>Full width content...</p>
     </ac:layout-cell>
  </ac:layout-section>
 <ac:layout-section ac:type="two_equal">
     <ac:layout-cell>
       <p>Left column content...</p>
     </ac:layout-cell>
     <ac:layout-cell>
       <p>Right column content...</p>
     </ac:layout-cell>
  </ac:layout-section>
</ac:layout>
\`\`\`

---

## Emojis / Emoticons

Uses the \`<ac:emoticon>\` tag.

| Emoticon Name   | Storage Format                        | Displayed As |
| :-------------- | :------------------------------------ | :----------- |
| smile           | \`<ac:emoticon ac:name="smile" />\`     | (smile)      |
| sad             | \`<ac:emoticon ac:name="sad" />\`       | (sad)        |
| cheeky          | \`<ac:emoticon ac:name="cheeky" />\`    | (tongue)     |
| laugh           | \`<ac:emoticon ac:name="laugh" />\`     | (big grin)   |
| wink            | \`<ac:emoticon ac:name="wink" />\`      | (wink)       |
| thumbs-up       | \`<ac:emoticon ac:name="thumbs-up" />\` | (thumbs up)  |
| thumbs-down     | \`<ac:emoticon ac:name="thumbs-down" />\` | (thumbs down)|
| information     | \`<ac:emoticon ac:name="information" />\`| (info)       |
| tick            | \`<ac:emoticon ac:name="tick" />\`      | (tick)       |
| cross           | \`<ac:emoticon ac:name="cross" />\`     | (error)      |
| warning         | \`<ac:emoticon ac:name="warning" />\`   | (warning)    |

---


## Resource Identifiers (\`ri:\`)

Used internally by tags like \`<ac:link>\` and \`<ac:image>\` to reference Confluence content or external URLs.

| Resource Type | Storage Format Example                                  | Notes                                        |
| :------------ | :------------------------------------------------------ | :------------------------------------------- |
| Page          | \`<ri:page ri:content-title="My Page" ri:space-key="KEY"/>\` | \`ri:space-key\` is optional for current space |
| Blog Post     | \`<ri:blog-post ri:content-title="My Post" ri:posting-day="2023/10/27"/>\` | \`ri:space-key\` is optional          |
| URL           | \`<ri:url ri:value="http://example.com"/>\`               | Used for external links/images               |
| User          | \`<ri:user ri:userkey="user-key-hash"/>\`                 | References a specific Confluence user        |
| Space         | \`<ri:space ri:space-key="KEY"/>\`                        | References a specific space                  |`;
