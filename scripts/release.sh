#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

VERSION=$(node -p "require('./package.json').version")
NAME=$(node -p "require('./package.json').name")

awk -v ver="$VERSION" '$0 ~ "^## " ver "( |$)" { found=1 } END { exit !found }' CHANGELOG.md \
  || { echo "CHANGELOG.md has no section for $VERSION" >&2; exit 1; }

if npm view "$NAME@$VERSION" version >/dev/null 2>&1; then
  echo "$VERSION is already on npm" >&2
  exit 1
fi

if git rev-parse -q --verify "refs/tags/v$VERSION" >/dev/null; then
  echo "tag v$VERSION already exists" >&2
  exit 1
fi

git tag "v$VERSION"
git push origin "v$VERSION"
gh release create "v$VERSION" --title "$VERSION" --notes "$(awk -v ver="$VERSION" '$0 ~ "^## " ver "( |$)" { found=1; next } found && /^## / { exit } found { print }' CHANGELOG.md)"
npm publish
