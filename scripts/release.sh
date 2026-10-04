#!/usr/bin/env bash
# Cut a client release: bump package.json, commit, tag.  Usage: scripts/release.sh 1.5.0
set -euo pipefail
v=${1:?usage: release.sh X.Y.Z}
cd "$(dirname "$0")/.."
node -e "const p=require('./package.json');p.version='$v';require('fs').writeFileSync('package.json',JSON.stringify(p,null,2)+'\n')"
git add package.json
git commit -q -m "chore(release): v$v"
git tag -a "v$v" -m "MiniRide client $v"
echo "released v$v"
