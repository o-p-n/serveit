FROM golang:1.19.1 AS builder

WORKDIR /working

COPY go.mod go.sum /working
RUN go mod download && go mod verify

COPY . /working
RUN go build -v -o /usr/bin/serveit ./...

FROM scratch AS serveit

WORKDIR /app

COPY --from=builder /usr/bin/serveit /usr/bin/serveit

CMD ["serveit", "/app/web"]