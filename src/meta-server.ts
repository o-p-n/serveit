/**
 * @copyright 2025 Matthew A. Miller
 */

import log from "./logger.ts";
import { HttpError, InternalServerError, NotFound } from "./errors.ts";
import { ServerConfig } from "./file-server.ts";
import { StatusCode } from "./constants.ts";

export interface HealthStats {
  healthy: boolean;
  uptime: number;
}

export class MetaServer {
  private config: ServerConfig;

  private started = new Date();

  constructor(config: ServerConfig) {
    this.config = { ...config };
  }

  get metaPort() {
    return this.config.metaPort;
  }

  private get signal() {
    return this.config.signal;
  }

  get startTime() {
    return this.started.getTime();
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

  private handle(req: Request) {
    const path = new URL(req.url).pathname;

    switch (path) {
      case "/health":
        return this.health();
    }

    return new NotFound().toResponse();
  }

  private error(err: unknown): Response {
    log().error`meta error encountered: ${err}`;

    if (err instanceof HttpError) {
      return err.toResponse();
    }
    return new InternalServerError().toResponse();
  }

  private health() {
    const stats = {
      healthy: true,
      uptime: Date.now() - this.startTime,
    }

    const body = new TextEncoder().encode(JSON.stringify(stats));
    const len = body.length;
    return new Response(body, {
      status: StatusCode.Ok,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": len.toString(),
      },
    });
  }
}
