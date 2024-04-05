FROM gcr.io/distroless/static-debian12@sha256:41972110a1c1a5c0b6adb283e8aa092c43c31f7c5d79b8656fbffff2c3e61f05 as base

ARG TARGETARCH
ARG TARGETOS

COPY --chmod=755 target/${TARGETOS}-${TARGETARCH} /bin/serveit

# New stage in order to collapse layers
FROM scratch
LABEL org.opencontainers.image.source="https://github.com/o-p-n/serveit"

# collapse layers
COPY --from=base / /

WORKDIR /app/web

CMD [ "/bin/serveit" ]
