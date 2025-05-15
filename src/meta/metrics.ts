import { StatusCode } from "../constants.ts";
import { MetaHandler } from "./basics.ts";

import { Counter, Registry } from "@wok/prometheus";

export interface Metrics {
  readonly totalRequests: Counter;
  readonly totalResponses: Counter;
}

let instance: MetricsHandler | undefined = undefined;

export function metrics(): Metrics {
  return {
    ...MetricsHandler.open(),
  };
}

export class MetricsHandler implements MetaHandler, Metrics {
  readonly method = "GET";
  readonly path = "/metrics";

  private registry: Registry;
  readonly totalRequests: Counter;
  readonly totalResponses: Counter;

  constructor() {
    this.registry = new Registry();

    this.totalRequests = Counter.with({
      name: "serveit_requests_total",
      help: "total number of requests received",
      labels: [ "method", "path" ],
      registry: [ this.registry ],
    });
    this.totalResponses = Counter.with({
      name: "serveit_responses_total",
      help: "total number of responses sent",
      labels: [ "path", "status" ],
      registry: [ this.registry ],
    })
  }

  async handle(_req: Request): Promise<Response> {
    const content = this.registry.metrics();
    const body = new TextEncoder().encode(content);
    const length = body.length;
    return await Promise.resolve(new Response(body, {
      status: StatusCode.Ok,
      headers: {
        "Content-Type": "text/plain",
        "Content-Length": length.toString(),
      },
    }));
  }

  static open(): MetricsHandler {
    if (!instance) {
      instance = new MetricsHandler();
    }

    return instance;
  }
}
