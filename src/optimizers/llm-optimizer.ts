/**
 * Options for LLM optimization
 */
interface OptimizationOptions {
  chunkSize?: number;
  preserveReferences?: boolean;
  addContextHeaders?: boolean;
  simplifyStructure?: boolean;
  removeRedundancy?: boolean;
}

/**
 * Chunk interface for split content
 */
interface ContentChunk {
  id: string;
  title: string;
  content: string;
  metadata: Record<string, any>;
  wordCount: number;
  context?: string;
}

/**
 * LLMOptimizer applies transformations to make Markdown more suitable for LLM consumption
 */
export class LLMOptimizer {
  private defaultOptions: OptimizationOptions = {
    chunkSize: 4000,
    preserveReferences: true,
    addContextHeaders: true,
    simplifyStructure: true,
    removeRedundancy: true,
  };

  /**
   * Optimize Markdown content for LLM consumption
   */
  async optimize(markdown: string, options: OptimizationOptions = {}): Promise<string> {
    const opts = { ...this.defaultOptions, ...options };

    try {
      let optimized = markdown;

      // Step 1: Clean and simplify structure
      if (opts.simplifyStructure) {
        optimized = this.simplifyStructure(optimized);
      }

      // Step 2: Remove redundancy
      if (opts.removeRedundancy) {
        optimized = this.removeRedundancy(optimized);
      }

      // Step 3: Add context headers
      if (opts.addContextHeaders) {
        optimized = this.addContextHeaders(optimized);
      }

      // Step 4: Optimize formatting for LLMs
      optimized = this.optimizeFormatting(optimized);

      return optimized;
    } catch (error) {
      throw new Error(`Failed to optimize content: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Split content into chunks suitable for LLM processing
   */
  chunkContent(markdown: string, options: OptimizationOptions = {}): ContentChunk[] {
    const opts = { ...this.defaultOptions, ...options };
    const chunks: ContentChunk[] = [];

    // Split by headers first
    const sections = this.splitByHeaders(markdown);

    let currentChunk: ContentChunk | null = null;
    let chunkIndex = 0;

    for (const section of sections) {
      const sectionWordCount = this.countWords(section.content);

      // If section is small enough, try to add to current chunk
      if (currentChunk && currentChunk.wordCount + sectionWordCount <= opts.chunkSize!) {
        currentChunk.content += '\\n\\n' + section.content;
        currentChunk.wordCount += sectionWordCount;
        currentChunk.metadata.sections = currentChunk.metadata.sections || [];
        currentChunk.metadata.sections.push(section.title);
      } else {
        // Create new chunk
        if (currentChunk) {
          chunks.push(currentChunk);
        }

        // If section is too large, split it further
        if (sectionWordCount > opts.chunkSize!) {
          const subChunks = this.splitLargeSection(section, opts.chunkSize!);
          for (const subChunk of subChunks) {
            chunks.push({
              id: `chunk-${++chunkIndex}`,
              title: subChunk.title,
              content: subChunk.content,
              wordCount: subChunk.wordCount,
              metadata: {
                parentSection: section.title,
                chunkType: 'subsection',
              },
            });
          }
          currentChunk = null;
        } else {
          currentChunk = {
            id: `chunk-${++chunkIndex}`,
            title: section.title || `Chunk ${chunkIndex}`,
            content: section.content,
            wordCount: sectionWordCount,
            metadata: {
              sections: [section.title],
              chunkType: 'section',
            },
          };
        }
      }
    }

    // Add the last chunk
    if (currentChunk) {
      chunks.push(currentChunk);
    }

    // Add context to chunks
    return this.addChunkContext(chunks);
  }

  /**
   * Simplify document structure for better LLM understanding
   */
  private simplifyStructure(markdown: string): string {
    let simplified = markdown;

    // Normalize header levels (no more than 4 levels)
    simplified = simplified.replace(/^#{5,}\\s+/gm, '#### ');

    // Convert complex lists to simpler format
    simplified = simplified.replace(/^\s*[a-zA-Z]\)\s+/gm, '- ');
    simplified = simplified.replace(/^\s*[ivx]+\)\s+/gm, '- ');

    // Simplify table formatting if present
    simplified = this.simplifyTables(simplified);

    return simplified;
  }

  /**
   * Remove redundant content and formatting
   */
  private removeRedundancy(markdown: string): string {
    let cleaned = markdown;

    // Remove excessive whitespace
    cleaned = cleaned.replace(/\\n{3,}/g, '\\n\\n');

    // Remove redundant emphasis
    cleaned = cleaned.replace(/\\*\\*\\*([^*]+)\\*\\*\\*/g, '**$1**');

    // Clean up redundant links (same text and URL)
    cleaned = cleaned.replace(/\[([^\]]+)\]\(\1\)/g, '$1');

    // Remove empty sections
    cleaned = cleaned.replace(/^#{1,6}\\s+.*\\n\\n(?=#{1,6})/gm, '');

    return cleaned;
  }

  /**
   * Add context headers to improve understanding
   */
  private addContextHeaders(markdown: string): string {
    const lines = markdown.split('\\n');
    const result: string[] = [];
    let currentContext: string[] = [];

    for (const line of lines) {
      const headerMatch = line.match(/^(#{1,6})\\s+(.+)/);
      
      if (headerMatch) {
        const level = headerMatch[1].length;
        const title = headerMatch[2];

        // Update context stack
        currentContext = currentContext.slice(0, level - 1);
        currentContext[level - 1] = title;

        // Add context information for deeper headers
        if (level > 2 && currentContext.length > 1) {
          const context = currentContext.slice(0, -1).join(' → ');
          result.push(`${headerMatch[1]} ${title}`);
          result.push('');
          result.push(`*Context: ${context}*`);
          result.push('');
        } else {
          result.push(line);
        }
      } else {
        result.push(line);
      }
    }

    return result.join('\\n');
  }

  /**
   * Optimize formatting specifically for LLM consumption
   */
  private optimizeFormatting(markdown: string): string {
    let optimized = markdown;

    // Ensure code blocks have language hints where possible
    optimized = optimized.replace(/^```\\n(.*?)^```/gms, (match, code) => {
      const firstLine = code.split('\\n')[0];
      if (firstLine.includes('#') || firstLine.includes('//')) {
        const lang = firstLine.includes('#') ? 'bash' : 'javascript';
        return `\`\`\`${lang}\\n${code}\`\`\``;
      }
      return match;
    });

