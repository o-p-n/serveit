# SERVEIT - Dead-simple Web Server

SERVEIT is a very simple web server.  It serves all files from a specified directory on port 4000.  It is intended to be run in a container, hence the almost complete lack of configurability.

## RUNNING

To run SERVEIT in its container, mount a directory to serve to `/app/web` and publish the container's port 4000:

```
docker run <options> --volume $PWD/web:/app/web --publish 4000:4000 --name serveit linuxwolf/serveit:<TAG>
```

### INCREASING/DECREASING LOG VERBOSITY

By default SERVEIT logs at `INFO`.  At this level, the out of each request is logged, as well as errors encountered.

To increase the log level, send the signal `USR1` to the container/process.  For example, in docker:

```
docker kill --signal USR1 serveit
```

To decrease the log level, send the signal `USR2` to the container/process.  For example, in docker:

```
docker kill --signal USR2 serveit
```

## BUILDING

To build, use `docker build` (or `docker buildx build`):

```
docker build -t <REPO>/serveit:latest .
```

