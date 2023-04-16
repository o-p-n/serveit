/**
 * @copyright 2023 Matthew A. Miller
 */

export enum LogLevel {
  ALL = 0,
  TRACE,
  DEBUG,
  INFO,
  WARNING,
  ERROR,
  CRITICAL,
  OFF,
}

export const LOG_LEVEL_NAMES = Object.keys(LogLevel).filter((k) => isNaN(parseInt(k)));

export function fromLevelName(name: string): LogLevel | undefined {
  const idx = LOG_LEVEL_NAMES.indexOf(name.toUpperCase());
  if (idx< 0) {
    return undefined;
  }
  return idx as LogLevel;
}

export const DEFAULT_LOG_LEVEL = LogLevel.INFO;

export class Logger {
  level: LogLevel;

  constructor(level = DEFAULT_LOG_LEVEL) {
    this.level = level;
  }

  louder(): LogLevel {
    if (this.level > LogLevel.ALL) {
      this.level = this.level - 1;
    }
    return this.level;
  }
  softer(): LogLevel {
    if (this.level < LogLevel.OFF) {
      this.level = this.level + 1;
    }
    return this.level;
  }

  #log(lvl: LogLevel, message: string) {
    if (this.level > lvl) return;

    const timestamp = new Date().toISOString();
    const level = LogLevel[lvl];

    const output = `${timestamp} [${level}] ${message}`;
    console.log(output);
  }

  trace(message: string) {
    return this.#log(LogLevel.TRACE, message);
  }

  debug(message: string) {
    return this.#log(LogLevel.DEBUG, message);
  }

  info(message: string) {
    return this.#log(LogLevel.INFO, message);
  }

  warning(message: string) {
    return this.#log(LogLevel.WARNING, message);
  }

  error(message: string) {
    return this.#log(LogLevel.ERROR, message);
  }

  critical(message: string) {
    return this.#log(LogLevel.CRITICAL, message);
  }
}

const log = new Logger();
export default log;
