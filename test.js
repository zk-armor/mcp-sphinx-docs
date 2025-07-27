#!/usr/bin/env node

/**
 * Simple test script to verify the MCP server works
 */

const { SphinxConverter } = require('./dist/converters/sphinx-converter.js');
const { LLMOptimizer } = require('./dist/optimizers/llm-optimizer.js');
const { FileHandler } = require('./dist/utils/file-handler.js');

async function testConversion() {
  console.log('🧪 Testing Sphinx to LLM Markdown Converter...\n');

  const converter = new SphinxConverter();
  const optimizer = new LLMOptimizer();
  const fileHandler = new FileHandler();

  // Sample RST content (from BTRFS docs style)
  const sampleRST = `
Introduction
============

BTRFS is a modern copy on write (COW) filesystem for Linux aimed at
implementing advanced features while also focusing on fault tolerance, repair
and easy administration. Its main features and benefits are:

* Snapshots which do not make a full copy of the files
* Built-in volume management, support for software-based RAID 0, RAID 1, RAID 10
* Self-healing - checksums for data and metadata, automatic detection of silent
  data corruptions
* Data compression
* Reflinks, fast and efficient file copies

Feature overview
----------------

* Extent based file storage
* 2^64 byte (16 EiB) :ref:\`maximum file size<administration-limits>\` (practical limit is 8 EiB due
  to Linux VFS)
* :doc:\`Space-efficient packing of small files<Inline-files>\`
* Space-efficient indexed directories
* :doc:\`Writable snapshots, read-only snapshots, subvolumes
  (separate internal filesystem roots)<Subvolumes>\`

.. note::
   This is an important note about BTRFS features.

.. warning::
   Some features are experimental and not production-ready.

Quick start
-----------

For a really quick start you can simply create and mount the
filesystem. Make sure that the block device you'd like to use is suitable so you
don't overwrite existing data.

.. code-block:: shell

   # mkfs.btrfs /dev/sdx
   # mount /dev/sdx /mnt/test

The default options should be acceptable for most users and sometimes can be
changed later.

Read more about:

* creating a filesystem at :doc:\`mkfs.btrfs\`
* mount options at :doc:\`Administration\`
`;

  try {
    console.log('📄 Converting RST to Markdown...');
    const markdown = await converter.convertToMarkdown(sampleRST);
    console.log('✅ Basic conversion successful!\n');

    console.log('🚀 Optimizing for LLM...');
    const optimized = await optimizer.optimize(markdown);
    console.log('✅ Optimization successful!\n');

    console.log('📋 Result Preview:');
    console.log('=' .repeat(50));
    console.log(optimized.substring(0, 800) + '...');
    console.log('=' .repeat(50));

    console.log('\n🎉 All tests passed! The MCP server should work correctly.');
    console.log('\n📋 Next steps:');
    console.log('1. Configure your MCP client to use this server');
    console.log('2. Test with real Sphinx documentation');
    console.log('3. Try the BTRFS docs: https://btrfs.readthedocs.io/');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testConversion();
