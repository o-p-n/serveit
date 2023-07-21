##### shipped #####
FROM gcr.io/distroless/static AS serveit
LABEL org.opencontainers.image.source="https://github.com/o-p-n/serveit"

ARG TARGETARCH
ARG TARGETOS

COPY --chmod=755 target/${TARGETOS}-${TARGETARCH} /bin/serveit

WORKDIR /app/web
CMD [ "/bin/serveit" ]
