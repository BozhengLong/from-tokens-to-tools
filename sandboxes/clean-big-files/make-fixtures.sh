#!/usr/bin/env bash
# Create the clean-big-files sandbox fixtures.
# Uses `mkfile -n` (macOS): files report their full LOGICAL size to `ls -la`/`du`
# but occupy almost no real disk (sparse). Safe to regenerate / delete anytime.
set -euo pipefail
cd "$(dirname "$0")"

# files over 1 GB (the ones the task should surface), biggest first:
mkfile -n 3200m archive-old.tar
mkfile -n 2400m video-master.mov
mkfile -n 1800m dataset-2024.zip
mkfile -n 1100m db-dump.sql

# decoys under 1 GB (must NOT be surfaced):
mkfile -n 340m  app.log
mkfile -n 12m   cover-photo.jpg
printf '# project notes\n\nnothing big here.\n' > notes.md

echo "fixtures created in $(pwd):"
ls -la
