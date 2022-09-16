PROJECT=serveit
DOCKER_REPO_OWNER=linuxwolf
DOCKER_CACHE=.cache/docker

include .builder/main.mk

.builder/main.mk:
	git clone -q https://github.com/o-p-n/image-builder.git -b main .builder

image: linuxwolf/serveit

linuxwolf/serveit: Dockerfile
