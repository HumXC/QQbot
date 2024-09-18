# syntax=docker/dockerfile:1

FROM golang:1.23.1 AS build 
WORKDIR /app
COPY . .
RUN go mod download
RUN CGO_ENABLED=0 go build -o ./qqbot

FROM alpine
WORKDIR /app
COPY --from=build /app/qqbot .
CMD ["/app/qqbot"]