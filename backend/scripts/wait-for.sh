#!/usr/bin/env sh
set -e
HOST="$1"
PORT="$2"
TIMEOUT="${3:-60}"

echo "Waiting for $HOST:$PORT for up to $TIMEOUT seconds..."
for i in $(seq $TIMEOUT); do
  nc -z "$HOST" "$PORT" >/dev/null 2>&1 && echo "$HOST:$PORT is available" && exit 0
  sleep 1
done

echo "Timeout waiting for $HOST:$PORT"
exit 1
