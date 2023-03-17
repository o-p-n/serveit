/**
 * @copyright 2023 Matthew A. Miller
 */

import { afterEach, beforeEach, describe, it } from "../deps/test/bdd.ts";
import { FakeTime } from "../deps/test/fake_time.ts";
import { readableStreamFromReader } from "../deps/test/streams.ts";
import { StringReader } from "../deps/test/io.ts";
import { expect, mock } from "../deps/test/expecto.ts";

import { FileEntry } from "../src/file.ts";

import { Server, _internal } from "../src/server.ts";

describe("server", () => {
  class FakeFileEntry extends FileEntry {
    constructor(path: string) {
      super({
        path,
        type: "text/plain",
        size: 9,
        createdAt: new Date(seed),
        modifiedAt: new Date(seed),
        etag: "some-fake-etag",
      });
    }

    override open(): Promise<ReadableStream<Uint8Array>> {
      const reader = new StringReader("fake data");

      return Promise.resolve(readableStreamFromReader(reader));
    }
  }

  const seed = new Date("2023-01-26T01:23:45.678Z");
  let clock: FakeTime;

  beforeEach(() => {
    clock = new FakeTime(seed);
  });
  afterEach(() => {
    clock.restore();
  });

  describe("Server", () => {
    describe(".lookup()", () => {
      const server = new Server("root");

      let stubFind: mock.Stub | undefined = undefined;

      afterEach(() => {
        stubFind?.restore();
        stubFind = undefined;
      });

      it("returns a 200 with no etag", async () => {
        stubFind = mock.stub(_internal, "find", (path: string) => {
          return Promise.resolve(new FakeFileEntry(path));
        });

        const result = await server.lookup("somefile.txt");
        expect(result.status).to.equal(200);
        expect(result.headers.get("content-type")).to.equal("text/plain");
        expect(result.headers.get("etag")).to.equal("some-fake-etag");
        expect(stubFind).to.have.been.deep.calledWith(["root/somefile.txt"]);
      });

      it("returns a 200 on mismatched etag", async () => {
        stubFind = mock.stub(_internal, "find", (path: string) => {
          return Promise.resolve(new FakeFileEntry(path));
        });

        const result = await server.lookup("somefile.txt", "mismatched-etag");
        expect(result.status).to.equal(200);
        expect(result.headers.get("content-type")).to.equal("text/plain");
        expect(result.headers.get("etag")).to.equal("some-fake-etag");
        expect(stubFind).to.have.been.deep.calledWith(["root/somefile.txt"]);
      });

      it("returns a 304 on matching etag", async () => {
        stubFind = mock.stub(_internal, "find", (path: string) => {
          return Promise.resolve(new FakeFileEntry(path));
        });

        const result = await server.lookup("somefile.txt", "some-fake-etag");
        expect(result.status).to.equal(304);
        expect(result.headers.get("content-type")).to.equal("text/plain");
        expect(result.headers.get("etag")).to.equal("some-fake-etag");
        expect(stubFind).to.have.been.deep.calledWith(["root/somefile.txt"]);
      });
    });
  });
});
