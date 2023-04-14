/**
 * @copyright 2023 Matthew A. Miller
 */

export enum Level {
  ALL = 0,
  TRACE,
  DEBUG,
  INFO,
  WARNING,
  ERROR,
  CRITICAL,
  OFF,
}

const DEFAULT_LEVEL = Level.INFO;

export class Logger {
  level: Level;

  constructor(level = DEFAULT_LEVEL) {
    this.level = level;
  }

  louder(): Level {
    if (this.level > Level.ALL) {
      this.level = this.level - 1;
    }
    return this.level;
  }
  softer(): Level {
    if (this.level < Level.OFF) {
      this.level = this.level + 1;
    }
    return this.level;
  }

  #log(lvl: Level, message: string) {
    if (this.level > lvl) return;

    const timestamp = new Date().toISOString();
    const level = Level[lvl];

    const output = `${timestamp} [${level}] ${message}`;
    console.log(output);
  }

  trace(message: string) {
    return this.#log(Level.TRACE, message);
  }

  debug(message: string) {
    return this.#log(Level.DEBUG, message);
  }

  info(message: string) {
    return this.#log(Level.INFO, message);
  }

  warning(message: string) {
    return this.#log(Level.WARNING, message);
  }

  error(message: string) {
    return this.#log(Level.ERROR, message);
  }

  critical(message: string) {
    return this.#log(Level.CRITICAL, message);
  }
}

const log = new Logger();
export default log;
