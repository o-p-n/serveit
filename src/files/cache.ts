/**
 * @copyright 2025 Matthew A. Miller
 */

import { encodeHex } from "@std/encoding";
import { walk } from "@std/fs";
import { typeByExtension } from "@std/media-types";
import { basename, dirname, extname, join, resolve } from "@std/path";

import { FileEntry } from "./entry.ts";

export const _internals = {
  readFile: Deno.readFile,
  stat: Deno.stat,
  walk,
};

export class FileCache {
  readonly rootDir: string;
  private contents: Record<string, FileEntry> = {};

  constructor(rootDir: string, prefill?: Record<string, FileEntry>) {
    this.rootDir = rootDir;
    this.contents = { ...prefill };
  }

  get files(): Record<string, FileEntry> {
    return { ...this.contents };
  }

  async index() {
    const itr = _internals.walk(this.rootDir, {
      includeDirs: false,
      includeSymlinks: false,
    });

    const cache: Record<string, FileEntry> = {};
    for await (const fe of itr) {
      const path = fe.path;
      const key = path.substring(this.rootDir.length);
      const stat = await _internals.stat(path);
      const content = await _internals.readFile(path);
      const etag = await calculateETag(content);

      const type = typeByExtension(extname(path)) || "text/plain";
      const size = stat.size;
      const createdAt = stat.birthtime || new Date();
      const modifiedAt = stat.mtime || createdAt;

      const entry = new FileEntry({
        path,
        type,
        size,
        createdAt,
        modifiedAt,
        etag,
      });
      cache[key] = entry;

      if (/index\.[^.]*$/g.test(basename(path)) && (type === "text/html")) {
        // record directory entry for index file
        const index = resolve(dirname(key));
        cache[index] = entry;
      }
    }

    // replace existing contents
    this.contents = cache;
  }

  async find(pathname: string): Promise<FileEntry> {
    let entry = this.contents[pathname];
    if (!entry) {
      const path = join(this.rootDir, pathname);
      // content etag not calcuated — not adding to cache
      entry = await FileEntry.find(path);
    }
    return entry;
  }
}

async function calculateETag(content: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", content);
  const hash = encodeHex(digest);

  return hash;
}
