##### shipped #####
FROM gcr.io/distroless/static AS serveit

ARG TARGETARCH
ARG TARGETOS

COPY target/${TARGETOS}-${TARGETARCH} /bin/serveit

WORKDIR /app/web
CMD [ "/bin/serveit" ]
