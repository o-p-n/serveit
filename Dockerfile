FROM rust:1.70 as builder
WORKDIR /working
COPY . /working
RUN cargo build --release

FROM gcr.io/distroless/cc AS serveit

WORKDIR /app/web

COPY --from=builder /working/target/release/serveit /bin/serveit

CMD [ "/bin/serveit" ]
