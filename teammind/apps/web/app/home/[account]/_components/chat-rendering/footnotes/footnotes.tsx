/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentProps, FC } from 'react';

import { FootnoteDefinition, Link } from 'mdast';
import { SKIP, visit } from 'unist-util-visit';

import { cn } from '@tm/ui/utils';

import { footnoteManager, getSourceFromUrl } from './footnote-manager';

// Custom transformer to handle footnotes
export const customizeFootnotes = (messageId: string) => {
  return (tree: any) => {
    const footnoteDefinitions: Record<string, string> = {};

    // Reset footnotes for this message
    footnoteManager.resetFootnotes(messageId);

    // First pass: collect all footnote definitions and their URLs
    visit(tree, 'footnoteDefinition', (node: FootnoteDefinition) => {
      let link: Link | null = null;
      let linkTitle = '';

      visit(node, 'link', (linkNode: Link) => {
        link = linkNode;
        visit(linkNode, 'text', (textNode: any) => {
          if (typeof textNode.value === 'string') {
            linkTitle = textNode.value;
          }
        });
        return 'skip';
      });

      const linkUrl = (link as Link | null)?.url;
      if (linkUrl) {
        footnoteDefinitions[node.identifier] = linkUrl;

        // Add to message-specific footnotes
        footnoteManager.addFootnote(messageId, {
          identifier: node.identifier,
          source: getSourceFromUrl(linkUrl),
          title: linkTitle || `Source ${node.identifier}`,
          url: linkUrl,
        });
      } else {
        // Fallback: maybe the definition itself is just a URL
        let textUrl: string | null = null;
        let textContent = '';

        visit(node, 'text', (textNode: any) => {
          if (typeof textNode.value === 'string') {
            textContent = textNode.value;
            if (textNode.value.startsWith('http')) {
              textUrl = textNode.value.trim();
              return 'skip';
            }
          }
        });

        if (textUrl) {
          footnoteDefinitions[node.identifier] = textUrl;

          footnoteManager.addFootnote(messageId, {
            identifier: node.identifier,
            source: getSourceFromUrl(textUrl),
            title: textContent || `Source ${node.identifier}`,
            url: textUrl,
          });
        }
      }
    });

    // The rest of the transformer function remains the same
    visit(tree, 'html', (node: any, index: number | undefined, parent: any) => {
      if (
        typeof node.value === 'string' &&
        node.value.includes('<referenced-docs>') &&
        node.value.includes('</referenced-docs>')
      ) {
        // Remove the node if it contains only the referenced-docs tag
        if (
          node.value.trim().startsWith('<referenced-docs>') &&
          node.value.trim().endsWith('</referenced-docs>')
        ) {
          if (parent && typeof index === 'number') {
            parent.children.splice(index, 1);
            return [SKIP, index];
          }
        } else {
          // Otherwise, just remove the referenced-docs part from the content
          node.value = node.value.replace(
            /<referenced-docs>[\s\S]*?<\/referenced-docs>/g,
            '',
          );
        }
      }
    });

    // Second pass: handle footnoteReference nodes
    visit(
      tree,
      'footnoteReference',
      (node: any, index: number | undefined, parent: any) => {
        if (!parent || typeof index !== 'number') return;

        const externalUrl = footnoteDefinitions[node.identifier];
        if (externalUrl) {
          // Replace with direct external link
          const replacement = {
            type: 'link',
            url: externalUrl,
            data: {
              hProperties: {
                className: 'footnote-link',
                target: '_blank',
                rel: 'noreferrer',
              },
            },
            children: [{ type: 'text', value: node.identifier }],
          };

          parent.children.splice(index, 1, replacement);
          return [SKIP, index + 1];
        }
      },
    );

    // Third pass: visit text nodes to find and replace footnote patterns
    visit(tree, 'text', (node: any, index, parent: any) => {
      if (
        typeof node.value !== 'string' ||
        !parent ||
        typeof index !== 'number'
      )
        return;

      const text = node.value;
      // Regex to match both [^id] and [id] formats
      const footnoteRegex = /\[(\^?)(\d+(?:,\s*\^?\d+)*)\]/g;
      let lastIndex = 0;
      const newChildren: any[] = [];
      let match;

      while ((match = footnoteRegex.exec(text)) !== null) {
        const fullMatch = match[0]; // e.g., [^1] or [2] or [2, 3]
        const idsString = match[2]; // e.g., "1" or "2, 3" or "2, ^3"

        if (typeof idsString !== 'string') continue;

        // Split the IDs, handling both with and without carets
        const ids = idsString
          .split(',')
          .map((id) => id.trim().replace(/^\^/, ''));

        // Check if all IDs have definitions
        const urls = ids.map((id) => footnoteDefinitions[id]).filter(Boolean);

        // Add the text before the match
        if (match.index > lastIndex) {
          newChildren.push({
            type: 'text',
            value: text.substring(lastIndex, match.index),
          });
        }

        if (urls.length === ids.length) {
          // All IDs found, create links
          ids.forEach((id, i) => {
            newChildren.push({
              type: 'link',
              url: urls[i]!,
              children: [{ type: 'text', value: id }],
              data: {
                hProperties: {
                  target: '_blank',
                  rel: 'noreferrer',
                  className: 'footnote-link', // Apply class for styling
                },
              },
            });
            // Add comma separator if not the last ID in a group
            if (ids.length > 1 && i < ids.length - 1) {
              newChildren.push({ type: 'text', value: ', ' });
            }
          });
        } else {
          // Not all IDs found, keep the original text
          newChildren.push({ type: 'text', value: fullMatch });
        }

        lastIndex = footnoteRegex.lastIndex;
      }

      // Add any remaining text after the last match
      if (lastIndex < text.length) {
        newChildren.push({
          type: 'text',
          value: text.substring(lastIndex),
        });
      }

      // If we made any changes, replace the original text node
      if (
        newChildren.length > 0 &&
        (newChildren.length > 1 || newChildren[0].value !== text)
      ) {
        parent.children.splice(index, 1, ...newChildren);
        // Return the index of the last inserted node + 1 to continue visiting after the replaced nodes
        return index + newChildren.length;
      }
    });

    // Fourth pass: remove the footnote definitions section completely
    if (tree.type === 'root' && 'children' in tree) {
      (
        tree as { children: Array<{ type?: string; [key: string]: any }> }
      ).children = (
        tree as { children: Array<{ type?: string; [key: string]: any }> }
      ).children.filter(
        (child) => !('type' in child) || child.type !== 'footnoteDefinition',
      );
    }

    // Fifth pass: Fix any remaining footnote links (created by remark-gfm)
    visit(tree, 'link', (node: any) => {
      if (node.url?.startsWith('#user-content-fn-')) {
        const identifier = node.url.replace('#user-content-fn-', '');

        // If we have an extracted URL for this footnote, replace the href
        if (footnoteDefinitions[identifier]) {
          node.url = footnoteDefinitions[identifier];

          // Add a class to identify it as our special footnote link
          if (!node.data) node.data = {};
          if (!node.data.hProperties) node.data.hProperties = {};
          node.data.hProperties.className = 'footnote-link';
          node.data.hProperties.target = '_blank';
          node.data.hProperties.rel = 'noreferrer';
        }
      }
    });
  };
};

