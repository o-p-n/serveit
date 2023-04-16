FROM lukechannings/deno:v1.30.2 AS builder
WORKDIR /working
COPY . /working
RUN deno compile --output /usr/bin/serveit --allow-env --allow-net --allow-read --no-prompt src/main.ts

FROM ubuntu:22.04 AS serveit

WORKDIR /app/web

COPY --from=builder /usr/bin/serveit /bin/serveit

CMD [ "/bin/serveit" ]
