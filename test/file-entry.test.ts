import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  it,
} from "./deps.ts";
import { expect, FakeTime, mock } from "./deps.ts";

import type { ExistsOptions } from "@std/fs";
import { _internals, FileEntry } from "../src/file-entry.ts";
import { NotFound } from "../src/errors.ts";
import { DEFAULT_CONFIG } from "../src/config.ts";
import { reset, setup } from "../src/logger.ts";

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

        async function mockExists(
          path: string | URL,
          _opts?: ExistsOptions,
        ) {
          return await Promise.resolve(
            path === "/root/app/sub/index.html" ||
              path === "/root/app/other-sub/index.htm",
          );
        }
        spyExists = mock.stub(_internals, "exists", mockExists);
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
        expect(result.etag).to.equal(
          "2fc6fd91da31cad6f07534cd3e6d03eedc71875996aada8696b334261476b079",
        );

        expect(result.headers()).to.deep.equal({
          "Content-Type": "text/plain",
          "Content-Length": "1000",
          "Date": new Date(120000).toUTCString(),
          "ETag":
            '"2fc6fd91da31cad6f07534cd3e6d03eedc71875996aada8696b334261476b079"',
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
        expect(result.etag).to.equal(
          "c46c8269cc639d9f8a11e752a21169cd418c47b6c200cc85a617d396032b02a3",
        );

        expect(result.headers()).to.deep.equal({
          "Content-Type": "text/plain",
          "Content-Length": "1000",
          "Date": new Date(120000).toUTCString(),
          "ETag":
            '"c46c8269cc639d9f8a11e752a21169cd418c47b6c200cc85a617d396032b02a3"',
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
        expect(result.etag).to.equal(
          "67e751af310816d270dc3a3c516ff81080ba7e7fe44e70cc9b6d69b4f8a2ec49",
        );

        expect(result.headers()).to.deep.equal({
          "Content-Type": "text/markdown",
          "Content-Length": "1000",
          "Date": seedTime.toUTCString(),
          "ETag":
            '"67e751af310816d270dc3a3c516ff81080ba7e7fe44e70cc9b6d69b4f8a2ec49"',
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
        expect(result.etag).to.equal(
          "997b12928a38a3dad580f7d40b34c84930f5f7621bfdf0bd0edcfb658163ea7f",
        );

        expect(result.headers()).to.deep.equal({
          "Content-Type": "text/html",
          "Content-Length": "1000",
          "Date": new Date(120000).toUTCString(),
          "ETag":
            '"997b12928a38a3dad580f7d40b34c84930f5f7621bfdf0bd0edcfb658163ea7f"',
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
        expect(result.etag).to.equal(
          "d8cc7d9d2c74940b4c686becfaec3f17749db078b2b6a5f028bca2f9f3f137d4",
        );

        expect(result.headers()).to.deep.equal({
          "Content-Type": "text/html",
          "Content-Length": "1000",
          "Date": new Date(120000).toUTCString(),
          "ETag":
            '"d8cc7d9d2c74940b4c686becfaec3f17749db078b2b6a5f028bca2f9f3f137d4"',
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
