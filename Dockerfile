##### shipped #####
FROM gcr.io/distroless/static-debian11@sha256:9ecc53c269509f63c69a266168e4a687c7eb8c0cfd753bd8bfcaa4f58a90876f AS serveit
LABEL org.opencontainers.image.source="https://github.com/o-p-n/serveit"

ARG TARGETARCH
ARG TARGETOS

COPY --chmod=755 target/${TARGETOS}-${TARGETARCH} /bin/serveit

WORKDIR /app/web
CMD [ "/bin/serveit" ]
