/**
 * @file Types and methods for configuring
 * @copyright 2023 Matthew A. Miller
 */

import { resolve } from "path";

import { DEFAULT_LOG_LEVEL, fromLevelName, LogLevel } from "./util/log.ts";

export interface Config {
  root: string;
  port: number;
  logLevel: LogLevel;
}

export async function load(env: Deno.Env = Deno.env) {
  const rootDir = env.get("SERVEIT_ROOT_DIR");
  const portStr = env.get("SERVEIT_PORT");
  const logLevelStr = env.get("SERVEIT_LOG_LEVEL");

  // default to `cwd`
  const root = resolve(rootDir || ".");
  const port = parseInt(portStr || "4000");
  const logLevel = logLevelStr ? fromLevelName(logLevelStr) : DEFAULT_LOG_LEVEL;

  // check it!
  const stat = await Deno.stat(root);
  if (!stat.isDirectory) {
    throw new Error(`root is not a directory: ${root}`);
  }
  if (isNaN(port) || (port < 0) || (port > 65535)) {
    throw new Error(`invalid port: ${portStr}`);
  }
  if (logLevel === undefined) {
    throw new Error(`invalid log level: ${logLevelStr}`);
  }

  return {
    root,
    port,
    logLevel,
  };
}
