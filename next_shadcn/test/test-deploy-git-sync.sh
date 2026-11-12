#!/bin/bash
# Tests for scripts/deploy-git-sync.sh (the git steps of deploy.sh / deploy_prod.sh).
# Runs entirely against throwaway repos in a temp dir — no network, no real remotes.
#   bash test/test-deploy-git-sync.sh

HERE="$(cd "$(dirname "$0")/.." && pwd)"
HELPER="$HERE/scripts/deploy-git-sync.sh"
PASS=0; FAIL=0
# Several cases expect a failure, so a missing helper must not count as a pass.
[ -f "$HELPER" ] || { echo "❌ missing $HELPER"; exit 1; }

ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ❌ $1"; FAIL=$((FAIL+1)); }

# Given: a bare origin with one commit, cloned as "local" (dev box) and "server".
setup() {
  T="$(mktemp -d)"
  export GIT_AUTHOR_NAME=t GIT_AUTHOR_EMAIL=t@t GIT_COMMITTER_NAME=t GIT_COMMITTER_EMAIL=t@t
  git init -q --bare -b main "$T/origin.git"
  git clone -q "$T/origin.git" "$T/seed" 2>/dev/null
  ( cd "$T/seed" && printf 'a\n' > app.txt && printf '{}\n' > package-lock.json \
      && git add -A && git commit -qm init && git push -q origin main )
  git clone -q "$T/origin.git" "$T/local"
  git clone -q "$T/origin.git" "$T/server"
}
# Push a commit to origin from a third clone (someone else's work / the other machine).
upstream_commit() { # file content
  ( cd "$T/seed" && git pull -q && printf '%s\n' "$2" > "$1" && git add -A && git commit -qm "up $1" && git push -q origin main )
}
teardown() { rm -rf "$T"; }

run() { ( source "$HELPER" && "$@" ) >"$T/out" 2>&1; }

echo "server_sync"

setup
upstream_commit package-lock.json '{"new":1}'
printf '{"churn":1}\n' > "$T/server/package-lock.json"   # left behind by npm install
if run server_sync "$T/server" && [ "$(cat "$T/server/package-lock.json")" = '{"new":1}' ]; then
  ok "should_drop_npm_lockfile_churn_and_fast_forward"
else bad "should_drop_npm_lockfile_churn_and_fast_forward"; cat "$T/out"; fi
teardown

setup
upstream_commit app.txt 'upstream'
printf 'hand edit\n' > "$T/server/app.txt"
if ! run server_sync "$T/server" && [ "$(cat "$T/server/app.txt")" = 'hand edit' ]; then
  ok "should_fail_and_keep_hand_edits_to_tracked_files"
else bad "should_fail_and_keep_hand_edits_to_tracked_files"; cat "$T/out"; fi
teardown

setup
upstream_commit new.txt 'upstream'
printf 'local only\n' > "$T/server/new.txt"
if ! run server_sync "$T/server" && [ "$(cat "$T/server/new.txt")" = 'local only' ]; then
  ok "should_fail_and_keep_untracked_files_that_collide_with_incoming"
else bad "should_fail_and_keep_untracked_files_that_collide_with_incoming"; cat "$T/out"; fi
teardown

setup
( cd "$T/server" && printf 'x\n' > srv.txt && git add srv.txt && git commit -qm "server-only commit" )
upstream_commit app.txt 'upstream'
before="$(git -C "$T/server" rev-parse HEAD)"
if ! run server_sync "$T/server" && [ "$(git -C "$T/server" rev-parse HEAD)" = "$before" ]; then
  ok "should_refuse_to_create_a_merge_commit_on_the_server"
else bad "should_refuse_to_create_a_merge_commit_on_the_server"; cat "$T/out"; fi
teardown

echo "local_sync"

setup
upstream_commit other.txt 'upstream'
printf 'mine\n' > "$T/local/mine.txt"
if run local_sync "$T/local" && git -C "$T/origin.git" cat-file -e main:mine.txt && git -C "$T/origin.git" cat-file -e main:other.txt; then
  ok "should_merge_diverged_origin_then_push"
else bad "should_merge_diverged_origin_then_push"; cat "$T/out"; fi
teardown

setup
upstream_commit app.txt 'upstream'
printf 'mine\n' > "$T/local/app.txt"
origin_before="$(git -C "$T/origin.git" rev-parse main)"
if ! run local_sync "$T/local" \
   && [ "$(git -C "$T/origin.git" rev-parse main)" = "$origin_before" ] \
   && ! git -C "$T/local" rev-parse -q --verify MERGE_HEAD >/dev/null; then
  ok "should_abort_merge_and_push_nothing_on_conflict"
else bad "should_abort_merge_and_push_nothing_on_conflict"; cat "$T/out"; fi
teardown

echo ""
echo "passed: $PASS  failed: $FAIL"
[ "$FAIL" -eq 0 ]
