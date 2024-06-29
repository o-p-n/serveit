/**
 * @copyright 2024 Matthew A. Miller
 */

export enum StatusCode {
  // 2xx
  Ok = 200,

  // 3xx
  NotModified = 304,

  // 4xx
  NotFound = 404,
  MethodNotAllowed = 405,

  // 5xx
  InternalServerError = 500,
}
