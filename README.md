# SERVEIT - Dead-simple Web Server

SERVEIT is a very simple web server. It serves all files from a specified directory on port 4000. It is intended to be run in a container, hence the almost complete lack of configurability.

## RUNNING

To run SERVEIT in its container, mount a directory to serve to `/app/web` and publish the container's port 4000:

```
docker run <options> --volume $PWD/web:/app/web --publish 4000:4000 --name serveit linuxwolf/serveit:<TAG>
```

### CONFIGURING

SERVEIT can be configuring via environment variables:

| Option              | Default  | Description                                                  |
| ------------------- | -------- | ------------------------------------------------------------ |
| `SERVEIT_ROOT_DIR`  | `$PWD`   | The root directory of files to serve.                        |
| `SERVEIT_PORT`      | `"4000"` | The port to serve on.                                        |
| `SERVEIT_LOG_LEVEL` | `"INFO"` | The level to log at (`ALL` == everything; `OFF` == nothing). |

## BUILDING

### PREREQUISITES

The following need to be installed in order to build:

* Docker (version `20.0` or higher)
* Make (version `3.81` or higher)
* Rust via `rustup` (version `1.70.0` or higher)

### CROSS-COMPILING

A cross-compiling linker needs to be available.  LLVM's' `lld` is such a linker that is available for all of this project's supported platforms.  This project uses version `15.0.7` in CI.

The easiest method is to install a pre-built package:
* **Ubuntu/Debian:** there are DEB and RPM packages available for many distributions
* **MacOS:** can be installed via Homebrew (`brew install llvm`) as a Keg-only

Make note of where LLVM is installed and the path to `lld`.  For MacOS + Homebrew, `brew --prefix llvm` will provide the base path, then append `/bin/lld`.  For Linux, it is often in `/usr/bin` with the version appended (e.g., `/usr/bin/llvm-15`).

For a persistent setup, add the following to `~/.cargo/config.toml` (create the file if missing), replacing `<path/to/lld>` with the absolute path that LLVM's `lld` is located:

```
[target.aarch64-unknown-linux-musl]
linker="<path/to/lld>"

[target.x86_64-unknown-linux-musl]
linker="<path/to/lld>"
```

Alternatively, the environment variables `TARGET_AARCH64_UNKNOWN_LINUX_MUSL_LINKER` and `TARGET_X86_64_UNKNOWN_LINUX_MUSL_LINKER` can be set, both with the absolute path to your installed `lld`.
