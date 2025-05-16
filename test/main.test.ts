import { afterEach, beforeEach, describe, expect, it, mock } from "./deps.ts";

import { type LogLevel } from "@logtape/logtape";
import { _internals, main } from "../src/main.ts";
import log from "../src/logger.ts";
import { Server } from "../src/file-server.ts";
import { DEFAULT_CONFIG } from "../src/config.ts";

describe("main", () => {
  const logger = log();
  describe("main()", () => {
    let spyLogInfo: mock.Spy;
    let spyLoad: mock.Spy;
    let spyServe: mock.Spy;
    let spyAddListener: mock.Spy;

    beforeEach(() => {
      spyLogInfo = mock.spy(logger, "info");

      spyLoad = mock.stub(_internals, "load", () =>
        Promise.resolve({
          ...DEFAULT_CONFIG,
          rootDir: "/root/app",
          logLevel: "info" as LogLevel,
        }));
      spyServe = mock.stub(Server.prototype, "serve", () => Promise.resolve());
      spyAddListener = mock.stub(Deno, "addSignalListener");
    });

    afterEach(() => {
      _internals.main = false;

      spyLogInfo.restore();

      spyLoad.restore();
      spyServe.restore();
      spyAddListener.restore();
    });

    it("does nothing when not main", async () => {
      _internals.main = false;

      await main();
      expect(spyServe).to.not.have.been.called();
    });

    it("runs it when main", async () => {
      _internals.main = true;

      await main();
      expect(spyServe).to.have.been.called();

      expect(spyAddListener).to.have.been.called();
      const listenerArgs = spyAddListener.calls[0].args;
      expect(listenerArgs.length).to.equal(2);
      expect(listenerArgs[0]).to.equal("SIGINT");
      expect(listenerArgs[1]).to.be.typeOf("function");

      const listener = listenerArgs[1] as (() => void);
      listener();
      expect(spyLogInfo).to.have.been.deep.calledWith([
        "stopping ...",
      ]);
    });
  });
});
