/**
 * @copyright 2023 Matthew A. Miller
 */

import { afterEach, beforeEach, describe, it } from "../deps/test/bdd.ts";
import { expect, mock } from "../deps/test/expecto.ts";

import { LogLevel, DEFAULT_LOG_LEVEL } from "../src/util/log.ts";
import { load } from "../src/config.ts";

const FILE_INFO_DEFAULTS: Deno.FileInfo = {
  isFile: false,
  isDirectory: false,
  isSymlink: false,
  size: 0,
  dev: 0,
  ino: null,
  mode: null,
  nlink: null,
  uid: null,
  gid: null,
  rdev: null,
  blksize: null,
  blocks: null,
  birthtime: null,
  mtime: null,
  atime: null,
};

class FakeEnv implements Deno.Env {
  #values: Map<string, string>;

  constructor(values?: Record<string, string>) {
    this.#values = new Map(Object.entries(values || {}));

    this.get = mock.spy(this.get.bind(this));
    this.set = mock.spy(this.set.bind(this));
    this.delete = mock.spy(this.delete.bind(this));
    this.has = mock.spy(this.has.bind(this));
    this.toObject = mock.spy(this.toObject.bind(this));
  }

  get(key: string): string | undefined {
    return this.#values.get(key);
  }
  set(key: string, value: string) {
    this.#values.set(key, value);
  }
  delete(key: string) {
    this.#values.delete(key);
  }
  has(key: string): boolean {
    return this.#values.has(key);
  }
  toObject(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of this.#values.entries()) {
      result[key] = value;
    }
    return result;
  }
}

