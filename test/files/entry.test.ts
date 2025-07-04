import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  it,
} from "../deps.ts";
import { expect, FakeTime, mock } from "../deps.ts";

import type { ExistsOptions } from "@std/fs";
import { _internals, FileEntry } from "../../src/files/entry.ts";
import { NotFound } from "../../src/errors.ts";
import { DEFAULT_CONFIG } from "../../src/config.ts";
import { reset, setup } from "../../src/logger.ts";

import { toStat } from "./common.ts";

describe("files/entry", () => {
  beforeAll(async () => {
    await setup({
      ...DEFAULT_CONFIG,
      logLevel: "debug",
    });
  });

  afterAll(async () => {
    await reset();
  });

  describe("FileEntry", () => {
    describe("ctor", () => {
      it("creates without an etag", () => {
        const entry = new FileEntry({
          path: "/app/web/file1.txt",
          type: "text/plain",
          size: 1000,
          createdAt: new Date(60000),
          modifiedAt: new Date(120000),
        });
        expect(entry.path).to.equal("/app/web/file1.txt");
        expect(entry.type).to.equal("text/plain");
        expect(entry.size).to.equal(1000);
        expect(entry.createdAt).to.deep.equal(new Date(60000));
        expect(entry.modifiedAt).to.deep.equal(new Date(120000));
        expect(entry.etag).to.be.undefined();

        expect(entry.headers()).to.deep.equal({
          "Content-Type": "text/plain",
          "Content-Length": "1000",
          "Date": entry.modifiedAt.toUTCString(),
        });
      });

      it("creates with an etag", () => {
        const entry = new FileEntry({
          path: "/app/web/file1.txt",
          type: "text/plain",
          size: 1000,
          createdAt: new Date(60000),
          modifiedAt: new Date(120000),
          etag: "0123456789abcdef",
        });
        expect(entry.path).to.equal("/app/web/file1.txt");
        expect(entry.type).to.equal("text/plain");
        expect(entry.size).to.equal(1000);
        expect(entry.createdAt).to.deep.equal(new Date(60000));
        expect(entry.modifiedAt).to.deep.equal(new Date(120000));
        expect(entry.etag).to.equal("0123456789abcdef");

        expect(entry.headers()).to.deep.equal({
          "Content-Type": "text/plain",
          "Content-Length": "1000",
          "Date": entry.modifiedAt.toUTCString(),
          "ETag": '"0123456789abcdef"',
        });
      });
    });

    describe("matches()", () => {
      let entry: FileEntry;

      beforeEach(() => {
        entry = new FileEntry({
          path: "/root/app/file.txt",
          type: "text/plain",
          size: 1000,
          createdAt: new Date(60000),
          modifiedAt: new Date(120000),
          etag: "qwerty",
        });
      });

      it("does not match an missing/empty header", () => {
        expect(entry.matches(undefined)).to.equal(false);
        expect(entry.matches("")).to.equal(false);
      });
      it("matches a single-entry header", () => {
        expect(entry.matches('"qwerty"')).to.equal(true);
      });
      it("matches a weak single-entry header", () => {
        expect(entry.matches('W/"qwerty"')).to.equal(true);
      });
      it("does not match on a single-entry header", () => {
        expect(entry.matches('"asdf"')).to.equal(false);
      });

      it("matches at one from a list-entries header", () => {
        expect(entry.matches('"asdf", "qwerty", "poiuy"')).to.equal(true);
        expect(entry.matches('"asdf", W/"qwerty", "poiuy"')).to.equal(true);
      });
      it("does not match from a list-entries header", () => {
        expect(entry.matches('"yuiop", "ytrewq", "fdsa"')).to.equal(false);
        expect(entry.matches('"yuiop", W/"ytrewq", "fdsa"')).to.equal(false);
      });

      it("does not match if entry has no etag", () => {
        entry = new FileEntry({
          path: "/root/app/file.txt",
          type: "text/plain",
          size: 1000,
          createdAt: new Date(60000),
          modifiedAt: new Date(120000),
        });

        expect(entry.matches('"qwerty"')).to.equal(false);
        expect(entry.matches('W/"qwerty"')).to.equal(false);
      });
    });
    describe("find()", () => {
      const content = ReadableStream.from([new Uint8Array()]);
      const seedTime = new Date(86400000);

      let spyOpen: mock.Spy;
      let spyStat: mock.Spy;
      let spyExists: mock.Spy;
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
              case "/root/app/other-sub":
                return toStat({
                  isDirectory: true,
                  size: 0,
                });
              case "/root/app/other-sub/index.htm":
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

        spyExists = mock.stub(
          _internals,
          "exists",
          (path: string | URL, _opts?: ExistsOptions) => {
            return Promise.resolve(
              (path === "/root/app/sub/index.html") ||
                (path === "/root/app/other-sub/index.htm"),
            );
          },
        );
      });

      afterEach(() => {
        spyExists.restore();
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
        expect(result.etag).to.be.undefined();

        expect(result.headers()).to.deep.equal({
          "Content-Type": "text/plain",
          "Content-Length": "1000",
          "Date": new Date(120000).toUTCString(),
        });
        await expect(result.open()).to.eventually.equal(content);
      });
      it("loads a specific file with unknown extension", async () => {
        const result = await FileEntry.find("/root/app/file.unknownext");
        expect(result.path).to.equal("/root/app/file.unknownext");
        expect(result.type).to.equal("text/plain");
        expect(result.size).to.equal(1000);
        expect(result.createdAt).to.deep.equal(new Date(60000));
        expect(result.modifiedAt).to.deep.equal(new Date(120000));
        expect(result.etag).to.be.undefined();

        expect(result.headers()).to.deep.equal({
          "Content-Type": "text/plain",
          "Content-Length": "1000",
          "Date": new Date(120000).toUTCString(),
        });
        await expect(result.open()).to.eventually.equal(content);
      });
      it("loads a specific file with unknown times", async () => {
        const result = await FileEntry.find("/root/app/notime.md");
        expect(result.path).to.equal("/root/app/notime.md");
        expect(result.type).to.equal("text/markdown");
        expect(result.size).to.equal(1000);
        expect(result.createdAt).to.deep.equal(seedTime);
        expect(result.modifiedAt).to.deep.equal(seedTime);
        expect(result.etag).to.be.undefined();

        expect(result.headers()).to.deep.equal({
          "Content-Type": "text/markdown",
          "Content-Length": "1000",
          "Date": seedTime.toUTCString(),
        });
        await expect(result.open()).to.eventually.equal(content);
      });

      it("loads the index for a directory (index.html)", async () => {
        const result = await FileEntry.find("/root/app/sub");
        expect(result.path).to.equal("/root/app/sub/index.html");
        expect(result.type).to.equal("text/html");
        expect(result.size).to.equal(1000);
        expect(result.createdAt).to.deep.equal(new Date(60000));
        expect(result.modifiedAt).to.deep.equal(new Date(120000));
        expect(result.etag).to.be.undefined();

        expect(result.headers()).to.deep.equal({
          "Content-Type": "text/html",
          "Content-Length": "1000",
          "Date": new Date(120000).toUTCString(),
        });
        await expect(result.open()).to.eventually.equal(content);

        expect(spyExists).to.have.been.called(1);
        expect(spyExists).to.have.been.deep.calledWith([
          "/root/app/sub/index.html",
          { isFile: true },
        ]);
      });
      it("loads the index for a directory (index.htm)", async () => {
        const result = await FileEntry.find("/root/app/other-sub");
        expect(result.path).to.equal("/root/app/other-sub/index.htm");
        expect(result.type).to.equal("text/html");
        expect(result.size).to.equal(1000);
        expect(result.createdAt).to.deep.equal(new Date(60000));
        expect(result.modifiedAt).to.deep.equal(new Date(120000));
        expect(result.etag).to.be.undefined();

        expect(result.headers()).to.deep.equal({
          "Content-Type": "text/html",
          "Content-Length": "1000",
          "Date": new Date(120000).toUTCString(),
        });
        await expect(result.open()).to.eventually.equal(content);

        expect(spyExists).to.have.been.called(2);
        expect(spyExists).to.have.been.deep.calledWith([
          "/root/app/other-sub/index.html",
          { isFile: true },
        ]);
        expect(spyExists).to.have.been.deep.calledWith([
          "/root/app/other-sub/index.htm",
          { isFile: true },
        ]);
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
