import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { expect, sinon } from "./setup.ts";

import { join, normalize } from "@std/path";

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
        root: "/app/web",
        port: 4000,
      });
      expect(spyResolve).calledWith(".");
    });
  });
});
