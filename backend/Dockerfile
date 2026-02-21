FROM golang:1.24-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /fire-server ./cmd/server

FROM alpine:3.19
RUN apk add --no-cache ca-certificates
COPY --from=builder /fire-server /fire-server
COPY migrations/ /migrations/
EXPOSE 8080
ENTRYPOINT ["/fire-server"]
