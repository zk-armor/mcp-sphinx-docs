import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { glob } from 'glob';

/**
 * File structure interface for analysis
 */
interface FileStructure {
  name: string;
  type: 'file' | 'directory';
  path: string;
  size?: number;
  children?: FileStructure[];
  extension?: string;
}

/**
 * FileHandler provides utilities for file operations and structure analysis
 */
export class FileHandler {
  private readFileAsync = promisify(fs.readFile);
  private writeFileAsync = promisify(fs.writeFile);
  private mkdir = promisify(fs.mkdir);
  private stat = promisify(fs.stat);
  private readdir = promisify(fs.readdir);

  /**
   * Read file content as string
   */
  async readFile(filePath: string): Promise<string> {
    try {
      const content = await this.readFileAsync(filePath, 'utf-8');
      return content;
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Write content to file
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      await this.writeFileAsync(filePath, content, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to write file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Ensure directory exists, create if it doesn't
   */
  async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await this.mkdir(dirPath, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create directory ${dirPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Find all RST files in a directory
   */
  async findRSTFiles(directoryPath: string, recursive: boolean = true): Promise<string[]> {
    try {
      const pattern = recursive ? '**/*.rst' : '*.rst';
      const fullPattern = path.join(directoryPath, pattern);
      
      const files = await glob(fullPattern, { 
        ignore: ['**/.*/**', '**/node_modules/**', '**/venv/**', '**/__pycache__/**']
      });
      
      return files.sort();
    } catch (error) {
      throw new Error(`Failed to find RST files in ${directoryPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get relative path from base to target
   */
  getRelativePath(basePath: string, targetPath: string): string {
    return path.relative(basePath, targetPath);
  }

  /**
   * Join path components
   */
  joinPath(...paths: string[]): string {
    return path.join(...paths);
  }

  /**
   * Change file extension
   */
  changeExtension(filePath: string, newExtension: string): string {
    const parsed = path.parse(filePath);
    return path.join(parsed.dir, parsed.name + newExtension);
  }

  /**
   * Get directory from file path
   */
  getDirectory(filePath: string): string {
    return path.dirname(filePath);
  }

  /**
   * Check if file exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      await this.stat(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file stats
   */
  async getFileStats(filePath: string): Promise<fs.Stats> {
    try {
      return await this.stat(filePath);
    } catch (error) {
      throw new Error(`Failed to get stats for ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Analyze directory structure for documentation
   */
  async analyzeStructure(directoryPath: string, maxDepth: number = 3): Promise<FileStructure> {
    try {
      const stats = await this.stat(directoryPath);
      const name = path.basename(directoryPath);

      if (!stats.isDirectory()) {
        return {
          name,
          type: 'file',
          path: directoryPath,
          size: stats.size,
          extension: path.extname(directoryPath),
        };
      }

      const structure: FileStructure = {
        name,
        type: 'directory',
        path: directoryPath,
        children: [],
      };

      if (maxDepth > 0) {
        const entries = await this.readdir(directoryPath);
        
        for (const entry of entries.sort()) {
          // Skip hidden files and common build directories
          if (entry.startsWith('.') || 
              ['node_modules', '__pycache__', 'venv', '_build', '_static', '_templates'].includes(entry)) {
            continue;
          }

          const entryPath = path.join(directoryPath, entry);
          const childStructure = await this.analyzeStructure(entryPath, maxDepth - 1);
          structure.children!.push(childStructure);
        }
      }

      return structure;
    } catch (error) {
      throw new Error(`Failed to analyze structure of ${directoryPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Find configuration files (conf.py, Makefile, etc.)
   */
  async findSphinxConfig(directoryPath: string): Promise<{
    confPy?: string;
    makefile?: string;
    requirements?: string;
    indexRst?: string;
  }> {
    const config: any = {};

    // Look for conf.py
    const confPyPath = path.join(directoryPath, 'conf.py');
    if (await this.fileExists(confPyPath)) {
      config.confPy = confPyPath;
    }

    // Look for Makefile
    const makefilePath = path.join(directoryPath, 'Makefile');
    if (await this.fileExists(makefilePath)) {
      config.makefile = makefilePath;
    }

    // Look for requirements files
    const requirementsPaths = [
      'requirements.txt',
      'requirements-docs.txt',
      'docs/requirements.txt',
    ];
    
    for (const reqPath of requirementsPaths) {
      const fullPath = path.join(directoryPath, reqPath);
      if (await this.fileExists(fullPath)) {
        config.requirements = fullPath;
        break;
      }
    }

    // Look for index.rst
    const indexPaths = [
      'index.rst',
      'docs/index.rst',
      'source/index.rst',
    ];
    
    for (const indexPath of indexPaths) {
      const fullPath = path.join(directoryPath, indexPath);
      if (await this.fileExists(fullPath)) {
        config.indexRst = fullPath;
        break;
      }
    }

    return config;
  }

  /**
   * Extract toctree information from index.rst
   */
  async extractToctree(indexRstPath: string): Promise<string[]> {
    try {
      const content = await this.readFile(indexRstPath);
      const toctreeFiles: string[] = [];

      // Find toctree directive
      const toctreeMatch = content.match(/\.\. toctree::\s*\n(.*?)(?=\n\S|\n$)/s);
      if (toctreeMatch) {
        const toctreeContent = toctreeMatch[1];
        
        // Extract file references (indented lines that don't start with :)
        const lines = toctreeContent.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith(':') && !trimmed.startsWith('..')) {
            // Remove any file extension and add .rst
            const filename = trimmed.replace(/\.(rst|md)$/, '') + '.rst';
            toctreeFiles.push(filename);
          }
        }
      }

      return toctreeFiles;
    } catch (error) {
      throw new Error(`Failed to extract toctree from ${indexRstPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get file mime type based on extension
   */
  getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.rst': 'text/x-rst',
      '.md': 'text/markdown',
      '.txt': 'text/plain',
      '.py': 'text/x-python',
      '.js': 'text/javascript',
      '.json': 'application/json',
      '.html': 'text/html',
      '.css': 'text/css',
    };
    
    return mimeTypes[ext] || 'text/plain';
  }

  /**
   * Create a safe filename from a title
   */
  createSafeFilename(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Copy file from source to destination
   */
  async copyFile(source: string, destination: string): Promise<void> {
    try {
      const content = await this.readFile(source);
      await this.ensureDirectory(this.getDirectory(destination));
      await this.writeFile(destination, content);
    } catch (error) {
      throw new Error(`Failed to copy file from ${source} to ${destination}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get file size in bytes
   */
  async getFileSize(filePath: string): Promise<number> {
    try {
      const stats = await this.stat(filePath);
      return stats.size;
    } catch (error) {
      throw new Error(`Failed to get file size for ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
