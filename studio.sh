#!/usr/bin/env bash
# Atajo: ./studio.sh <comando>  (equivale a python3 -m studio)
cd "$(dirname "$0")" && exec python3 -m studio "$@"
