import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  it,
} from "./deps.ts";
import { expect, FakeTime, mock } from "./deps.ts";
import { ExpandGlobOptions } from "@std/fs";
import { basename, dirname } from "@std/path";

import { _internals, FileEntry } from "../src/file-entry.ts";
import { NotFound } from "../src/errors.ts";
import log, { LogLevel } from "../src/logger.ts";

function toStat(info: Partial<Deno.FileInfo>) {
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

describe("file-entry", () => {
  beforeAll(() => {
    log.level = LogLevel.ALL;
  });

  afterAll(() => {
    log.level = LogLevel.INFO;
  });

  describe("FileEntry", () => {
    describe("find()", () => {
      const content = ReadableStream.from([new Uint8Array()]);
      const seedTime = new Date(86400000);

      let spyOpen: mock.Spy;
      let spyStat: mock.Spy;
      let spyExpandGlob: mock.Spy;
      let clock: FakeTime;

      beforeEach(() => {
        clock = new FakeTime(seedTime);

        spyOpen = mock.stub(
          _internals,
          "open",
          () => Promise.resolve({ readable: content } as Deno.FsFile),
        );

        spyStat = mock.stub(
          _internals,
          "stat",
          // deno-lint-ignore require-await
          async (path: string | URL): Promise<Deno.FileInfo> => {
            switch (path.toString()) {
              case "/root/app/symlink":
                return toStat({
                  isSymlink: true,
                });
              case "/root/app/file.unknownext":
                return toStat({
                  isFile: true,
                });
              case "/root/app/file.txt":
                return toStat({
                  isFile: true,
                });
              case "/root/app/sub":
                return toStat({
                  isDirectory: true,
                  size: 0,
                });
              case "/root/app/sub/index.html":
                return toStat({
                  isFile: true,
                });
              case "/root/app/no-index":
                return toStat({
                  isDirectory: true,
                  size: 0,
                });
              case "/root/app/notime.md":
                return toStat({
                  isFile: true,
                  birthtime: null,
                  mtime: null,
                });
              default:
                throw new Deno.errors.NotFound(
                  `No such file or directory (os error 2): stat '${path}'`,
                );
            }
          },
        );

        async function* mockExpand(
          _glob: string | URL,
          opts?: ExpandGlobOptions,
        ) {
          opts = opts || {};
          if (opts.root === "/root/app/sub") {
            const path = `${opts.root!}/index.html`;
            yield {
              path,
              parentPath: dirname(path),
              name: basename(path),
              isFile: true,
              isDirectory: false,
              isSymlink: false,
            };
          }
        }
        spyExpandGlob = mock.stub(_internals, "expandGlob", mockExpand);
      });

      afterEach(() => {
        spyExpandGlob.restore();
        spyStat.restore();
        spyOpen.restore();

        clock.restore();
      });

      it("loads the specific file", async () => {
        const result = await FileEntry.find("/root/app/file.txt");
        expect(result.path).to.equal("/root/app/file.txt");
        expect(result.type).to.equal("text/plain");
        expect(result.size).to.equal(1000);
        expect(result.createdAt).to.deep.equal(new Date(60000));
        expect(result.modifiedAt).to.deep.equal(new Date(120000));
        expect(result.etag).to.equal(
          "W/2fc6fd91da31cad6f07534cd3e6d03eedc71875996aada8696b334261476b079",
        );

        await expect(result.open()).to.eventually.equal(content);
      });
      it("loads a specific file with unknown extension", async () => {
        const result = await FileEntry.find("/root/app/file.unknownext");
        expect(result.path).to.equal("/root/app/file.unknownext");
        expect(result.type).to.equal("text/plain");
        expect(result.size).to.equal(1000);
        expect(result.createdAt).to.deep.equal(new Date(60000));
        expect(result.modifiedAt).to.deep.equal(new Date(120000));
        expect(result.etag).to.equal(
          "W/c46c8269cc639d9f8a11e752a21169cd418c47b6c200cc85a617d396032b02a3",
        );

        await expect(result.open()).to.eventually.equal(content);
      });
      it("loads a specific file with unknown times", async () => {
        const result = await FileEntry.find("/root/app/notime.md");
        expect(result.path).to.equal("/root/app/notime.md");
        expect(result.type).to.equal("text/markdown");
        expect(result.size).to.equal(1000);
        expect(result.createdAt).to.deep.equal(seedTime);
        expect(result.modifiedAt).to.deep.equal(seedTime);
        expect(result.etag).to.equal(
          "W/67e751af310816d270dc3a3c516ff81080ba7e7fe44e70cc9b6d69b4f8a2ec49",
        );

        await expect(result.open()).to.eventually.equal(content);
      });

      it("loads the index for a directory", async () => {
        const result = await FileEntry.find("/root/app/sub");
        expect(result.path).to.equal("/root/app/sub/index.html");
        expect(result.type).to.equal("text/html");
        expect(result.size).to.equal(1000);
        expect(result.createdAt).to.deep.equal(new Date(60000));
        expect(result.modifiedAt).to.deep.equal(new Date(120000));
        expect(result.etag).to.equal(
          "W/997b12928a38a3dad580f7d40b34c84930f5f7621bfdf0bd0edcfb658163ea7f",
        );

        await expect(result.open()).to.eventually.equal(content);
      });

      it("throws NotFound for non-existent file", async () => {
        await expect(FileEntry.find("/not/a/file")).to.be.rejectedWith(
          NotFound,
        );
      });
      it("throws NotFound for symlink", async () => {
        await expect(FileEntry.find("/root/app/symlink")).to.be.rejectedWith(
          NotFound,
        );
      });
      it("throws NotFound for non-existent index for directory", async () => {
        await expect(FileEntry.find("/root/app/no-index")).to.be.rejectedWith(
          NotFound,
        );
      });
    });
  });
});
