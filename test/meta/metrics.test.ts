import { StatusCode } from "../../src/constants.ts";
import { metrics, MetricsHandler } from "../../src/meta/metrics.ts";
import { beforeEach, describe, expect, it } from "../deps.ts";

describe("meta/metrics", () => {
  describe("MetricsHandler", () => {
    let server: MetricsHandler;

    beforeEach(() => {
      server = new MetricsHandler();
    });

    describe("ctor", () => {
      it("initializes", () => {
        expect(server.method).to.equal("GET");
        expect(server.path).to.equal("/metrics");
        expect(server.totalRequests.description).to.equal(
          "serveit_requests_total",
        );
        expect(server.totalResponses.description).to.equal(
          "serveit_responses_total",
        );
      });
    });

    describe(".open()", () => {
      it("returns the same instance every time", () => {
        const result = MetricsHandler.open();
        expect(result).to.exist();
        expect(MetricsHandler.open()).to.equal(result);
      });
    });

    describe("handle()", () => {
      it("responds with empty when no recorded metrics", async () => {
        const req = new Request(new URL("http://example.com:12676/metrics"));
        const rsp = await server.handle(req);

        expect(rsp.status).to.equal(StatusCode.Ok);
        expect(rsp.headers.get("Content-Type")).to.equal("text/plain");
        expect(rsp.headers.get("Content-Length")).to.equal("0");

        const text = await rsp.text();
        expect(text).to.equal("");
      });

      it("responds with recorded metrics", async () => {
        server.totalRequests.labels({
          "method": "GET",
          "path": "/",
        }).inc();
        server.totalResponses.labels({
          "status": "200",
          "path": "/",
        }).inc();

        const req = new Request(new URL("http://example.com:12676/metrics"));
        const rsp = await server.handle(req);

        expect(rsp.status).to.equal(200);
        expect(rsp.headers.get("Content-Type")).to.equal("text/plain");
        //expect(rsp.headers.get("Content-Length")).to.equal("301");

        const text = await rsp.text();
        expect(text).to.equal(
          `# HELP serveit_requests_total total number of requests received
# TYPE serveit_requests_total counter
serveit_requests_total{method="GET",path="/"} 1

# HELP serveit_responses_total total number of responses sent
# TYPE serveit_responses_total counter
serveit_responses_total{path="/",status="200"} 1
`,
        );
      });
    });
  });

  describe("metrics()", () => {
    it("returns the Metrics", () => {
      const result = metrics();
      expect(result.totalRequests).to.exist();
      expect(result.totalResponses).to.exist();
    });
  });
});
