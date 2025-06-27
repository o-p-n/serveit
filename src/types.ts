import { type LogLevel } from "@logtape/logtape";

export interface Config {
  rootDir: string;
  port: number;
  metaPort: number;
  logLevel: LogLevel | null;
}

export interface ServerConfig extends Config {
  signal?: AbortSignal;
}
