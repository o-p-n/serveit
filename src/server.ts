/**
 * @copyright 2023 Matthew A. Miller
 */

import { join } from "../deps/src/path.ts";
import { Status, ServeInit, serve } from "../deps/src/http.ts";

import logger from "./util/log.ts";
import { find } from "./file.ts";

export const _internal = {
  find,
  serve,
};

export const DEFAULT_SERVEINIT: ServeInit = {
  port: 4000,
  onListen: ({ port, hostname }) => {
    logger.info(`listening on http://${hostname}:${port}/`);
  }
}

export class Server {
  readonly root: string;

  constructor(root: string) {
    this.root = root;
    this.handle = this.handle.bind(this);
  }

  async serve(init?: ServeInit) {
    return await _internal.serve(this.handle, {
      ...DEFAULT_SERVEINIT,
      ...init,
    });
  }

  async handle(req: Request): Promise<Response> {
    const method = req.method.toUpperCase();
    const url = new URL(req.url);
    const path = url.pathname;

    let rsp: Response;
    if (method !== "GET") {
      rsp = new Response(Status[Status.MethodNotAllowed], { status: Status.MethodNotAllowed });
    } else {
      const etag = req.headers.get("etag") || undefined;

      try {
        rsp = await this.lookup(path, etag);
      } catch (err) {
        logger.error(`failed to get ${path}: ${err}`);
        rsp = new Response(Status[Status.NotFound], { status: Status.NotFound });
      }
    }

    logger.info(`${rsp.status} ${path} ${rsp.headers.get("Content-Length") || 0}`);
    return rsp;
  }

  async lookup(src: string, etag?: string): Promise<Response> {
    // TODO: implement a cache

    src = join(this.root, src);
    logger.debug(`finding ${src} ...`);

    const entry = await _internal.find(src);
    const headers = {
      "Content-Type": entry.type,
      "Content-Length": entry.size.toString(),
      "ETag": entry.etag,
    };

    if (etag && etag === entry.etag) {
      logger.debug(`${src} unchanged`);

      return new Response(null, {
        status: Status.NotModified,
        headers,
      });
    }

    logger.debug(`opening ${entry.path}...`);
    const body = await entry.open();

    logger.debug(`streaming ${entry.path}`);
    return new Response(body, {
      status: Status.OK,
      headers,
    });
  }
}
