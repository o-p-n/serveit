import { afterEach, beforeEach, describe, it } from "../deps.ts";
import { expect, FakeTime, mock } from "../deps.ts";

import { _internals, FileCache } from "../../src/files/cache.ts";
import { WalkEntry, WalkOptions } from "@std/fs";
import { join } from "@std/path";
import { toStat } from "./common.ts";
import { FileEntry } from "../../src/files/entry.ts";

describe("files/cache", () => {
  describe("FileCache", () => {
    describe(".ctor()", () => {
      it("creates with empty contents", () => {
        const cache = new FileCache("/app/web");
        expect(cache.rootDir).to.equal("/app/web");
        expect(cache.files).to.deep.equal({});
      });
      it("creates with prefilled contents", () => {
        const contents: Record<string, FileEntry> = {
          "file.txt": new FileEntry({
            path: "/app/web/file.txt",
            type: "text/plain",
            size: 1000,
            createdAt: new Date(60000),
            modifiedAt: new Date(120000),
            etag: "abcdefg",
          }),
          "image.png": new FileEntry({
            path: "/app/web/image.png",
            type: "image/png",
            size: 1000,
            createdAt: new Date(60000),
            modifiedAt: new Date(120000),
            etag: "abcdefg",
          }),
        };
        const cache = new FileCache("/app/web", contents);
        expect(cache.rootDir).to.equal("/app/web");
        expect(cache.files).to.deep.equal(contents);

        delete contents["image.png"];
        expect(cache.files).to.not.deep.equal(contents);
      });
    });

    describe(".index()", () => {
      const seedTime = new Date(10000);
      let clock: FakeTime;

      let cache: FileCache;
      let spyWalk: mock.Spy;
      let spyStat: mock.Spy;
      let spyReadFile: mock.Spy;

      beforeEach(() => {
        clock = new FakeTime(seedTime);

        cache = new FileCache("/app/web");
        spyWalk = mock.stub(
          _internals,
          "walk",
          async function* (root: string | URL, _opts?: WalkOptions) {
            const result: WalkEntry[] = [
              {
                path: join(root.toString(), "file1.txt"),
                name: "file1.txt",
                isDirectory: false,
                isFile: true,
                isSymlink: false,
              },
              {
                path: join(root.toString(), "file2.txt"),
                name: "file2.txt",
                isDirectory: false,
                isFile: true,
                isSymlink: false,
              },
              {
                path: join(root.toString(), "output.random"),
                name: "output.random",
                isDirectory: false,
                isFile: true,
                isSymlink: false,
              },
              {
                path: join(root.toString(), "subdir", "index.html"),
                name: "index.html",
                isDirectory: false,
                isFile: true,
                isSymlink: false,
              },
              {
                path: join(root.toString(), "otherdir", "index.htm"),
                name: "index.html",
                isDirectory: false,
                isFile: true,
                isSymlink: false,
              },
            ];

            for (const entry of result) {
              yield entry;
            }
          },
        );
        spyStat = mock.stub(_internals, "stat", (path: string | URL) => {
          const birthtime = (path.toString().endsWith(".html"))
            ? null
            : new Date(30000);
          const mtime = (path.toString().endsWith("file2.txt"))
            ? null
            : new Date(120000);
          return Promise.resolve(toStat({
            isFile: true,
            birthtime,
            mtime,
          }));
        });
        spyReadFile = mock.stub(
          _internals,
          "readFile",
          (_path: string | URL, _opts?: Deno.ReadFileOptions) => {
            // "file content"
            return Promise.resolve(
              new Uint8Array([
                102,
                105,
                108,
                101,
                32,
                99,
                111,
                110,
                116,
                101,
                110,
                116,
              ]),
            );
          },
        );
      });

      afterEach(() => {
        spyWalk.restore();
        spyStat.restore();
        spyReadFile.restore();
        clock.restore();
      });

      it("indexes the rootDir", async () => {
        await cache.index();
        expect(cache.files).to.deep.equal({
          "/file1.txt": new FileEntry({
            path: "/app/web/file1.txt",
            type: "text/plain",
            size: 1000,
            createdAt: new Date(30000),
            modifiedAt: new Date(120000),
            etag:
              "e0ac3601005dfa1864f5392aabaf7d898b1b5bab854f1acb4491bcd806b76b0c",
          }),
          "/file2.txt": new FileEntry({
            path: "/app/web/file2.txt",
            type: "text/plain",
            size: 1000,
            createdAt: new Date(30000),
            modifiedAt: new Date(30000),
            etag:
              "e0ac3601005dfa1864f5392aabaf7d898b1b5bab854f1acb4491bcd806b76b0c",
          }),
          "/output.random": new FileEntry({
            path: "/app/web/output.random",
            type: "text/plain",
            size: 1000,
            createdAt: new Date(30000),
            modifiedAt: new Date(120000),
            etag:
              "e0ac3601005dfa1864f5392aabaf7d898b1b5bab854f1acb4491bcd806b76b0c",
          }),
          "/subdir": new FileEntry({
            path: "/app/web/subdir/index.html",
            type: "text/html",
            size: 1000,
            createdAt: new Date(10000),
            modifiedAt: new Date(120000),
            etag:
              "e0ac3601005dfa1864f5392aabaf7d898b1b5bab854f1acb4491bcd806b76b0c",
          }),
          "/subdir/index.html": new FileEntry({
            path: "/app/web/subdir/index.html",
            type: "text/html",
            size: 1000,
            createdAt: new Date(10000),
            modifiedAt: new Date(120000),
            etag:
              "e0ac3601005dfa1864f5392aabaf7d898b1b5bab854f1acb4491bcd806b76b0c",
          }),
          "/otherdir": new FileEntry({
            path: "/app/web/otherdir/index.htm",
            type: "text/html",
            size: 1000,
            createdAt: new Date(30000),
            modifiedAt: new Date(120000),
            etag:
              "e0ac3601005dfa1864f5392aabaf7d898b1b5bab854f1acb4491bcd806b76b0c",
          }),
          "/otherdir/index.htm": new FileEntry({
            path: "/app/web/otherdir/index.htm",
            type: "text/html",
            size: 1000,
            createdAt: new Date(30000),
            modifiedAt: new Date(120000),
            etag:
              "e0ac3601005dfa1864f5392aabaf7d898b1b5bab854f1acb4491bcd806b76b0c",
          }),
        });

        expect(spyWalk).to.have.been.deep.calledWith([
          "/app/web",
          {
            includeDirs: false,
            includeSymlinks: false,
          },
        ]);

        expect(spyStat).to.have.been.called(5);
        expect(spyStat).to.have.been.deep.calledWith([
          "/app/web/file1.txt",
        ]);
        expect(spyStat).to.have.been.deep.calledWith([
          "/app/web/file2.txt",
        ]);
        expect(spyStat).to.have.been.deep.calledWith([
          "/app/web/output.random",
        ]);
        expect(spyStat).to.have.been.deep.calledWith([
          "/app/web/subdir/index.html",
        ]);
        expect(spyStat).to.have.been.deep.calledWith([
          "/app/web/otherdir/index.htm",
        ]);

        expect(spyReadFile).to.have.been.called(5);
        expect(spyReadFile).to.have.been.deep.calledWith([
          "/app/web/file1.txt",
        ]);
        expect(spyReadFile).to.have.been.deep.calledWith([
          "/app/web/file2.txt",
        ]);
        expect(spyReadFile).to.have.been.deep.calledWith([
          "/app/web/output.random",
        ]);
        expect(spyReadFile).to.have.been.deep.calledWith([
          "/app/web/subdir/index.html",
        ]);
        expect(spyReadFile).to.have.been.deep.calledWith([
          "/app/web/otherdir/index.htm",
        ]);
      });
    });

    describe(".find()", () => {
      let cache: FileCache;
      let spyEntryFind: mock.Spy;

      beforeEach(() => {
        cache = new FileCache("/app/web", {
          "/file1.txt": new FileEntry({
            path: "/app/web/file1.txt",
            type: "text/plain",
            size: 1000,
            createdAt: new Date(60000),
            modifiedAt: new Date(120000),
            etag: "0123456789abcdef",
          }),
          "/subdir": new FileEntry({
            path: "/app/web/subdir/index.html",
            type: "text/html",
            size: 1000,
            createdAt: new Date(60000),
            modifiedAt: new Date(120000),
            etag: "0123456789abcdef",
          }),
          "/subdir/index.html": new FileEntry({
            path: "/app/web/subdir/index.html",
            type: "text/html",
            size: 1000,
            createdAt: new Date(60000),
            modifiedAt: new Date(120000),
            etag: "0123456789abcdef",
          }),
        });
        spyEntryFind = mock.stub(FileEntry, "find", (path: string) => {
          return Promise.resolve(
            new FileEntry({
              path,
              type: "text/plain",
              size: 1000,
              createdAt: new Date(60000),
              modifiedAt: new Date(120000),
              etag: "0123456789abcdef",
            }),
          );
        });
      });

      afterEach(() => {
        spyEntryFind.restore();
      });

      it("file path returns the cached entry", async () => {
        const result = await cache.find("/file1.txt");

        expect(result).to.deep.equal(
          new FileEntry({
            path: "/app/web/file1.txt",
            type: "text/plain",
            size: 1000,
            createdAt: new Date(60000),
            modifiedAt: new Date(120000),
            etag: "0123456789abcdef",
          }),
        );
        expect(result).to.equal(cache.files["/file1.txt"]);

        expect(spyEntryFind).to.not.have.been.called();
      });
      it("file path falls through entry find", async () => {
        const result = await cache.find("/file2.txt");

        expect(result).to.deep.equal(
          new FileEntry({
            path: "/app/web/file2.txt",
            type: "text/plain",
            size: 1000,
            createdAt: new Date(60000),
            modifiedAt: new Date(120000),
            etag: "0123456789abcdef",
          }),
        );
        expect(cache.files["/file2.txt"]).to.not.exist();

        expect(spyEntryFind).to.have.been.deep.calledWith([
          "/app/web/file2.txt",
        ]);
      });
    });
  });
});
