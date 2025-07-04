import { StatusCode } from "../../src/constants.ts";
import { health, HealthHandler } from "../../src/meta/health.ts";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  FakeTime,
  it,
} from "../deps.ts";

describe("meta/health", () => {
  const seedTime = new Date(1234567890);

  let clock: FakeTime;

  beforeEach(() => {
    clock = new FakeTime(seedTime);
  });
  afterEach(() => {
    clock.restore();
  });

  describe("HealthHandler", () => {
    let health: HealthHandler;

    beforeEach(() => {
      health = new HealthHandler();
    });

    describe("ctor", () => {
      it("properties with expected values", () => {
        expect(health.method).to.equal("GET");
        expect(health.path).to.equal("/health");
        expect(health.started).to.equal(seedTime.getTime());
      });
    });

    describe("handle()", () => {
      it("responds with unhealthy stats", async () => {
        const req = new Request(new URL("http://example.com:9090/health"));

        clock.tick(1000);
        const rsp = await health.handle(req);

        expect(rsp.status).to.equal(StatusCode.Ok);
        expect(rsp.headers.get("Content-Type")).to.equal("application/json");
        expect(rsp.headers.get("Content-Length")).to.equal("31");

        const body = await rsp.json();
        expect(body).to.deep.equal({
          healthy: false,
          uptime: 1000,
        });
      });
      it("responds with healthy stats", async () => {
        const req = new Request(new URL("http://example.com:9090/health"));
        health.update(true);

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

  describe("health()", () => {
    it("returns the Health", () => {
      const result = health();
      expect(result.healthy).to.exist();
      expect(result.uptime).to.exist();
      expect(result.update).to.exist();

      result.update(true);
      expect(result.healthy).to.be.true();
      result.update(false);
      expect(result.healthy).to.be.false();
    });
  });
});
