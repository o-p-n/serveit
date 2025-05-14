/**
 * @copyright 2025 Matthew A. Miller
 */

import log from "./logger.ts";
import { HttpError, InternalServerError, NotFound } from "./errors.ts";
import { ServerConfig } from "./file-server.ts";

export class MetaServer {
  private config: ServerConfig;

  constructor(config: ServerConfig) {
    this.config = { ...config };
  }

  get metaPort() {
    return this.config.metaPort;
  }

  private get signal() {
    return this.config.signal;
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

  private async handle(_req: Request): Promise<Response> {
    const rsp = new NotFound().toResponse();

    return await Promise.resolve(rsp);
  }

  private error(err: unknown): Response {
    log().error`meta error encountered: ${err}`;

    if (err instanceof HttpError) {
      return err.toResponse();
    }
    return new InternalServerError().toResponse();
  }
}
