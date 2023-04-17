/**
 * @copyright 2023 Matthew A. Miller
 */

import { extname, join } from "path";
import { typeByExtension } from "media_types";

import { encode as toHex } from "./util/hex.ts";

interface FileEntryProps {
  path: string;
  type: string;
  size: number;
  createdAt: Date;
  modifiedAt: Date;
  etag: string;
}

export class FileEntry {
  readonly path: string;
  readonly type: string;
  readonly size: number;
  readonly createdAt: Date;
  readonly modifiedAt: Date;
  readonly etag: string;

  constructor(props: FileEntryProps) {
    this.path = props.path;
    this.type = props.type;
    this.size = props.size;
    this.createdAt = props.createdAt;
    this.modifiedAt = props.modifiedAt;
    this.etag = props.etag;
  }

  async open(): Promise<ReadableStream<Uint8Array>> {
    const fs = await Deno.open(this.path, { read: true, write: false });
    return fs.readable;
  }
}

async function calculateETag(input: Partial<FileEntryProps>): Promise<string> {
  const json = JSON.stringify(input);
  const src = new TextEncoder().encode(json);
  const hash = await crypto.subtle.digest("SHA-256", src);
  return "W/" + toHex(hash);
}

export async function find(path: string): Promise<FileEntry> {
  const stat = await Deno.stat(path);
  if (stat.isDirectory) {
    return find(join(path, "index.html"));
  } else if (stat.isSymlink) {
    // should not happen
    throw new Error("unsupported type");
  }

  // get basic info
  const createdAt = stat.birthtime || new Date();
  const modifiedAt = stat.mtime || createdAt;
  const props = {
    path,
    type: typeByExtension(extname(path)) || "text/plain",
    size: stat.size,
    createdAt,
    modifiedAt,
  } as Partial<FileEntryProps>;

  // calculate ETag
  props.etag = await calculateETag(props);
  return new FileEntry(props as FileEntryProps);
}
