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

### CONFIGURING

SERVEIT can be configuring via environment variables:

| Option              | Default    | Description                                                  |
| ------------------- | ---------- | ------------------------------------------------------------ |
| `SERVEIT_ROOT_DIR`  | `/app/web` | The root directory of files to serve.                        |
| `SERVEIT_PORT`      | `"4000"`   | The port to serve on.                                        |
| `SERVEIT_LOG_LEVEL` | `"INFO"`   | The level to log at (`ALL` == everything; `OFF` == nothing). |
