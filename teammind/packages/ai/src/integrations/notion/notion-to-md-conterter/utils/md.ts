import markdownTable from 'markdown-table';

import { CalloutIcon } from '../types';

export const inlineCode = (text: string) => {
  return `\`${text}\``;
};

export const inlineEquation = (text: string) => {
  return `$${text}$`;
};

export const bold = (text: string) => {
  return `**${text}**`;
};

export const italic = (text: string) => {
  return `_${text}_`;
};

export const strikethrough = (text: string) => {
  return `~~${text}~~`;
};

export const underline = (text: string) => {
  return `<u>${text}</u>`;
};

export const link = (text: string, href: string) => {
  return `[${text}](${href})`;
};

export const codeBlock = (text: string, language?: string) => {
  if (!text) return '';
  // Ensure a valid language, default to "plaintext" if missing
  const lang = language?.trim() ? language.toLowerCase() : 'plaintext';
  return `\`\`\`${lang}
${text.trim()}
\`\`\``;
};

export const equation = (text: string) => {
  return `$$
${text}
$$`;
};

export const heading1 = (text: string) => {
  return `# ${text}`;
};

export const heading2 = (text: string) => {
  return `## ${text}`;
};

export const heading3 = (text: string) => {
  return `### ${text}`;
};

export const quote = (text: string) => {
  // the replace is done to handle multiple lines
  return `> ${text.replace(/\n/g, '  \n> ')}`;
};

export const callout = (text: string, icon?: CalloutIcon) => {
  let emoji: string | undefined;
  if (icon?.type === 'emoji') {
    emoji = icon.emoji;
  }

  // the replace is done to handle multiple lines
  const formattedText = text.replace(/\n/g, '  \n> ');
  const formattedEmoji = emoji ? emoji + ' ' : '';
  const headingMatch = /^(#{1,6})\s+([.*\s\S]+)/.exec(formattedText);
  if (headingMatch) {
    const headingLevel = headingMatch[1]!.length;
    const headingContent = headingMatch[2];
    return `> ${'#'.repeat(headingLevel)} ${formattedEmoji}${headingContent}`;
  }
  return `> ${formattedEmoji}${formattedText}`;
};

export const bullet = (text: string, count?: number) => {
  const renderText = text.trim();
  return count ? `${count}. ${renderText}` : `- ${renderText}`;
};

export const todo = (text: string, checked: boolean) => {
  return checked ? `- [x] ${text}` : `- [ ] ${text}`;
};

export const addTabSpace = (text: string, n = 0) => {
  const tab = '    ';
  for (let i = 0; i < n; i++) {
    if (text.includes('\n')) {
      const multiLineText = text.split(/(?:^|\n)/).join(`\n${tab}`);
      text = tab + multiLineText;
    } else text = tab + text;
  }
  return text;
};

export const divider = () => {
  return '---';
};

export const toggle = (summary?: string, children?: string) => {
  if (!summary) return children ?? '';
  return `<details>
<summary>${summary}</summary>
${children ?? ''}
</details>\n\n`;
};

export const table = (cells: string[][]) => {
  return markdownTable(cells);
};
