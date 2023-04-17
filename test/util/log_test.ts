/**
 * @copyright 2023 Matthew A. Miller
 */

import { afterEach, beforeEach, describe, it } from "test/bdd";
import { FakeTime } from "test/fake_time";
import { expect, mock } from "../setup.ts";

import * as logger from "../../src/util/log.ts";

describe("util/log", () => {
  const seed = new Date("2022-01-26T01:23:45.678Z");
  let clock: FakeTime;

  beforeEach(() => {
    clock = new FakeTime(seed);
  });
  afterEach(() => {
    clock.restore();
  });

  describe("fromLevelName()", () => {
    it("returns the LogLevel for known names", () => {
      for (const name of logger.LOG_LEVEL_NAMES) {
        const expected = logger.LOG_LEVEL_NAMES.indexOf(name);
        const result = logger.fromLevelName(name);
        expect(result).to.equal(expected);
      }
    });

    it("returns the LogLevel for known names (ignoring case)", () => {
      for (let name of logger.LOG_LEVEL_NAMES) {
        name = name.toLowerCase();
        const expected = logger.LOG_LEVEL_NAMES.indexOf(name.toUpperCase());
        const result = logger.fromLevelName(name);
        expect(result).to.equal(expected);
      }
    });

    it("returns undefined for unknown name", () => {
      const result = logger.fromLevelName("UNKNOWN");
      expect(result).to.be.undefined();
    });
  });

  describe("Logger", () => {
    describe("ctor()", () => {
      it("creates with default level", () => {
        const result = new logger.Logger();
        expect(result.level).to.equal(logger.LogLevel.INFO);
      });
      it("creates with the specified level", () => {
        const result = new logger.Logger(logger.LogLevel.DEBUG);
        expect(result.level).to.equal(logger.LogLevel.DEBUG);
      });
    });

    describe("levels", () => {
      it("gets louder", () => {
        const log = new logger.Logger(logger.LogLevel.INFO);
        let result;

        result = log.louder();
        expect(result).to.equal(logger.LogLevel.DEBUG);

        result = log.louder();
        expect(result).to.equal(logger.LogLevel.TRACE);

        result = log.louder();
        expect(result).to.equal(logger.LogLevel.ALL);
      });
      it("does not get louder than ALL", () => {
        const log = new logger.Logger(logger.LogLevel.ALL);
        const result = log.louder();
        expect(result).to.equal(logger.LogLevel.ALL);
      });

      it("gets softer", () => {
        const log = new logger.Logger(logger.LogLevel.INFO);
        let result;

        result = log.softer();
        expect(result).to.equal(logger.LogLevel.WARNING);

        result = log.softer();
        expect(result).to.equal(logger.LogLevel.ERROR);

        result = log.softer();
        expect(result).to.equal(logger.LogLevel.CRITICAL);

        result = log.softer();
        expect(result).to.equal(logger.LogLevel.OFF);
      });
      it("does not get softer than OFF", () => {
        const log = new logger.Logger(logger.LogLevel.OFF);
        const result = log.softer();
        expect(result).to.equal(logger.LogLevel.OFF);
      });
    });

    describe("logging", () => {
      let log: logger.Logger;
      let spyLog: mock.Spy;

      beforeEach(() => {
        spyLog = mock.stub(console, "log");
        log = new logger.Logger();
      });
      afterEach(() => {
        spyLog.restore();
      });

      it("logs everything at ALL", () => {
        log.level = logger.LogLevel.ALL;
        log.trace("trace message");
        log.debug("debug message");
        log.info("info message");
        log.warning("warning message");
        log.error("error message");
        log.critical("critical message");

        expect(spyLog).to.have.been.called(6);
        expect(spyLog).to.have.been.deep.calledWith([
          `${seed.toISOString()} [TRACE] trace message`,
        ]);
        expect(spyLog).to.have.been.deep.calledWith([
          `${seed.toISOString()} [DEBUG] debug message`,
        ]);
        expect(spyLog).to.have.been.deep.calledWith([
          `${seed.toISOString()} [INFO] info message`,
        ]);
        expect(spyLog).to.have.been.deep.calledWith([
          `${seed.toISOString()} [WARNING] warning message`,
        ]);
        expect(spyLog).to.have.been.deep.calledWith([
          `${seed.toISOString()} [ERROR] error message`,
        ]);
        expect(spyLog).to.have.been.deep.calledWith([
          `${seed.toISOString()} [CRITICAL] critical message`,
        ]);
      });
      it("logs at or above TRACE", () => {
        log.level = logger.LogLevel.TRACE;
        log.trace("trace message");
        log.debug("debug message");
        log.info("info message");
        log.warning("warning message");
        log.error("error message");
        log.critical("critical message");

        expect(spyLog).to.have.been.called(6);
        expect(spyLog).to.have.been.deep.calledWith([
          `${seed.toISOString()} [TRACE] trace message`,
        ]);
        expect(spyLog).to.have.been.deep.calledWith([
          `${seed.toISOString()} [DEBUG] debug message`,
        ]);
        expect(spyLog).to.have.been.deep.calledWith([
          `${seed.toISOString()} [INFO] info message`,
        ]);
        expect(spyLog).to.have.been.deep.calledWith([
          `${seed.toISOString()} [WARNING] warning message`,
        ]);
        expect(spyLog).to.have.been.deep.calledWith([
          `${seed.toISOString()} [ERROR] error message`,
        ]);
        expect(spyLog).to.have.been.deep.calledWith([
          `${seed.toISOString()} [CRITICAL] critical message`,
        ]);
      });
      it("logs at or above DEBUG", () => {
        log.level = logger.LogLevel.DEBUG;
        log.trace("trace message");
        log.debug("debug message");
        log.info("info message");
        log.warning("warning message");
        log.error("error message");
        log.critical("critical message");

        expect(spyLog).to.have.been.called(5);
        expect(spyLog).to.have.been.deep.calledWith([
          `${seed.toISOString()} [DEBUG] debug message`,
        ]);
        expect(spyLog).to.have.been.deep.calledWith([
          `${seed.toISOString()} [INFO] info message`,
        ]);
        expect(spyLog).to.have.been.deep.calledWith([
          `${seed.toISOString()} [WARNING] warning message`,
        ]);
        expect(spyLog).to.have.been.deep.calledWith([
          `${seed.toISOString()} [ERROR] error message`,
        ]);
        expect(spyLog).to.have.been.deep.calledWith([
          `${seed.toISOString()} [CRITICAL] critical message`,
        ]);
      });
      it("logs at or above INFO", () => {
        log.level = logger.LogLevel.INFO;
        log.trace("trace message");
        log.debug("debug message");
        log.info("info message");
        log.warning("warning message");
        log.error("error message");
        log.critical("critical message");

        expect(spyLog).to.have.been.called(4);
        expect(spyLog).to.have.been.deep.calledWith([
          `${seed.toISOString()} [INFO] info message`,
        ]);
        expect(spyLog).to.have.been.deep.calledWith([
          `${seed.toISOString()} [WARNING] warning message`,
        ]);
        expect(spyLog).to.have.been.deep.calledWith([
          `${seed.toISOString()} [ERROR] error message`,
        ]);
        expect(spyLog).to.have.been.deep.calledWith([
          `${seed.toISOString()} [CRITICAL] critical message`,
        ]);
      });
      it("logs at or above WARNING", () => {
        log.level = logger.LogLevel.WARNING;
        log.trace("trace message");
        log.debug("debug message");
        log.info("info message");
        log.warning("warning message");
        log.error("error message");
        log.critical("critical message");

        expect(spyLog).to.have.been.called(3);
        expect(spyLog).to.have.been.deep.calledWith([
          `${seed.toISOString()} [WARNING] warning message`,
        ]);
        expect(spyLog).to.have.been.deep.calledWith([
          `${seed.toISOString()} [ERROR] error message`,
        ]);
        expect(spyLog).to.have.been.deep.calledWith([
          `${seed.toISOString()} [CRITICAL] critical message`,
        ]);
      });
      it("logs at or above ERROR", () => {
        log.level = logger.LogLevel.ERROR;
        log.trace("trace message");
        log.debug("debug message");
        log.info("info message");
        log.warning("warning message");
        log.error("error message");
        log.critical("critical message");

        expect(spyLog).to.have.been.called(2);
        expect(spyLog).to.have.been.deep.calledWith([
          `${seed.toISOString()} [ERROR] error message`,
        ]);
        expect(spyLog).to.have.been.deep.calledWith([
          `${seed.toISOString()} [CRITICAL] critical message`,
        ]);
      });
      it("logs at or above CRITICAL", () => {
        log.level = logger.LogLevel.CRITICAL;
        log.trace("trace message");
        log.debug("debug message");
        log.info("info message");
        log.warning("warning message");
        log.error("error message");
        log.critical("critical message");

        expect(spyLog).to.have.been.called(1);
        expect(spyLog).to.have.been.deep.calledWith([
          `${seed.toISOString()} [CRITICAL] critical message`,
        ]);
      });

      it("logs nothing at OFF", () => {
        log.level = logger.LogLevel.OFF;
        log.trace("trace message");
        log.debug("debug message");
        log.info("info message");
        log.warning("warning message");
        log.error("error message");
        log.critical("critical message");

        expect(spyLog).to.have.been.called(0);
      });
    });
  });
});
