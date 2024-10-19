# SERVEIT - Dead-simple Web Server

SERVEIT is a very simple web server. It serves all files from a specified directory on port 4000. It is intended to be run in a container, hence the almost complete lack of configurability.

## RUNNING

To run SERVEIT in its container, mount a directory to serve to `/app/web` and publish the container's port `4000`:

```
docker run <options> \
    --volume $PWD/web:/app/web \
    --publish 4000:4000 \
    gcr.io/o-p-n/serveit:<TAG>
```

### IMAGES

Releases can be found at the [`serveit` container package](https://github.com/o-p-n/serveit/pkgs/container/serveit).  Generally, each release is tagged with its corresponding git commit hash.  There is no `latest` tag, currently.

The following platforms are supported:

* `linux/amd64`
* `linux/arm64`

### CONFIGURING

SERVEIT can be configuring via environment variables:

| Option              | Default    | Description                                                  |
| ------------------- | ---------- | ------------------------------------------------------------ |
| `SERVEIT_ROOT_DIR`  | `/app/web` | The root directory of files to serve.                        |
| `SERVEIT_PORT`      | `"4000"`   | The port to serve on.                                        |
| `SERVEIT_LOG_LEVEL` | `"INFO"`   | The level to log at (`ALL` == everything; `OFF` == nothing). |

## DEVELOPING

### PREREQUISITES

To build `serveit` locally, the following tools must be available in your `PATH`:

* [Deno](https://deno.land/), v2.0.0 or later
* [Crane](https://github.com/google/go-containerregistry/blob/main/cmd/crane/README.md) v0.19.0 or later
* [Task](https://taskfile.dev/), v3.30.0 or later

In addition, Docker v25 or later is required to be installed and running.

It is possible to obtain these using an [installer script](./.github/scripts/install-tooling.sh) for most of these dependencies (plus others needed by GitHub Actions for publishing and distritubing).  By default the script installs tools in `${HOME}/bin`.

### WORKING COPY

This repository uses git modules for some build instructions.  Be sure to clone with recursive submodules to have all the necessary files:

```
git clone --recurse-submodules https://github.com/o-p-n/serveit
```

### TESTING

Run `task test` to execute all unit-tests. Run `task cover` to generate code coverage reports (including HTML); coverage reports are stored in `./coverage/html` in your working copy. 

### BUILDING IMAGES

Run `task image` to build the container image.  This is a multi-arch image, with both `linux/amd64` and `linux/arm64`.
