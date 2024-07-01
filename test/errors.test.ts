import { describe, it } from "./deps.ts";
import { expect } from "./deps.ts";

import * as errors from "../src/errors.ts";

describe("errors", () => {
  describe("HttpError", () => {
    it("creates a HttpError", () => {
      const result = new errors.HttpError(501, "some server error");
      expect(result.name).to.equal("HttpError");
      expect(result.message).to.equal("some server error");
      expect(result.code).to.equal(501);
    });

    it("creates a response", () => {
      const err = new errors.HttpError(501, "some server error");
      const result = err.toResponse();
      expect(result.status).to.equal(err.code);
      expect(result.statusText).to.equal(err.message);
    });
  });

  describe("coded errors", () => {
    describe("NotFound", () => {
      it("creates NotFound with a default message", () => {
        const err = new errors.NotFound();
        expect(err.name).to.equal("NotFound");
        expect(err.code).to.equal(404);
        expect(err.message).to.equal("not found");

        const result = err.toResponse();
        expect(result.status).to.equal(err.code);
        expect(result.statusText).to.equal(err.message);
      });
      it("creates NotFound with a custom message", () => {
        const err = new errors.NotFound("path not located");
        expect(err.name).to.equal("NotFound");
        expect(err.code).to.equal(404);
        expect(err.message).to.equal("path not located");

        const result = err.toResponse();
        expect(result.status).to.equal(err.code);
        expect(result.statusText).to.equal(err.message);
      });
    });

    describe("MethodNotAllowed", () => {
      it("creates MethodNotAllowed with a default message", () => {
        const err = new errors.MethodNotAllowed();
        expect(err.name).to.equal("MethodNotAllowed");
        expect(err.code).to.equal(405);
        expect(err.message).to.equal("method not allowed");

        const result = err.toResponse();
        expect(result.status).to.equal(err.code);
        expect(result.statusText).to.equal(err.message);
      });
      it("creates MethodNotAllowed with a custom message", () => {
        const err = new errors.MethodNotAllowed("no such method");
        expect(err.name).to.equal("MethodNotAllowed");
        expect(err.code).to.equal(405);
        expect(err.message).to.equal("no such method");

        const result = err.toResponse();
        expect(result.status).to.equal(err.code);
        expect(result.statusText).to.equal(err.message);
      });
    });

    describe("InternalServerError", () => {
      it("creates InternalServerError with a default message", () => {
        const err = new errors.InternalServerError();
        expect(err.name).to.equal("InternalServerError");
        expect(err.code).to.equal(500);
        expect(err.message).to.equal("internal server error");

        const result = err.toResponse();
        expect(result.status).to.equal(err.code);
        expect(result.statusText).to.equal(err.message);
      });
      it("creates InternalServerError with a custom message", () => {
        const err = new errors.InternalServerError("server failed");
        expect(err.name).to.equal("InternalServerError");
        expect(err.code).to.equal(500);
        expect(err.message).to.equal("server failed");

        const result = err.toResponse();
        expect(result.status).to.equal(err.code);
        expect(result.statusText).to.equal(err.message);
      });
    });
  });
});
