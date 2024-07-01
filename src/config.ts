/**
 * @file Types and methods for configuring the app
 * @copyright 2024 Matthew A. Miller
 */

import { resolve } from "@std/path";
import { fromLevelName, LogLevel } from "./logger.ts";

export const _internals = {
  env: Deno.env,
  resolve,
};

export interface Config {
  rootDir: string;
  port: number;
  logLevel: LogLevel;
}

export async function load(env: Deno.Env = _internals.env) {
  const rootDirStr = env.get("SERVEIT_ROOT_DIR");
  const portStr = env.get("SERVEIT_PORT");
  const levelName = env.get("SERVEIT_LOG_LEVEL");

  const logLevel = fromLevelName(levelName || "INFO");
  const rootDir = _internals.resolve(rootDirStr || ".");
  const port = parseInt(portStr || "4000");
  if (Number.isNaN(port)) {
    throw new Error(`invalid port: ${portStr}`);
  }

  // dummy await
  await Promise.resolve();

  return {
    rootDir,
    port,
    logLevel,
  };
}
