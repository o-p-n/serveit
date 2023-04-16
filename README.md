# SERVEIT - Dead-simple Web Server

SERVEIT is a very simple web server. It serves all files from a specified directory on port 4000. It is intended to be run in a container, hence the almost complete lack of configurability.

## RUNNING

To run SERVEIT in its container, mount a directory to serve to `/app/web` and publish the container's port 4000:

```
docker run <options> --volume $PWD/web:/app/web --publish 4000:4000 --name serveit linuxwolf/serveit:<TAG>
```
## BUILDING

To build, use `docker build` (or `docker buildx build`):

```
docker build -t <REPO>/serveit:latest .
```
