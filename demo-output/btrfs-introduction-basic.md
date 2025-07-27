## Introduction
============

BTRFS is a modern copy on write (COW) filesystem for Linux aimed a
implementing advanced features while also focusing on fault tolerance, repair
and easy administration. Its main features and benefits are:

* Snapshots which do not make a full copy of the files
* Built-in volume management, support for software-based RAID 0, RAID 1, RAID 10
  and others
* Self-healing - checksums for data and metadata, automatic detection of silen
  data corruptions
* Data compression
* Reflinks, fast and efficient file copies

Feature overview
----------------

*  Extent based file storage
*  2\ :sup:`64` byte (16 EiB)
   :ref:`maximum file size<administration-limits>` (practical limit is 8 EiB due
   to Linux VFS)
*  :doc:`Space-efficient packing of small files<Inline-files>`
*
   Space-efficient indexed directories
*  :ref:`Dynamic inode
   allocation<administration-flexibility>`
*  :doc:`Writable snapshots, read-only snapshots, subvolumes
   (separate internal filesystem roots)<Subvolumes>`
*  :doc:`Checksums on data and
   metadata<Checksumming>` (crc32c, xxhash, sha256, blake2b)
*  :doc:`Compression
   (ZLIB, LZO, ZSTD), heuristics<Compression>`
*  :doc:`Integrated multiple device
   support<Volume-management>`:

   * File Striping (like RAID0)
   * File Mirroring
     (like RAID1 up to 4 copies)
   * File Striping+Mirroring (like RAID10)
   *
     Single and Dual Parity implementations (like RAID5/6, experimental, no
     production-ready)

*  SSD/NVMe (flash storage) awareness, :doc:`TRIM/Discard<Trim>` for
   reporting free blocks for
   reuse and optimizations (e.g. avoiding unnecessary
   seek optimizations,
   sending writes in clusters.
*  :doc:`Background
   scrub<Scrub>` process for finding and repairing errors of files with redundant copies
*
   :doc:`Online filesystem defragmentation<Defragmentation>`

> ℹ️ **NOTE**\n\n***> BTRFS development is active and features are continuously being improved.
   Some features may be experimental.\n***\n\n## > ⚠️ **WARNING**\n\n***> Always backup your data before using experimental features.\n
Quick star
-----------

For a really quick start you can simply create and mount the
filesystem. Make sure that the block device you'd like to use is suitable so you
don't overwrite existing data.

.. code-block:: shell

   # mkfs.btrfs /dev/sdx

   # mount /dev/sdx /mnt/tes

The default options should be acceptable for mos
users and sometimes can be
changed later. The example above is for a single
device filesystem, creating a
*******single******* profile for data (no redundant copies of the
blocks), and *******DUP*******
for metadata (each block is duplicated).

Read more about:


******* creating a filesystem at mkfs.btrfs
   ******* mount options a
     Administration
\n***\n\n