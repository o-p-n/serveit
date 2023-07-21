PROJECT=serveit
DOCKER_REPO_OWNER=o-p-n
DOCKER_BUILDER=container-builder
DOCKER_CACHE=${HOME}/.cache/docker-buildx
STAMP=latest

include .builder/main.mk

PATH := $(shell pwd)/.zig:$(PATH)

.PHONY: clean cargo-zigbuild compile image image-only

##### SETUP #####

.builder/main.mk:
	git clone -q https://github.com/o-p-n/image-builder.git -b main .builder

.zig/zig:
	./.build-tools/download-zig.sh

cargo-zigbuild:
	./.build-tools/install-zigbuild.sh

##### CLEANING #####

clean-compile:
	cargo clean

clean: clean-compile

clean-all: clean-compile clean-cache clean-builder

##### RUST BINARIES #####

compile: target/linux-amd64 target/linux-arm64

target/linux-arm64: target/aarch64-unknown-linux-musl
	cp target/aarch64-unknown-linux-musl/release/serveit target/linux-arm64

target/linux-amd64: target/x86_64-unknown-linux-musl
	cp target/x86_64-unknown-linux-musl/release/serveit target/linux-amd64

target/aarch64-unknown-linux-musl: .zig/zig cargo-zigbuild
	rustup target add aarch64-unknown-linux-musl \
	&& cargo zigbuild --release --target aarch64-unknown-linux-musl

target/x86_64-unknown-linux-musl: .zig/zig cargo-zigbuild
	rustup target add x86_64-unknown-linux-musl \
	&& cargo zigbuild --release --target x86_64-unknown-linux-musl

##### CONTAINAER IMAGES #####

image: compile Dockerfile image-only

image-only: $(DOCKER_REPO_OWNER)/serveit

# $(DOCKER_REPO_OWNER)/serveit:

