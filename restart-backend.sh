#!/bin/bash
while true; do
  cd /root/.openclaw/workspace/xundao-server
  node server/backend/server.js >> /tmp/xundao-backend.log 2>&1
  echo "[$(date)] Backend crashed, restarting in 5s..." >> /tmp/xundao-backend.log
  sleep 5
done
