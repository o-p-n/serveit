FROM lukechannings/deno:1.30.2 AS builder

FROM linuxwolf/busybox:1.34.1.6b78e270e42100250574e9a9dbed00b44ae1d9a6 AS serveit

WORKDIR /app
