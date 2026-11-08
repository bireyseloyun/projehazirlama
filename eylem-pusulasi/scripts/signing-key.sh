#!/usr/bin/env bash
set -euo pipefail
signing_dir="$RUNNER_TEMP/eylem-signing"
mkdir -p "$signing_dir"
# Updates must use the owner's existing key, supplied as repository secrets.
if [[ -n "${EYLEM_SIGNING_KEY_B64:-}" && -n "${EYLEM_SIGNING_PASSWORD:-}" ]]; then
  printf '%s' "$EYLEM_SIGNING_KEY_B64" | base64 --decode > "$signing_dir/release.jks"
  printf '%s' "$EYLEM_SIGNING_PASSWORD" > "$signing_dir/password.txt"
else
  previous="$(gh api "repos/$GITHUB_REPOSITORY/actions/runs?branch=eylem-pusulasi-android&status=success&per_page=100" --jq '.workflow_runs | length')"
  if [[ "$previous" != "0" ]]; then
    echo "An APK was already delivered. Configure the owner's signing key secrets before building an update; a different key will not be generated."
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
