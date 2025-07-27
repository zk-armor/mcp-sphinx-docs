#!/usr/bin/env node

/**
 * Demo script that fetches and converts real BTRFS documentation
 */

const fs = require('fs');
const path = require('path');
const { SphinxConverter } = require('./dist/converters/sphinx-converter.js');
const { LLMOptimizer } = require('./dist/optimizers/llm-optimizer.js');

async function demo() {
  console.log('🚀 Sphinx to LLM Markdown - BTRFS Demo\n');

  // Sample content from BTRFS documentation (Introduction page)
  const btrfsIntroRST = `Introduction
============

BTRFS is a modern copy on write (COW) filesystem for Linux aimed at
implementing advanced features while also focusing on fault tolerance, repair
and easy administration. Its main features and benefits are:

* Snapshots which do not make a full copy of the files
* Built-in volume management, support for software-based RAID 0, RAID 1, RAID 10
  and others
* Self-healing - checksums for data and metadata, automatic detection of silent
  data corruptions
* Data compression
* Reflinks, fast and efficient file copies

Feature overview
----------------

*  Extent based file storage
*  2\\ :sup:\`64\` byte (16 EiB)
   :ref:\`maximum file size<administration-limits>\` (practical limit is 8 EiB due
   to Linux VFS)
*  :doc:\`Space-efficient packing of small files<Inline-files>\`
* 
   Space-efficient indexed directories
*  :ref:\`Dynamic inode
   allocation<administration-flexibility>\`
*  :doc:\`Writable snapshots, read-only snapshots, subvolumes
   (separate internal filesystem roots)<Subvolumes>\`
*  :doc:\`Checksums on data and
   metadata<Checksumming>\` (crc32c, xxhash, sha256, blake2b)
*  :doc:\`Compression
   (ZLIB, LZO, ZSTD), heuristics<Compression>\`
*  :doc:\`Integrated multiple device
   support<Volume-management>\`:

   * File Striping (like RAID0)
   * File Mirroring
     (like RAID1 up to 4 copies)
   * File Striping+Mirroring (like RAID10)
   *
     Single and Dual Parity implementations (like RAID5/6, experimental, not
     production-ready)

*  SSD/NVMe (flash storage) awareness, :doc:\`TRIM/Discard<Trim>\` for
   reporting free blocks for
   reuse and optimizations (e.g. avoiding unnecessary
   seek optimizations,
   sending writes in clusters.
*  :doc:\`Background
   scrub<Scrub>\` process for finding and repairing errors of files with redundant copies
* 
   :doc:\`Online filesystem defragmentation<Defragmentation>\`

.. note::
   BTRFS development is active and features are continuously being improved.
   Some features may be experimental.

.. warning::
   Always backup your data before using experimental features.

Quick start
-----------

For a really quick start you can simply create and mount the
filesystem. Make sure that the block device you'd like to use is suitable so you
don't overwrite existing data.

.. code-block:: shell

   # mkfs.btrfs /dev/sdx
   
   # mount /dev/sdx /mnt/test

The default options should be acceptable for most
users and sometimes can be
changed later. The example above is for a single
device filesystem, creating a
*single* profile for data (no redundant copies of the
blocks), and *DUP*
for metadata (each block is duplicated).

Read more about:

  
* creating a filesystem at :doc:\`mkfs.btrfs\`
   * mount options at
     :doc:\`Administration\`
`;

  const converter = new SphinxConverter();
  const optimizer = new LLMOptimizer();

  try {
    console.log('📄 Converting BTRFS Introduction from RST...');
    const markdown = await converter.convertToMarkdown(btrfsIntroRST, 'Introduction.rst');
    
    console.log('🚀 Optimizing for LLM consumption...');
    const optimized = await optimizer.optimize(markdown, {
      chunkSize: 3000,
      addContextHeaders: true,
      simplifyStructure: true
    });

    console.log('💾 Saving converted content...');
    
    // Create demo output directory
    const outputDir = path.join(__dirname, 'demo-output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    // Save original and optimized versions
    fs.writeFileSync(path.join(outputDir, 'btrfs-introduction-basic.md'), markdown);
    fs.writeFileSync(path.join(outputDir, 'btrfs-introduction-optimized.md'), optimized);

    console.log('✅ Demo completed successfully!\n');
    console.log('📁 Files saved in ./demo-output/');
    console.log('   • btrfs-introduction-basic.md     (basic conversion)');
    console.log('   • btrfs-introduction-optimized.md (LLM-optimized)');
    
    console.log('\n📋 Optimized content preview:');
    console.log('=' .repeat(60));
    console.log(optimized.substring(0, 1000));
    console.log('\n...\n');
    console.log('=' .repeat(60));

    console.log('\n🎯 Ready to test with MCP clients!');
    console.log('   Next: Configure your MCP client and try converting real Sphinx docs');

  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

demo();
