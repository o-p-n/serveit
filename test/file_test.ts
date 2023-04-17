/**
 * @copyright 2023 Matthew A. Miller
 */

import { afterEach, beforeEach, describe, it } from "test/bdd";
import { FakeTime } from "test/fake_time";
import { expect, mock } from "./setup.ts";

import { FileEntry, find } from "../src/file.ts";

const FILE_INFO_DEFAULTS: Deno.FileInfo = {
  isFile: false,
  isDirectory: false,
  isSymlink: false,
  size: 0,
  dev: 0,
  ino: null,
  mode: null,
  nlink: null,
  uid: null,
  gid: null,
  rdev: null,
  blksize: null,
  blocks: null,
  birthtime: null,
  mtime: null,
  atime: null,
};

class MockFsFile extends Deno.FsFile {
  readonly readable: ReadableStream<Uint8Array>;

  constructor(readable: ReadableStream<Uint8Array>) {
    super(0);
    this.readable = readable;
  }
}

function createMockFsFile(data: string): MockFsFile {
  const bytes = new TextEncoder().encode(data);
  const readable = new ReadableStream({
    start(ctrl) {
      ctrl.enqueue(bytes);
    },
  });
  return new MockFsFile(readable);
}

describe("file", () => {
  const seed = new Date("2023-01-26T01:23:45.678Z");
  let clock: FakeTime;

  describe("find()", () => {
    let stubStat: mock.Stub | undefined = undefined;

    beforeEach(() => {
      clock = new FakeTime(seed);
    });

    afterEach(() => {
      clock.restore();
      if (stubStat) {
        stubStat.restore();
        stubStat = undefined;
      }
    });

    it("returns for a specific file with all details", async () => {
      const createdAt = new Date("2023-01-01T12:34:56.789Z");
      const modifiedAt = new Date("2023-01-15T23:45:43.210Z");
      stubStat = mock.stub(Deno, "stat", (_: string | URL) =>
        Promise.resolve({
          ...FILE_INFO_DEFAULTS,
          isFile: true,
          size: 500,
          birthtime: createdAt,
          mtime: modifiedAt,
        }));

      const result = await find("somefile.txt");
      const expected = new FileEntry({
        path: "somefile.txt",
        type: "text/plain",
        size: 500,
        createdAt,
        modifiedAt,
        etag:
          "W/abe1e47f94c47d425120b2bca9cb3b8c8912620966cff3942585fdf45d9342ef",
      });
      expect(result).to.deep.equal(expected);
    });
    it("returns for a specific file with missing dates", async () => {
      const createdAt = new Date(seed.getTime());
      const modifiedAt = new Date(seed.getTime());
      stubStat = mock.stub(Deno, "stat", (_: string | URL) =>
        Promise.resolve({
          ...FILE_INFO_DEFAULTS,
          isFile: true,
          size: 500,
        }));

      const result = await find("somefile.txt");
      const expected = new FileEntry({
        path: "somefile.txt",
        type: "text/plain",
        size: 500,
        createdAt,
        modifiedAt,
        etag:
          "W/e0492a83f5c73613ad84edd3c8a1469c75d7ef4bc6cdc51a3028bc3857a0eaa6",
      });
      expect(result).to.deep.equal(expected);
    });
    it("returns for a file without a known media type", async () => {
      const createdAt = new Date("2023-01-01T12:34:56.789Z");
      const modifiedAt = new Date("2023-01-15T23:45:43.210Z");
      stubStat = mock.stub(Deno, "stat", (_: string | URL) =>
        Promise.resolve({
          ...FILE_INFO_DEFAULTS,
          isFile: true,
          size: 500,
          birthtime: createdAt,
          mtime: modifiedAt,
        }));

      const result = await find("somefile");
      const expected = new FileEntry({
        path: "somefile",
        type: "text/plain",
        size: 500,
        createdAt,
        modifiedAt,
        etag:
          "W/6526a88e4a2e9d9b2122669164f2827aa2b773873dfd8fac1dac87efa7a3b830",
      });
      expect(result).to.deep.equal(expected);
    });
    it("returns index.html for directory", async () => {
      const createdAt = new Date("2023-01-01T12:34:56.789Z");
      const modifiedAt = new Date("2023-01-15T23:45:43.210Z");
      stubStat = mock.stub(Deno, "stat", (path: string | URL) => {
        path = path.toString();
        if (path.endsWith("/index.html")) {
          return Promise.resolve({
            ...FILE_INFO_DEFAULTS,
            isFile: true,
            size: 500,
            birthtime: createdAt,
            mtime: modifiedAt,
          });
        }
        return Promise.resolve({
          ...FILE_INFO_DEFAULTS,
          isDirectory: true,
        });
      });

      const result = await find("somedir");
      const expected = new FileEntry({
        path: "somedir/index.html",
        type: "text/html",
        size: 500,
        createdAt,
        modifiedAt,
        etag:
          "W/e0e37e2c280a813cc27b3e9d0804da1dd367e13738047baed735db359b3a0740",
      });
      expect(result).to.deep.equal(expected);
      expect(stubStat).to.be.called(2);
      expect(stubStat).to.be.calledWith(["somedir"])
        .and.be.calledWith(["somedir/index.html"]);
    });
    it("throws an error for file not found", async () => {
      stubStat = mock.stub(
        Deno,
        "stat",
        (_: string | URL) => Promise.reject(new Deno.errors.NotFound()),
      );

      await expect(find("somefile.txt")).to.be.rejected();
    });
    it("throws an error for index.html not found on directory", async () => {
      stubStat = mock.stub(Deno, "stat", (path: string | URL) => {
        path = path.toString();
        if (path.endsWith("/index.html")) {
          return Promise.reject(new Deno.errors.NotFound());
        }
        return Promise.resolve({
          ...FILE_INFO_DEFAULTS,
          isDirectory: true,
        });
      });

      await expect(find("somedir")).to.be.rejected();
      expect(stubStat).to.be.called(2)
        .and.calledWith(["somedir"])
        .and.calledWith(["somedir/index.html"]);
    });
    it("throws an error on symlink", async () => {
      stubStat = mock.stub(Deno, "stat", (_: string | URL) =>
        Promise.resolve({
          ...FILE_INFO_DEFAULTS,
          isSymlink: true,
          size: 500,
        }));

      await expect(find("somefile.txt")).to.be.rejected();
    });
  });

  describe("FileEntry", () => {
    describe(".open()", () => {
      const entry = new FileEntry({
        path: "sometext.txt",
        type: "text/plain",
        size: 25,
        createdAt: seed,
        modifiedAt: seed,
        etag: "0123456789abcdef",
      });
      let stubOpen: mock.Stub | undefined = undefined;

      afterEach(() => {
        if (stubOpen) {
          stubOpen.restore();
          stubOpen = undefined;
        }
      });

      it("returns a readable stream", async () => {
        stubOpen = mock.stub(
          Deno,
          "open",
          () => Promise.resolve(createMockFsFile("this is the file contents")),
        );
        const _result = await entry.open();
        expect(stubOpen).to.have.been.deep.calledWith(["sometext.txt", {
          read: true,
          write: false,
        }]);
      });
    });
  });
});
