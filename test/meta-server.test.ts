import { afterEach, beforeEach, describe, expect, FakeTime, it, mock } from "./deps.ts";
import { BoundSpy, createBoundSpy } from "./bound-spy.ts";

import log from "../src/logger.ts";
import { MetaServer } from "../src/meta-server.ts";
import { DEFAULT_CONFIG } from "../src/config.ts";
import { NotFound } from "../src/errors.ts";

describe("meta-server", () => {
  const logger = log();
  const seedTime = new Date();

  let clock: FakeTime;

  beforeEach(() => {
    clock = new FakeTime(seedTime);
  });
  afterEach(() => {
    clock.restore();
  });
  
  describe("MetaServer", () => {
    const abort = new AbortController();
 
    let server: MetaServer;

    beforeEach(() => {
      server = new MetaServer({
        ...DEFAULT_CONFIG,
        rootDir: "/root/app",
        signal: abort.signal,
      });
    });

    describe("ctor", () => {
      it("saves the config", () => {
        expect(server.metaPort).to.equal(12676);
      });
    });

    describe("serve()", () => {
      let spyLogInfo: mock.Spy;

      let spyServe: mock.Spy;
      let spyHandle: mock.Spy;
      let spyError: mock.Spy;

      beforeEach(() => {
        spyLogInfo = mock.spy(logger, "info");

        spyServe = mock.stub(Deno, "serve", (_) => ({
          finished: Promise.resolve(),
          addr: {
            transport: "tcp",
            hostname: "0.0.0.0",
            port: 12676,
          },
          ref: () => {},
          unref: () => {},
          shutdown: () => Promise.resolve(),
        }) as Deno.HttpServer<Deno.NetAddr>);
        spyHandle = mock.stub(Object.getPrototypeOf(server), "handle");
        spyError = mock.stub(Object.getPrototypeOf(server), "error");
      });
      afterEach(() => {
        for (const spy of [ spyLogInfo, spyServe, spyHandle, spyError ]) {
          spy.restore();
        }
      });

      it("runs the server", async () => {
        await server.serve();
        expect(spyLogInfo).to.have.been.deep.calledWith([
          ["stopped serving metainfo at ", ":", ""],
          "0.0.0.0",
          12676,
        ]);

        const args = spyServe.calls[0].args;
        expect(args.length).to.equal(1);

        const opts = args[0];
        expect(opts.handler).to.exist();
        expect(opts.onListen).to.exist();
        expect(opts.port).to.equal(12676);
        expect(opts.signal).to.equal(abort.signal);

        opts.handler();
        expect(spyHandle).to.have.been.called();

        opts.onError();
        expect(spyError).to.have.been.called();

        opts.onListen({
          transport: "tcp",
          hostname: "0.0.0.0",
          port: 12676,
        });
        expect(spyLogInfo).to.have.been.deep.calledWith([
          ["now serving metainfo at ", ":", ""],
          "0.0.0.0",
          12676,
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

    describe("handle()", () => {
      let spyHandle: BoundSpy<(req: Request) => Response>;
      let spyHealth: mock.Spy;

      beforeEach(() => {
        spyHandle = createBoundSpy(server, "handle");
        spyHealth = mock.stub(Object.getPrototypeOf(server), "health", (_) => new Response(null, {
          status: 200,
          statusText: "ok",
        }));
      });
      afterEach(() => {
        spyHandle.spy.restore();
        spyHealth.restore();
      });

      it("handls 'GET /health'", () => {
        const req = new Request("http://example.com:12676/health");
        spyHandle.call(req);

        expect(spyHealth).to.have.been.called();
      });

      it("returns 404 for unknown path", () => {
        const req = new Request("http://example.com:12676/not-a-path");
        const rsp = spyHandle.call(req);

        const expected = new NotFound();
        expect(rsp.status).to.equal(expected.code);
        expect(rsp.statusText).to.equal(expected.message);
      });
    });

    describe("meta endpoints", () => {
      describe("/health", () => {
        let spyHealth: BoundSpy<() => Response>;

        beforeEach(() => {
          spyHealth = createBoundSpy(server, "health");
        });
        afterEach(() => {
          spyHealth.spy.restore();
        });

        it("returns health stats", async () => {
          clock.tick(60000);
          const rsp = spyHealth.call();

          expect(rsp.status).to.equal(200);
          expect(rsp.headers.get("Content-Type")).to.equal("application/json");
          expect(rsp.headers.get("Content-Length")).to.equal("31");

          const body = await rsp.json();
          expect(body).to.deep.equal({
            healthy: true,
            uptime: 60000,
          });
        });
      });
    });
  });
});
