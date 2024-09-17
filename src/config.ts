/**
 * @file Types and methods for configuring the app
 * @copyright 2024 Matthew A. Miller
 */

import { resolve } from "@std/path";
import { type LogLevel, parseLogLevel } from "@logtape/logtape";

export const _internals = {
  env: Deno.env,
  resolve,
};

export interface Config {
  rootDir: string;
  port: number;
  logLevel: LogLevel | null;
}

export const DEFAULT_CONFIG: Config = {
  rootDir: ".",
  port: 4000,
  logLevel: "info",
};

export async function load(env: Deno.Env = _internals.env) {
  const rootDirStr = env.get("SERVEIT_ROOT_DIR");
  const portStr = env.get("SERVEIT_PORT");
  const levelName = env.get("SERVEIT_LOG_LEVEL");

  const logLevel = levelName
    ? ((name?: string) => {
      switch (name) {
        case "OFF":
          return null;
        case "ALL":
          return "debug";
        default:
          return parseLogLevel(name!);
      }
    })(levelName)
    : DEFAULT_CONFIG.logLevel;
  const rootDir = _internals.resolve(rootDirStr || DEFAULT_CONFIG.rootDir);
  const port = portStr ? parseInt(portStr!) : DEFAULT_CONFIG.port;
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
