import { afterEach, beforeEach, describe, it } from "./deps.ts";
import { expect, FakeTime, mock } from "./deps.ts";

import * as logger from "../src/logger.ts";

describe("logger", () => {
  describe("LogLevel", () => {
    describe("fromLevelName()", () => {
      it("returns the log level", () => {
        let result;

        result = logger.fromLevelName("DEBUG");
        expect(result).to.equal(logger.LogLevel.DEBUG);
        result = logger.fromLevelName("VERBOSE");
        expect(result).to.equal(logger.LogLevel.VERBOSE);
        result = logger.fromLevelName("INFO");
        expect(result).to.equal(logger.LogLevel.INFO);
        result = logger.fromLevelName("WARN");
        expect(result).to.equal(logger.LogLevel.WARN);
        result = logger.fromLevelName("ERROR");
        expect(result).to.equal(logger.LogLevel.ERROR);
      });
      it("throws if name is not found", () => {
        expect(() => logger.fromLevelName("stuff")).to.throw(
          Error,
          "no log level found for name: stuff",
        );
      });
    });
    describe("toLevelName()", () => {
      it("returns the level name", () => {
        let result;

        result = logger.toLevelName(logger.LogLevel.DEBUG);
        expect(result).to.equal("DEBUG");
        result = logger.toLevelName(logger.LogLevel.VERBOSE);
        expect(result).to.equal("VERBOSE");
        result = logger.toLevelName(logger.LogLevel.INFO);
        expect(result).to.equal("INFO");
        result = logger.toLevelName(logger.LogLevel.WARN);
        expect(result).to.equal("WARN");
        result = logger.toLevelName(logger.LogLevel.ERROR);
        expect(result).to.equal("ERROR");
      });
      it("throws if level is not recognized", () => {
        expect(() => logger.toLevelName(12 as logger.LogLevel)).to.throw(
          Error,
          "not a log level: 12",
        );
      });
    });

    describe("Logger", () => {
      it("creates with the given LogLevel", () => {
        const log = new logger.Logger(logger.LogLevel.ALL);
        expect(log.level).to.equal(logger.LogLevel.ALL);
        expect(log.levelName).to.equal("ALL");
      });
      it("creates with the default LogLevel", () => {
        const log = new logger.Logger();
        expect(log.level).to.equal(logger.LogLevel.INFO);
        expect(log.levelName).to.equal("INFO");
      });

      describe("levels", () => {
        it("gets/sets by LogLevel", () => {
          const log = new logger.Logger();

          expect(log.level).to.equal(logger.LogLevel.INFO);

          log.level = logger.LogLevel.ERROR;
          expect(log.level).to.equal(logger.LogLevel.ERROR);
          expect(log.levelName).to.equal("ERROR");

          log.level = logger.LogLevel.ALL;
          expect(log.level).to.equal(logger.LogLevel.ALL);
          expect(log.levelName).to.equal("ALL");
        });
        it("gets/sets by name", () => {
          const log = new logger.Logger();

          expect(log.level).to.equal(logger.LogLevel.INFO);
          expect(log.levelName).to.equal("INFO");

          log.levelName = "ERROR";
          expect(log.level).to.equal(logger.LogLevel.ERROR);
          expect(log.levelName).to.equal("ERROR");

          log.levelName = "ALL";
          expect(log.level).to.equal(logger.LogLevel.ALL);
          expect(log.levelName).to.equal("ALL");
        });
      });

      describe("logging", () => {
        const log = new logger.Logger();

        let clock: FakeTime;
        let spyConsoleLog: mock.Spy;

        function spyMessage(msg: string) {
          return mock.spy(() => msg);
        }

        beforeEach(() => {
          clock = new FakeTime(new Date(0));
          spyConsoleLog = mock.stub(console, "log");
        });

        afterEach(() => {
          spyConsoleLog.restore();
          clock.restore();
        });

        it("logs a string when at or above level", () => {
          log.debug("this is at DEBUG");
          log.verbose("this is at VERBOSE");
          log.info("this is at INFO");
          log.warn("this is at WARN");
          log.error("this is at ERROR");

          expect(spyConsoleLog).to.have.been.called(3);
          // expect(spyConsoleLog).to.have.been.deep.calledWith(["1970-01-01T00:00:00.000Z [DEBUG]: this is at DEBUG"]);
          // expect(spyConsoleLog).to.have.been.deep.calledWith(["1970-01-01T00:00:00.000Z [VERBOSE]: this is at VERBOSE"]);
          expect(spyConsoleLog).to.have.been.deep.calledWith([
            "1970-01-01T00:00:00.000Z [INFO]: this is at INFO",
          ]);
          expect(spyConsoleLog).to.have.been.deep.calledWith([
            "1970-01-01T00:00:00.000Z [WARN]: this is at WARN",
          ]);
          expect(spyConsoleLog).to.have.been.deep.calledWith([
            "1970-01-01T00:00:00.000Z [ERROR]: this is at ERROR",
          ]);
        });

        it("logs a function when at or above level", () => {
          let spy;

          spy = spyMessage("this is at DEBUG");
          log.debug(spy);
          expect(spy).to.not.have.been.called();

          spy = spyMessage("this is at VERBOSE");
          log.verbose(spy);
          expect(spy).to.not.have.been.called();

          spy = spyMessage("this is at INFO");
          log.info(spy);
          expect(spy).to.have.been.called();

          spy = spyMessage("this is at WARN");
          log.warn(spy);
          expect(spy).to.have.been.called();

          spy = spyMessage("this is at ERROR");
          log.error(spy);
          expect(spy).to.have.been.called();

          expect(spyConsoleLog).to.have.been.called(3);
          // expect(spyConsoleLog).to.have.been.deep.calledWith(["1970-01-01T00:00:00.000Z [DEBUG]: this is at DEBUG"]);
          // expect(spyConsoleLog).to.have.been.deep.calledWith(["1970-01-01T00:00:00.000Z [VERBOSE]: this is at VERBOSE"]);
          expect(spyConsoleLog).to.have.been.deep.calledWith([
            "1970-01-01T00:00:00.000Z [INFO]: this is at INFO",
          ]);
          expect(spyConsoleLog).to.have.been.deep.calledWith([
            "1970-01-01T00:00:00.000Z [WARN]: this is at WARN",
          ]);
          expect(spyConsoleLog).to.have.been.deep.calledWith([
            "1970-01-01T00:00:00.000Z [ERROR]: this is at ERROR",
          ]);
        });
      });
    });
  });
});
