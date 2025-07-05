import { StatusCode } from "../constants.ts";
import { MetaHandler } from "./basics.ts";

import { Counter, Gauge, Registry, Summary } from "@wok/prometheus";

export interface Metrics {
  readonly totalRequests: Counter;
  readonly totalResponses: Counter;
  readonly duration: Summary;

  readonly totalIndexingRuns: Counter;
  readonly indexedFilesCount: Gauge;
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
  readonly duration: Summary;

  readonly totalIndexingRuns: Counter;
  readonly indexedFilesCount: Gauge;

  constructor() {
    this.registry = new Registry();

    this.totalRequests = Counter.with({
      name: "serveit_txn_requests_total",
      help: "total number of requests received",
      labels: ["method", "path"],
      registry: [this.registry],
    });
    this.totalResponses = Counter.with({
      name: "serveit_txn_responses_total",
      help: "total number of responses sent",
      labels: ["path", "status"],
      registry: [this.registry],
    });
    this.duration = Summary.with({
      name: "serveit_txn_duration",
      help: "duration between request and response (in ms)",
      labels: ["method"],
      quantiles: [0.25, 0.50, 0.75, 0.90, 1],
      registry: [this.registry],
    });

    this.totalIndexingRuns = Counter.with({
      name: "serveit_indexing_runs_total",
      help: "total number of file indexing runs",
      registry: [this.registry],
    });
    this.indexedFilesCount = Gauge.with({
      name: "serveit_indexed_files_count",
      help: "number of indexed files",
      registry: [this.registry],
    });
  }

  async handle(_req: Request): Promise<Response> {
    const content = this.registry.metrics();
    const body = new TextEncoder().encode(content);
    const length = body.length;
    return await Promise.resolve(
      new Response(body, {
        status: StatusCode.Ok,
        headers: {
          "Content-Type": "text/plain",
          "Content-Length": length.toString(),
        },
      }),
    );
  }

  static open(): MetricsHandler {
    if (!instance) {
      instance = new MetricsHandler();
    }

    return instance;
  }
}
