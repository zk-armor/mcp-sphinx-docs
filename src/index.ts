#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { SphinxConverter } from './converters/sphinx-converter.js';
import { LLMOptimizer } from './optimizers/llm-optimizer.js';
import { FileHandler } from './utils/file-handler.js';

/**
 * Sphinx to LLM Markdown MCP Server
 * 
 * This server provides tools to convert Sphinx documentation to LLM-optimized Markdown.
 */

const server = new Server(
  {
    name: 'mcp-sphinx-docs',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool schemas for MCP
const ConvertFileSchema = {
  type: "object" as const,
  properties: {
    sourcePath: {
      type: "string",
      description: "Path to the RST file to convert"
    },
    outputPath: {
      type: "string",
      description: "Output path for the converted Markdown file"
    },
    options: {
      type: "object",
      properties: {
        optimize: {
          type: "boolean",
          default: true,
          description: "Apply LLM optimizations"
        },
        chunkSize: {
          type: "number",
          default: 4000,
          description: "Maximum chunk size for splitting"
        },
        preserveReferences: {
          type: "boolean",
          default: true,
          description: "Preserve internal references"
        }
      }
    }
  },
  required: ["sourcePath"]
};

const ConvertDirectorySchema = {
  type: "object" as const,
  properties: {
    sourcePath: {
      type: "string",
      description: "Path to the Sphinx documentation directory"
    },
    outputPath: {
      type: "string", 
      description: "Output directory for converted Markdown files"
    },
    options: {
      type: "object",
      properties: {
        recursive: {
          type: "boolean",
          default: true,
          description: "Process subdirectories recursively"
        },
        optimize: {
          type: "boolean",
          default: true,
          description: "Apply LLM optimizations"
        },
        chunkSize: {
          type: "number",
          default: 4000,
          description: "Maximum chunk size for splitting"
        },
        preserveStructure: {
          type: "boolean",
          default: true,
          description: "Preserve directory structure"
        }
      }
    }
  },
  required: ["sourcePath", "outputPath"]
};

const AnalyzeStructureSchema = {
  type: "object" as const,
  properties: {
    sourcePath: {
      type: "string",
      description: "Path to the Sphinx documentation directory"
    },
    depth: {
      type: "number",
      default: 3,
      description: "Maximum depth to analyze"
    }
  },
  required: ["sourcePath"]
};

// Validation functions
function validateConvertFile(args: any): { sourcePath: string; outputPath?: string; options?: any } {
  if (!args.sourcePath || typeof args.sourcePath !== 'string') {
    throw new Error('sourcePath is required and must be a string');
  }
  return {
    sourcePath: args.sourcePath,
    outputPath: args.outputPath,
    options: args.options || {},
  };
}

function validateConvertDirectory(args: any): { sourcePath: string; outputPath: string; options?: any } {
  if (!args.sourcePath || typeof args.sourcePath !== 'string') {
    throw new Error('sourcePath is required and must be a string');
  }
  if (!args.outputPath || typeof args.outputPath !== 'string') {
    throw new Error('outputPath is required and must be a string');
  }
  return {
    sourcePath: args.sourcePath,
    outputPath: args.outputPath,
    options: args.options || {},
  };
}

function validateAnalyzeStructure(args: any): { sourcePath: string; depth: number } {
  if (!args.sourcePath || typeof args.sourcePath !== 'string') {
    throw new Error('sourcePath is required and must be a string');
  }
  return {
    sourcePath: args.sourcePath,
    depth: args.depth || 3,
  };
}

// Initialize components
const sphinxConverter = new SphinxConverter();
const llmOptimizer = new LLMOptimizer();
const fileHandler = new FileHandler();

// Tool definitions
const tools: Tool[] = [
  {
    name: 'convert_sphinx_file',
    description: 'Convert a single Sphinx RST file to LLM-optimized Markdown',
    inputSchema: ConvertFileSchema,
  },
  {
    name: 'convert_sphinx_directory',
    description: 'Convert an entire Sphinx documentation directory to LLM-optimized Markdown',
    inputSchema: ConvertDirectorySchema,
  },
  {
    name: 'analyze_sphinx_structure',
    description: 'Analyze the structure of a Sphinx documentation project',
    inputSchema: AnalyzeStructureSchema,
  },
];

// Register tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'convert_sphinx_file': {
        const parsed = validateConvertFile(args);
        
        // Read the RST file
        const content = await fileHandler.readFile(parsed.sourcePath);
        
        // Convert RST to Markdown
        const markdown = await sphinxConverter.convertToMarkdown(content, parsed.sourcePath);
        
        // Apply LLM optimizations if requested
        let optimizedMarkdown = markdown;
        if (parsed.options?.optimize !== false) {
          optimizedMarkdown = await llmOptimizer.optimize(markdown, {
            chunkSize: parsed.options?.chunkSize,
            preserveReferences: parsed.options?.preserveReferences,
          });
        }
        
        // Write output if path provided
        if (parsed.outputPath) {
          await fileHandler.writeFile(parsed.outputPath, optimizedMarkdown);
        }
        
        return {
          content: [
            {
              type: 'text',
              text: `Successfully converted ${parsed.sourcePath} to Markdown${parsed.outputPath ? ` and saved to ${parsed.outputPath}` : ''}\\n\\nConverted content:\\n\\n${optimizedMarkdown}`,
            },
          ],
        };
      }

      case 'convert_sphinx_directory': {
        const parsed = validateConvertDirectory(args);
        
        // Get all RST files in the directory
        const rstFiles = await fileHandler.findRSTFiles(parsed.sourcePath, parsed.options?.recursive !== false);
        
        const results = [];
        
        for (const rstFile of rstFiles) {
          // Determine output path
          const relativePath = fileHandler.getRelativePath(parsed.sourcePath, rstFile);
          const outputPath = fileHandler.changeExtension(
            fileHandler.joinPath(parsed.outputPath, relativePath),
            '.md'
          );
          
          // Convert file
          const content = await fileHandler.readFile(rstFile);
          const markdown = await sphinxConverter.convertToMarkdown(content, rstFile);
          
          // Apply optimizations
          let optimizedMarkdown = markdown;
          if (parsed.options?.optimize !== false) {
            optimizedMarkdown = await llmOptimizer.optimize(markdown, {
              chunkSize: parsed.options?.chunkSize,
            });
          }
          
          // Ensure output directory exists
          await fileHandler.ensureDirectory(fileHandler.getDirectory(outputPath));
          
          // Write file
          await fileHandler.writeFile(outputPath, optimizedMarkdown);
          
          results.push(`✓ ${rstFile} → ${outputPath}`);
        }
        
        return {
          content: [
            {
              type: 'text',
              text: `Successfully converted ${rstFiles.length} files:\\n\\n${results.join('\\n')}`,
            },
          ],
        };
      }

      case 'analyze_sphinx_structure': {
        const parsed = validateAnalyzeStructure(args);
        
        const structure = await fileHandler.analyzeStructure(parsed.sourcePath, parsed.depth);
        
        return {
          content: [
            {
              type: 'text',
              text: `Sphinx Documentation Structure Analysis:\\n\\n${JSON.stringify(structure, null, 2)}`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP Sphinx Docs Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
