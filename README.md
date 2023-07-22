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

A cross-compiling linker needs to be available.  On linux, modern version of GCC and LLVM+Clang already support this.

On MacOS, there are a few options.  The method tested is to use the Homebrew version of LLVM plus a custom linker in Cargo configuration.

First, install LLVM:

```bash
brew install llvm
```

Next, add the following to `~/.cargo/config.toml` (create the file if missing):

```
[target.aarch64-unknown-linux-musl]
linker="/opt/homebrew/opt/llvm/bin/lld

[target.x86_64-unknown-linux-musl]
linker="/opt/homebrew/opt/llvm/bin/lld
```

The above is for an Apple Silicon Mac, on Intel Macs replace `/opt/homebrew/opt` with `/usr/local/opt`
