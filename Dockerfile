##### builder #####
FROM rust:1.70 as builder

# build only dependencies
WORKDIR /working
RUN USER=root cargo new --bin serveit

WORKDIR /working/serveit
COPY ./Cargo.* .
RUN cargo build --release

# build project
RUN rm -rf ./src
COPY ./src ./src
RUN rm -rf ./target/release/serveit* \
    && cargo build --release

##### shipped #####
FROM gcr.io/distroless/cc AS serveit

COPY --from=builder /working/serveit/target/release/serveit /bin/serveit

WORKDIR /app/web
CMD [ "/bin/serveit" ]
