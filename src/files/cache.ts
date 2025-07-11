/**
 * @copyright 2025 Matthew A. Miller
 */

import { encodeHex } from "@std/encoding";
import { walk } from "@std/fs";
import { typeByExtension } from "@std/media-types";
import { basename, dirname, extname, resolve } from "@std/path";
import { debounce } from "@std/async";

import { FileEntry } from "./entry.ts";
import { metrics } from "../meta/metrics.ts";
import log from "../logger.ts";

export const _internals = {
  readFile: Deno.readFile,
  stat: Deno.stat,
  walk,
  findEntry: FileEntry.find,
  watchFs: Deno.watchFs,
};

export class FileCache {
  readonly rootDir: string;
  private contents: Record<string, FileEntry> = {};
  private watcher?: Deno.FsWatcher;

  constructor(rootDir: string, prefill?: Record<string, FileEntry>) {
    this.rootDir = rootDir;
    this.contents = { ...prefill };
  }

  get files(): Record<string, FileEntry> {
    return { ...this.contents };
  }

  async start() {
    const watcher = this.watcher = _internals.watchFs(this.rootDir);
    const reindex = debounce(this.index.bind(this), 200);

    await this.index();

    (async () => {
      log().debug`starting fs watch ...`;

      for await (const evt of watcher) {
        log().debug`+++ processing fs event ${evt.kind} on ${
          evt.paths.join(", ")
        }`;
        reindex();
      }

      log().debug`... stopped fs watch`;
    })();
  }
  stop() {
    this.watcher?.close();
    this.watcher = undefined;
  }

  async index() {
    const { indexedFilesCount, totalIndexingRuns } = metrics();

    log().debug`indexing ${this.rootDir} ...`;
    const itr = _internals.walk(this.rootDir, {
      includeDirs: false,
      includeSymlinks: false,
    });

    const cache: Record<string, FileEntry> = {};
    for await (const fe of itr) {
      log().debug` + caching ${fe.path} ...`;
      const path = fe.path;
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
      cache[path] = entry;

      if (/index\.[^.]*$/g.test(basename(path)) && (type === "text/html")) {
        // record directory entry for index file
        log().debug` + ... and the directory for ${path}`;
        const index = resolve(dirname(path));
        cache[index] = entry;
      }
    }

    // replace existing contents
    const keys = Object.keys(cache);
    log().debug`cache index: ${keys.join(" * ")}`;
    indexedFilesCount.set(keys.length);
    this.contents = cache;
    totalIndexingRuns.inc();
  }

  async find(path: string): Promise<FileEntry> {
    path = resolve(path);
    log().debug`checking cache for ${path}`;
    let entry = this.contents[path];
    if (!entry) {
      log().debug`did not find ${path} in cache!`;
      // content etag not calcuated — not adding to cache
      entry = await _internals.findEntry(path);
    }
    return entry;
  }
}

async function calculateETag(content: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", content);
  const hash = encodeHex(digest);

  return hash;
}
