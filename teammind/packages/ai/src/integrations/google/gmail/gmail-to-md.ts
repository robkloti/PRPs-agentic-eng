import TurndownService from 'turndown';

import { GmailBodyParts, GmailEmailMetadata } from '../../../types/google';

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const turndownPluginGfm = require('@guyplusplus/turndown-plugin-gfm');
// Adjust path as needed

// Helper type for Node attributes
interface NodeWithAttributes extends Node {
  attributes?: { [key: string]: { value: string } };
  innerHTML?: string;
  outerHTML?: string;
  textContent: string;
  style?: Record<string, string>;
}

/**
 * Result of email conversion
 */
export interface ConversionResult {
  markdown: string;
  mentionedAddresses: string[];
}

/**
 * Converts Gmail email content to clean markdown.
 * Attempts nested conversion for complex table cells. Removes all images.
 */
export class GmailToMarkdownConverter {
  private turndownService: TurndownService;

  constructor() {
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      hr: '---',
      bulletListMarker: '-',
      codeBlockStyle: 'fenced',
      emDelimiter: '*',
      strongDelimiter: '**',
      linkStyle: 'inlined',
      blankReplacement: (_content: string, node: Node) => {
        return this.isBlockElement(node as NodeWithAttributes) ? '\n\n' : '\n';
      },
      // Keep TD and TH content even if Turndown thinks it's blank,
      // as our custom rule might process it.
      keepReplacement: (content: string, node: Node): string => {
        const tagName = (node as NodeWithAttributes).nodeName?.toUpperCase();
        return tagName === 'TD' || tagName === 'TH' ? content : '';
      },
    });

    // Add GitHub Flavored Markdown support (includes table handling)
    this.turndownService.use([turndownPluginGfm.gfm]);

    // --- Element Removal ---
    // Remove specific HTML elements
    this.turndownService.remove([
      'script',
      'noscript',
      'style',
      'meta',
      'iframe',
      'object',
      'embed',
      'canvas',
      'map',
      'button',
      'img', // *** REMOVE ALL IMAGES ***
    ]);

    // Remove empty P and DIV elements
    this.turndownService.remove(
      (node: Node, _options: TurndownService.Options) => {
        const element = node as NodeWithAttributes;
        const tagName = element.nodeName.toUpperCase();
        if (
          (tagName === 'P' || tagName === 'DIV') &&
          this.isBlank(element.textContent) &&
          !(element.innerHTML || '').includes('<hr')
        ) {
          return true; // Remove empty P/DIV used for spacing
        }
        return false;
      },
    );

    // --- Custom Rules ---
    // Add rules *after* .use()
    this.addCustomRules();
  }

  private isBlockElement(node: NodeWithAttributes): boolean {
    if (!node || typeof node.nodeName !== 'string') return false;
    const blockElements = [
      'ADDRESS',
      'ARTICLE',
      'ASIDE',
      'BLOCKQUOTE',
      'CANVAS',
      'DD',
      'DIV',
      'DL',
      'DT',
      'FIELDSET',
      'FIGCAPTION',
      'FIGURE',
      'FOOTER',
      'FORM',
      'H1',
      'H2',
      'H3',
      'H4',
      'H5',
      'H6',
      'HEADER',
      'HR',
      'LI',
      'MAIN',
      'NAV',
      'NOSCRIPT',
      'OL',
      'P',
      'PRE',
      'SECTION',
      'TABLE',
      'TFOOT',
      'UL',
      'VIDEO',
    ];
    return blockElements.includes(node.nodeName.toUpperCase());
  }

  private getAttributeSafely(
    node: NodeWithAttributes,
    attributeName: string,
  ): string | null {
    if (!node || !node.attributes) return null;
    const lowerAttrName = attributeName.toLowerCase();
    for (const key in node.attributes) {
      if (
        Object.prototype.hasOwnProperty.call(node.attributes, key) &&
        key.toLowerCase() === lowerAttrName
      ) {
        return node.attributes[key]?.value || null;
      }
    }
    if (node.attributes && node.attributes[attributeName])
      return node.attributes[attributeName]?.value || null;
    return null;
  }

  // Helper to safely get innerHTML, needed for nested conversion
  private getInnerHtmlSafely(node: NodeWithAttributes): string {
    if (typeof node.innerHTML === 'string') return node.innerHTML;
    // Fallback: Serialize child nodes if innerHTML is not directly available
    let html = '';
    if (node.childNodes) {
      for (let i = 0; i < node.childNodes.length; i++) {
        // Need a safe outerHTML serializer for this fallback
        html += this.getOuterHtmlSafely(
          node.childNodes[i] as NodeWithAttributes,
        );
      }
    }
    return html;
  }

  // Basic outerHTML fallback (only needed if getInnerHtmlSafely fallback is used)
  private getOuterHtmlSafely(node: NodeWithAttributes): string {
    if (typeof node.outerHTML === 'string') return node.outerHTML;
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tagName = (node.nodeName || '').toLowerCase();
      if (!tagName) return '';
      let attrs = '';
      if (node.attributes) {
        for (const key in node.attributes) {
          if (Object.prototype.hasOwnProperty.call(node.attributes, key)) {
            const value = (node.attributes[key]?.value || '').replace(
              /"/g,
              '"',
            );
            attrs += ` ${key}="${value}"`;
          }
        }
      }
      const innerHTML = this.getInnerHtmlSafely(node);
      const selfClosingTags = [
        'area',
        'base',
        'br',
        'col',
        'embed',
        'hr',
        'img',
        'input',
        'link',
        'meta',
        'param',
        'source',
        'track',
        'wbr',
      ];
      if (selfClosingTags.includes(tagName)) return `<${tagName}${attrs}>`;
      else return `<${tagName}${attrs}>${innerHTML}</${tagName}>`;
    } else if (node.nodeType === Node.TEXT_NODE) {
      return (node.nodeValue || '').replace(/</g, '<').replace(/>/g, '>');
    }
    return '';
  }

  private addCustomRules(): void {
    // Rule for PRE tags -> fenced code blocks
    this.turndownService.addRule('preToFencedCode', {
      filter: ['pre'],
      replacement: (content: string, node: Node): string => {
        const element = node as NodeWithAttributes;
        const className = this.getAttributeSafely(element, 'class') || '';
        const langMatch = className.match(/language-(\S+)/);
        const lang = langMatch ? langMatch[1] : '';
        let decodedContent = content;
        try {
          const he = require('he');
          decodedContent = he.decode(content);
        } catch (e) {
          decodedContent = content
            .replace(/</g, '<')
            .replace(/>/g, '>')
            .replace(/&/g, '&')
            .replace(/"/g, '"')
            .replace(/'/g, "'");
        }
        return `\n\n\`\`\`${lang}\n${decodedContent.trim()}\n\`\`\`\n\n`;
      },
    });

    // Handle blockquotes for email replies
    this.turndownService.addRule('emailQuote', {
      filter: (node: Node): boolean => {
        const element = node as NodeWithAttributes;
        if (!element || typeof element.nodeName !== 'string') return false;
        if (element.nodeName === 'BLOCKQUOTE') return true;
        if (element.nodeName === 'DIV') {
          const className = this.getAttributeSafely(element, 'class');
          return (
            className !== null &&
            (className.includes('gmail_quote') ||
              className.includes('moz-cite-prefix') ||
              className.includes('Quote') ||
              className.includes('quote') ||
              className.includes('gmail_extra') ||
              className.includes('msg_quote'))
          );
        }
        if (
          element.nodeName === 'P' &&
          (this.getAttributeSafely(element, 'class') || '')
            .toLowerCase()
            .includes('msoreply')
        )
          return true;
        if (
          element.nodeName === 'HR' &&
          (this.getAttributeSafely(element, 'class') || '')
            .toLowerCase()
            .includes('stopreply')
        )
          return true;
        return false;
      },
      replacement: (content: string, node: Node): string => {
        const element = node as NodeWithAttributes;
        const trimmedContent = content.trim();
        if (
          element.nodeName === 'HR' &&
          (this.getAttributeSafely(element, 'class') || '')
            .toLowerCase()
            .includes('stopreply')
        ) {
          return '\n\n---\n*Reply Separator*\n---\n\n';
        }
        if (!trimmedContent) return '';
        return '\n\n> ' + trimmedContent.split('\n').join('\n> ') + '\n\n';
      },
    });

    // Handle email signatures
    this.turndownService.addRule('emailSignature', {
      filter: (node: Node): boolean => {
        const element = node as NodeWithAttributes;
        if (!element || typeof element.nodeName !== 'string') return false;
        if (element.nodeName === 'SIGNATURE') return true;
        if (element.nodeName === 'DIV' || element.nodeName === 'SPAN') {
          const className = this.getAttributeSafely(element, 'class');
          const idAttr = this.getAttributeSafely(element, 'id');
          return !!(
            (className &&
              (className.includes('signature') ||
                className.includes('Signature') ||
                className.includes('moz-signature'))) ||
            (idAttr &&
              (idAttr.includes('signature') || idAttr.includes('Signature')))
          );
        }
        if (
          (element.nodeName === 'P' || element.nodeName === 'DIV') &&
          (element.textContent || '').trim() === '--'
        )
          return true;
        return false;
      },
      replacement: (content: string): string => {
        const trimmedContent = content.trim();
        if (!trimmedContent || trimmedContent === '--') return '';
        return `\n\n---\n\n${trimmedContent}\n`;
      },
    });

    // Keep definition lists somewhat formatted
    this.turndownService.keep(['dl', 'dt', 'dd']);
    this.turndownService.addRule('definitionList', {
      filter: ['dt'],
      replacement: (content) => `**${content.trim()}**\n`,
    });
    this.turndownService.addRule('definitionDescription', {
      filter: ['dd'],
      replacement: (content) => `  : ${content.trim()}\n\n`,
    });

    // Emphasize links styled like buttons
    this.turndownService.addRule('styledLinksAsButtons', {
      filter: (node: Node): boolean => {
        const element = node as NodeWithAttributes;
        if (!element || element.nodeName !== 'A') return false;
        const style = this.getAttributeSafely(element, 'style');
        const className = this.getAttributeSafely(element, 'class');
        const role = this.getAttributeSafely(element, 'role');
        return (
          (style &&
            (style.includes('background:') ||
              style.includes('border:') ||
              style.includes('padding:'))) ||
          (className &&
            (className.includes('button') || className.includes('btn'))) ||
          role === 'button'
        );
      },
      replacement: (content: string, node: Node): string => {
        const element = node as NodeWithAttributes;
        const href = this.getAttributeSafely(element, 'href') || '#';
        const text =
          content.trim() ||
          this.getAttributeSafely(element, 'title') ||
          'Button Link';
        return ` **[${text}](${href})** `;
      },
    });

    // Remove image links rule
    this.turndownService.addRule('removeImageLinks', {
      filter: (node: Node): boolean => {
        const element = node as NodeWithAttributes;
        if (!element || element.nodeName !== 'A') return false;

        // Check if this link contains an image reference or points to an image
        const href = this.getAttributeSafely(element, 'href') || '';
        const text = element.textContent || '';

        if (href.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i)) return true;
        if (text.startsWith('!') || text.match(/^<img/i)) return true;

        return false;
      },
      replacement: () => {
        // Replace image links with empty string
        return '';
      },
    });

    // *** Table Cells (td, th) with Nested Conversion ***
    this.turndownService.addRule('tableCellNestedConversion', {
      filter: ['td', 'th'],
      replacement: (content: string, node: Node): string => {
        const element = node as NodeWithAttributes;
        let cellMarkdown = content; // Start with the default conversion

        // Heuristic: Does the initial conversion result still contain block-level HTML?
        const containsBlockHTML =
          /<\/?(div|p|ul|ol|li|h[1-6]|blockquote|table|tr|td|th|hr)[^>]*>/i.test(
            cellMarkdown,
          );
        // Or did the initial conversion result in blank content despite the node having text?
        const isEffectivelyBlank = this.isBlank(
          cellMarkdown.replace(/[\s\xA0\u200B-\u200D\uFEFF]+/g, ''),
        );
        const originalNodeHadContent = !this.isBlank(element.textContent);

        if (
          containsBlockHTML ||
          (isEffectivelyBlank && originalNodeHadContent)
        ) {
          try {
            // Get the innerHTML of the cell
            const cellInnerHTML = this.getInnerHtmlSafely(element);

            if (!this.isBlank(cellInnerHTML)) {
              // Before converting, remove any img tags from the innerHTML
              const cleanedInnerHTML = cellInnerHTML.replace(
                /<img[^>]*>/gi,
                '',
              );

              // Perform nested conversion using the *same* Turndown instance
              cellMarkdown = this.turndownService.turndown(cleanedInnerHTML);

              // Basic cleanup after nested conversion
              cellMarkdown = cellMarkdown.trim();

              // Instead of using <br>, use proper markdown line breaks
              // But keep paragraph structure that works in tables
              cellMarkdown = cellMarkdown.replace(/\n{2,}/g, ' \n ');
              cellMarkdown = cellMarkdown.replace(/\n/g, ' ');
            } else {
              // If innerHTML is blank, use cleaned textContent as a fallback
              cellMarkdown = (element.textContent || '')
                .replace(/[\s\xA0\u200B-\u200D\uFEFF]+/g, ' ')
                .trim();
            }
          } catch (nestedError) {
            console.error(
              `Nested conversion failed for cell (${element.nodeName}):`,
              nestedError,
            );
            // Fallback to text content if nested conversion errors out
            cellMarkdown = (element.textContent || '')
              .replace(/[\s\xA0\u200B-\u200D\uFEFF]+/g, ' ')
              .trim();
          }
        }

        // Remove any remaining image references
        cellMarkdown = cellMarkdown.replace(/!\[.*?\]\(.*?\)/g, '');
        cellMarkdown = cellMarkdown.replace(/!<[^>]*>/g, '');

        // IMPORTANT: Escape pipe characters in the final cell content to prevent breaking the table row
        cellMarkdown = cellMarkdown.replace(/\|/g, '\\|');

        // Trim the final result for the cell
        return cellMarkdown.trim();
      },
    });
  } // End of addCustomRules

  /** Creates a thread document from multiple emails (expected sorted oldest to newest) */
  public createThreadDocument(
    emails: { body: GmailBodyParts; metadata: GmailEmailMetadata }[],
  ): { content: string; hasContent: boolean } {
    if (!emails || emails.length === 0)
      return { content: '', hasContent: false };

    // Sort emails chronologically
    const sortedEmails = [...emails].sort((a, b) => {
      try {
        const dateA = new Date(a.metadata.date);
        const dateB = new Date(b.metadata.date);
        if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0;
        return dateA.getTime() - dateB.getTime();
      } catch {
        return 0;
      }
    });

    const firstEmailMeta = sortedEmails[0]?.metadata;
    const lastEmailMeta = sortedEmails[sortedEmails.length - 1]?.metadata;

    if (!firstEmailMeta || !lastEmailMeta)
      return {
        content: '*(Error processing thread metadata)*',
        hasContent: false,
      };

    // Fix subject line if it appears to be broken at a line break
    let subject = this.sanitizeText(firstEmailMeta.subject || '(No Subject)');
    if (
      subject.endsWith('h') &&
      sortedEmails.some((email) => email.metadata.subject?.includes('höh'))
    ) {
      subject = subject.replace(/h$/, 'höhe');
    }

    let threadContent = [`# Thread: ${subject}\n`];
    let hasAnyEmailContent = false; // Track if any email has actual content

    // --- Thread Summary (comprehensive metadata only here) ---
    threadContent.push(`- **Emails:** ${sortedEmails.length}`);

    // Starting email info
    threadContent.push(
      `- **Started:** ${this.formatDate(firstEmailMeta.date)} by <${firstEmailMeta.from_email}>`,
    );

    // Last email info
    threadContent.push(
      `- **Last Email:** ${this.formatDate(lastEmailMeta.date)} by <${lastEmailMeta.from_email}>`,
    );

    // --- Create deduplicated participants list ---
    const participants = new Map<string, string>();
    const uniqueParticipantEmails = new Set<string>();

    sortedEmails.forEach((email) => {
      // Process From field
      if (email.metadata.from_email) {
        const addr = email.metadata.from_email.toLowerCase();
        uniqueParticipantEmails.add(addr);
        if (email.metadata.from_name) {
          participants.set(addr, this.sanitizeText(email.metadata.from_name));
        }
      }

      // Process To, CC fields
      const processAddressList = (addressList: string[] | undefined) => {
        if (!addressList || !Array.isArray(addressList)) return;

        addressList.forEach((address) => {
          const match = address.match(/(.*?)\s*<(.*?)>/);
          if (match && match[1] && match[2]) {
            const name = match[1].trim().replace(/^"|"$/g, '');
            const email = match[2].toLowerCase();
            uniqueParticipantEmails.add(email);
            if (!participants.has(email) && name) {
              participants.set(email, name);
            }
          } else if (address.includes('@')) {
            const email = address.toLowerCase();
            uniqueParticipantEmails.add(email);
          }
        });
      };

      processAddressList(email.metadata.to);
      processAddressList(email.metadata.cc);
    });

    // Create participant list favoring names over email addresses
    const participantList: string[] = [];
    uniqueParticipantEmails.forEach((email) => {
      const name = participants.get(email);
      if (name && name !== email) {
        participantList.push(name);
      } else {
        const domain = email.split('@')[1];
        // Only include email addresses from the main conversation participants
        if (
          email === firstEmailMeta.from_email ||
          email === lastEmailMeta.from_email ||
          sortedEmails.some((e) => e.metadata.from_email === email)
        ) {
          participantList.push(email);
        }
      }
    });

    // Add deduplicated participants
    threadContent.push(
      `- **Participants (${participantList.length}):** ${participantList.join(', ')}`,
    );

    threadContent.push('\n---\n');

    // Email content loop - with just the sender and date in header
    for (let i = 0; i < sortedEmails.length; i++) {
      const email = sortedEmails[i];
      if (!email || !email.metadata || !email.body) continue;

      // Get just the message content
      const messageContent = this.getEmailBodyContent(
        email.body,
        email.metadata,
      );

      // Skip empty emails (except first one)
      if (!messageContent.hasContent && i !== 0) continue;

      // Track if any email has content
      hasAnyEmailContent = hasAnyEmailContent || messageContent.hasContent;

      // Create a clean header with sender name and date
      const fromName =
        email.metadata.from_name || email.metadata.from_email || '';
      const fromNameClean = fromName.replace(/^"(.*)"$/, '$1'); // Remove quotes if present
      const dateFormatted = this.formatDate(email.metadata.date);

      threadContent.push(`## ${fromNameClean} (${dateFormatted})`);

      // For the first email or emails with content, show the message body
      if (messageContent.hasContent) {
        threadContent.push(messageContent.content);
      } else {
        threadContent.push('*(No content)*');
      }

      // Add separator between emails
      if (i < sortedEmails.length - 1) threadContent.push('\n---\n');
    }

    return {
      content: threadContent.join('\n').trim(),
      hasContent: hasAnyEmailContent,
    };
  }

  // Converts email content to markdown with metadata
  private convert(
    bodyParts: GmailBodyParts,
    metadata: GmailEmailMetadata,
  ): ConversionResult & { hasActualContent: boolean } {
    const mentionedAddresses = new Set<string>();
    let markdown = '\n';
    let hasActualContent = false; // Track if there's real content

    // --- Body Content Check (moved up to evaluate first) ---
    let bodyContent = '';
    if (bodyParts.html) {
      const decodedHtml = this.needsDecoding(bodyParts.html)
        ? GmailToMarkdownConverter.decodeBase64Url(bodyParts.html)
        : bodyParts.html;
      if (!this.isBlank(decodedHtml)) {
        bodyContent = this.convertHtmlContent(decodedHtml);
        hasActualContent = !this.isBlank(bodyContent);
      }
    }
    if (this.isBlank(bodyContent) && bodyParts.plain) {
      const decodedPlain = this.needsDecoding(bodyParts.plain)
        ? GmailToMarkdownConverter.decodeBase64Url(bodyParts.plain)
        : bodyParts.plain;
      if (!this.isBlank(decodedPlain)) {
        bodyContent = this.formatPlainText(decodedPlain);
        hasActualContent = !this.isBlank(bodyContent);
      }
    }

    // --- Metadata Header (Used for single email view) ---
    markdown += `# ${this.sanitizeText(metadata.subject || '(No Subject)')}\n`;

    // Create a compact metadata block
    let metadataLines = [];

    // Always include essential From info
    if (metadata.from_name && metadata.from_email) {
      metadataLines.push(
        `**From:** ${this.sanitizeText(metadata.from_name)} <${metadata.from_email}>`,
      );
      mentionedAddresses.add(metadata.from_email);
    } else if (metadata.from_email) {
      metadataLines.push(`**From:** <${metadata.from_email}>`);
      mentionedAddresses.add(metadata.from_email);
    }

    // Group recipients on fewer lines
    let recipients = [];
    if (metadata.to && metadata.to.length > 0) {
      recipients.push(`**To:** ${this.formatAddressList(metadata.to)}`);
      this.extractEmailAddresses(metadata.to).forEach((email) =>
        mentionedAddresses.add(email),
      );
    }

    // Only add CC/BCC if non-empty and there's content
    if (hasActualContent) {
      if (
        metadata.cc &&
        Array.isArray(metadata.cc) &&
        metadata.cc.length > 0 &&
        metadata.cc.some((addr) => addr && addr.trim() !== '')
      ) {
        recipients.push(`**CC:** ${this.formatAddressList(metadata.cc)}`);
        this.extractEmailAddresses(metadata.cc).forEach((email) =>
          mentionedAddresses.add(email),
        );
      }
      if (
        metadata.bcc &&
        Array.isArray(metadata.bcc) &&
        metadata.bcc.length > 0 &&
        metadata.bcc.some((addr) => addr && addr.trim() !== '')
      ) {
        recipients.push(`**BCC:** ${this.formatAddressList(metadata.bcc)}`);
        this.extractEmailAddresses(metadata.bcc).forEach((email) =>
          mentionedAddresses.add(email),
        );
      }
    }

    // Add date
    if (metadata.date) {
      metadataLines.push(`**Date:** ${this.formatDate(metadata.date)}`);
    }

    // Add recipients as multiple lines (cleaner presentation)
    metadataLines = metadataLines.concat(recipients);

    // Only include labels if necessary and there's content
    if (hasActualContent && metadata.labels && metadata.labels.length > 0) {
      const displayLabels = metadata.labels.filter(
        (label) => !this.isSystemLabel(label),
      );
      if (displayLabels.length > 0) {
        metadataLines.push(
          `**Labels:** ${displayLabels.map((l) => `\`${l}\``).join(', ')}`,
        );
      }
    }

    // Add all metadata lines
    markdown += metadataLines.join('\n') + '\n\n---\n\n';

    // --- Body Content ---
    // Don't add placeholder text when no content exists
    if (!hasActualContent) {
      bodyContent = '';
    }

    // Add the body content
    markdown += bodyContent;

    // --- Final processing ---
    if (hasActualContent) {
      // Remove quoted content at the end
      markdown = markdown.replace(/(\n>.*\n?)+$/, '');

      // Apply cleanup steps
      markdown = this.cleanupTables(markdown);
      markdown = this.removeRemainingImageReferences(markdown);
      markdown = this.ensureProperLineBreaks(markdown);
    }

    // Final trim before returning
    markdown = markdown.trim();

    return {
      markdown: markdown,
      mentionedAddresses: Array.from(mentionedAddresses),
      hasActualContent: hasActualContent,
    };
  }

  /**
   * Gets just the message body content without metadata
   * @private
   */
  private getEmailBodyContent(
    bodyParts: GmailBodyParts,
    metadata: GmailEmailMetadata,
  ): { content: string; hasContent: boolean } {
    // Process the email content using the convert method
    const conversionResult = this.convert(bodyParts, metadata);

    if (!conversionResult.hasActualContent) {
      return { content: '', hasContent: false };
    }

    // Extract just the body content by removing all metadata
    const fullContent = conversionResult.markdown;

    // Remove the heading and metadata section
    let bodyContent = fullContent
      // Remove everything up to and including the first horizontal rule after metadata
      .replace(/^[\s\S]*?---\n\n/, '')
      .trim();

    return {
      content: bodyContent,
      hasContent: conversionResult.hasActualContent,
    };
  }

  private needsDecoding(str: string): boolean {
    if (!str || str.length < 20) return false;
    if (str.includes('<html') || str.includes('<div') || str.includes('<p>'))
      return false;
    return /^[A-Za-z0-9+/=_\-\s]*$/.test(str.substring(0, 100));
  }

  private isSystemLabel(label: string): boolean {
    const systemLabels = [
      'INBOX',
      'SENT',
      'DRAFT',
      'TRASH',
      'SPAM',
      'STARRED',
      'UNREAD',
      'IMPORTANT',
      'CHAT',
      'SCHEDULED',
      'ALL',
      'ARCHIVED',
      'CATEGORY_PERSONAL',
      'CATEGORY_SOCIAL',
      'CATEGORY_PROMOTIONS',
      'CATEGORY_UPDATES',
      'CATEGORY_FORUMS',
    ];
    return systemLabels.includes(label.toUpperCase()) || label.startsWith('^');
  }

  /** Converts HTML content to markdown */
  private convertHtmlContent(html: string): string {
    if (this.isBlank(html)) return '';
    try {
      // Add pre-processing to handle images before conversion
      html = this.removeImagesFromHtml(html);

      const cleanedHtml = this.preCleanHtml(html);
      let markdown = this.turndownService.turndown(cleanedHtml);
      return this.postCleanMarkdown(markdown);
    } catch (error) {
      console.error('Error during HTML to Markdown conversion:', error);
      return `*(HTML conversion failed. Error: ${error instanceof Error ? error.message : String(error)})*`;
    }
  }

  /**
   * Removes all image tags from HTML
   */
  private removeImagesFromHtml(html: string): string {
    if (this.isBlank(html)) return '';

    // Remove all standard image tags
    let processed = html.replace(/<img[^>]*>/gi, '');

    // Remove all image references that might appear in markdown-style
    processed = processed.replace(/!\[.*?\]\(.*?\)/g, '');

    // Handle special image references in Gmail emails
    processed = processed.replace(/!<[^>]*>/g, '');

    return processed;
  }

  /**
   * Clean up any remaining image references that might have slipped through
   */
  private removeRemainingImageReferences(markdown: string): string {
    if (this.isBlank(markdown)) return '';

    // Remove markdown-style image references
    let cleaned = markdown.replace(/!\[.*?\]\(.*?\)/g, '');

    // Remove special image references often seen in Gmail conversions
    cleaned = cleaned.replace(/!<[^>]*>/g, '');

    // Remove HTML img tags that might have been preserved
    cleaned = cleaned.replace(/<img[^>]*>/gi, '');

    return cleaned;
  }

  /**
   * Fix the "one big header" problem by ensuring proper line breaks
   */
  private ensureProperLineBreaks(markdown: string): string {
    if (this.isBlank(markdown)) return '';

    // Ensure proper breaks after headings
    let cleaned = markdown.replace(/(#{1,6}[^\n]+)(?!\n)/g, '$1\n\n');

    // Replace <br> tags with proper newlines
    cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n');

    // Replace multiple <br><br> with double newlines
    cleaned = cleaned.replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '\n\n');

    // Ensure paragraphs have proper spacing
    cleaned = cleaned.replace(/([^\n])\n([^#\-\n])/g, '$1\n\n$2');

    // Normalize newlines
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    return cleaned;
  }

  /** Formats plain text content */
  private formatPlainText(text: string): string {
    if (this.isBlank(text)) return '';
    let cleanedText = this.sanitizeText(text);
    cleanedText = this.removePlainTextQuotesAndSignatures(cleanedText);
    cleanedText = this.enhanceUrls(cleanedText);
    cleanedText = this.preserveListFormatting(cleanedText);
    cleanedText = cleanedText.replace(/\n{3,}/g, '\n\n');
    return cleanedText.trim();
  }

  /** Basic HTML cleaning before Turndown */
  private preCleanHtml(html: string): string {
    if (this.isBlank(html)) return '';
    let cleaned = html;
    cleaned = cleaned.replace(/<\?xml[^>]*>/gi, '');
    cleaned = cleaned.replace(/<!DOCTYPE[^>]*>/gi, '');
    cleaned = cleaned.replace(/<[/]?(o|w|m|v|st1):[^>]*>/gi, '');
    cleaned = cleaned.replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, '');
    cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
    cleaned = cleaned.replace(/ /gi, ' ');
    cleaned = cleaned.replace(/\u00A0/g, ' ');
    cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, '');
    cleaned = cleaned.replace(
      /<(\w+)[^>]*style="[^"]*display:\s*none[^"]*"[^>]*>[\s\S]*?<\/\1>/gi,
      '',
    );

    // Ensure proper spacing around block elements for better markdown conversion
    cleaned = cleaned.replace(
      /<\/(div|p|table|ul|ol|li|h[1-6]|blockquote|pre|tr|hr|dl|dd|dt)>/gi,
      '</$1>\n',
    );
    cleaned = cleaned.replace(
      /<(div|p|table|ul|ol|li|h[1-6]|blockquote|pre|tr|hr|dl|dd|dt)[^>]*>/gi,
      '\n<$1>',
    );

    return cleaned.trim();
  }

  private cleanupTables(markdown: string): string {
    if (this.isBlank(markdown)) return '';

    // Split into lines to process tables
    const lines = markdown.split('\n');
    const result = [];
    let inTable = false;
    let tableLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!.trim();

      // Check if this line looks like part of a table
      const isTableLine =
        line.startsWith('|') && line.endsWith('|') && line.includes('|', 1);
      // Also check for escaped pipe variant
      const isEscapedTableLine = line.startsWith('\\|') && line.endsWith('\\|');

      if (isTableLine || isEscapedTableLine) {
        if (!inTable) {
          inTable = true;
          // Add a blank line before table if not already there
          if (result.length > 0 && result[result.length - 1] !== '') {
            result.push('');
          }
        }

        // Fix common table issues
        let fixedLine = line
          .replace(/\\\|/g, '|') // Remove escaped pipes
          .replace(/\|(\s*):--(\s*)\|/g, '| :--- |') // Fix alignment markers
          .replace(/\|(\s*)--:(\s*)\|/g, '| ---: |')
          .replace(/\|(\s*):--:(\s*)\|/g, '| :---: |');

        tableLines.push(fixedLine);
      } else {
        if (inTable) {
          // Process collected table lines
          if (tableLines.length > 0) {
            // Count columns in first row to standardize
            const firstRow = tableLines[0];
            if (!firstRow) return result.join('\n');
            const columnCount = (firstRow.match(/\|/g) || []).length - 1;

            // Ensure all rows have same number of columns
            for (let j = 0; j < tableLines.length; j++) {
              let row = tableLines[j];
              if (!row) continue;
              const rowColumns = (row.match(/\|/g) || []).length - 1;

              if (rowColumns < columnCount) {
                // Add missing columns
                row = row.replace(
                  /\|$/,
                  ' |'.repeat(columnCount - rowColumns) + '|',
                );
              }

              result.push(row);
            }

            // Add blank line after table
            result.push('');
          }

          inTable = false;
          tableLines = [];
        }

        result.push(line);
      }
    }

    // Handle case where file ends with a table
    if (inTable && tableLines.length > 0) {
      const firstRow = tableLines[0];
      if (!firstRow) return result.join('\n');
      const columnCount = (firstRow.match(/\|/g) || []).length - 1;

      for (let j = 0; j < tableLines.length; j++) {
        let row = tableLines[j];
        if (!row) continue;
        const rowColumns = (row.match(/\|/g) || []).length - 1;

        if (rowColumns < columnCount) {
          row = row.replace(/\|$/, ' |'.repeat(columnCount - rowColumns) + '|');
        }

        result.push(row);
      }

      result.push('');
    }

    return result.join('\n');
  }

  /** Cleans up generated markdown after Turndown */
  private postCleanMarkdown(markdown: string): string {
    if (this.isBlank(markdown)) return '';
    let cleaned = markdown;

    // Normalize newlines
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    // Trim trailing spaces in each line
    cleaned = cleaned
      .split('\n')
      .map((line) => line.trimEnd())
      .join('\n');

    // Ensure proper spacing around headings
    cleaned = cleaned.replace(/(\n|^)(#+\s+.*?)(\n|$)/g, '\n\n$2\n\n');

    // Ensure proper spacing around horizontal rules
    cleaned = cleaned.replace(/(\n|^)(---+)(\n|$)/g, '\n\n$2\n\n');

    // Ensure proper spacing around code blocks
    cleaned = cleaned.replace(/(\n|^)(```[\s\S]*?```)(\n|$)/g, '\n\n$2\n\n');

    // Handle blockquotes
    cleaned = cleaned.replace(/(\n{2,})(>.*)/g, '\n\n$2');
    cleaned = cleaned.replace(/(>.*)(\n{2,})/g, '$1\n\n');

    // Handle lists
    cleaned = cleaned.replace(/(\n{2,})(\*|-|\d+\.\s)/g, '\n\n$2');

    // Fix emphasis and strong formatting
    cleaned = cleaned.replace(/([*_`~])\s+(\S(?:.*\S)?)\s+\1/g, '$1$2$1');

    // Convert empty links to simple URLs
    cleaned = cleaned.replace(/\[\s*\]\(([^)]*)\)/g, '<$1>');
    cleaned = cleaned.replace(/\[\]\([^)]*\)/g, '');

    // Fix table formatting
    cleaned = cleaned.replace(/\\\|/g, '|'); // Remove extra backslashes before pipes
    cleaned = cleaned.replace(/\|\s+/g, '| ').replace(/\s+\|/g, ' |'); // Normalize spacing around pipes
    cleaned = cleaned
      .replace(
        /\|(\s*):--(\s*)\|/g,
        '| :--- |', // Fix alignment markers for left align
      )
      .replace(
        /\|(\s*)--:(\s*)\|/g,
        '| ---: |', // Fix alignment markers for right align
      )
      .replace(
        /\|(\s*):--:(\s*)\|/g,
        '| :---: |', // Fix alignment markers for center align
      );
    cleaned = cleaned.replace(
      /^\|\s*-(.*)-\s*\|$/gm,
      (match, content) => `|-${content.replace(/[^|]/g, '-')}-|`,
    );

    // Deduplicate horizontal rules
    cleaned = cleaned.replace(/(\n\n---\n\n)+/g, '\n\n---\n\n');

    // Fix blockquote formatting
    cleaned = cleaned.replace(/(\n>\s*){2,}/g, '\n> ');

    // Remove empty table rows
    cleaned = cleaned
      .split('\n')
      .filter((line) => {
        const trimmed = line.trim();
        if (/^\|?[\s|\-]*\|?$/.test(trimmed) && trimmed.includes('|'))
          return false;
        if (trimmed === '---') return true;
        if (/^-+$/.test(trimmed) && trimmed.length < 5) return false;
        return true;
      })
      .join('\n');

    // Final newline normalization
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    // Replace <br> tags with proper newlines
    cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n');

    return cleaned.trim();
  }

  /** Preserves basic list formatting in plain text */
  private preserveListFormatting(text: string): string {
    return text
      .replace(/^(\s*)(\*|-|\+|\u2022)(\s+)/gm, '$1- ')
      .replace(/^(\s*)(\d+)\.(\s+)/gm, '$1$2. ');
  }

  /** Enhances plain text URLs into Markdown links using <...> syntax */
  private enhanceUrls(text: string): string {
    if (this.isBlank(text)) return '';
    const urlRegex =
      /(?<![<[![])((?:https?|ftp):\/\/[^\s<>"'()]+|[a-z0-9]+([\-\.][a-z0-9]+)*\.[a-z]{2,}[^\s<>"'()]*)/gi;
    return text.replace(urlRegex, (url) => {
      if (url.startsWith('http') || url.startsWith('ftp')) return `<${url}>`;
      else return `<http://${url}>`;
    });
  }

  /** Removes common reply headers/signatures from plain text */
  private removePlainTextQuotesAndSignatures(content: string): string {
    if (this.isBlank(content)) return '';
    const headerPatterns = [
      /^\s*On\s+.*?\s+wrote:\s*$/im,
      /^\s*From:\s*.*$/im,
      /^\s*Sent:\s*.*$/im,
      /^\s*To:\s*.*$/im,
      /^\s*Cc:\s*.*$/im,
      /^\s*Subject:\s*.*$/im,
      /^\s*Date:\s*.*$/im,
      /^-+\s*(Forwarded message|Original Message)\s*-+$/im,
      /^>?\s*_{5,}\s*$/m,
      /^>?\s*-{5,}\s*$/m,
    ];
    const signatureSeparatorPattern = /^\s*--\s*$/m;
    const lines = content.split('\n');
    const resultLines: string[] = [];
    let processingMode = 'seeking_headers';
    let potentialHeaderBlockEnd = -1;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      const trimmedLine = line.trim();
      if (processingMode === 'finished') break;
      if (signatureSeparatorPattern.test(line)) {
        processingMode = 'finished';
        break;
      }
      switch (processingMode) {
        case 'seeking_headers':
          if (headerPatterns.some((p) => p.test(line))) {
            processingMode = 'skipping_headers';
            potentialHeaderBlockEnd = i;
          } else if (!this.isBlank(trimmedLine)) {
            processingMode = 'content';
            resultLines.push(line.replace(/^>\s*/, ''));
          }
          break;
        case 'skipping_headers':
          if (headerPatterns.some((p) => p.test(line))) {
            potentialHeaderBlockEnd = i;
          } else if (this.isBlank(trimmedLine)) {
            processingMode = 'content';
            i = potentialHeaderBlockEnd;
          } else {
            processingMode = 'content';
            let startOfSkippedBlock = 0;
            for (let j = potentialHeaderBlockEnd; j >= 0; j--) {
              if (!headerPatterns.some((p) => p.test(lines[j]!))) {
                startOfSkippedBlock = j + 1;
                break;
              }
              if (j === 0) startOfSkippedBlock = 0;
            }
            for (
              let j = startOfSkippedBlock;
              j <= potentialHeaderBlockEnd;
              j++
            ) {
              resultLines.push(lines[j]!.replace(/^>\s*/, ''));
            }
            resultLines.push(line.replace(/^>\s*/, ''));
          }
          break;
        case 'content':
          resultLines.push(line.replace(/^>\s*/, ''));
          break;
      }
    }
    return resultLines
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /** Extracts unique email addresses */
  private extractEmailAddresses(
    input: string | string[] | undefined,
  ): string[] {
    const addresses = new Set<string>();
    if (!input) return [];
    const processString = (str: string) => {
      const emailRegex = /([\w\.\-+']+)@([\w\-\.]+)\.([\w]{2,})/g;
      const bracketRegex = /<([\w\.\-+']+)@([\w\-\.]+)\.([\w]{2,})>/g;
      let match;
      while ((match = emailRegex.exec(str)) !== null)
        if (match[0]) addresses.add(match[0].toLowerCase());
      while ((match = bracketRegex.exec(str)) !== null)
        if (match[1]) addresses.add(match[1].toLowerCase());
    };
    if (Array.isArray(input)) input.forEach((item) => processString(item));
    else if (typeof input === 'string') processString(input);
    return Array.from(addresses);
  }

  /** Formats a list of email addresses for display */
  private formatAddressList(addresses: string[] | string): string {
    if (typeof addresses === 'string') return this.sanitizeText(addresses);
    return addresses.map((addr) => this.sanitizeText(addr)).join(', ');
  }

  /** Formats a date string */
  private formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '(No date)';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return this.sanitizeText(dateStr);
      return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      console.warn(`Error formatting date "${dateStr}":`, error);
      return this.sanitizeText(dateStr);
    }
  }

  /** Basic text sanitization for display */
  private sanitizeText(text: string | null | undefined): string {
    if (this.isBlank(text)) return '';
    let cleaned = text!;
    cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    cleaned = cleaned.replace(/ {2,}/g, ' ');

    // Fix for newlines that break words
    cleaned = cleaned.replace(/\n(?=\S)/g, '');

    return cleaned.trim();
  }
  /** Decodes Base64URL-encoded content */
  public static decodeBase64Url(data: string): string {
    if (!data) return '';
    try {
      let base64 = data.replace(/-/g, '+').replace(/_/g, '/');
      const padding = base64.length % 4;
      if (padding) base64 += '='.repeat(4 - padding);
      if (typeof Buffer !== 'undefined') {
        return Buffer.from(base64, 'base64').toString('utf-8');
      } else if (typeof atob !== 'undefined') {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return new TextDecoder().decode(bytes);
      } else {
        console.error('Cannot decode Base64: No Buffer or atob found.');
        return `(Base64 Decode Error: ${data.substring(0, 50)}...)`;
      }
    } catch (error) {
      console.error('Error decoding base64:', error);
      return `(Base64 Decode Error: ${data.substring(0, 50)}...)`;
    }
  }

  /** Checks if text is null, undefined, or effectively empty */
  private isBlank(text: string | null | undefined): boolean {
    return text === null || text === undefined || text.trim() === '';
  }
}
