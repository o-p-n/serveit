import { StatusCode } from "../constants.ts";
import { MetaHandler } from "./basics.ts";

export interface HealthStats {
  healthy: boolean;
  uptime: number;
}

export interface Health extends HealthStats {
  update(status: boolean): void;
}

let instance: HealthHandler | undefined = undefined;

export function health(): Health {
  const instance = HealthHandler.open();

  return {
    get healthy() {
      return instance.healthy;
    },
    get uptime() {
      return instance.uptime;
    },
    update(stat: boolean) {
      instance.update(stat);
    },
  };
}

export class HealthHandler implements MetaHandler {
  readonly path = "/health";
  readonly method = "GET";
  readonly started = Date.now();

  private _healthy = false;
  // TODO: reason for unhealthy

  get healthy() {
    return this._healthy;
  }

  get uptime() {
    return Date.now() - this.started;
  }

  update(status: boolean) {
    this._healthy = status;
  }

  async handle(_req: Request): Promise<Response> {
    const stats = {
      healthy: this.healthy,
      uptime: this.uptime,
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

  static open(): HealthHandler {
    if (!instance) {
      instance = new HealthHandler();
    }
    return instance;
  }
}
