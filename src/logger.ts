/**
 * 
 */

export enum LogLevel {
  ALL = 0,
  DEBUG = 10,
  VERBOSE = 20,
  INFO = 30,
  WARN = 40,
  ERROR = 50,
  OFF = 100,
};

const LOG_LEVEL_NAMES = Object.entries(LogLevel).reduce((acc, entry) => {
  const [key, value] = entry;
  if (typeof value === "number") {
    acc[key] = value;
  }
  return acc;
}, {} as Record<string, LogLevel>);

export type LogMessage = string | (() => string);

export function fromLevelName(name: string): LogLevel {
  if (name in LOG_LEVEL_NAMES) {
    return LOG_LEVEL_NAMES[name];
  }

  throw new Error(`no log level found for name: ${name}`);
}

export function toLevelName(lvl: LogLevel): string {
  if (lvl in LogLevel) {
    return LogLevel[lvl];
  }
  throw new Error(`not a log level: ${lvl}`);
}

export class Logger {
  level: LogLevel;

  constructor(level = LogLevel.INFO) {
    this.level = level;
  }

  get levelName(): string {
    return toLevelName(this.level);
  }
  set levelName(name: string) {
    this.level = fromLevelName(name);
  }

  #log(lvl: LogLevel, msg: LogMessage) {
    if (lvl < this.level) { return; }

    const timestamp = new Date().toISOString();
    const level = toLevelName(lvl);
    const message = typeof msg === "function"
      ? msg()
      : msg;
    console.log(`${timestamp} [${level}]: ${message}`);
  }

  debug(msg: LogMessage) {
    this.#log(LogLevel.DEBUG, msg);
  }

  verbose(msg: LogMessage) {
    this.#log(LogLevel.VERBOSE, msg);
  }

  info(msg: LogMessage) {
    this.#log(LogLevel.INFO, msg);
  }

  warn(msg: LogMessage) {
    this.#log(LogLevel.WARN, msg);
  }

  error(msg: LogMessage) {
    this.#log(LogLevel.ERROR, msg);
  }
}
