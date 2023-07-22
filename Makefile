PROJECT=serveit
DOCKER_REPO_OWNER=o-p-n
DOCKER_BUILDER=container-builder
DOCKER_CACHE=${HOME}/.cache/docker-buildx
STAMP=latest

SOURCES=$(wildcard src/**/*.rs)

include .builder/main.mk

.PHONY: clean compile image-only image

##### SETUP #####

.builder/main.mk:
	git clone -q https://github.com/o-p-n/image-builder.git -b main .builder

##### CLEANING #####

clean:
	git clean -dfx .

clean-all: clean clean-cache clean-builder

##### RUST BINARIES #####

compile: target/linux-amd64 target/linux-arm64

target/linux-arm64: target/aarch64-unknown-linux-musl/release/serveit
	cp target/aarch64-unknown-linux-musl/release/serveit target/linux-arm64

target/linux-amd64: target/x86_64-unknown-linux-musl/release/serveit
	cp target/x86_64-unknown-linux-musl/release/serveit target/linux-amd64

target/aarch64-unknown-linux-musl/release/serveit: $(SOURCES)
	rustup target add aarch64-unknown-linux-musl \
	&& cargo build --release --target aarch64-unknown-linux-musl

target/x86_64-unknown-linux-musl/release/serveit: $(SOURCES)
	rustup target add x86_64-unknown-linux-musl \
	&& cargo build --release --target x86_64-unknown-linux-musl

##### CHECKS #####

lint:
	cargo clippy --no-deps

fmt-check:
	cargo fmt --check

##### CONTAINAER IMAGES #####

image: compile Dockerfile image-only

image-only: $(DOCKER_REPO_OWNER)/serveit

# $(DOCKER_REPO_OWNER)/serveit:

