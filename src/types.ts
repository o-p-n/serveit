import { Config } from "./config.ts";

export interface ServerConfig extends Config {
  signal?: AbortSignal;
}

