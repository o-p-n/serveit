FROM gcr.io/distroless/cc-debian12@sha256:e1065a1d58800a7294f74e67c32ec4146d09d6cbe471c1fa7ed456b2d2bf06e0 as base

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
