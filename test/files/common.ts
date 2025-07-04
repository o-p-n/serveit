export function toStat(info: Partial<Deno.FileInfo>) {
  return {
    isFile: false,
    isDirectory: false,
    isSymlink: false,
    size: 1000,
    birthtime: new Date(60000),
    mtime: new Date(120000),
    ...info,
  } as Deno.FileInfo;
}

