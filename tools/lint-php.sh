#!/usr/bin/env bash
# Lint semua PHP proyek di dalam container wp-env (php -l). Gagal bila ada satu file rusak.
set -euo pipefail
find wp-content/mu-plugins wp-content/themes/jatman tools tests/php -name '*.php' -print0 | xargs -0 -n1 php -l
