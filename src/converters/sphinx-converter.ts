import { unified } from 'unified';

/**
 * RST Directive interface for representing parsed directives
 */
interface RSTDirective {
  name: string;
  arguments: string[];
  options: Record<string, string>;
  content: string[];
}

/**
 * Conversion options interface
 */
interface ConversionOptions {
  baseUrl?: string;
  preserveReferences?: boolean;
  includeMetadata?: boolean;
}

/**
 * SphinxConverter handles the conversion of Sphinx RST files to Markdown
 */
export class SphinxConverter {
  private docReferences: Map<string, string> = new Map();
  private crossReferences: Map<string, string> = new Map();

  /**
   * Convert RST content to Markdown
   */
  async convertToMarkdown(content: string, filePath?: string, options: ConversionOptions = {}): Promise<string> {
    try {
      // Pre-process the content to extract metadata and references
      const preprocessed = this.preprocessRST(content);
      
      // Parse the RST content
      const parsed = this.parseRST(preprocessed);
      
      // Convert to Markdown
      const markdown = this.convertParsedToMarkdown(parsed, options);
      
      // Post-process to clean up and optimize
      const postProcessed = this.postProcess(markdown, options);
      
      return postProcessed;
    } catch (error) {
      throw new Error(`Failed to convert RST to Markdown: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Pre-process RST content to normalize and extract metadata
   */
  private preprocessRST(content: string): string {
    // Remove or convert Sphinx-specific directives
    let processed = content;

    // Convert common Sphinx directives to comments for preservation
    processed = processed.replace(/\.\. toctree::\s*\n(.*?)(?=\n\S|\n$)/gs, (match, content) => {
      return `<!-- TOCTREE:\\n${content.trim()}\\n-->\\n`;
    });

    // Handle automodule and autoclass directives
    processed = processed.replace(/\.\. automodule::\s*(.+)/g, '<!-- AUTO-MODULE: $1 -->');
    processed = processed.replace(/\.\. autoclass::\s*(.+)/g, '<!-- AUTO-CLASS: $1 -->');

    // Convert note/warning/tip boxes to markdown equivalents
    processed = processed.replace(/\.\. (note|warning|tip|important)::\s*\n(.*?)(?=\n\S|\n$)/gs, 
      (match, type, content) => {
        const emoji = type === 'warning' ? '⚠️' : type === 'tip' ? '💡' : type === 'important' ? '❗' : 'ℹ️';
        return `> ${emoji} **${type.toUpperCase()}**\\n>\\n> ${content.trim().replace(/\\n/g, '\\n> ')}\\n`;
      });

    return processed;
  }

  /**
   * Parse RST content into a structured format
   */
  private parseRST(content: string): any {
    const lines = content.split('\\n');
    const result = {
      title: '',
      sections: [] as any[],
      directives: [] as RSTDirective[],
      content: content
    };

    let currentSection: any = null;
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      
      // Check for titles (underlined with =, -, ~, etc.)
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        if (this.isUnderline(nextLine) && line.trim()) {
          const level = this.getHeaderLevel(nextLine[0]);
          
          if (!result.title && level === 1) {
            result.title = line.trim();
          } else {
            currentSection = {
              title: line.trim(),
              level: level,
              content: '',
              lineStart: i
            };
            result.sections.push(currentSection);
          }
          i += 2; // Skip the underline
          continue;
        }
      }

      // Check for directives
      if (line.match(/^\\.\\. [a-zA-Z-]+::/)) {
        const directive = this.parseDirective(lines, i);
        result.directives.push(directive.directive);
        i = directive.nextIndex;
        continue;
      }

      // Add content to current section
      if (currentSection) {
        currentSection.content += line + '\\n';
      }

      i++;
    }

    return result;
  }

  /**
   * Check if a line is an underline for headers
   */
  private isUnderline(line: string): boolean {
    if (!line.trim()) return false;
    const char = line.trim()[0];
    return line.trim().split('').every(c => c === char) && '=-~^"\'`.+*#<>_'.includes(char);
  }

  /**
   * Get header level based on underline character
   */
  private getHeaderLevel(char: string): number {
    const levels: Record<string, number> = {
      '=': 1,
      '-': 2,
      '~': 3,
      '^': 4,
      '"': 5,
      "'": 6
    };
    return levels[char] || 2;
  }

  /**
   * Parse a directive from RST content
   */
  private parseDirective(lines: string[], startIndex: number): { directive: RSTDirective, nextIndex: number } {
    const directiveLine = lines[startIndex];
    const match = directiveLine.match(/^\\.\\. ([a-zA-Z-]+)::\\s*(.*)/);
    
    if (!match) {
      return {
        directive: { name: '', arguments: [], options: {}, content: [] },
        nextIndex: startIndex + 1
      };
    }

    const directive: RSTDirective = {
      name: match[1],
      arguments: match[2] ? [match[2]] : [],
      options: {},
      content: []
    };

    let i = startIndex + 1;
    
    // Parse options (lines starting with :option:)
    while (i < lines.length && lines[i].match(/^\\s*:[a-zA-Z-]+:/)) {
      const optionMatch = lines[i].match(/^\\s*:([a-zA-Z-]+):\\s*(.*)/);
      if (optionMatch) {
        directive.options[optionMatch[1]] = optionMatch[2];
      }
      i++;
    }

    // Skip empty line
    if (i < lines.length && !lines[i].trim()) {
      i++;
    }

    // Parse content (indented lines)
    while (i < lines.length && (lines[i].startsWith('   ') || !lines[i].trim())) {
      if (lines[i].trim()) {
        directive.content.push(lines[i].substring(3)); // Remove 3-space indentation
      } else {
        directive.content.push('');
      }
      i++;
    }

    return { directive, nextIndex: i };
  }

  /**
   * Convert parsed RST to Markdown
   */
  private convertParsedToMarkdown(parsed: any, options: ConversionOptions): string {
    let markdown = '';

    // Add title
    if (parsed.title) {
      markdown += `# ${parsed.title}\\n\\n`;
    }

    // Process sections
    for (const section of parsed.sections) {
      const headerPrefix = '#'.repeat(section.level + (parsed.title ? 1 : 0));
      markdown += `${headerPrefix} ${section.title}\\n\\n`;
      
      // Convert section content
      markdown += this.convertContentToMarkdown(section.content, options);
      markdown += '\\n\\n';
    }

    return markdown;
  }

  /**
   * Convert RST content to Markdown format
   */
  private convertContentToMarkdown(content: string, options: ConversionOptions): string {
    let markdown = content;

    // Convert emphasis and strong
    markdown = markdown.replace(/\\*\\*([^*]+)\\*\\*/g, '**$1**'); // Strong
    markdown = markdown.replace(/\\*([^*]+)\\*/g, '*$1*'); // Emphasis

    // Convert inline code
    markdown = markdown.replace(/``([^`]+)``/g, '`$1`');

    // Convert code blocks
    markdown = markdown.replace(/::$\\n\\n((?:\\s{4,}.*\\n?)*)/gm, (match, code) => {
      const cleanCode = code.replace(/^\\s{4}/gm, '').trim();
      return `\\n\`\`\`\\n${cleanCode}\\n\`\`\`\\n`;
    });

    // Convert bullet lists
    markdown = markdown.replace(/^\\s*\\*\\s+(.+)$/gm, '- $1');

    // Convert numbered lists
    markdown = markdown.replace(/^\\s*(\\d+)\\.\\s+(.+)$/gm, '$1. $2');

    // Convert doc references (:doc:\`reference\`)
    markdown = markdown.replace(/:doc:\`([^`]+)\`/g, (match, ref) => {
      if (options.preserveReferences) {
        return `[${ref}](${ref}.md)`;
      }
      return ref;
    });

    // Convert external links
    markdown = markdown.replace(/\`([^<]+)<([^>]+)>\`_/g, '[$1]($2)');

    // Convert internal references (:ref:\`reference\`)
    markdown = markdown.replace(/:ref:\`([^`]+)\`/g, (match, ref) => {
      if (options.preserveReferences) {
        return `[${ref}](#${ref.toLowerCase().replace(/\\s+/g, '-')})`;
      }
      return ref;
    });

    return markdown.trim();
  }

  /**
   * Post-process the converted Markdown
   */
  private postProcess(markdown: string, options: ConversionOptions): string {
    let processed = markdown;

    // Clean up multiple consecutive newlines
    processed = processed.replace(/\\n{3,}/g, '\\n\\n');

    // Ensure proper spacing around headers
    processed = processed.replace(/^(#{1,6}\\s+.+)$/gm, '\\n$1\\n');

    // Clean up extra spaces
    processed = processed.replace(/[ \\t]+$/gm, '');

    // Remove leading/trailing whitespace
    processed = processed.trim();

    return processed;
  }

  /**
   * Extract metadata from RST content
   */
  extractMetadata(content: string): Record<string, any> {
    const metadata: Record<string, any> = {};
    
    // Extract title
    const titleMatch = content.match(/^(.+)\\n[=]+\\n/);
    if (titleMatch) {
      metadata.title = titleMatch[1].trim();
    }

    // Extract author from meta directive
    const authorMatch = content.match(/:author:\\s*(.+)/);
    if (authorMatch) {
      metadata.author = authorMatch[1].trim();
    }

    // Extract date
    const dateMatch = content.match(/:date:\\s*(.+)/);
    if (dateMatch) {
      metadata.date = dateMatch[1].trim();
    }

    return metadata;
  }
}
