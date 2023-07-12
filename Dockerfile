##### shipped #####
FROM gcr.io/distroless/cc AS serveit

ARG TARGETARCH
ARG TARGETOS

COPY target/${TARGETOS}-${TARGETARCH} /bin/serveit

WORKDIR /app/web
CMD [ "/bin/serveit" ]
