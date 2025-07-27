# Copilot Instructions for Sphinx to LLM Markdown MCP Server

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

You can find more info and examples at https://modelcontextprotocol.io/llms-full.txt

## Project Context
This is a Model Context Protocol (MCP) server that converts Sphinx documentation to LLM-optimized Markdown. The server provides tools to:

1. **Parse Sphinx RST files** - Extract content from reStructuredText files
2. **Convert to Markdown** - Transform RST syntax to clean Markdown
3. **Optimize for LLMs** - Apply formatting and chunking for better LLM consumption
4. **Handle References** - Process internal links and cross-references

## Architecture Guidelines
- Use TypeScript with strict typing
- Follow MCP SDK patterns from https://github.com/modelcontextprotocol/create-python-server
- Implement modular converters for different RST elements
- Use streaming for large document processing
- Implement proper error handling and validation

## Key Components
- RST Parser: Parse reStructuredText syntax and directives
- Markdown Writer: Generate clean, consistent Markdown output
- LLM Optimizer: Apply transformations for better LLM consumption
- Chunker: Split large documents intelligently
- Reference Resolver: Handle internal links and cross-references

## Code Style
- Use descriptive function and variable names
- Add comprehensive JSDoc comments
- Implement robust error handling
- Use Zod for input validation
- Follow MCP server conventions
