/**
 * @copyright 2025 Matthew A. Miller
 */

import log from "../logger.ts";
import { HttpError, InternalServerError, NotFound } from "../errors.ts";
import { ServerConfig } from "../file-server.ts";
import { MetaHandler } from "./basics.ts";

import { HealthHandler } from "./health.ts";
import { MetricsHandler } from "./metrics.ts";

export class MetaServer {
  private config: ServerConfig;

  private handlers: Record<string, MetaHandler> = {};

  constructor(config: ServerConfig) {
    this.config = { ...config };

    this.apply(HealthHandler.open());
    this.apply(MetricsHandler.open());
  }

  get metaPort() {
    return this.config.metaPort;
  }

  private get signal() {
    return this.config.signal;
  }

  private apply(hnd: MetaHandler) {
    const key = `${hnd.method} ${hnd.path}`;

    this.handlers[key] = hnd;
  }

  async serve() {
    const srv = Deno.serve({
      handler: (req: Request) => this.handle(req),
      port: this.metaPort,
      signal: this.signal,
      onListen: (addr: Deno.NetAddr) => (
        log()
          .info`now serving metainfo at ${addr.hostname}:${addr.port}`
      ),
      onError: (err: unknown) => this.error(err),
    });
    await srv.finished;

    log()
      .info`stopped serving metainfo at ${srv.addr.hostname}:${srv.addr.port}`;
  }

  private async handle(req: Request) {
    const method = req.method;
    const path = new URL(req.url).pathname;
    const key = `${method} ${path}`;
    const handler = this.handlers[key];

    if (!handler) {
      return new NotFound().toResponse();
    }

    return await handler.handle(req);
  }

  private error(err: unknown): Response {
    log().error`meta error encountered: ${err}`;

    if (err instanceof HttpError) {
      return err.toResponse();
    }
    return new InternalServerError().toResponse();
  }
}
