#! /bin/bash

set -euo pipefail

config_dir=$(mktemp -d)

cat << ---EOF--- > ${config_dir}/buildx.toml
debug = true
insecure-entitlements = [ "network.host", "security.insecure" ]
[registry."${DOCKER_REGISTRY_HOST}:${DOCKER_REGISTRY_PORT}"]
  http = true
  insecure = true
---EOF---

docker buildx create --name "${DOCKER_BUILDER}" \
  --driver docker-container \
  --driver-opt network=host \
  --config ${config_dir}/buildx.toml \
  --bootstrap

rm -rf ${config_dir}
