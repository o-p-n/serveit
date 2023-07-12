PROJECT=serveit
DOCKER_REPO_OWNER=linuxwolf
DOCKER_BUILDER=container-builder
DOCKER_CACHE=${HOME}/.cache/docker-buildx
STAMP=latest

include .builder/main.mk

PATH := $(shell pwd)/.zig:$(PATH)

.builder/main.mk:
	git clone -q https://github.com/o-p-n/image-builder.git -b main .builder

.PHONY: cargo-zigbuild binaries image image-only

##### RUST BINARIES #####

binaries: target/linux-amd64 target/linux-arm64

cargo-zigbuild:
	cargo install cargo-zigbuild

target/linux-arm64: target/aarch64-unknown-linux-musl
	cp target/aarch64-unknown-linux-musl/release/serveit target/linux-arm64

target/linux-amd64: target/x86_64-unknown-linux-musl
	cp target/x86_64-unknown-linux-musl/release/serveit target/linux-amd64

target/aarch64-unknown-linux-musl: .zig/zig cargo-zigbuild
	cargo zigbuild --release --target aarch64-unknown-linux-musl

target/x86_64-unknown-linux-musl: .zig/zig cargo-zigbuild
	cargo zigbuild --release --target x86_64-unknown-linux-musl

##### CONTAINAER IMAGES #####

image: target/linux-amd64 target/linux-arm64 Dockerfile image-only

image-only: linuxwolf/serveit

linuxwolf/serveit:

.zig/zig:
	./build-tools/download-zig.sh

