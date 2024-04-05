FROM gcr.io/distroless/static-debian11@sha256:9ecc53c269509f63c69a266168e4a687c7eb8c0cfd753bd8bfcaa4f58a90876f as base

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
