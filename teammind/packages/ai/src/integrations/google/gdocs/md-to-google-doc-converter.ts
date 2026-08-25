import { docs_v1 } from 'googleapis';
import type {
  Blockquote,
  Code,
  Heading,
  Html,
  List,
  ListItem,
  Paragraph,
  PhrasingContent,
  RootContent,
  Table,
} from 'mdast';
import { toString } from 'mdast-util-to-string';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

interface ConversionResult {
  requests: docs_v1.Schema$Request[];
  endIndex: number;
}

/**
 * A converter that transforms GitHub Flavored Markdown (GFM) into
 * Google Docs API requests for document creation and updating.
 */
export class GfmToGoogleDocsConverter {
  /**
   * Converts Markdown content to Google Docs API requests
   * @param markdown The markdown content to convert
   * @param startIndex The starting index in the document
   * @returns An array of requests and the ending index
   */
  public convertToRequests(markdown: string, startIndex = 1): ConversionResult {
    const requests: docs_v1.Schema$Request[] = [];
    let currentIndex = startIndex;

    try {
      // Parse the markdown content into an AST
      const processor = unified().use(remarkParse).use(remarkGfm);

      const tree = processor.parse(markdown);

      // Process each top-level node in the AST
      for (const node of tree.children) {
        const result = this.processNode(node, currentIndex);
        if (result) {
          requests.push(...result.requests);
          currentIndex = result.endIndex;
        }
      }

      return { requests, endIndex: currentIndex };
    } catch (error) {
      console.error(
        'Error converting markdown to Google Docs requests:',
        error,
      );
      // Fallback: Insert as plain text
      requests.push({
        insertText: {
          location: { index: startIndex },
          text: markdown,
        },
      });
      return { requests, endIndex: startIndex + markdown.length };
    }
  }

  /**
   * Process a node in the markdown AST
   * @param node The node to process
   * @param startIndex The starting index in the document
   * @returns An object containing the requests and the ending index
   */
  private processNode(
    node: RootContent,
    startIndex: number,
  ): ConversionResult | null {
    const requests: docs_v1.Schema$Request[] = [];
    let currentIndex = startIndex;

    switch (node.type) {
      case 'heading':
        return this.processHeading(node, currentIndex);

      case 'paragraph':
        return this.processParagraph(node, currentIndex);

      case 'list':
        return this.processList(node, currentIndex);

      case 'code':
        return this.processCodeBlock(node, currentIndex);

      case 'table':
        return this.processTable(node, currentIndex);

      case 'thematicBreak':
        return this.processThematicBreak(currentIndex);

      case 'html':
        return this.processHtml(node, currentIndex);

      case 'blockquote':
        return this.processBlockquote(node, currentIndex);

      default: {
        // For unsupported node types, try to extract text
        const text = toString(node);
        if (text) {
          requests.push({
            insertText: {
              location: { index: currentIndex },
              text: text + '\n',
            },
          });
          currentIndex += text.length + 1;
        }
        return { requests, endIndex: currentIndex };
      }
    }
  }

