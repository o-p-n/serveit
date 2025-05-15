import { afterEach, beforeEach, describe, expect, it, mock } from "./deps.ts";
import { BoundSpy, createBoundSpy } from "./bound-spy.ts";

import { typeByExtension } from "@std/media-types";
import { NotFound } from "../src/errors.ts";
import { FileEntry } from "../src/file-entry.ts";

import { DEFAULT_CONFIG } from "../src/config.ts";
import log from "../src/logger.ts";
import { Server } from "../src/file-server.ts";
import { extname } from "@std/path";

import { metrics } from "../src/meta/metrics.ts";
import { Counter, Metric } from "@wok/prometheus";

const DEFAULT_CONTENT = ReadableStream.from([new Uint8Array()]);
function createEntry(path: string) {
  const type = typeByExtension(extname(path)) || "text/plain";
  const entry = new FileEntry({
    path,
    type,
    size: 1000,
    createdAt: new Date(60000),
    modifiedAt: new Date(120000),
    etag: "qwerty",
  });

  mock.stub(entry, "open", () => Promise.resolve(DEFAULT_CONTENT));

  return entry;
}

describe("file-server", () => {
  const logger = log();

  describe("Server", () => {
    const abort = new AbortController();
    const server = new Server({
      ...DEFAULT_CONFIG,
      rootDir: "/root/app",
      signal: abort.signal,
    });

    describe("ctor", () => {
      it("saves the config", () => {
        expect(server.rootDir).to.equal("/root/app");
        expect(server.port).to.equal(4000);
      });
    });

    describe("serve()", () => {
      let spyLogInfo: mock.Spy;

      let spyServe: mock.Spy;
      let spyHandle: mock.Spy;
      let spyError: mock.Spy;

      beforeEach(() => {
        spyLogInfo = mock.spy(logger, "info");

        spyServe = mock.stub(Deno, "serve", (_) =>
          ({
            finished: Promise.resolve(),
            addr: {
              transport: "tcp",
              hostname: "0.0.0.0",
              port: 4000,
            },
            ref: () => {},
            unref: () => {},
            shutdown: () => Promise.resolve(),
          }) as Deno.HttpServer<Deno.NetAddr>);
        spyHandle = mock.stub(Object.getPrototypeOf(server), "handle");
        spyError = mock.stub(Object.getPrototypeOf(server), "error");
      });
      afterEach(() => {
        spyLogInfo.restore();

        spyServe.restore();
        spyHandle.restore();
        spyError.restore();
      });

      it("runs the server", async () => {
        await server.serve();
        expect(spyLogInfo).to.have.been.deep.calledWith([
          ["stopped serving ", " at ", ":", ""],
          "/root/app",
          "0.0.0.0",
          4000,
        ]);

        const args = spyServe.calls[0].args;
        expect(args.length).to.equal(1);

        const opts = args[0];
        expect(opts.handler).to.exist();
        expect(opts.onListen).to.exist();
        expect(opts.onError).to.exist();
        expect(opts.port).to.equal(4000);
        expect(opts.signal).to.equal(abort.signal);

        opts.handler();
        expect(spyHandle).to.have.been.called();

        opts.onError();
        expect(spyError).to.have.been.called();

        opts.onListen({
          transport: "tcp",
          hostname: "0.0.0.0",
          port: 4000,
        });
        expect(spyLogInfo).to.have.been.deep.calledWith([
          ["now serving directory ", " at ", ":", ""],
          "/root/app",
          "0.0.0.0",
          4000,
        ]);
      });
    });

    describe("error()", () => {
      let spyError: BoundSpy<(err: Error) => Response>;

      beforeEach(() => {
        spyError = createBoundSpy(server, "error");
      });
      afterEach(() => {
        spyError.spy.restore();
      });

      it("generates a response from a HttpError", () => {
        const err = new NotFound();
        const result: Response = spyError.call(err);
        expect(result.status).to.equal(404);
        expect(result.statusText).to.equal("not found");
      });
      it("generates a InternalServerError from any other error", () => {
        const err = new TypeError("not a HttpError");
        const result: Response = spyError.call(err);
        expect(result.status).to.equal(500);
        expect(result.statusText).to.equal("internal server error");
      });
    });

    describe("lookup()", () => {
      let spyFind: mock.Spy;
      let spyLookup: BoundSpy<
        (path: string, etags?: string, preview?: boolean) => Promise<Response>
      >;

      beforeEach(() => {
        spyFind = mock.stub(
          FileEntry,
          "find",
          (path: string): Promise<FileEntry> => {
            switch (path) {
              case "/root/app":
                return Promise.resolve(createEntry(path + "/index.html"));
              case "/root/app/file.txt":
                return Promise.resolve(createEntry(path));
            }

            return Promise.reject(new NotFound());
          },
        );

        spyLookup = createBoundSpy(server, "lookup");
      });
      afterEach(() => {
        spyFind.restore();
        spyLookup.spy.restore();
      });

      it("return a 200 ok for a file (GET)", async () => {
        const rsp = await spyLookup.call("file.txt", undefined, false);
        expect(rsp.status).to.equal(200);
        expect(rsp.headers.get("Content-Type")).to.equal("text/plain");
        expect(rsp.headers.get("Content-Length")).to.equal("1000");
        expect(rsp.headers.get("Date")).to.equal(
          new Date(120000).toUTCString(),
        );
        expect(rsp.headers.get("ETag")).to.equal('"qwerty"');
        expect(rsp.body).to.equal(DEFAULT_CONTENT);
      });
      it("returns a 200 ok for a file (HEAD)", async () => {
        const rsp = await spyLookup.call("file.txt", undefined, true);
        expect(rsp.status).to.equal(200);
        expect(rsp.headers.get("Content-Type")).to.equal("text/plain");
        expect(rsp.headers.get("Content-Length")).to.equal("1000");
        expect(rsp.headers.get("Date")).to.equal(
          new Date(120000).toUTCString(),
        );
        expect(rsp.headers.get("ETag")).to.equal('"qwerty"');
        expect(rsp.body).to.be.null();
      });
      it("returns a 304 for matching etag (GET)", async () => {
        const rsp = await spyLookup.call("file.txt", '"qwerty"', false);
        expect(rsp.status).to.equal(304);
        expect(rsp.headers.get("Content-Type")).to.equal("text/plain");
        expect(rsp.headers.get("Content-Length")).to.equal("1000");
        expect(rsp.headers.get("Date")).to.equal(
          new Date(120000).toUTCString(),
        );
        expect(rsp.headers.get("ETag")).to.equal('"qwerty"');
        expect(rsp.body).to.be.null();
      });
      it("returns a 304 for matching etag (HEAD)", async () => {
        const rsp = await spyLookup.call("file.txt", '"qwerty"', true);
        expect(rsp.status).to.equal(304);
        expect(rsp.headers.get("Content-Type")).to.equal("text/plain");
        expect(rsp.headers.get("Content-Length")).to.equal("1000");
        expect(rsp.headers.get("Date")).to.equal(
          new Date(120000).toUTCString(),
        );
        expect(rsp.headers.get("ETag")).to.equal('"qwerty"');
        expect(rsp.body).to.be.null();
      });
      it("returns a 404 for path outside of root (GET)", async () => {
        const rsp = await spyLookup.call(
          "../hacked/file.txt",
          '"qwerty"',
          false,
        );
        expect(rsp.status).to.equal(404);
      });
      it("returns a 404 for path outside of root (HEAD)", async () => {
        const rsp = await spyLookup.call(
          "../hacked/file.txt",
          '"qwerty"',
          true,
        );
        expect(rsp.status).to.equal(404);
      });
    });

    describe("handle()", () => {
      let spyLogInfo: mock.Spy;
      let spyLookup: mock.Spy;
      let spyMetricLabels: mock.Spy;
      let spyMetricCount: mock.Spy;
      let spyHandle: BoundSpy<(req: Request) => Promise<Response>>;

      beforeEach(() => {
        const labelResult = {
          inc() { return 0; },
          value() { return 0; },
        };
        spyMetricCount = mock.stub(labelResult, "inc");
        spyMetricLabels = mock.stub(Counter.prototype, "labels", (_) => labelResult);

        spyLogInfo = mock.spy(logger, "info");

        const fnLookup = (path: string, etags?: string): Promise<Response> => {
          const [status, statusText] = (etags === '"qwerty"')
            ? [304, "not modified"]
            : [200, "OK"];

          switch (path) {
            case "/file.txt":
              return Promise.resolve(
                new Response(undefined, {
                  status,
                  statusText,
                  headers: {
                    "Content-Type": "text/plain",
                    "Content-Length": "1000",
                    "ETag": '"qwerty"',
                  },
                }),
              );
            case "/":
              return Promise.resolve(
                new Response(undefined, {
                  status,
                  statusText,
                  headers: {
                    "Content-Type": "text/html",
                    "Content-Length": "1000",
                    "ETag": '"qwerty"',
                  },
                }),
              );
          }
          return Promise.reject(new NotFound());
        };

        spyLookup = mock.stub(
          Object.getPrototypeOf(server),
          "lookup",
          fnLookup as (...args: unknown[]) => unknown,
        );

        spyHandle = createBoundSpy(server, "handle");
      });
      afterEach(() => {
        spyLogInfo.restore();
        spyLookup.restore();
        spyMetricLabels.restore();
        spyMetricCount.restore();
        spyHandle.spy.restore();
      });

      it("handles a disallowed method", async () => {
        const req = new Request(new URL("https://example.com/file.txt"), {
          method: "DELETE",
        });
        const rsp = await spyHandle.call(req);

        expect(rsp.status).to.equal(405);
        expect(rsp.statusText).to.equal("method not allowed");

        expect(spyLookup).to.have.not.been.called();

        expect(spyLogInfo).to.have.been.deep.calledWith([
          ["", " ", " - ", " ", ""],
          "DELETE",
          "/file.txt",
          405,
          "0",
        ]);

        expect(spyMetricLabels).to.have.been.deep.calledWith([
          {
            method: "DELETE",
            path: "/file.txt",
          },
        ]);
        expect(spyMetricLabels).to.have.been.deep.calledWith([
          {
            path: "/file.txt",
            status: "405",
          },
        ]);
        expect(spyMetricCount).to.have.been.called(2);
      });

      it("handles an OPTIONS request", async () => {
        const req = new Request(new URL("https://example.com/"), {
          method: "OPTIONS",
        });
        const rsp = await spyHandle.call(req);

        expect(rsp.status).to.equal(204);
        expect(rsp.headers.get("Allow")).to.equal("GET, HEAD, OPTIONS");

        expect(spyLookup).to.not.have.been.called();

        expect(spyLogInfo).to.have.been.deep.calledWith([
          ["", " ", " - ", " ", ""],
          "OPTIONS",
          "/",
          204,
          "0",
        ]);

        expect(spyMetricLabels).to.have.been.deep.calledWith([
          {
            method: "OPTIONS",
            path: "/",
          },
        ]);
        expect(spyMetricLabels).to.have.been.deep.calledWith([
          {
            status: "204",
            path: "/",
          },
        ]);
        expect(spyMetricCount).to.have.been.called(2);
      });

      describe("GET requests", () => {
        it("handles a GET of known file path", async () => {
          const req = new Request(new URL("https://example.com/file.txt"), {
            method: "GET",
          });
          const rsp = await spyHandle.call(req);

          expect(rsp.status).to.equal(200);
          expect(rsp.statusText).to.equal("OK");
          expect(rsp.headers.get("Content-Type")).to.equal("text/plain");
          expect(rsp.headers.get("Content-Length")).to.equal("1000");
          expect(rsp.headers.get("ETag")).to.equal('"qwerty"');

          expect(spyLookup).to.have.been.deep.calledWith([
            "/file.txt",
            undefined,
            false,
          ]);

          expect(spyLogInfo).to.have.been.deep.calledWith([
            ["", " ", " - ", " ", ""],
            "GET",
            "/file.txt",
            200,
            "1000",
          ]);

          expect(spyMetricLabels).to.have.been.deep.calledWith([
            {
              method: "GET",
              path: "/file.txt",
            },
          ]);
          expect(spyMetricLabels).to.have.been.deep.calledWith([
            {
              path: "/file.txt",
              status: "200",
            },
          ]);
          expect(spyMetricCount).to.have.been.called(2);
        });
        it("handles a GET of a known file path w/ mismatch ETag", async () => {
          const req = new Request(new URL("https://example.com/file.txt"), {
            method: "GET",
            headers: {
              "If-None-Match": '"asdf"',
            },
          });
          const rsp = await spyHandle.call(req);

          expect(rsp.status).to.equal(200);
          expect(rsp.statusText).to.equal("OK");
          expect(rsp.headers.get("Content-Type")).to.equal("text/plain");
          expect(rsp.headers.get("Content-Length")).to.equal("1000");
          expect(rsp.headers.get("ETag")).to.equal('"qwerty"');

          expect(spyLookup).to.have.been.deep.calledWith([
            "/file.txt",
            '"asdf"',
            false,
          ]);

          expect(spyLogInfo).to.have.been.deep.calledWith([
            ["", " ", " - ", " ", ""],
            "GET",
            "/file.txt",
            200,
            "1000",
          ]);

          expect(spyMetricLabels).to.have.been.deep.calledWith([
            {
              method: "GET",
              path: "/file.txt",
            },
          ]);
          expect(spyMetricLabels).to.have.been.deep.calledWith([
            {
              path: "/file.txt",
              status: "200",
            },
          ]);
          expect(spyMetricCount).to.have.been.called(2);
        });
        it("handles a GET of a known file path w/ matching ETag", async () => {
          const req = new Request(new URL("https://example.com/file.txt"), {
            method: "GET",
            headers: {
              "If-None-Match": '"qwerty"',
            },
          });
          const rsp = await spyHandle.call(req);

          expect(rsp.status).to.equal(304);
          expect(rsp.statusText).to.equal("not modified");
          expect(rsp.headers.get("Content-Type")).to.equal("text/plain");
          expect(rsp.headers.get("Content-Length")).to.equal("1000");
          expect(rsp.headers.get("ETag")).to.equal('"qwerty"');

          expect(spyLookup).to.have.been.deep.calledWith([
            "/file.txt",
            '"qwerty"',
            false,
          ]);

          expect(spyLogInfo).to.have.been.deep.calledWith([
            ["", " ", " - ", " ", ""],
            "GET",
            "/file.txt",
            304,
            "1000",
          ]);

          expect(spyMetricLabels).to.have.been.deep.calledWith([
            {
              method: "GET",
              path: "/file.txt",
            },
          ]);
          expect(spyMetricLabels).to.have.been.deep.calledWith([
            {
              path: "/file.txt",
              status: "304",
            },
          ]);
          expect(spyMetricCount).to.have.been.called(2);
        });
        it("handles a GET of a known directory path", async () => {
          const req = new Request(new URL("https://example.com/"), {
            method: "GET",
          });
          const rsp = await spyHandle.call(req);

          expect(rsp.status).to.equal(200);
          expect(rsp.statusText).to.equal("OK");
          expect(rsp.headers.get("Content-Type")).to.equal("text/html");
          expect(rsp.headers.get("Content-Length")).to.equal("1000");
          expect(rsp.headers.get("ETag")).to.equal('"qwerty"');

          expect(spyLookup).to.have.been.deep.calledWith([
            "/",
            undefined,
            false,
          ]);

          expect(spyLogInfo).to.have.been.deep.calledWith([
            ["", " ", " - ", " ", ""],
            "GET",
            "/",
            200,
            "1000",
          ]);

          expect(spyMetricLabels).to.have.been.deep.calledWith([
            {
              method: "GET",
              path: "/",
            },
          ]);
          expect(spyMetricLabels).to.have.been.deep.calledWith([
            {
              path: "/",
              status: "200",
            },
          ]);
          expect(spyMetricCount).to.have.been.called(2);
        });
        it("handles a GET of an unknown path", async () => {
          const req = new Request(new URL("https://example.com/unknown.txt"), {
            method: "GET",
          });
          const rsp = await spyHandle.call(req);

          expect(rsp.status).to.equal(404);
          expect(rsp.statusText).to.equal("not found");

          expect(spyLookup).to.have.been.deep.calledWith([
            "/unknown.txt",
            undefined,
            false,
          ]);

          expect(spyLogInfo).to.have.been.deep.calledWith([
            ["", " ", " - ", " ", ""],
            "GET",
            "/unknown.txt",
            404,
            "0",
          ]);

          expect(spyMetricLabels).to.have.been.deep.calledWith([
            {
              method: "GET",
              path: "/unknown.txt",
            },
          ]);
          expect(spyMetricLabels).to.have.been.deep.calledWith([
            {
              path: "/unknown.txt",
              status: "404",
            },
          ]);
          expect(spyMetricCount).to.have.been.called(2);
        });
      });

      describe("HEAD requests", () => {
        it("handles a HEAD  of a known file path", async () => {
          const req = new Request(new URL("https://example.com/file.txt"), {
            method: "HEAD",
          });
          const rsp = await spyHandle.call(req);

          expect(rsp.status).to.equal(200);
          expect(rsp.statusText).to.equal("OK");
          expect(rsp.headers.get("Content-Type")).to.equal("text/plain");
          expect(rsp.headers.get("Content-Length")).to.equal("1000");
          expect(rsp.headers.get("ETag")).to.equal('"qwerty"');

          expect(spyLookup).to.have.been.deep.calledWith([
            "/file.txt",
            undefined,
            true,
          ]);

          expect(spyLogInfo).to.have.been.deep.calledWith([
            ["", " ", " - ", " ", ""],
            "HEAD",
            "/file.txt",
            200,
            "1000",
          ]);
        });
        it("handles a HEAD  of a known file path w/ mismatch ETag", async () => {
          const req = new Request(new URL("https://example.com/file.txt"), {
            method: "HEAD",
            headers: {
              "If-None-Match": '"asdf"',
            },
          });
          const rsp = await spyHandle.call(req);

          expect(rsp.status).to.equal(200);
          expect(rsp.statusText).to.equal("OK");
          expect(rsp.headers.get("Content-Type")).to.equal("text/plain");
          expect(rsp.headers.get("Content-Length")).to.equal("1000");
          expect(rsp.headers.get("ETag")).to.equal('"qwerty"');

          expect(spyLookup).to.have.been.deep.calledWith([
            "/file.txt",
            '"asdf"',
            true,
          ]);

          expect(spyLogInfo).to.have.been.deep.calledWith([
            ["", " ", " - ", " ", ""],
            "HEAD",
            "/file.txt",
            200,
            "1000",
          ]);
        });
        it("handles a HEAD  of a known file path w/ matching ETag", async () => {
          const req = new Request(new URL("https://example.com/file.txt"), {
            method: "HEAD",
            headers: {
              "If-None-Match": '"qwerty"',
            },
          });
          const rsp = await spyHandle.call(req);

          expect(rsp.status).to.equal(304);
          expect(rsp.statusText).to.equal("not modified");
          expect(rsp.headers.get("Content-Type")).to.equal("text/plain");
          expect(rsp.headers.get("Content-Length")).to.equal("1000");
          expect(rsp.headers.get("ETag")).to.equal('"qwerty"');

          expect(spyLookup).to.have.been.deep.calledWith([
            "/file.txt",
            '"qwerty"',
            true,
          ]);

          expect(spyLogInfo).to.have.been.deep.calledWith([
            ["", " ", " - ", " ", ""],
            "HEAD",
            "/file.txt",
            304,
            "1000",
          ]);
        });
        it("handles a HEAD  of a known directory path", async () => {
          const req = new Request(new URL("https://example.com/"), {
            method: "HEAD",
          });
          const rsp = await spyHandle.call(req);

          expect(rsp.status).to.equal(200);
          expect(rsp.statusText).to.equal("OK");
          expect(rsp.headers.get("Content-Type")).to.equal("text/html");
          expect(rsp.headers.get("Content-Length")).to.equal("1000");
          expect(rsp.headers.get("ETag")).to.equal('"qwerty"');

          expect(spyLookup).to.have.been.deep.calledWith([
            "/",
            undefined,
            true,
          ]);

          expect(spyLogInfo).to.have.been.deep.calledWith([
            ["", " ", " - ", " ", ""],
            "HEAD",
            "/",
            200,
            "1000",
          ]);
        });
        it("handles a HEAD of an unknown path", async () => {
          const req = new Request(new URL("https://example.com/unknown.txt"), {
            method: "HEAD",
          });
          const rsp = await spyHandle.call(req);

          expect(rsp.status).to.equal(404);
          expect(rsp.statusText).to.equal("not found");

          expect(spyLookup).to.have.been.deep.calledWith([
            "/unknown.txt",
            undefined,
            true,
          ]);

          expect(spyLogInfo).to.have.been.deep.calledWith([
            ["", " ", " - ", " ", ""],
            "HEAD",
            "/unknown.txt",
            404,
            "0",
          ]);
        });
      });
    });
  });
});
