import { afterEach, beforeEach, describe, it } from "./deps.ts";
import { expect, mock } from "./deps.ts";

import { resolve } from "@std/path";

import { _internals, DEFAULT_CONFIG, load } from "../src/config.ts";

class MockEnv implements Deno.Env {
  #data: Record<string, string>;

  constructor(data: Record<string, string> = {}) {
    this.#data = data;
  }

  get(key: string): string | undefined {
    return this.#data[key] ?? undefined;
  }

  set(key: string, value: string): void {
    this.#data[key] = value;
  }

  delete(key: string): void {
    delete this.#data[key];
  }

  has(key: string): boolean {
    return key in this.#data;
  }

  toObject(): { [index: string]: string } {
    return {
      ...this.#data,
    };
  }
}

describe("config", () => {
  let spyResolve: mock.Spy;

  beforeEach(() => {
    const fn = (p: string) => {
      if (p.startsWith("/")) {
        return p;
      }

      return resolve("/app/web", p);
    };
    spyResolve = mock.stub(_internals, "resolve", fn);
  });
  afterEach(() => {
    spyResolve.restore();
  });

  describe("load()", () => {
    it("loads with defaults", async () => {
      const env = new MockEnv();
      const result = await load(env);
      expect(result).to.deep.equal({
        rootDir: "/app/web",
        port: 4000,
        metaPort: 12676,
        logLevel: "info",
      });
      expect(spyResolve).to.be.deep.calledWith(["."]);
    });

    it("loads with specified envs", async () => {
      const env = new MockEnv({
        "SERVEIT_ROOT_DIR": "/some/path",
        "SERVEIT_PORT": "5000",
        "SERVEIT_META_PORT": "12676",
        "SERVEIT_LOG_LEVEL": "ERROR",
      });
      const result = await load(env);
      expect(result).to.deep.equal({
        rootDir: "/some/path",
        port: 5000,
        metaPort: 12676,
        logLevel: "error",
      });
      expect(spyResolve).to.be.deep.calledWith(["/some/path"]);
    });

    it("loads with logging OFF", async () => {
      const env = new MockEnv({
        "SERVEIT_LOG_LEVEL": "OFF",
      });
      const result = await load(env);
      expect(result).to.deep.equal({
        ...DEFAULT_CONFIG,
        rootDir: "/app/web",
        logLevel: null,
      });
    });

    it("loads with logging ALL", async () => {
      const env = new MockEnv({
        "SERVEIT_LOG_LEVEL": "ALL",
      });
      const result = await load(env);
      expect(result).to.deep.equal({
        ...DEFAULT_CONFIG,
        rootDir: "/app/web",
        logLevel: "debug",
      });
    });

    it("rejects if invalid port", async () => {
      const env = new MockEnv({
        "SERVEIT_PORT": "blah",
      });
      await expect(load(env)).to.be.rejectedWith(Error, "invalid port: blah");
    });

    it("rejects if invalid meta port", async () => {
      const env = new MockEnv({
        "SERVEIT_META_PORT": "blah",
      });
      await expect(load(env)).to.be.rejectedWith(
        Error,
        "invalid meta port: blah",
      );
    });

    it("rejects if invalid log-level", async () => {
      const env = new MockEnv({
        "SERVEIT_LOG_LEVEL": "stuff",
      });
      await expect(load(env)).to.be.rejectedWith(
        Error,
        "no log level found for name: stuff",
      );
    });
  });
});
