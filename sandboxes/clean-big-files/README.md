# clean-big-files sandbox

A scratch folder that *looks* like a messy downloads directory full of huge files.
Used to capture a real Claude Code session for the "clean big files" scenario of the
from-tokens-to-tools demo.

## Setup

```bash
./make-fixtures.sh
```

This creates **sparse** fixture files — they report multi-GB sizes to `ls -la`/`du`
but use almost no real disk. The generated files are gitignored; only this README and
the generator are tracked.

Files over 1 GB (what a cleanup task should find): `archive-old.tar` (3.2G),
`video-master.mov` (2.4G), `dataset-2024.zip` (1.8G), `db-dump.sql` (1.1G).
Decoys under 1 GB: `app.log` (340M), `cover-photo.jpg` (12M), `notes.md`.

## The task to run

> List the files larger than 1 GB in this folder, biggest first, and save the list to `big-files.txt`.
