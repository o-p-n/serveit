/**
 * @copyright 2024 Matthew A. Miller
 */

import log from "./logger.ts";
import { Config } from "./config.ts";
import { FileEntry } from "./file-entry.ts";
import {
  HttpError,
  InternalServerError,
  MethodNotAllowed,
  NotFound,
} from "./errors.ts";
import { common, join } from "@std/path";

const ALLOWED_METHODS = [
  "GET",
  "HEAD",
  "OPTIONS",
];

export interface ServerConfig extends Config {
  signal?: AbortSignal;
}

export class Server {
  private config: ServerConfig;

  constructor(config: ServerConfig) {
    this.config = { ...config };
  }

  get rootDir() {
    return this.config.rootDir;
  }

  get port() {
    return this.config.port;
  }

  private get signal() {
    return this.config.signal;
  }

  async serve() {
    const srv = Deno.serve({
      handler: (req: Request) => this.handle(req),
      port: this.port,
      signal: this.signal,
      onListen: (addr: Deno.NetAddr) =>
        log.info(
          `now serving directory ${this.rootDir} at ${addr.hostname}:${addr.port}`,
        ),
      onError: (err: unknown) => this.error(err),
    });
    await srv.finished;

    log.info(
      `stopped serving ${this.rootDir} at ${srv.addr.hostname}:${srv.addr.port}`,
    );
  }

  private error(err: unknown): Response {
    log.error(`error encountered: ${err}`);

    if (err instanceof HttpError) {
      return err.toResponse();
    }
    return new InternalServerError().toResponse();
  }

  private async handle(req: Request) {
    const method = req.method;
    const path = new URL(req.url).pathname;
    const etags = req.headers.get("If-None-Match") || undefined;

    let rsp: Response;
    try {
      switch (method) {
        case "OPTIONS":
          rsp = new Response(undefined, {
            status: 204,
            headers: {
              "Allow": ALLOWED_METHODS.join(", "),
            },
          });
          break;
        case "HEAD":
          rsp = await this.lookup(path, etags, true);
          break;
        case "GET":
          rsp = await this.lookup(path, etags, false);
          break;
        default:
          throw new MethodNotAllowed();
      }
    } catch (err) {
      rsp = this.error(err);
    }
    const size = rsp.headers.get("Content-Length") || "0";
    log.info(`${method} ${path} - ${rsp.status} ${size}`);

    return rsp;
  }

  private async lookup(
    path: string,
    etags?: string,
    preview = false,
  ): Promise<Response> {
    path = join(this.config.rootDir, path);
    if (common([this.rootDir, path]) !== this.rootDir) {
      log.warn(`invalid path requested: ${path}`);
      return new NotFound().toResponse();
    }

    const entry = await FileEntry.find(path);
    const headers = entry.headers();

    if (entry.matches(etags)) {
      return new Response(undefined, {
        status: 304,
        statusText: "Not Modified",
        headers,
      });
    }
    const content = preview ? undefined : await entry.open();
    return new Response(content, {
      status: 200,
      statusText: "OK",
      headers,
    });
  }
}
