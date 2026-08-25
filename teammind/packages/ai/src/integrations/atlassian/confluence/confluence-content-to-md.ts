// https://confluence.atlassian.com/doc/confluence-storage-format-790796544.html
import TurndownService from 'turndown';

import { ConversionResult } from '../../../types';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const turndownPluginGfm = require('@guyplusplus/turndown-plugin-gfm');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const turndownPluginConfluenceToGfm = require('turndown-plugin-confluence-to-gfm');

interface ConversionOptions {
  headingStyle?: 'setext' | 'atx';
  hr?: string;
  bulletListMarker?: '-' | '+' | '*';
  codeBlockStyle?: 'indented' | 'fenced';
  emDelimiter?: '_' | '*';
  strongDelimiter?: '__' | '**';
  linkStyle?: 'inlined' | 'referenced';
  linkReferenceStyle?: 'full' | 'collapsed' | 'shortcut';
}

interface RoadmapData {
  title: string;
  timeline: {
    startDate: string;
    endDate: string;
    displayOption: string;
  };
  lanes: Array<{
    title: string;
    color: {
      lane: string;
      bar: string;
      text: string;
      count: number;
    };
    bars: Array<{
      rowIndex: number;
      startDate: string;
      id: string;
      title: string;
      description: string;
      duration: number;
      pageLink: Record<string, unknown>;
    }>;
  }>;
  markers: Array<{
    markerDate: string;
    title: string;
  }>;
}

export class ConfluenceToGFMConverter {
  private turndownService: TurndownService;

  constructor(options: ConversionOptions = {}) {
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      hr: '---',
      bulletListMarker: '-',
      codeBlockStyle: 'fenced',
      emDelimiter: '*',
      strongDelimiter: '**',
      linkStyle: 'inlined',
      linkReferenceStyle: 'full',
      ...options,
    });

    this.initializePlugins();
  }

  public convert(
    content: string,
    userMap?: Map<string, { displayName: string }>,
  ): ConversionResult {
    try {
      content = this.sanitizeContent(content);

      // Extract user mentions before processing CDATA
      const sourceMentionedUserIds = this.extractUserIds(content);

      // Process CDATA sections
      content = content.replace(
        /<!\[CDATA\[([\s\S]*?)\]\]>/g,
        (_, p1: string) => p1,
      );

      // Process user mentions with display names if available
      content = content.replace(
        /<ri:user[^>]*(?:ri:userkey|ri:account-id)="([^"]*)"[^>]*>/g,
        (_, userId: string) => {
          const user = userMap?.get(userId);
          const displayName = user?.displayName ?? userId;
          return `<a href="/mentions/confluence/${userId}" class="user-mention">@${displayName}</a>`;
        },
      );

      // Pre-process roadmap macros, converting them to basic HTML
      content = content.replace(
        /<ac:structured-macro[^>]*ac:name="roadmap"[^>]*>[\s\S]*?<ac:parameter[^>]*ac:name="source"[^>]*>(.*?)<\/ac:parameter>[\s\S]*?<\/ac:structured-macro>/g,
        (match, sourceParam) => this.processRoadmapMacro(match, sourceParam),
      );

      const markdown = this.turndownService.turndown(content);

      return {
        markdown,
        sourceMentionedUserIds,
      };
    } catch (error) {
      const errorMessage = (error as Error).message;
      throw new Error(`Failed to convert content: ${errorMessage}`);
    }
  }

  public extractUserIds(content: string): string[] {
    const userIds = new Set<string>();
    const userRegex =
      /<ri:user[^>]*(?:ri:userkey|ri:account-id)="([^"]*)"[^>]*>/g;
    let match;
    while ((match = userRegex.exec(content)) !== null) {
      if (match[1]) {
        userIds.add(match[1]);
      }
    }
    return Array.from(userIds);
  }

  private initializePlugins(): void {
    this.turndownService.use([
      turndownPluginGfm.gfm,
      turndownPluginGfm.tables,
      turndownPluginGfm.strikethrough,
      turndownPluginConfluenceToGfm.confluenceGfm,
    ]);
  }

  private processRoadmapMacro(match: string, sourceParam: string): string {
    try {
      const decodedJson = decodeURIComponent(sourceParam);
      const roadmapData = JSON.parse(decodedJson) as RoadmapData;

      // Convert to basic HTML that Turndown can handle
      let html = `<h2>${roadmapData.title}</h2>`;
      html += `<p><strong>Timeline:</strong> ${roadmapData.timeline.startDate} to ${roadmapData.timeline.endDate}</p>`;

      roadmapData.lanes?.forEach((lane) => {
        html += `<h3>${lane.title}</h3>`;
        html += '<ul>';

        const validBars = lane.bars.filter((bar) => bar.title !== 'New Bar');
        validBars.forEach((bar) => {
          html += '<li>';
          html += `<strong>${bar.title}</strong><br>`;
          html += `Start: ${bar.startDate}<br>`;
          html += `Duration: ${bar.duration} units`;
          if (bar.description) {
            html += `<br>${bar.description}`;
          }
          html += '</li>';
        });

        html += '</ul>';
      });

      if (roadmapData.markers?.length > 0) {
        html += '<h3>Milestones</h3>';
        html += '<ul>';
        roadmapData.markers.forEach((marker) => {
          html += `<li><strong>${marker.title}</strong> (${marker.markerDate})</li>`;
        });
        html += '</ul>';
      }

      return html;
    } catch {
      return match;
    }
  }

  private sanitizeContent(content: string): string {
    // Remove potentially problematic characters and normalize whitespace
    return content
      .replace(/\uFEFF/g, '') // Remove BOM
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\r/g, '\n')
      .replace(/\t/g, '    ') // Convert tabs to spaces
      .replace(/\u00A0/g, ' '); // Convert non-breaking spaces to regular spaces
  }
}
