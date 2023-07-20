##### shipped #####
FROM gcr.io/distroless/static AS serveit

ARG TARGETARCH
ARG TARGETOS

COPY --chmod=755 target/${TARGETOS}-${TARGETARCH} /bin/serveit

WORKDIR /app/web
CMD [ "/bin/serveit" ]