// Custom footnote link component
export const FootnoteLink: FC<ComponentProps<'a'>> = (props) => {
  const { children, className, ...rest } = props;

  return (
    <a {...rest} className={cn('group relative', className)}>
      <sup className="rounded-[2px] bg-neutral-300 px-1 py-0.5 text-xs text-primary shadow-sm dark:bg-neutral-700">
        {children}
      </sup>
    </a>
  );
};

// hideReferencedDocs function (unchanged)
export const hideReferencedDocs = () => {
  return (tree: any) => {
    // First properly identify and handle the entire referenced-docs blocks in text nodes
    visit(tree, 'text', (node: any) => {
      if (typeof node.value === 'string') {
        // Use regex to replace the entire block including tags and content
        node.value = node.value.replace(
          /<referenced-docs>[\s\S]*?<\/referenced-docs>/g,
          '',
        );
      }
    });

    // Second, handle potential HTML nodes that might contain referenced-docs
    let insideReferencedDocs = false;
    const nodesToRemove: Array<{ parent: any; index: number }> = [];

    visit(
      tree,
      ['html', 'text'],
      (node: any, index: number | undefined, parent: any) => {
        if (!parent || typeof index === 'undefined') return;

        // Check if this node marks the beginning of a referenced-docs section
        if (
          node.type === 'html' &&
          typeof node.value === 'string' &&
          node.value.includes('<referenced-docs>')
        ) {
          insideReferencedDocs = true;
          nodesToRemove.push({ parent, index });
          return;
        }

        // Check if this node marks the end of a referenced-docs section
        if (
          node.type === 'html' &&
          typeof node.value === 'string' &&
          node.value.includes('</referenced-docs>')
        ) {
          insideReferencedDocs = false;
          nodesToRemove.push({ parent, index });
          return;
        }

        // If we're inside a referenced-docs section, mark this node for removal
        if (insideReferencedDocs) {
          nodesToRemove.push({ parent, index });
        }
      },
    );

    // Remove all marked nodes, from last to first to avoid index shifting issues
    for (let i = nodesToRemove.length - 1; i >= 0; i--) {
      const nodeToRemove = nodesToRemove[i];
      if (!nodeToRemove?.parent || typeof nodeToRemove.index !== 'number')
        continue;
      const { parent, index } = nodeToRemove;
      parent.children.splice(index, 1);
    }
  };
};
