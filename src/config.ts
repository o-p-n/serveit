/**
 * @file Types and methods for configuring the app
 * @copyright 2024 Matthew A. Miller
 */

import { resolve } from "@std/path";

export const _internals = {
  env: Deno.env,
  resolve,
};

export interface Config {
  root: string;
  port: number;
}

export async function load(env: Deno.Env = _internals.env) {
  const rootDir = env.get("SERVEIT_ROOT_DIR");
  const portStr = env.get("SERVEIT_PORT");

  const root = _internals.resolve(rootDir || ".");
  const port = parseInt(portStr || "4000");

  // dummy await
  await Promise.resolve();
  
  return {
    root,
    port,
  };
}
