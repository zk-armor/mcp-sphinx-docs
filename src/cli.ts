#!/usr/bin/env node

import { Command } from 'commander';
import { SphinxConverter } from './converters/sphinx-converter.js';
import { LLMOptimizer } from './optimizers/llm-optimizer.js';
import { FileHandler } from './utils/file-handler.js';
import * as path from 'path';
import * as fs from 'fs';
import axios from 'axios';
import * as cheerio from 'cheerio';

const program = new Command();

program
  .name('mcp-sphinx-docs')
  .description('Convert Sphinx documentation to LLM-optimized Markdown')
  .version('1.0.0');

// Command to convert URL documentation
program
  .command('convert-url')
  .description('Convert Sphinx documentation from a URL to Markdown')
  .argument('<url>', 'URL of the Sphinx documentation site')
  .argument('<outputDir>', 'Directory to save the converted Markdown files')
  .option('-d, --max-depth <depth>', 'Maximum depth to crawl (default: 3)', '3')
  .option('-c, --chunk-size <size>', 'Maximum chunk size for optimization (default: 4000)', '4000')
  .option('--no-optimize', 'Skip LLM optimizations')
  .action(async (url: string, outputDir: string, options: any) => {
    try {
      console.log(`🚀 Converting Sphinx documentation from: ${url}`);
      console.log(`📁 Output directory: ${outputDir}`);
      
      const converter = new SphinxConverter();
      const optimizer = new LLMOptimizer();
      const fileHandler = new FileHandler();
      
      // Ensure output directory exists
      await fileHandler.ensureDirectory(outputDir);
      
      // Crawl and convert the documentation
      const pages = await crawlSphinxSite(url, parseInt(options.maxDepth));
      
      console.log(`📄 Found ${pages.length} pages to convert`);
      
      let converted = 0;
      for (const page of pages) {
        try {
          console.log(`   Converting: ${page.title || page.url}`);
          
          // Convert RST content to Markdown
          const markdown = await converter.convertToMarkdown(page.content, page.url);
          
          // Apply LLM optimizations if requested
          let finalContent = markdown;
          if (options.optimize !== false) {
            finalContent = await optimizer.optimize(markdown, {
              chunkSize: parseInt(options.chunkSize)
            });
          }
          
          // Generate filename from title or URL
          const filename = fileHandler.createSafeFilename(page.title || page.path) + '.md';
          const outputPath = path.join(outputDir, filename);
          
          // Write the file
          await fileHandler.writeFile(outputPath, finalContent);
          converted++;
        } catch (error) {
          console.error(`❌ Failed to convert ${page.url}:`, error instanceof Error ? error.message : error);
        }
      }
      
      console.log(`✅ Successfully converted ${converted}/${pages.length} pages`);
      console.log(`📁 Files saved in: ${outputDir}`);
      
    } catch (error) {
      console.error('❌ Conversion failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Command to convert local files
program
  .command('convert-local')
  .description('Convert local Sphinx documentation to Markdown')
  .argument('<sourcePath>', 'Path to RST file or directory')
  .argument('<outputPath>', 'Output file or directory path')
  .option('-r, --recursive', 'Process directories recursively (default: true)')
  .option('-c, --chunk-size <size>', 'Maximum chunk size for optimization (default: 4000)', '4000')
  .option('--no-optimize', 'Skip LLM optimizations')
  .action(async (sourcePath: string, outputPath: string, options: any) => {
    try {
      console.log(`🚀 Converting local Sphinx documentation`);
      console.log(`📂 Source: ${sourcePath}`);
      console.log(`📁 Output: ${outputPath}`);
      
      const converter = new SphinxConverter();
      const optimizer = new LLMOptimizer();
      const fileHandler = new FileHandler();
      
      const sourceStats = await fileHandler.getFileStats(sourcePath);
      
      if (sourceStats.isFile()) {
        // Convert single file
        const content = await fileHandler.readFile(sourcePath);
        const markdown = await converter.convertToMarkdown(content, sourcePath);
        
        let finalContent = markdown;
        if (options.optimize !== false) {
          finalContent = await optimizer.optimize(markdown, {
            chunkSize: parseInt(options.chunkSize)
          });
        }
        
        await fileHandler.ensureDirectory(path.dirname(outputPath));
        await fileHandler.writeFile(outputPath, finalContent);
        console.log(`✅ Converted: ${sourcePath} → ${outputPath}`);
        
      } else if (sourceStats.isDirectory()) {
        // Convert directory
        const rstFiles = await fileHandler.findRSTFiles(sourcePath, options.recursive !== false);
        console.log(`📄 Found ${rstFiles.length} RST files`);
        
        for (const rstFile of rstFiles) {
          const relativePath = fileHandler.getRelativePath(sourcePath, rstFile);
          const outputFilePath = fileHandler.changeExtension(
            path.join(outputPath, relativePath),
            '.md'
          );
          
          const content = await fileHandler.readFile(rstFile);
          const markdown = await converter.convertToMarkdown(content, rstFile);
          
          let finalContent = markdown;
          if (options.optimize !== false) {
            finalContent = await optimizer.optimize(markdown, {
              chunkSize: parseInt(options.chunkSize)
            });
          }
          
          await fileHandler.ensureDirectory(path.dirname(outputFilePath));
          await fileHandler.writeFile(outputFilePath, finalContent);
          console.log(`✅ Converted: ${rstFile} → ${outputFilePath}`);
        }
      }
      
    } catch (error) {
      console.error('❌ Conversion failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Helper function to crawl Sphinx documentation site
async function crawlSphinxSite(baseUrl: string, maxDepth: number): Promise<Array<{url: string, title: string, content: string, path: string}>> {
  const pages: Array<{url: string, title: string, content: string, path: string}> = [];
  const visited = new Set<string>();
  const queue: Array<{url: string, depth: number}> = [{url: baseUrl, depth: 0}];
  
  while (queue.length > 0 && pages.length < 50) { // Limit to 50 pages for safety
    const {url, depth} = queue.shift()!;
    
    if (visited.has(url) || depth > maxDepth) continue;
    visited.add(url);
    
    try {
      console.log(`  📖 Crawling: ${url} (depth: ${depth})`);
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'mcp-sphinx-docs/1.0.0'
        }
      });
      
      const $ = cheerio.load(response.data);
      
      // Extract title
      const title = $('h1').first().text().trim() || $('title').text().trim() || 'Untitled';
      
      // Extract main content (try different Sphinx selectors)
      const contentSelectors = [
        '.document .body',
        '.document .documentwrapper .bodywrapper .body',
        '.rst-content',
        'main',
        '.content'
      ];
      
      let content = '';
      for (const selector of contentSelectors) {
        const element = $(selector);
        if (element.length > 0) {
          content = element.text().trim();
          break;
        }
      }
      
      if (!content) {
        content = $('body').text().trim();
      }
      
      // Clean up content - convert to basic RST-like format
      content = content
        .replace(/\\s+/g, ' ')
        .replace(/\\n\\s*\\n/g, '\\n\\n')
        .trim();
      
      pages.push({
        url,
        title,
        content,
        path: new URL(url).pathname.replace(/\\.html?$/, '').replace(/^\//, '')
      });
      
      // Find links to other pages (only within same domain)
      if (depth < maxDepth) {
        $('a[href]').each((_, element) => {
          const href = $(element).attr('href');
          if (href) {
            try {
              const fullUrl = new URL(href, url).toString();
              const baseUrlObj = new URL(baseUrl);
              const linkUrlObj = new URL(fullUrl);
              
              // Only follow links within the same domain and documentation path
              if (linkUrlObj.hostname === baseUrlObj.hostname && 
                  linkUrlObj.pathname.includes(baseUrlObj.pathname.split('/')[1] || '') &&
                  (linkUrlObj.pathname.endsWith('.html') || !linkUrlObj.pathname.includes('.'))) {
                queue.push({url: fullUrl, depth: depth + 1});
              }
            } catch (e) {
              // Ignore invalid URLs
            }
          }
        });
      }
      
    } catch (error) {
      console.error(`⚠️  Failed to crawl ${url}:`, error instanceof Error ? error.message : error);
    }
  }
  
  return pages;
}

program.parse();
