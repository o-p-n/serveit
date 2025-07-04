import { afterEach, beforeEach, describe, it } from "../deps.ts";
import { expect, FakeTime, mock } from "../deps.ts";

import { _internals, FileCache } from "../../src/files/cache.ts";
import { WalkEntry, WalkOptions } from "@std/fs";
import { join } from "@std/path";
import { toStat } from "./common.ts";
import { FileEntry } from "../../src/files/entry.ts";

describe("files/cache", () => {
  const seedTime = new Date(10000);
  let clock: FakeTime;

  beforeEach(() => {
    clock = new FakeTime(seedTime);
  });

  afterEach(() => {
    clock.runAll();
    clock.restore();
  });

  describe("FileCache", () => {
    describe("ctor", () => {
      it("creates with empty contents", () => {
        const cache = new FileCache("/app/web");
        expect(cache.rootDir).to.equal("/app/web");
        expect(cache.files).to.deep.equal({});
      });
      it("creates with prefilled contents", () => {
        const contents: Record<string, FileEntry> = {
          "/app/web/file.txt": new FileEntry({
            path: "/app/web/file.txt",
            type: "text/plain",
            size: 1000,
            createdAt: new Date(60000),
            modifiedAt: new Date(120000),
            etag: "abcdefg",
          }),
          "/app/web/image.png": new FileEntry({
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

        delete contents["/app/web/image.png"];
        expect(cache.files).to.not.deep.equal(contents);
      });
    });

    describe(".index()", () => {
      let cache: FileCache;
      let spyWalk: mock.Spy;
      let spyStat: mock.Spy;
      let spyReadFile: mock.Spy;

      beforeEach(() => {
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
      });

      it("indexes the rootDir", async () => {
        await cache.index();
        expect(cache.files).to.deep.equal({
          "/app/web/file1.txt": new FileEntry({
            path: "/app/web/file1.txt",
            type: "text/plain",
            size: 1000,
            createdAt: new Date(30000),
            modifiedAt: new Date(120000),
            etag:
              "e0ac3601005dfa1864f5392aabaf7d898b1b5bab854f1acb4491bcd806b76b0c",
          }),
          "/app/web/file2.txt": new FileEntry({
            path: "/app/web/file2.txt",
            type: "text/plain",
            size: 1000,
            createdAt: new Date(30000),
            modifiedAt: new Date(30000),
            etag:
              "e0ac3601005dfa1864f5392aabaf7d898b1b5bab854f1acb4491bcd806b76b0c",
          }),
          "/app/web/output.random": new FileEntry({
            path: "/app/web/output.random",
            type: "text/plain",
            size: 1000,
            createdAt: new Date(30000),
            modifiedAt: new Date(120000),
            etag:
              "e0ac3601005dfa1864f5392aabaf7d898b1b5bab854f1acb4491bcd806b76b0c",
          }),
          "/app/web/subdir": new FileEntry({
            path: "/app/web/subdir/index.html",
            type: "text/html",
            size: 1000,
            createdAt: new Date(10000),
            modifiedAt: new Date(120000),
            etag:
              "e0ac3601005dfa1864f5392aabaf7d898b1b5bab854f1acb4491bcd806b76b0c",
          }),
          "/app/web/subdir/index.html": new FileEntry({
            path: "/app/web/subdir/index.html",
            type: "text/html",
            size: 1000,
            createdAt: new Date(10000),
            modifiedAt: new Date(120000),
            etag:
              "e0ac3601005dfa1864f5392aabaf7d898b1b5bab854f1acb4491bcd806b76b0c",
          }),
          "/app/web/otherdir": new FileEntry({
            path: "/app/web/otherdir/index.htm",
            type: "text/html",
            size: 1000,
            createdAt: new Date(30000),
            modifiedAt: new Date(120000),
            etag:
              "e0ac3601005dfa1864f5392aabaf7d898b1b5bab854f1acb4491bcd806b76b0c",
          }),
          "/app/web/otherdir/index.htm": new FileEntry({
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

    describe(".start()/.stop()", () => {
      let cache: FileCache;
      let spyIndex: mock.Spy;
      let spyWatchFS: mock.Spy;

      beforeEach(() => {
        cache = new FileCache("/app/web");
        spyIndex = mock.stub(cache, "index");
        spyWatchFS = mock.stub(_internals, "watchFs", (_path: string | string[], _opts?: { recursive: boolean }) => {
          const entries: Deno.FsEvent[] = [
            {
              kind: "modify",
              paths: ["/app/web/file1.txt"],
            },
            {
              kind: "remove",
              paths: ["/app/web/subdir"],
            },
            {
              kind: "create",
              paths: ["/app/web/subdir/index.html"],
            },
          ];

          // deno-lint-ignore no-explicit-any
          const itr: any = (async function* () {
            for (const e of entries) {
              yield e;
            }
            
          })();
          itr[Symbol.dispose] = () => {};
          itr.close = () => {};

          return itr as Deno.FsWatcher;
        });
      });

      afterEach(() => {
        spyIndex.restore();
        spyWatchFS.restore();
      });

      it("starts the indexing", async () => {
        await cache.start();

        expect(spyIndex).to.have.been.called(1);
        expect(spyWatchFS).to.have.been.calledWith([
          "/app/web",
        ]);
      });
      it("stops the indexing", () => {
        const spyClose = mock.spy();

        Object.assign(cache, {
          watcher: {
            close: spyClose,
          },
        });
        cache.stop();

        expect(spyClose).to.have.been.called();
      });
    });

    describe(".find()", () => {
      let cache: FileCache;
      let spyFindEntry: mock.Spy;

      beforeEach(() => {
        cache = new FileCache("/app/web", {
          "/app/web/file1.txt": new FileEntry({
            path: "/app/web/file1.txt",
            type: "text/plain",
            size: 1000,
            createdAt: new Date(60000),
            modifiedAt: new Date(120000),
            etag: "0123456789abcdef",
          }),
          "/app/web/subdir": new FileEntry({
            path: "/app/web/subdir/index.html",
            type: "text/html",
            size: 1000,
            createdAt: new Date(60000),
            modifiedAt: new Date(120000),
            etag: "0123456789abcdef",
          }),
          "/app/web/subdir/index.html": new FileEntry({
            path: "/app/web/subdir/index.html",
            type: "text/html",
            size: 1000,
            createdAt: new Date(60000),
            modifiedAt: new Date(120000),
            etag: "0123456789abcdef",
          }),
        });

        spyFindEntry = mock.stub(_internals, "findEntry", (path: string) => {
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
        spyFindEntry.restore();
      });

      it("file path returns the cached entry", async () => {
        const result = await cache.find("/app/web/file1.txt");

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
        expect(result).to.equal(cache.files["/app/web/file1.txt"]);

        expect(spyFindEntry).to.not.have.been.called();
      });
      it("file path falls through entry find", async () => {
        const result = await cache.find("/app/web/file2.txt");

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
        expect(cache.files["/app/web/file2.txt"]).to.not.exist();

        expect(spyFindEntry).to.have.been.deep.calledWith([
          "/app/web/file2.txt",
        ]);
      });
    });
  });
});
