/**
 * @copyright 2023 Matthew A. Miller
 */

import { afterEach, beforeEach, describe, it } from "../../deps/test/bdd.ts";
import { FakeTime } from "../../deps/test/fake_time.ts";
import { expect, mock } from "../../deps/test/expecto.ts";

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

  describe("Logger", () => {
    describe("ctor()", () => {
      it("creates with default level", () => {
        const result = new logger.Logger();
        expect(result.level).to.equal(logger.Level.INFO);
      });
      it("creates with the specified level", () => {
        const result = new logger.Logger(logger.Level.DEBUG);
        expect(result.level).to.equal(logger.Level.DEBUG);
      });
    });

    describe("levels", () => {
      it("gets louder", () => {
        const log = new logger.Logger(logger.Level.INFO);
        let result;

        result = log.louder();
        expect(result).to.equal(logger.Level.DEBUG);

        result = log.louder();
        expect(result).to.equal(logger.Level.TRACE);

        result = log.louder();
        expect(result).to.equal(logger.Level.ALL);
      });
      it("does not get louder than ALL", () => {
        const log = new logger.Logger(logger.Level.ALL);
        const result = log.louder();
        expect(result).to.equal(logger.Level.ALL);
      });

      it("gets softer", () => {
        const log = new logger.Logger(logger.Level.INFO);
        let result;

        result = log.softer();
        expect(result).to.equal(logger.Level.WARNING);

        result = log.softer();
        expect(result).to.equal(logger.Level.ERROR);

        result = log.softer();
        expect(result).to.equal(logger.Level.CRITICAL);

        result = log.softer();
        expect(result).to.equal(logger.Level.OFF);
      });
      it("does not get softer than OFF", () => {
        const log = new logger.Logger(logger.Level.OFF);
        const result = log.softer();
        expect(result).to.equal(logger.Level.OFF);
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
        log.level = logger.Level.ALL;
        log.trace("trace message");
        log.debug("debug message");
        log.info("info message");
        log.warning("warning message");
        log.error("error message");
        log.critical("critical message");

        expect(spyLog).to.have.been.called(6);
        expect(spyLog).to.have.been.deep.calledWith([`${seed.toISOString()} [TRACE] trace message`]);
        expect(spyLog).to.have.been.deep.calledWith([`${seed.toISOString()} [DEBUG] debug message`]);
        expect(spyLog).to.have.been.deep.calledWith([`${seed.toISOString()} [INFO] info message`]);
        expect(spyLog).to.have.been.deep.calledWith([`${seed.toISOString()} [WARNING] warning message`]);
        expect(spyLog).to.have.been.deep.calledWith([`${seed.toISOString()} [ERROR] error message`]);
        expect(spyLog).to.have.been.deep.calledWith([`${seed.toISOString()} [CRITICAL] critical message`]);
      });
      it("logs at or above TRACE", () => {
        log.level = logger.Level.TRACE;
        log.trace("trace message");
        log.debug("debug message");
        log.info("info message");
        log.warning("warning message");
        log.error("error message");
        log.critical("critical message");

        expect(spyLog).to.have.been.called(6);
        expect(spyLog).to.have.been.deep.calledWith([`${seed.toISOString()} [TRACE] trace message`]);
        expect(spyLog).to.have.been.deep.calledWith([`${seed.toISOString()} [DEBUG] debug message`]);
        expect(spyLog).to.have.been.deep.calledWith([`${seed.toISOString()} [INFO] info message`]);
        expect(spyLog).to.have.been.deep.calledWith([`${seed.toISOString()} [WARNING] warning message`]);
        expect(spyLog).to.have.been.deep.calledWith([`${seed.toISOString()} [ERROR] error message`]);
        expect(spyLog).to.have.been.deep.calledWith([`${seed.toISOString()} [CRITICAL] critical message`]);
      });
      it("logs at or above DEBUG", () => {
        log.level = logger.Level.DEBUG;
        log.trace("trace message");
        log.debug("debug message");
        log.info("info message");
        log.warning("warning message");
        log.error("error message");
        log.critical("critical message");

        expect(spyLog).to.have.been.called(5);
        expect(spyLog).to.have.been.deep.calledWith([`${seed.toISOString()} [DEBUG] debug message`]);
        expect(spyLog).to.have.been.deep.calledWith([`${seed.toISOString()} [INFO] info message`]);
        expect(spyLog).to.have.been.deep.calledWith([`${seed.toISOString()} [WARNING] warning message`]);
        expect(spyLog).to.have.been.deep.calledWith([`${seed.toISOString()} [ERROR] error message`]);
        expect(spyLog).to.have.been.deep.calledWith([`${seed.toISOString()} [CRITICAL] critical message`]);
      });
      it("logs at or above INFO", () => {
        log.level = logger.Level.INFO;
        log.trace("trace message");
        log.debug("debug message");
        log.info("info message");
        log.warning("warning message");
        log.error("error message");
        log.critical("critical message");

        expect(spyLog).to.have.been.called(4);
        expect(spyLog).to.have.been.deep.calledWith([`${seed.toISOString()} [INFO] info message`]);
        expect(spyLog).to.have.been.deep.calledWith([`${seed.toISOString()} [WARNING] warning message`]);
        expect(spyLog).to.have.been.deep.calledWith([`${seed.toISOString()} [ERROR] error message`]);
        expect(spyLog).to.have.been.deep.calledWith([`${seed.toISOString()} [CRITICAL] critical message`]);
      });
      it("logs at or above WARNING", () => {
        log.level = logger.Level.WARNING;
        log.trace("trace message");
        log.debug("debug message");
        log.info("info message");
        log.warning("warning message");
        log.error("error message");
        log.critical("critical message");

        expect(spyLog).to.have.been.called(3);
        expect(spyLog).to.have.been.deep.calledWith([`${seed.toISOString()} [WARNING] warning message`]);
        expect(spyLog).to.have.been.deep.calledWith([`${seed.toISOString()} [ERROR] error message`]);
        expect(spyLog).to.have.been.deep.calledWith([`${seed.toISOString()} [CRITICAL] critical message`]);
      });
      it("logs at or above ERROR", () => {
        log.level = logger.Level.ERROR;
        log.trace("trace message");
        log.debug("debug message");
        log.info("info message");
        log.warning("warning message");
        log.error("error message");
        log.critical("critical message");

        expect(spyLog).to.have.been.called(2);
        expect(spyLog).to.have.been.deep.calledWith([`${seed.toISOString()} [ERROR] error message`]);
        expect(spyLog).to.have.been.deep.calledWith([`${seed.toISOString()} [CRITICAL] critical message`]);
      });
      it("logs at or above CRITICAL", () => {
        log.level = logger.Level.CRITICAL;
        log.trace("trace message");
        log.debug("debug message");
        log.info("info message");
        log.warning("warning message");
        log.error("error message");
        log.critical("critical message");

        expect(spyLog).to.have.been.called(1);
        expect(spyLog).to.have.been.deep.calledWith([`${seed.toISOString()} [CRITICAL] critical message`]);
      });

      it("logs nothing at OFF", () => {
        log.level = logger.Level.OFF;
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
