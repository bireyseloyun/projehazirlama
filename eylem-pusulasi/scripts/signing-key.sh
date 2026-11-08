#!/usr/bin/env bash
set -euo pipefail
signing_dir="$RUNNER_TEMP/eylem-signing"
mkdir -p "$signing_dir"
# Keep an existing key so future APKs update the app without uninstalling it.
artifact_id="$(gh api --paginate "repos/$GITHUB_REPOSITORY/actions/artifacts?name=eylem-signing-key&per_page=100" --jq '.artifacts[] | select(.expired == false) | .id' | head -n 1)"
if [[ -n "$artifact_id" ]]; then
  gh api "repos/$GITHUB_REPOSITORY/actions/artifacts/$artifact_id/zip" > "$RUNNER_TEMP/eylem-signing.zip"
  unzip -q "$RUNNER_TEMP/eylem-signing.zip" -d "$signing_dir"
else
  previous="$(gh api "repos/$GITHUB_REPOSITORY/actions/runs?branch=eylem-pusulasi-android&status=success&per_page=100" --jq '.workflow_runs | length')"
  if [[ "$previous" != "0" ]]; then
    echo "Previous signing key is no longer available. Restore the user's signing backup instead of generating a different key."
    exit 1
  fi
  password="$(openssl rand -hex 32)"
  printf '%s' "$password" > "$signing_dir/password.txt"
  keytool -genkeypair -keystore "$signing_dir/release.jks" -storetype JKS -alias eylem \
    -storepass "$password" -keypass "$password" -keyalg RSA -keysize 3072 -validity 20000 \
    -dname "CN=Eylem Pusulasi" -noprompt
fi
test -s "$signing_dir/release.jks"
test -s "$signing_dir/password.txt"
password="$(cat "$signing_dir/password.txt")"
echo "::add-mask::$password"
echo "EYLEM_KEYSTORE=$signing_dir/release.jks" >> "$GITHUB_ENV"
echo "EYLEM_KEY_PASSWORD=$password" >> "$GITHUB_ENV"
