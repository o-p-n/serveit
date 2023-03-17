/**
 * @copyright 2023 Matthew A. Miller
 */

import { join } from "../deps/src/path.ts";
import { Status } from "../deps/src/http.ts";

import logger from "./util/log.ts";
import { find } from "./file.ts";

export const _internal = {
  find,
};

export class Server {
  readonly root: string;

  constructor(root: string) {
    this.root = root;
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
    return new Response(body, {
      status: Status.OK,
      headers,
    });
  }
}
