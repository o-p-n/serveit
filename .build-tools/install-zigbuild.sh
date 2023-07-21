#! /bin/bash

set -euo pipefail

ZIGBUILD_VERSION=0.16.12

if [[ $(cargo install --list | grep "cargo-zigbuild v${ZIGBUILD_VERSION}") != "" ]] ; then
  echo "cargo-zigbuild v${ZIGBUILD_VERSION} already installed"
else
  cargo install --version 0.16.12 cargo-zigbuild --force
  echo "cargo-zigbuild v${ZIGBUILD_VERSION} installed"
fi
