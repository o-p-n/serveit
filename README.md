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
| `SERVEIT_ROOT_DIR`  | `/app/web` | The root directory of files to serve.                         |
| `SERVEIT_PORT`      | `"4000"`   | The port to serve files on.                                   |
| `SERVEIT_META_PORT` | `"9090"`  | The port to serve metainfo on.                               |
| `SERVEIT_LOG_LEVEL` | `"INFO"`   | The level to log at (`ALL` == everything; `OFF` == nothing). |

### OBSERVABILITY

The "main" port (`SERVEIT_PORT`) serves static file content via HTTP.  Observability data is accessible on the "meta" port (`SERVEIT_META_PORT`).  This includes a healthcheck and telemetry metics.

> **!!! WARNING !!!** The meta endpoint can provide potentially privileged information about the service, and therefore should not be publicly accessible.

#### SERVICE HEALTH

The endpoint path `/health` provides healthcheck information about the running SERVEIT.  Since this is a "dead-simple" web server, this endpoint (currently) always returns a `200` status code along with `application/json` content.  The JSON object content has the following properties:

* **`"healthy"`** (_`boolean`_): set to `true` if the service is considered healthy (which is always).
* **`"updtime"`** (_`number`_): the number of milliseconds that SERVEIT has been running.

This endpoint should be used by the orchestration framework for readiness and/or liveness checks.

#### TELEMETRY METRICS

The endpoint path `/metrics` provides telemetry metfrics about SERVEIT.  The following metrics are reported, formatted as [Prometheus](https://prometheus.io) expects:

* **`serveit_txn_requests_total`** (_counter_): The total number of requests received.  The following labels are used:
  * **`path`**: the HTTP path of the request
  * **`method`**: the HTTP method of the request

* **`serveit_txn_responses_total`** (_counter_): The total number of responses sent.  The following labels are used:
  * **`path`**: The HTTP path from the associated request.
  * **`status`**: The HTTP status code returned

* **`serveit_duration`** (_summary_): The duration it takes from receiving the requeset to sending the response, in milliseconds.  The following labels are used:
  * **`method`**: The HTTP method of the request

## DEVELOPING

### PREREQUISITES

To build `serveit` locally, the following tools must be available in your `PATH`:

* [Deno](https://deno.land/), v2.0.0 or later
* [Crane](https://github.com/google/go-containerregistry/blob/main/cmd/crane/README.md) v0.19.0 or later
* [Task](https://taskfile.dev/), v3.30.0 or later
* [Docker](https://docker.com/), v25 or later

It is possible to obtain most of these (excluding Docker) using an [installer script](./.github/scripts/install-tooling.sh) for most of these dependencies (plus others needed by GitHub Actions for publishing and distritubing).  By default the script installs tools in `${HOME}/bin`.

In addition, git hooks are managed using [Lefthook](https://github.com/evilmartians/lefthook).  It currently has the following hooks:

* `pre-push` — runs code styling checks (linting and format-checking)

### WORKING COPY

This repository uses git modules for some build instructions.  Be sure to clone with recursive submodules to have all the necessary files:

```
git clone --recurse-submodules https://github.com/o-p-n/serveit
```

### TESTING

Run `task test` to execute all unit-tests. Run `task cover` to generate code coverage reports (including HTML); coverage reports are stored in `./coverage/html` in your working copy. 

### BUILDING IMAGES

Run `task image` to build the container image.  This is a multi-arch image, with both `linux/amd64` and `linux/arm64`.
