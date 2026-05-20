#!/usr/bin/env bash
# Rainz SkyCam Pi installer
set -euo pipefail

cd "$(dirname "$0")"

echo "==> Installing system deps"
sudo apt update
sudo apt install -y python3 python3-venv libcamera-apps || true

echo "==> Setting up Python venv"
if [ ! -d venv ]; then python3 -m venv venv; fi
./venv/bin/pip install --upgrade pip
./venv/bin/pip install requests python-dotenv

if [ ! -f .env ]; then
  cp .env.example .env
  echo "==> Created .env — edit it with your station code and upload key."
fi

echo "==> Installing systemd service"
sudo cp rainz-skycam.service /etc/systemd/system/rainz-skycam.service
sudo systemctl daemon-reload
sudo systemctl enable rainz-skycam.service

echo "Done. Start with: sudo systemctl start rainz-skycam.service"
