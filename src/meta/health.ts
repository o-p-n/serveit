
import { StatusCode } from "../constants.ts";
import { MetaHandler } from "./basics.ts";

export interface HealthStats {
  healthy: boolean;
  uptime: number;
}

export class Health implements MetaHandler {
  readonly path = "/health";
  readonly method = "GET";
  readonly started = Date.now();

  async handle(_req: Request): Promise<Response> {
    const stats = {
      healthy: true,
      uptime: Date.now() - this.started,
    };

    const body = new TextEncoder().encode(JSON.stringify(stats));
    const len = body.length;
    const rsp = new Response(body, {
      status: StatusCode.Ok,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": len.toString(),
      },
    });

    return await Promise.resolve(rsp);
  }
}
