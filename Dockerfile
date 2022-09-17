FROM golang:1.19.1 AS builder

WORKDIR /working

COPY go.mod go.sum /working
RUN go mod download && go mod verify

ARG TARGETARCH
ARG TARGETOS

COPY . /working
RUN GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build \
  -o /usr/bin/serveit \
  -buildmode=pie \
  -ldflags='-linkmode external -extldflags "-static-pie"' \
  ./...

FROM linuxwolf/busybox:1.34.1.6b78e270e42100250574e9a9dbed00b44ae1d9a6 AS serveit

WORKDIR /app

COPY --from=builder /usr/bin/serveit /bin/serveit

CMD ["/bin/serveit", "/app/web"]