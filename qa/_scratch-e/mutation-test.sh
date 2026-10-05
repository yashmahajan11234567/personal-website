#!/bin/bash
# MUTATION TEST: revert each fix in turn and confirm the new tests FAIL.
#
# A regression test that passes both before and after a fix proves nothing. Each
# mutation below restores the exact pre-fix code, runs only the new spec, and
# asserts it fails. Any pass means the test is not detecting its bug.
set -u
cd /d/Yash/personal-website || exit 1

SPEC=qa/phase2/correction-pass-three-fixes.spec.ts
LOG=/tmp/mut.log

kill_port() {
  for P in $(netstat -ano | grep ":5174" | grep LISTENING | awk '{print $NF}' | sort -u); do
    MSYS_NO_PATHCONV=1 taskkill /F /T /PID $P >/dev/null 2>&1
  done
  sleep 2
}

run_spec() {
  kill_port
  npx playwright test "$SPEC" --reporter=line --workers=1 > "$LOG" 2>&1
  echo $?
}

# Snapshot the three files so each mutation can be undone exactly.
cp src/game/scenes/WorldScene.ts /tmp/m-WS.ts
cp src/components/WorldShell.css /tmp/m-WS.css
cp src/components/InfoPanel.css /tmp/m-IP.css

restore() {
  cp /tmp/m-WS.ts src/game/scenes/WorldScene.ts
  cp /tmp/m-WS.css src/components/WorldShell.css
  cp /tmp/m-IP.css src/components/InfoPanel.css
}

echo "=============== BASELINE (all fixes in place) ==============="
RC=$(run_spec)
echo "baseline exit=$RC"
grep -E "passed|failed" "$LOG" | tail -3
if [ "$RC" != "0" ]; then echo "BASELINE FAILED -- fix the spec before mutating"; restore; exit 1; fi

echo
echo "=============== MUTATION 1: revert the exit-pipe visibility fix ==============="
# The original: only the destination's ENTRY pipe is visible.
python - <<'PY'
import io
p = "src/game/scenes/WorldScene.ts"
s = io.open(p, encoding="utf-8").read()
old = """          const entryId = world.entryPipe.id;
          const exitId = world.exitPipe?.id ?? null;
          const live = new Set<string>([entryId]);
          if (exitId) live.add(exitId);

          for (const [id, built] of this.pipeSkins) {
            built.mouth.setVisible(live.has(id));"""
new = """          const entryId = world.entryPipe.id;

          for (const [id, built] of this.pipeSkins) {
            built.mouth.setVisible(id === entryId);"""
assert old in s, "MUTATION 1 anchor not found"
io.open(p, "w", encoding="utf-8").write(s.replace(old, new))
print("mutation 1 applied")
PY
RC=$(run_spec)
echo "mutation 1 exit=$RC (expect NON-zero)"
grep -E "✘|failed|passed" "$LOG" | tail -6
restore

echo
echo "=============== MUTATION 2: revert the exit-control specificity fix ==============="
# The original: a bare `.world-exit` rule that App.css outranks.
python - <<'PY'
import io
p = "src/components/WorldShell.css"
s = io.open(p, encoding="utf-8").read()
old_sel = ".placeholder-world[data-theme='dark'] button.world-exit {"
assert old_sel in s, "MUTATION 2 anchor not found"
s = s.replace(old_sel, ".world-exit {")
s = s.replace(".placeholder-world[data-theme='dark'] button.world-exit::before {", ".world-exit::before {")
s = s.replace(".placeholder-world[data-theme='dark'] button.world-exit:hover {", ".world-exit:hover {")
io.open(p, "w", encoding="utf-8").write(s)
print("mutation 2 applied")
PY
RC=$(run_spec)
echo "mutation 2 exit=$RC (expect NON-zero)"
grep -E "✘|failed|passed" "$LOG" | tail -6
restore

echo
echo "=============== MUTATION 3: revert the panel line-height reset ==============="
# The original: no `line-height` reset on `.info-panel`, so the stage's
# `line-height: 0` collapses every control's line box to zero height.
python - <<'PY'
import io, re
p = "src/components/InfoPanel.css"
s = io.open(p, encoding="utf-8").read()
s2 = re.sub(r"\n  /\*\n   \* RESET `line-height`.*?\n   \*/\n  line-height: normal;\n\}", "\n}", s, flags=re.S)
assert s2 != s, "MUTATION 3 anchor not found"
io.open(p, "w", encoding="utf-8").write(s2)
print("mutation 3 applied")
PY
RC=$(run_spec)
echo "mutation 3 exit=$RC (expect NON-zero)"
grep -E "✘|failed|passed" "$LOG" | tail -6
restore

echo
echo "=============== MUTATION 4: remove the BACK button from the header ==============="
python - <<'PY'
import io, re
p = "src/components/InfoPanel.tsx"
s = io.open(p, encoding="utf-8").read()
io.open("/tmp/m-IP.tsx", "w", encoding="utf-8").write(s)
m = re.search(r"\n        \{\/\*\n          THE LABELLED BACK CONTROL\..*?</button>\n", s, flags=re.S)
assert m, "MUTATION 4 anchor not found"
io.open(p, "w", encoding="utf-8").write(s[:m.start()] + "\n" + s[m.end():])
print("mutation 4 applied")
PY
RC=$(run_spec)
echo "mutation 4 exit=$RC (expect NON-zero)"
grep -E "✘|failed|passed" "$LOG" | tail -6
cp /tmp/m-IP.tsx src/components/InfoPanel.tsx
restore

echo
echo "=============== MUTATION 5: re-freeze the player (the bug I introduced) ==============="
python - <<'PY'
import io
p = "src/game/scenes/WorldScene.ts"
s = io.open(p, encoding="utf-8").read()
old = """          for (const [id, built] of this.pipeSkins) {
            built.mouth.setVisible(live.has(id));"""
new = """          for (const [id, built] of this.pipeSkins) {
            built.mouth.setVisible(live.has(id));
            built.setActive(false);"""
assert old in s, "MUTATION 5 anchor not found"
io.open(p, "w", encoding="utf-8").write(s.replace(old, new, 1))
print("mutation 5 applied")
PY
RC=$(run_spec)
echo "mutation 5 exit=$RC (expect NON-zero)"
grep -E "✘|failed|passed" "$LOG" | tail -6
restore

echo
echo "=============== RESTORED: confirm green again ==============="
RC=$(run_spec)
echo "restored exit=$RC (expect 0)"
grep -E "passed|failed" "$LOG" | tail -3

echo
echo "=============== git diff must be empty vs the snapshots ==============="
diff -q /tmp/m-WS.ts src/game/scenes/WorldScene.ts && echo "WorldScene.ts: identical"
diff -q /tmp/m-WS.css src/components/WorldShell.css && echo "WorldShell.css: identical"
diff -q /tmp/m-IP.css src/components/InfoPanel.css && echo "InfoPanel.css: identical"
diff -q /tmp/m-IP.tsx src/components/InfoPanel.tsx && echo "InfoPanel.tsx: identical"
kill_port
echo "MUTATION SUITE DONE"