    // Improve list formatting
    optimized = optimized.replace(/^-\\s+/gm, '• ');

    // Add clear separators between major sections
    optimized = optimized.replace(/^(#{1,2}\\s+.+)$/gm, '\\n---\\n\\n$1');

    // Clean up the beginning
    optimized = optimized.replace(/^\\n+---\\n+/, '');

    return optimized;
  }

  /**
   * Split content by headers into sections
   */
  private splitByHeaders(markdown: string): Array<{title: string, content: string, level: number}> {
    const lines = markdown.split('\\n');
    const sections: Array<{title: string, content: string, level: number}> = [];
    
    let currentSection: {title: string, content: string, level: number} | null = null;
    
    for (const line of lines) {
      const headerMatch = line.match(/^(#{1,6})\\s+(.+)/);
      
      if (headerMatch) {
        // Save previous section
        if (currentSection) {
          sections.push(currentSection);
        }
        
        // Start new section
        currentSection = {
          title: headerMatch[2],
          content: line,
          level: headerMatch[1].length,
        };
      } else if (currentSection) {
        currentSection.content += '\\n' + line;
      } else {
        // Content before first header
        if (sections.length === 0) {
          sections.push({
            title: 'Introduction',
            content: line,
            level: 1,
          });
        } else {
          sections[0].content += '\\n' + line;
        }
      }
    }
    
    // Add the last section
    if (currentSection) {
      sections.push(currentSection);
    }
    
    return sections;
  }

  /**
   * Split large sections into smaller chunks
   */
  private splitLargeSection(section: {title: string, content: string}, maxSize: number): ContentChunk[] {
    const chunks: ContentChunk[] = [];
    const paragraphs = section.content.split('\\n\\n');
    
    let currentChunk = '';
    let chunkIndex = 0;
    
    for (const paragraph of paragraphs) {
      const paragraphWordCount = this.countWords(paragraph);
      const currentWordCount = this.countWords(currentChunk);
      
      if (currentWordCount + paragraphWordCount <= maxSize && currentChunk) {
        currentChunk += '\\n\\n' + paragraph;
      } else {
        // Save current chunk if it has content
        if (currentChunk.trim()) {
          chunks.push({
            id: `${section.title}-${++chunkIndex}`,
            title: `${section.title} (Part ${chunkIndex})`,
            content: currentChunk.trim(),
            wordCount: this.countWords(currentChunk),
            metadata: { partOf: section.title },
          });
        }
        
        // Start new chunk
        currentChunk = paragraph;
      }
    }
    
    // Add the last chunk
    if (currentChunk.trim()) {
      chunks.push({
        id: `${section.title}-${++chunkIndex}`,
        title: chunkIndex > 1 ? `${section.title} (Part ${chunkIndex})` : section.title,
        content: currentChunk.trim(),
        wordCount: this.countWords(currentChunk),
        metadata: { partOf: section.title },
      });
    }
    
    return chunks;
  }

  /**
   * Add context information to chunks
   */
  private addChunkContext(chunks: ContentChunk[]): ContentChunk[] {
    return chunks.map((chunk, index) => {
      let context = '';
      
      // Add document navigation context
      if (chunks.length > 1) {
        context += `Document part ${index + 1} of ${chunks.length}`;
        
        if (index > 0) {
          context += ` | Previous: "${chunks[index - 1].title}"`;
        }
        
        if (index < chunks.length - 1) {
          context += ` | Next: "${chunks[index + 1].title}"`;
        }
      }
      
      return {
        ...chunk,
        context,
      };
    });
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.trim().split(/\\s+/).length;
  }

  /**
   * Simplify table formatting
   */
  private simplifyTables(markdown: string): string {
    // Convert complex tables to simple lists
    return markdown.replace(/\\|.*\\|\\n\\|.*\\|\\n(?:\\|.*\\|\\n)*/g, (match) => {
      const rows = match.trim().split('\\n');
      const headers = rows[0].split('|').map(h => h.trim()).filter(h => h);
      
      if (rows.length < 3) return match; // Not a proper table
      
      const dataRows = rows.slice(2); // Skip header separator
      let result = `**${headers.join(' | ')}**\\n\\n`;
      
      for (const row of dataRows) {
        const cells = row.split('|').map(c => c.trim()).filter(c => c);
        if (cells.length === headers.length) {
          result += `• ${cells.join(' • ')}\\n`;
        }
      }
      
      return result;
    });
  }
}
