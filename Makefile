PROJECT=serveit
DOCKER_REPO_OWNER=linuxwolf
DOCKER_BUILDER=container-builder
DOCKER_CACHE=${HOME}/.cache/docker-buildx
STAMP=latest

include .builder/main.mk

.builder/main.mk:
	git clone -q https://github.com/o-p-n/image-builder.git -b main .builder

image: linuxwolf/serveit

linuxwolf/serveit: Dockerfile
