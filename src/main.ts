/**
 * @file Main entrypoint
 * @copyright 2023 Matthew A. Miller
 */

import { resolve } from "../deps/src/path.ts";
import { Server } from "./server.ts";
import logger from "./util/log.ts";

if (import.meta.main) {
  const root = resolve(Deno.args[0] || ".");

  const abort = new AbortController();
  const { signal } = abort;
  Deno.addSignalListener("SIGINT", () => {
    logger.warning("stopping");
    abort.abort();
  });

  const server = new Server(root);
  await server.serve({
    signal,
  });
  logger.warning("stopped");
}
