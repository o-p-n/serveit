
import { StatusCode } from "../../src/constants.ts";
import { Health } from "../../src/meta/health.ts";
import { afterEach, beforeEach, describe, expect, FakeTime, it } from "../deps.ts";

describe("meta/health", () => {
  const seedTime = new Date(1234567890);

  let clock: FakeTime;

  beforeEach(() => {
    clock = new FakeTime(seedTime);
  });
  afterEach(() => {
    clock.restore();
  });

  describe("Health", () => {
    let health: Health;

    beforeEach(() => {
      health = new Health();
    });

    describe("ctor", () => {
      it("properties with expected values", () => {
        expect(health.method).to.equal("GET");
        expect(health.path).to.equal("/health");
        expect(health.started).to.equal(seedTime.getTime());
      });
    });

    describe("handle()", () => {
      it("responds with healthy stats", async () => {
        const req = new Request(new URL("http://example.com:12676/health"));

        clock.tick(1000);
        const rsp = await health.handle(req);

        expect(rsp.status).to.equal(StatusCode.Ok);
        expect(rsp.headers.get("Content-Type")).to.equal("application/json");
        expect(rsp.headers.get("Content-Length")).to.equal("30");

        const body = await rsp.json();
        expect(body).to.deep.equal({
          healthy: true,
          uptime: 1000,
        });
      });
    });
  });
});
