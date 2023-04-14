/**
 * @copyright 2023 Matthew A. Miller
 */

import { afterEach, beforeEach, describe, it } from "../deps/test/bdd.ts";
import { FakeTime } from "../deps/test/fake_time.ts";
import { readableStreamFromReader } from "../deps/test/streams.ts";
import { StringReader } from "../deps/test/io.ts";
import { expect, mock } from "../deps/test/expecto.ts";

import { Handler, ServeInit, Status } from "../deps/src/http.ts";
import { FileEntry } from "../src/file.ts";

import { Server, _internal, DEFAULT_SERVEINIT } from "../src/server.ts";

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

    describe(".handle()", () => {
      const server = new Server("root");

      let stubLookup: mock.Stub | undefined = undefined;

      function makeResponse(etag?: string): Response {
        const data = "fake data";
        const headers: Record<string, string> = {
          "Content-Type": "text/plain",
          "Content-Length": data.length.toString(),
          "ETag": etag || "fake-generated-etag",
        }
        const rsp = new Response(data, {
          status: Status.OK,
          headers,
        });
        stubLookup = mock.stub(server, "lookup", (_src: string, _etag?: string) => Promise.resolve(rsp));

        return rsp
      }

      afterEach(() => {
        stubLookup?.restore();
        stubLookup = undefined;
      });

      it("returns the lookup's response on GET", async () => {
        const rsp = makeResponse("fake-etag");

        const req = new Request(new URL("http://example.com/path"), {
          headers: {
            "ETag": "fake-etag",
          } as Record<string, string>,
        });
        const result = await server.handle(req);
        expect(result).to.deep.equal(rsp);

        expect(stubLookup).to.have.been.calledWith(["/path", "fake-etag"]);
      });
      it("returns the lookup's response on GET, no request etag", async () => {
        const rsp = makeResponse();

        const req = new Request(new URL("http://example.com/path"));
        const result = await server.handle(req);
        expect(result).to.deep.equal(rsp);

        expect(stubLookup).to.have.been.calledWith(["/path", undefined]);
      });
      it("returns NotFound on lookup error", async () => {
        stubLookup = mock.stub(server, "lookup", (_src: string, _etag?: string) => {
          return Promise.reject(new Error());
        });

        const req = new Request(new URL("http://example.com/path"));
        const result = await server.handle(req);
        expect(result.status).to.equal(Status.NotFound);

        expect(stubLookup).to.have.been.calledWith(["/path", undefined]);
      });
      it("returns MethodNotAllowed on anything other than GET", async () => {
        stubLookup = mock.stub(server, "lookup", (_src: string, _etag?: string) => {
          return Promise.reject(new Error());
        });

        const req = new Request(new URL("http://example.com/path"), {
          method: "POST",
        });
        const result = await server.handle(req);
        expect(result.status).to.equal(Status.MethodNotAllowed);

        expect(stubLookup).to.be.called(0);
      });
    });

    describe(".serve()", () => {
      const server = new Server("root");

      let stubServe: mock.Stub | undefined = undefined;

      afterEach(() => {
        stubServe?.restore();
        stubServe = undefined;
      });

      beforeEach(() => {
        stubServe = mock.stub(_internal, "serve", (_handler: Handler, options?: ServeInit) => {
          const onListen = options?.onListen;
          onListen && onListen({ port: options?.port ?? 4000, hostname: options?.hostname ?? "example.com"});
          return Promise.resolve();
        });
      });

      it("serves with default settings", () => {
        server.serve();
        expect(stubServe).to.have.been.deep.calledWith([server.handle, DEFAULT_SERVEINIT])
      });
      it("serves with an AbortController", () => {
        const abort = new AbortController();
        const signal = abort.signal;
        server.serve({
          signal,
        });
        expect(stubServe).to.have.been.deep.calledWith([server.handle, {
          ...DEFAULT_SERVEINIT,
          signal,
        }]);
      });
    });
  });
});