  /**
   * Process a heading node
   */
  private processHeading(node: Heading, startIndex: number): ConversionResult {
    const requests: docs_v1.Schema$Request[] = [];
    let currentIndex = startIndex;

    // Extract the text content from the heading
    const headingText = toString(node) + '\n';

    // Insert heading text
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: headingText,
      },
    });

    // Apply heading style
    requests.push({
      updateParagraphStyle: {
        range: {
          startIndex: currentIndex,
          endIndex: currentIndex + headingText.length - 1, // -1 to exclude newline
        },
        paragraphStyle: {
          namedStyleType: `HEADING_${node.depth}`,
        },
        fields: 'namedStyleType',
      },
    });

    // Process any text formatting in the heading
    for (const child of node.children) {
      const formatting = this.getTextFormatting(child);
      if (formatting) {
        const childText = toString(child);
        const childStartIndex = headingText.indexOf(childText);
        if (childStartIndex !== -1) {
          requests.push({
            updateTextStyle: {
              range: {
                startIndex: currentIndex + childStartIndex,
                endIndex: currentIndex + childStartIndex + childText.length,
              },
              textStyle: formatting,
              fields: Object.keys(formatting).join(','),
            },
          });
        }
      }
    }

    currentIndex += headingText.length;
    return { requests, endIndex: currentIndex };
  }

  /**
   * Process a paragraph node
   */
  private processParagraph(
    node: Paragraph,
    startIndex: number,
  ): ConversionResult {
    const requests: docs_v1.Schema$Request[] = [];
    let currentIndex = startIndex;

    // Extract the text content from the paragraph
    const paragraphText = toString(node) + '\n';

    // Insert paragraph text
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: paragraphText,
      },
    });

    // Process any text formatting in the paragraph
    for (const child of node.children) {
      const formatting = this.getTextFormatting(child);
      if (formatting) {
        const childText = toString(child);
        const childStartIndex = paragraphText.indexOf(childText);
        if (childStartIndex !== -1) {
          requests.push({
            updateTextStyle: {
              range: {
                startIndex: currentIndex + childStartIndex,
                endIndex: currentIndex + childStartIndex + childText.length,
              },
              textStyle: formatting,
              fields: Object.keys(formatting).join(','),
            },
          });
        }
      }

      // Process links specifically
      if (child.type === 'link') {
        const linkText = toString(child);
        const linkStartIndex = paragraphText.indexOf(linkText);
        if (linkStartIndex !== -1) {
          requests.push({
            updateTextStyle: {
              range: {
                startIndex: currentIndex + linkStartIndex,
                endIndex: currentIndex + linkStartIndex + linkText.length,
              },
              textStyle: {
                link: {
                  url: child.url,
                },
              },
              fields: 'link',
            },
          });
        }
      }
    }

    currentIndex += paragraphText.length;
    return { requests, endIndex: currentIndex };
  }

  /**
   * Process a list node
   */
  private processList(node: List, startIndex: number): ConversionResult {
    const requests: docs_v1.Schema$Request[] = [];
    let currentIndex = startIndex;

    // Process the list with a helper function that handles nesting
    const result = this.processListItems(
      node.children,
      node.ordered ?? false,
      currentIndex,
      0,
    );
    requests.push(...result.requests);
    currentIndex = result.endIndex;

    return { requests, endIndex: currentIndex };
  }

  /**
   * Process list items with support for nested lists
   * @param items List items to process
   * @param ordered Whether this is an ordered list
   * @param startIndex Starting index in the document
   * @param nestingLevel Current nesting level (0 for top level)
   */
  private processListItems(
    items: ListItem[],
    ordered: boolean,
    startIndex: number,
    nestingLevel: number,
  ): ConversionResult {
    const requests: docs_v1.Schema$Request[] = [];
    let currentIndex = startIndex;

    for (const item of items) {
      // Get the paragraph content from the item (typically the first child)
      const paragraphNodes = item.children.filter(
        (child) => child.type === 'paragraph',
      );
      if (paragraphNodes.length === 0) continue;

      const itemText = toString(paragraphNodes[0]) + '\n';

      // Insert the list item text
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: itemText,
        },
      });

      // Apply bullet or numbered list formatting with appropriate nesting level
      requests.push({
        createParagraphBullets: {
          range: {
            startIndex: currentIndex,
            endIndex: currentIndex + itemText.length - 1,
          },
          bulletPreset: ordered
            ? 'NUMBERED_DECIMAL'
            : 'BULLET_DISC_CIRCLE_SQUARE',
        },
      });

      // Apply nesting indentation if needed
      if (nestingLevel > 0) {
        requests.push({
          updateParagraphStyle: {
            range: {
              startIndex: currentIndex,
              endIndex: currentIndex + itemText.length - 1,
            },
            paragraphStyle: {
              indentStart: {
                magnitude: 36 * nestingLevel,
                unit: 'PT',
              },
              indentFirstLine: {
                magnitude: 36 * nestingLevel,
                unit: 'PT',
              },
            },
            fields: 'indentStart,indentFirstLine',
          },
        });
      }

      // Process text formatting within the list item
      for (const paragraph of paragraphNodes) {
        for (const child of paragraph.children) {
          const formatting = this.getTextFormatting(child);
          if (formatting) {
            const childText = toString(child);
            const childStartIndex = itemText.indexOf(childText);
            if (childStartIndex !== -1) {
              requests.push({
                updateTextStyle: {
                  range: {
                    startIndex: currentIndex + childStartIndex,
                    endIndex: currentIndex + childStartIndex + childText.length,
                  },
                  textStyle: formatting,
                  fields: Object.keys(formatting).join(','),
                },
              });
            }
          }
        }
      }

      currentIndex += itemText.length;

      // Process nested lists
      const nestedLists = item.children.filter(
        (child) => child.type === 'list',
      );
      for (const nestedList of nestedLists) {
        const nestedResult = this.processListItems(
          nestedList.children,
          nestedList.ordered ?? false,
          currentIndex,
          nestingLevel + 1,
        );

        requests.push(...nestedResult.requests);
        currentIndex = nestedResult.endIndex;
      }
    }

    return { requests, endIndex: currentIndex };
  }

  /**
   * Process a code block
   */
  private processCodeBlock(node: Code, startIndex: number): ConversionResult {
    const requests: docs_v1.Schema$Request[] = [];
    let currentIndex = startIndex;

    const codeText = node.value + '\n';

    // Insert code block text
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: codeText,
      },
    });

    // Apply monospace font and light gray background for code blocks
    requests.push({
      updateTextStyle: {
        range: {
          startIndex: currentIndex,
          endIndex: currentIndex + codeText.length - 1,
        },
        textStyle: {
          weightedFontFamily: {
            fontFamily: 'Courier New',
            weight: 400,
          },
        },
        fields: 'fontFamily',
      },
    });

    // Add a light gray background to the code block
    requests.push({
      updateParagraphStyle: {
        range: {
          startIndex: currentIndex,
          endIndex: currentIndex + codeText.length - 1,
        },
        paragraphStyle: {
          shading: {
            backgroundColor: {
              color: {
                rgbColor: {
                  red: 0.95,
                  green: 0.95,
                  blue: 0.95,
                },
              },
            },
          },
        },
        fields: 'shading',
      },
    });

    currentIndex += codeText.length;
    return { requests, endIndex: currentIndex };
  }

  /**
   * Process a table - creates an actual table structure in Google Docs
   */
  private processTable(node: Table, startIndex: number): ConversionResult {
    const requests: docs_v1.Schema$Request[] = [];
    let currentIndex = startIndex;

    // First insert a newline to ensure the table starts on a new line
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: '\n',
      },
    });
    currentIndex += 1;

    // Get table dimensions
    const rows = node.children.length;
    if (rows === 0) {
      return { requests, endIndex: currentIndex };
    }

    const columns = node.children[0]!.children.length;
    if (columns === 0) {
      return { requests, endIndex: currentIndex };
    }

    // Insert a table
    requests.push({
      insertTable: {
        location: {
          index: currentIndex,
        },
        rows,
        columns,
      },
    });

    // Calculate indices for cells based on Google Docs API structure
    // Each cell requires:
    // - End of cell marker ("\u0003") - 1 character
    // - Row markers (additional for table structure)

    // The table structure starts at currentIndex
    // First marker is at currentIndex
    // Row and cell content follows, with end markers for each cell and row

    // Will need to track position as we fill the table
    let tableIndex = currentIndex;

    // Add 1 to move past the table start marker
    tableIndex += 1;

    // For each row in the table
    for (let rowIdx = 0; rowIdx < rows; rowIdx++) {
      const row = node.children[rowIdx];

      if (!row || !Array.isArray(row.children)) {
        continue; // Skip if row is not valid
      }

      // For each cell in the row
      for (let colIdx = 0; colIdx < columns; colIdx++) {
        // Handle case where a row might not have all columns
        const cellContent =
          colIdx < row.children.length ? toString(row.children[colIdx]) : '';

        if (cellContent) {
          // Insert the content into the cell
          requests.push({
            insertText: {
              location: { index: tableIndex },
              text: cellContent,
            },
          });

          // Apply formatting if this is a header row
          if (rowIdx === 0) {
            requests.push({
              updateTextStyle: {
                range: {
                  startIndex: tableIndex,
                  endIndex: tableIndex + cellContent.length,
                },
                textStyle: {
                  bold: true,
                },
                fields: 'bold',
              },
            });
          }

          // Move index past this content
          tableIndex += cellContent.length;
        }

        // Move past the cell end marker (1 character)
        tableIndex += 1;
      }

      // Move past the row end marker (1 character)
      tableIndex += 1;
    }

    // Return the final position after the table
    // Add 1 for the table end marker
    currentIndex = tableIndex + 1;

    return { requests, endIndex: currentIndex };
  }

  /**
   * Process a thematic break (horizontal rule)
   */
  private processThematicBreak(startIndex: number): ConversionResult {
    const requests: docs_v1.Schema$Request[] = [];
    let currentIndex = startIndex;

    // Insert a line of dashes as a horizontal rule
    const hrText = '----------------------------------------\n';
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: hrText,
      },
    });

    currentIndex += hrText.length;
    return { requests, endIndex: currentIndex };
  }

  /**
   * Process HTML content (fallback to plain text)
   */
  private processHtml(node: Html, startIndex: number): ConversionResult {
    const requests: docs_v1.Schema$Request[] = [];
    let currentIndex = startIndex;

    // For HTML, we just insert it as text with a comment
    const htmlText = `<!-- HTML content: ${node.value} -->\n`;
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: htmlText,
      },
    });

    currentIndex += htmlText.length;
    return { requests, endIndex: currentIndex };
  }

  /**
   * Process a blockquote
   */
  private processBlockquote(
    node: Blockquote,
    startIndex: number,
  ): ConversionResult {
    const requests: docs_v1.Schema$Request[] = [];
    let currentIndex = startIndex;

    // Convert blockquote content to text
    const quoteText = toString(node) + '\n';

    // Insert the blockquote text
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: quoteText,
      },
    });

    // Apply blockquote styling (indentation and left border)
    requests.push({
      updateParagraphStyle: {
        range: {
          startIndex: currentIndex,
          endIndex: currentIndex + quoteText.length - 1,
        },
        paragraphStyle: {
          indentFirstLine: {
            magnitude: 36,
            unit: 'PT',
          },
          indentStart: {
            magnitude: 36,
            unit: 'PT',
          },
        },
        fields: 'indentFirstLine,indentStart',
      },
    });

    // Add a light gray background
    requests.push({
      updateParagraphStyle: {
        range: {
          startIndex: currentIndex,
          endIndex: currentIndex + quoteText.length - 1,
        },
        paragraphStyle: {
          borderLeft: {
            color: {
              color: {
                rgbColor: {
                  red: 0.8,
                  green: 0.8,
                  blue: 0.8,
                },
              },
            },
            width: {
              magnitude: 3,
              unit: 'PT',
            },
            padding: {
              magnitude: 10,
              unit: 'PT',
            },
            dashStyle: 'SOLID',
          },
        },
        fields: 'borderLeft',
      },
    });

    currentIndex += quoteText.length;
    return { requests, endIndex: currentIndex };
  }

  /**
   * Get text style formatting for a node
   */
  private getTextFormatting(
    node: PhrasingContent,
  ): docs_v1.Schema$TextStyle | null {
    switch (node.type) {
      case 'strong':
        return { bold: true };
      case 'emphasis':
        return { italic: true };
      case 'delete':
        return { strikethrough: true };
      case 'inlineCode':
        return { bold: true, italic: true };
      default:
        return null;
    }
  }
}
