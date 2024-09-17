/***
 * @file Custom errors
 * @copyright 2024 Matthew A. Miller
 */

import { StatusCode } from "./constants.ts";

export class HttpError extends Error {
  readonly code: number;

  constructor(code: number, msg: string) {
    super(msg);
    this.name = this.constructor.name;
    this.code = code;
  }

  toResponse() {
    return new Response(undefined, {
      status: this.code,
      statusText: this.message,
    });
  }
}

export class MethodNotAllowed extends HttpError {
  constructor(msg = "method not allowed") {
    super(StatusCode.MethodNotAllowed, msg);
  }
}

export class NotFound extends HttpError {
  constructor(msg = "not found") {
    super(StatusCode.NotFound, msg);
  }
}

export class InternalServerError extends HttpError {
  constructor(msg = "internal server error") {
    super(StatusCode.InternalServerError, msg);
  }
}
