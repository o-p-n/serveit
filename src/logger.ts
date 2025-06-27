/** */

import {
  configure,
  defaultConsoleFormatter,
  getConsoleSink,
  getLogger,
  type LogLevel,
  reset,
} from "@logtape/logtape";
import { type Config } from "./types.ts";

export async function setup(config: Config) {
  const level: LogLevel | null = config.logLevel;

  await configure({
    sinks: {
      console: getConsoleSink({
        formatter: defaultConsoleFormatter,
      }),
    },
    loggers: [
      {
        category: ["app"],
        sinks: ["console"],
        level,
      },
      {
        category: ["logtape", "meta"],
        level: "fatal",
      },
    ],
  });
}

export { reset };

export default function log() {
  return getLogger(["app"]);
}
