/**
 * @copyright 2024 Matthew A. Miller
 */

import log, { setup } from "./logger.ts";
import { load } from "./config.ts";
import { Server } from "./file-server.ts";

export const _internals = {
  load,
  main: import.meta.main,
};

export async function main() {
  if (!_internals.main) return;

  const config = await _internals.load();
  await setup(config);

  const abort = new AbortController();
  const signal = abort.signal;
  Deno.addSignalListener("SIGINT", () => {
    log().info("stopping ...");
    abort.abort();
  });

  const srv = new Server({
    ...config,
    signal,
  });
  await srv.serve();
  log().info("... stopped");
}

await main();
