/**
 * @file locates and reads files
 * @copyright 2024 Matthew A. Miller
 */

import { exists } from "@std/fs";
import { typeByExtension } from "@std/media-types";
import { extname, resolve } from "@std/path";

import { NotFound } from "../errors.ts";
import log from "../logger.ts";

export const _internals = {
  open: Deno.open,
  stat: Deno.stat,
  exists,
};

interface FileEntryProps {
  readonly path: string;
  readonly type: string;
  readonly size: number;

  readonly createdAt: Date;
  readonly modifiedAt: Date;
  readonly etag?: string;
}

export class FileEntry {
  readonly path: string;
  readonly type: string;
  readonly size: number;

  readonly createdAt: Date;
  readonly modifiedAt: Date;
  readonly etag?: string;

  constructor(props: FileEntryProps) {
    this.path = props.path;
    this.type = props.type;
    this.size = props.size;

    this.createdAt = props.createdAt;
    this.modifiedAt = props.modifiedAt;
    this.etag = props.etag;
  }

  headers(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": this.type,
      "Content-Length": this.size.toString(),
      "Cache-Control": "public, no-transform",
      "Date": this.modifiedAt.toUTCString(),
    };

    if (this.etag) {
      headers["ETag"] = `"${this.etag!}"`;
    }

    return headers;
  }

  matches(header?: string): boolean {
    if (!header) return false;
    if (!this.etag) return false;

    const entries = header.split(/\s*,\s*/);
    let result = false;
    for (const entry of entries) {
      const value = /^(?:W\/)?"([\u0021\u0023-\u007e\u0080-\u00ff]*)"$/.exec(
        entry,
      )?.[1];
      result = result || (value === this.etag);
    }

    return result;
  }

  async open() {
    const fs = await _internals.open(this.path);
    return fs.readable;
  }

  static async find(path: string): Promise<FileEntry> {
    log().debug`attempting to find ${path} ...`;

    const stat = await _internals.stat(path)
      .catch((err) => {
        log().warn`failed to stat ${path}: ${err.message}`;
        throw new NotFound();
      });
    if (stat.isDirectory) {
      log().debug`${path} is a directory; looking for index`;

      for (const index of ["index.html", "index.htm"]) {
        const indexPath = resolve(path, index);
        if (await _internals.exists(indexPath, { isFile: true })) {
          return FileEntry.find(indexPath);
        }
      }

      log().warn`no index file found for ${path}`;
      throw new NotFound();
    }
    if (!stat.isFile) {
      log().warn`${path} is not a supported kind`;
      throw new NotFound();
    }

    const type = typeByExtension(extname(path)) || "text/plain";
    const size = stat.size;
    const createdAt = stat.birthtime || new Date();
    const modifiedAt = stat.mtime || createdAt;
    const props: FileEntryProps = {
      path,
      type,
      size,
      createdAt,
      modifiedAt,
    };

    log().debug`found ${path} (type=${props.type}, size=${props.size})!`;
    return new FileEntry(props);
  }
}