describe("config", () => {
  const CWD = "/working";

  let stubCwd: mock.Stub | undefined = undefined;
  let stubStat: mock.Stub | undefined = undefined;

  afterEach(() => {
    stubCwd?.restore();
    stubStat?.restore();
    stubCwd = stubStat = undefined;
  });

  beforeEach(() => {
    if (!stubStat) {
      stubStat = mock.stub(Deno, "stat", (_: string | URL) => Promise.resolve({
        ...FILE_INFO_DEFAULTS,
        isDirectory: true,
      }));
    }
    stubCwd = mock.stub(Deno, "cwd", () => CWD);
  });

  describe("load()", () => {
    describe("succes cases", () => {
      it("uses explicit values", async () => {
        const env = new FakeEnv({
          "SERVEIT_ROOT_DIR": "/root",
          "SERVEIT_PORT": "5000",
          "SERVEIT_LOG_LEVEL": "DEBUG",
        });
        const result = await load(env);
        expect(result).to.deep.equal({
          root: "/root",
          port: 5000,
          logLevel: LogLevel.DEBUG,
        });
  
        expect(stubStat).to.be.calledWith(["/root"]);
      });
      it("uses defaults if unset", async () => {
        const env = new FakeEnv();
        const result = await load(env);
        expect(result).to.deep.equal({
          root: CWD,
          port: 4000,
          logLevel: DEFAULT_LOG_LEVEL,
        });

        expect(stubStat).to.have.been.calledWith([CWD]);
        expect(env.get).to.have.been.calledWith(["SERVEIT_ROOT_DIR"]);
        expect(env.get).to.have.been.calledWith(["SERVEIT_PORT"]);
        expect(env.get).to.have.been.calledWith(["SERVEIT_LOG_LEVEL"]);
      });
      it("uses defaults is set to ''", async () => {
        const env = new FakeEnv({
          "SERVEIT_ROOT_DIR": "",
          "SERVEIT_PORT": "",
          "SERVEIT_LOG_LEVEL": "",
        });
        const result = await load(env);
        expect(result).to.deep.equal({
          root: CWD,
          port: 4000,
          logLevel: DEFAULT_LOG_LEVEL,
        });

        expect(stubStat).to.have.been.calledWith([CWD]);
        expect(env.get).to.have.been.calledWith(["SERVEIT_ROOT_DIR"]);
        expect(env.get).to.have.been.calledWith(["SERVEIT_PORT"]);
        expect(env.get).to.have.been.calledWith(["SERVEIT_LOG_LEVEL"]);
      });
      it("resolves `SERVEIT_ROOT_DIR` to an absolute path", async () => {
        const env = new FakeEnv({
          "SERVEIT_ROOT_DIR": "web",
        });
        const result = await load(env);
        expect(result).to.deep.equal({
          root: `${CWD}/web`,
          port: 4000,
          logLevel: DEFAULT_LOG_LEVEL,
        });

        expect(stubStat).to.have.been.calledWith([`${CWD}/web`]);
        expect(env.get).to.have.been.calledWith(["SERVEIT_ROOT_DIR"]);
        expect(env.get).to.have.been.calledWith(["SERVEIT_PORT"]);
        expect(env.get).to.have.been.calledWith(["SERVEIT_LOG_LEVEL"]);
      });
    });
    describe("failure cases", () => {
      it("throws if `SERVET_ROOT_DIR` is a file", async () => {
        stubStat?.restore();
        stubStat = mock.stub(Deno, "stat", (_: string | URL) => Promise.resolve({
          ...FILE_INFO_DEFAULTS,
          isFile: true,
        }));

        const env = new FakeEnv({
          "SERVEIT_ROOT_DIR": "/is-a-file",
        });
        await expect(load(env)).to.be.rejected();

        expect(stubStat).to.have.been.calledWith(["/is-a-file"]);
        expect(env.get).to.have.been.calledWith(["SERVEIT_ROOT_DIR"]);
        expect(env.get).to.have.been.calledWith(["SERVEIT_PORT"]);
        expect(env.get).to.have.been.calledWith(["SERVEIT_LOG_LEVEL"]);
      });
      it("throws if `SERVEIT_ROOT_DIR` does not exist", async () => {
        stubStat?.restore();
        stubStat = mock.stub(Deno, "stat", (_: string | URL) => Promise.reject(new Deno.errors.NotFound()));

        const env = new FakeEnv({
          "SERVEIT_ROOT_DIR": "/is-a-file",
        });
        await expect(load(env)).to.be.rejected();

        expect(stubStat).to.have.been.calledWith(["/is-a-file"]);
        expect(env.get).to.have.been.calledWith(["SERVEIT_ROOT_DIR"]);
        expect(env.get).to.have.been.calledWith(["SERVEIT_PORT"]);
        expect(env.get).to.have.been.calledWith(["SERVEIT_LOG_LEVEL"]);
      });
      it("throws if `SERVEIT_PORT` is not a number", async () => {
        const env = new FakeEnv({
          "SERVEIT_PORT": "not-a-number",
        });
        await expect(load(env)).to.be.rejected();

        expect(env.get).to.have.been.calledWith(["SERVEIT_ROOT_DIR"]);
        expect(env.get).to.have.been.calledWith(["SERVEIT_PORT"]);
        expect(env.get).to.have.been.calledWith(["SERVEIT_LOG_LEVEL"]);
      });
      it("throws if `SERVEIT_PORT` is outside range", async () => {
        let env: FakeEnv;

        env = new FakeEnv({
          "SERVEIT_PORT": "-1",
        });
        await expect(load(env)).to.be.rejected();

        expect(env.get).to.have.been.calledWith(["SERVEIT_ROOT_DIR"]);
        expect(env.get).to.have.been.calledWith(["SERVEIT_PORT"]);
        expect(env.get).to.have.been.calledWith(["SERVEIT_LOG_LEVEL"]);

        env = new FakeEnv({
          "SERVEIT_PORT": "65536",
        });
        await expect(load(env)).to.be.rejected();

        expect(env.get).to.have.been.calledWith(["SERVEIT_ROOT_DIR"]);
        expect(env.get).to.have.been.calledWith(["SERVEIT_PORT"]);
        expect(env.get).to.have.been.calledWith(["SERVEIT_LOG_LEVEL"]);
      });
      it("throws if `SERVEIT_LOG_LEVEL` is invalid", async () => {
        const env = new FakeEnv({
          "SERVEIT_LOG_LEVEL": "NOT_A_LEVEL",
        });
        await expect(load(env)).to.be.rejected();

        expect(env.get).to.have.been.calledWith(["SERVEIT_ROOT_DIR"]);
        expect(env.get).to.have.been.calledWith(["SERVEIT_PORT"]);
        expect(env.get).to.have.been.calledWith(["SERVEIT_LOG_LEVEL"]);
      });
    });
  });
});
