/** */

import { resolve } from "../deps/src/path.ts";
import { Server } from "./server.ts";
import logger, { Level as Loglevel } from "./util/log.ts";

// TODO: module-ize
const root = resolve(Deno.args[0] || ".");

Deno.addSignalListener("SIGUSR1", () => {
  const level = logger.louder();
  logger.critical(`logging at ${Loglevel[level]}`);
});
Deno.addSignalListener("SIGUSR2", () => {
  const level = logger.softer();
  logger.critical(`logging at ${Loglevel[level]}`);
});

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
