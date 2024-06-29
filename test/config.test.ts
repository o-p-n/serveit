import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { expect, sinon } from "./setup.ts";

import { join, normalize } from "@std/path";

import { LogLevel } from "../src/logger.ts"
import { _internals, load } from "../src/config.ts";

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
  let spyResolve: sinon.Spy;

  beforeEach(() => {
    const fn = (p: string) => {
      if (p.startsWith("/")) {
        return p;
      }

      return normalize(
        join("/app/web", p),
      );
    };
    spyResolve = sinon.stub(_internals, "resolve")
      .callsFake(fn);
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
        logLevel: LogLevel.INFO,
      });
      expect(spyResolve).to.be.calledWith(".");
    });

    it("loads with specified envs", async () => {
      const env = new MockEnv({
        "SERVEIT_ROOT_DIR": "/some/path",
        "SERVEIT_PORT": "5000",
        "SERVEIT_LOG_LEVEL": "ERROR",
      });
      const result = await load(env);
      expect(result).to.deep.equal({
        rootDir: "/some/path",
        port: 5000,
        logLevel: LogLevel.ERROR,
      });
      expect(spyResolve).to.be.calledWith("/some/path");
    });

    it("rejects if invalid port", async () => {
      const env = new MockEnv({
        "SERVEIT_PORT": "blah",
      });
      await expect(load(env)).to.be.rejectedWith(Error, "invalid port: blah");
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
