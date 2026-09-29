#!/usr/bin/env node
// Runs the Claude hooks in .claude/hooks against a table of tool calls and checks
// each exit code (0 allows, 2 blocks). CI runs it (`pnpm check:hooks`). Every case
// starts bash, which takes minutes on Windows, so the pre-commit hook leaves it out.
//
// upstream-readonly.sh and git-write-protection.sh read only the JSON on stdin and
// compare paths as text, so their cases use a made-up Windows project directory
// and behave the same on the Linux runner. branch-verification.sh asks git for the
// branch, so its cases use throwaway repositories in the OS temp directory.
import {execFileSync, spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const HOOKS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '.claude', 'hooks');
const PROJECT = 'D:\\work\\inkweave-admin';
const UP = `${PROJECT}\\upstream\\inkweave`;
const FWD = 'D:/work/inkweave-admin'; // the same directory as D:/ and Git Bash (/d/) paths
const MSYS = '/d/work/inkweave-admin';

/** Exit code and first stderr line of `hook` (a name in .claude/hooks, or a path) for one tool call. */
export function runHook(hook, payload, env = {}) {
  const result = spawnSync('bash', [path.isAbsolute(hook) ? hook : path.join(HOOKS, hook)], {
    input: JSON.stringify(payload),
    env: {...process.env, CLAUDE_PROJECT_DIR: PROJECT, ...env},
    encoding: 'utf8',
  });
  // Without an exit status, say why instead of reporting a bare null.
  if (result.error) return {code: null, err: `bash did not start: ${result.error.message}`};
  if (result.signal) return {code: null, err: `hook killed by ${result.signal}`};
  return {code: result.status, err: (result.stderr || '').trim().split('\n')[0]};
}

const bash = (command, cwd = PROJECT) => ({tool_name: 'Bash', cwd, tool_input: {command}});
const pwsh = (command, cwd = PROJECT) => ({tool_name: 'PowerShell', cwd, tool_input: {command}});
const edit = (file_path) => ({tool_name: 'Edit', cwd: PROJECT, tool_input: {file_path, old_string: 'a', new_string: 'b'}});

/** [hook, tool call, expected exit code, label] */
export const cases = [
  // upstream-readonly: Edit|Write
  ['upstream-readonly.sh', edit(`${UP}\\README.md`), 2, 'Edit upstream/inkweave/README.md'],
  ['upstream-readonly.sh', edit(`${PROJECT}\\src\\main.tsx`), 0, 'Edit src/main.tsx'],
  // upstream-readonly: Bash, read-only git inside upstream passes
  ['upstream-readonly.sh', bash('git -C upstream/inkweave status --porcelain'), 0, 'git -C upstream status'],
  ['upstream-readonly.sh', bash("git -C upstream/inkweave log -1 --format='%h %s'"), 0, 'git -C upstream log'],
  ['upstream-readonly.sh', bash('git -C upstream/inkweave remote get-url origin'), 0, 'git -C upstream remote get-url'],
  ['upstream-readonly.sh', bash('git -C upstream/inkweave branch --show-current 2>/dev/null'), 0, 'git -C upstream branch --show-current 2>/dev/null'],
  ['upstream-readonly.sh', bash('git -C upstream/inkweave fetch'), 0, 'git -C upstream fetch'],
  ['upstream-readonly.sh', bash('cd upstream/inkweave/apps/web && git status'), 0, 'cd deep into upstream && git status'],
  ['upstream-readonly.sh', bash('cd upstream/inkweave && cd ../.. && git status'), 0, 'cd upstream, cd back, git status'],
  ['upstream-readonly.sh', bash('git submodule foreach git status'), 0, 'submodule foreach git status'],
  ['upstream-readonly.sh', bash('echo "$(git -C upstream/inkweave rev-parse HEAD)"'), 0, '$(git -C upstream rev-parse) in quotes'],
  ['upstream-readonly.sh', bash(`git -C '${FWD}/upstream/inkweave' status`), 0, 'absolute D:/ path, status'],
  // upstream-readonly: Bash, writes inside upstream are hard-blocked
  ['upstream-readonly.sh', bash('git -C upstream/inkweave commit --allow-empty -m probe'), 2, 'git -C upstream commit'],
  ['upstream-readonly.sh', bash('USER_APPROVED=1 git -C upstream/inkweave commit -m x'), 2, 'approved git -C upstream commit (still hard)'],
  ['upstream-readonly.sh', bash('git -C upstream/inkweave push'), 2, 'git -C upstream push'],
  ['upstream-readonly.sh', bash('git -C upstream/inkweave reset --hard'), 2, 'git -C upstream reset --hard'],
  ['upstream-readonly.sh', bash('git -C upstream/inkweave checkout -- .'), 2, 'git -C upstream checkout -- .'],
  ['upstream-readonly.sh', bash('git -C upstream/inkweave pull'), 2, 'git -C upstream pull'],
  ['upstream-readonly.sh', bash('cd upstream/inkweave && git commit -m x'), 2, 'cd upstream && git commit'],
  ['upstream-readonly.sh', bash(`cd ${MSYS}/upstream/inkweave; git reset --hard HEAD`), 2, 'cd /d/... upstream; reset'],
  ['upstream-readonly.sh', bash("git submodule foreach 'git reset --hard'"), 2, "submodule foreach 'git reset --hard'"],
  ['upstream-readonly.sh', bash('git -C "upstream/inkweave" -c core.x=1 commit -m x'), 2, 'quoted -C plus -c, commit'],
  ['upstream-readonly.sh', bash('echo "$(git -C upstream/inkweave reset --hard)"'), 2, '$(git -C upstream reset) in quotes'],
  ['upstream-readonly.sh', bash('bash -c "cd upstream/inkweave && git commit -m x"'), 2, 'bash -c "cd upstream && commit"'],
  ['upstream-readonly.sh', bash('git --work-tree=upstream/inkweave checkout .'), 2, '--work-tree=upstream checkout'],
  ['upstream-readonly.sh', bash(`git -C "${UP}" reset --hard`), 2, 'Windows backslash path, reset'],
  ['upstream-readonly.sh', bash('git reset --hard', UP), 2, 'shell cwd inside upstream, reset'],
  ['upstream-readonly.sh', bash('git log -1', UP), 0, 'shell cwd inside upstream, log'],
  // upstream-readonly: soft blocks (USER_APPROVED=1 bypass)
  ['upstream-readonly.sh', bash('git submodule update --remote upstream/inkweave'), 2, 'submodule update --remote'],
  ['upstream-readonly.sh', bash('USER_APPROVED=1 git submodule update --remote upstream/inkweave'), 0, 'approved submodule update --remote'],
  ['upstream-readonly.sh', bash('git submodule update --init'), 0, 'submodule update --init'],
  ['upstream-readonly.sh', bash('git -c user.name=x commit --allow-empty -m probe'), 2, 'git -c k=v commit'],
  ['upstream-readonly.sh', bash('USER_APPROVED=1 git -c user.name=x commit -m x'), 0, 'approved git -c k=v commit'],
  ['upstream-readonly.sh', bash('USER_APPROVED=1 git -c user.name=x commit -m x | tail -3'), 2, 'approved but piped git -c commit'],
  ['upstream-readonly.sh', bash('git -C . push'), 2, 'git -C . push'],
  // upstream-readonly: things that are not its business
  ['upstream-readonly.sh', bash('git commit -m "msg"'), 0, 'literal git commit (the other hook owns it)'],
  ['upstream-readonly.sh', bash('git commit -m "cd upstream/inkweave && git reset --hard"'), 0, 'quoted message naming upstream'],
  ['upstream-readonly.sh', bash("USER_APPROVED=1 git commit -F - <<'EOF'\ndocs: mention git -C upstream/inkweave reset --hard\nEOF"), 0, 'heredoc message naming upstream'],
  ['upstream-readonly.sh', bash('git status'), 0, 'git status'],
  ['upstream-readonly.sh', bash('pnpm lint'), 0, 'pnpm lint'],
  // upstream-readonly: PowerShell tool
  ['upstream-readonly.sh', pwsh('git -C upstream/inkweave status --porcelain'), 0, 'PS git -C upstream status'],
  ['upstream-readonly.sh', pwsh('git -C upstream/inkweave commit -m x'), 2, 'PS git -C upstream commit'],
  ['upstream-readonly.sh', pwsh('git -C upstream\\inkweave reset --hard'), 2, 'PS backslash path (literal), reset'],
  ['upstream-readonly.sh', pwsh('Set-Location upstream\\inkweave; git reset --hard'), 2, 'PS Set-Location upstream; reset'],
  ['upstream-readonly.sh', pwsh('sl -Path upstream/inkweave; git clean -fd'), 2, 'PS sl -Path upstream; clean'],
  ['upstream-readonly.sh', pwsh('Push-Location upstream/inkweave; git status; Pop-Location'), 0, 'PS Push-Location; status; Pop-Location'],
  ['upstream-readonly.sh', pwsh('Push-Location upstream/inkweave; Pop-Location; git reset --hard'), 0, 'PS pushed and popped, reset in admin (not ours)'],
  ['upstream-readonly.sh', pwsh(`cd ${UP}; git log -1`), 0, 'PS cd absolute upstream; log'],
  ['upstream-readonly.sh', pwsh('& git -C upstream/inkweave push'), 2, 'PS & git -C upstream push'],
  ['upstream-readonly.sh', pwsh("$env:X='1'; git -C upstream/inkweave checkout -- ."), 2, 'PS $env: then checkout in upstream'],
  ['upstream-readonly.sh', pwsh('powershell -Command "git -C upstream/inkweave reset --hard"'), 2, 'PS powershell -Command nested'],
  ['upstream-readonly.sh', pwsh('cmd /c "git -C upstream\\inkweave commit -m x"'), 2, 'PS cmd /c nested'],
  ['upstream-readonly.sh', pwsh('git submodule update --remote'), 2, 'PS submodule update --remote (always)'],
  ['upstream-readonly.sh', pwsh('git -c user.name=x commit -m x'), 2, 'PS git -c commit (always)'],
  ['upstream-readonly.sh', pwsh('git log -1 --format="%h `"quoted`""'), 0, 'PS backtick-escaped quotes'],
  ['upstream-readonly.sh', pwsh("git commit -m 'it''s fine'"), 0, "PS literal commit, '' escape (other hook owns it)"],
  ['upstream-readonly.sh', pwsh("$m = @'\ncd upstream/inkweave; git reset --hard\n'@\nWrite-Output $m"), 0, 'PS here-string naming upstream'],
  ['upstream-readonly.sh', pwsh('Get-ChildItem upstream'), 0, 'PS Get-ChildItem upstream'],
  // upstream-readonly: redirections (review on PR #5)
  ['upstream-readonly.sh', bash('printf data > upstream/inkweave/file'), 2, 'printf > upstream file'],
  ['upstream-readonly.sh', bash('echo x >> upstream/inkweave/README.md'), 2, 'echo >> upstream file'],
  ['upstream-readonly.sh', bash('echo hi>upstream/inkweave/x'), 2, 'glued redirect hi>upstream/...'],
  ['upstream-readonly.sh', bash('> upstream/inkweave/x'), 2, 'bare truncate > upstream/...'],
  ['upstream-readonly.sh', bash('echo x &> upstream/inkweave/log'), 2, '&> upstream file'],
  ['upstream-readonly.sh', bash('echo x >| upstream/inkweave/f'), 2, '>| upstream file'],
  ['upstream-readonly.sh', bash('echo x 2> upstream/inkweave/err.log'), 2, '2> upstream file'],
  ['upstream-readonly.sh', bash('cd upstream/inkweave && echo x > notes.txt'), 2, 'cd upstream && echo > relative file'],
  ['upstream-readonly.sh', bash(`echo x > ${MSYS}/upstream/inkweave/f`), 2, 'absolute /d/ path redirect'],
  ['upstream-readonly.sh', bash("git submodule foreach 'echo x > f'"), 2, "submodule foreach 'echo > f'"],
  ['upstream-readonly.sh', bash('git -C upstream/inkweave log 2>&1 | tail -3'), 0, 'git -C upstream log 2>&1 | tail'],
  ['upstream-readonly.sh', bash('cd upstream/inkweave && git log 2>&1'), 0, 'cd upstream && git log 2>&1 (dup, no file)'],
  ['upstream-readonly.sh', bash('cd upstream/inkweave && git status 2>/dev/null'), 0, 'cd upstream && 2>/dev/null'],
  ['upstream-readonly.sh', bash('git -C upstream/inkweave log > /tmp/out.txt'), 0, 'redirect out of upstream to /tmp'],
  ['upstream-readonly.sh', bash('cat upstream/inkweave/README.md > notes.txt'), 0, 'read upstream, write admin file'],
  ['upstream-readonly.sh', bash('echo "a > upstream/inkweave/x"'), 0, 'quoted > is text'],
  ['upstream-readonly.sh', bash('cat < upstream/inkweave/README.md'), 0, 'input redirect from upstream'],
  ['upstream-readonly.sh', bash('cat <<< "upstream/inkweave"'), 0, 'herestring'],
  ['upstream-readonly.sh', bash('echo x > $OUT'), 0, 'unexpanded variable target'],
  ['upstream-readonly.sh', pwsh('"x" > upstream\\inkweave\\f'), 2, 'PS > upstream file (backslashes)'],
  ['upstream-readonly.sh', pwsh('Get-Content a.txt *> upstream/inkweave/log.txt'), 2, 'PS *> upstream file'],
  ['upstream-readonly.sh', pwsh('git -C upstream/inkweave log 2>$null'), 0, 'PS 2>$null'],
  ['upstream-readonly.sh', pwsh('Push-Location upstream/inkweave; git log 2>&1; Pop-Location'), 0, 'PS in upstream, 2>&1'],
  ['upstream-readonly.sh', pwsh('"x" | Out-File upstream/inkweave/f'), 0, 'PS Out-File (cmdlet write: out of scope)'],
  // upstream-readonly: heredocs (second review on PR #5)
  ['upstream-readonly.sh', bash('cat <<EOF\nsome text\nEOF\ngit -C upstream/inkweave reset --hard'), 2, 'git write after a heredoc'],
  ['upstream-readonly.sh', bash('cat <<-EOF\n\tbody\n\tEOF\ngit -C upstream/inkweave push'), 2, '<<- heredoc (tab terminator), then push'],
  ['upstream-readonly.sh', bash("cat <<'EOF'\nbody\nEOF\necho x > upstream/inkweave/f"), 2, "quoted <<'EOF', then redirect"],
  ['upstream-readonly.sh', bash('cat <<A <<B\na body\nA\nb body\nB\ngit -C upstream/inkweave reset --hard'), 2, 'two heredocs on one line, then write'],
  ['upstream-readonly.sh', bash("git commit -m \"$(cat <<'EOF'\nmsg\nEOF\n)\" && git -C upstream/inkweave push"), 2, 'commit-message heredoc, then upstream push'],
  ['upstream-readonly.sh', bash('cat <<EOF\ngit -C upstream/inkweave reset --hard\nEOF'), 0, 'heredoc body naming a write is data'],
  ['upstream-readonly.sh', bash("git commit -m \"$(cat <<'EOF'\nfix: echo x > upstream/inkweave/f\nEOF\n)\""), 0, 'commit message naming a redirect is data'],
  ['upstream-readonly.sh', bash('cat <<EOF\ngit -C upstream/inkweave reset --hard'), 0, 'unterminated heredoc: rest is body (bash semantics)'],
  // upstream-readonly: unquoted heredocs expand, comments don't count (third review on PR #5)
  ['upstream-readonly.sh', bash('cat <<EOF\n$(git -C upstream/inkweave reset --hard)\nEOF'), 2, 'unquoted heredoc: $(...) in body runs'],
  ['upstream-readonly.sh', bash('cat <<EOF\n`git -C upstream/inkweave reset --hard`\nEOF'), 2, 'unquoted heredoc: `...` in body runs'],
  ['upstream-readonly.sh', bash('cat <<EOF\nnested $(echo $(git -C upstream/inkweave reset --hard))\nEOF'), 2, 'unquoted heredoc: nested substitution'],
  ['upstream-readonly.sh', bash("cat <<'EOF'\n$(git -C upstream/inkweave reset --hard)\nEOF"), 0, "quoted <<'EOF': body is literal"],
  ['upstream-readonly.sh', bash('cat <<"EOF"\n$(git -C upstream/inkweave reset --hard)\nEOF'), 0, 'quoted <<"EOF": body is literal'],
  ['upstream-readonly.sh', bash('cat <<\\EOF\n$(git -C upstream/inkweave reset --hard)\nEOF'), 0, 'backslash <<\\EOF: body is literal'],
  ['upstream-readonly.sh', bash('cat <<EOF\ncost: \\$(git -C upstream/inkweave reset --hard)\nEOF'), 0, 'unquoted heredoc: escaped \\$( is text'],
  ['upstream-readonly.sh', bash('cat <<EOF\na > upstream/inkweave/x\nEOF'), 0, 'unquoted heredoc: > in body is text'],
  ['upstream-readonly.sh', bash('# <<EOF\ngit -C upstream/inkweave reset --hard'), 2, 'heredoc marker in a comment'],
  ['upstream-readonly.sh', bash('echo hi # <<EOF\ngit -C upstream/inkweave reset --hard'), 2, 'trailing comment with a heredoc marker'],
  ['upstream-readonly.sh', bash('echo x # > upstream/inkweave/f'), 0, 'redirect inside a comment is text'],
  ['upstream-readonly.sh', bash('echo x # ; git -C upstream/inkweave reset --hard'), 0, 'git write inside a comment is text'],
  ['upstream-readonly.sh', bash('echo ${#HOME} $# a#b; git -C upstream/inkweave reset --hard'), 2, '# inside words is not a comment'],
  // upstream-readonly: full delimiter words (fourth review on PR #5)
  ['upstream-readonly.sh', bash('cat <<END.txt\nbody\nEND.txt\ngit -C upstream/inkweave reset --hard'), 2, 'delimiter END.txt, then git write'],
  ['upstream-readonly.sh', bash('cat <<END-OF-FILE\nbody\nEND-OF-FILE\ngit -C upstream/inkweave reset --hard'), 2, 'delimiter END-OF-FILE, then git write'],
  ['upstream-readonly.sh', bash('cat <<END.txt\n$(git -C upstream/inkweave reset --hard)\nEND.txt'), 2, 'unquoted END.txt: $(...) in body runs'],
  ['upstream-readonly.sh', bash("cat <<'END.txt'\n$(git -C upstream/inkweave reset --hard)\nEND.txt"), 0, "quoted 'END.txt': body is literal"],
  ['upstream-readonly.sh', bash('cat <<E"OF"\n$(git -C upstream/inkweave reset --hard)\nEOF'), 0, 'partly quoted E"OF": literal, ends at EOF'],
  ['upstream-readonly.sh', bash('cat <<EOF>out.txt\nbody\nEOF\ngit -C upstream/inkweave reset --hard'), 2, 'delimiter ends at a metacharacter (EOF>out)'],
  // upstream-readonly: quote-aware substitution scan (fourth review on PR #5)
  ['upstream-readonly.sh', bash("cat <<EOF\n$(printf '%s' ')' ; git -C upstream/inkweave reset --hard)\nEOF"), 2, "heredoc $(...) with a quoted ')'"],
  ['upstream-readonly.sh', bash('cat <<EOF\n$(printf "%s" ")" ; git -C upstream/inkweave reset --hard)\nEOF'), 2, 'heredoc $(...) with a double-quoted ")"'],
  ['upstream-readonly.sh', bash("echo \"$(printf '%s' ')' ; git -C upstream/inkweave reset --hard)\""), 2, "\"$(...)\" with a quoted ')' at top level"],
  ['upstream-readonly.sh', bash('echo "$(echo "$(git -C upstream/inkweave reset --hard)")"'), 2, 'nested "$(... "$(...)" ...)"'],
  ['upstream-readonly.sh', bash("echo \"$(printf '%s' ')')\""), 0, "harmless \"$(...)\" with a quoted ')'"],
  ['upstream-readonly.sh', bash("echo \"$(git -C upstream/inkweave log -1 --format='%h (%s)')\""), 0, 'read-only git with parens in quotes'],
  // upstream-readonly: cubic review on PR #5
  ['upstream-readonly.sh', edit(`${PROJECT}\\Upstream\\Inkweave\\README.md`), 2, 'Edit with mixed-case Upstream\\Inkweave path'],
  ['upstream-readonly.sh', bash('GIT_DIR=upstream/inkweave/.git git reset --hard'), 2, 'GIT_DIR=upstream prefix, reset'],
  ['upstream-readonly.sh', bash('GIT_WORK_TREE=upstream/inkweave git checkout .'), 2, 'GIT_WORK_TREE=upstream prefix, checkout'],
  ['upstream-readonly.sh', bash('env GIT_DIR=upstream/inkweave/.git git commit -m x'), 2, 'env GIT_DIR=upstream git commit'],
  ['upstream-readonly.sh', bash('export GIT_DIR=upstream/inkweave/.git; git reset --hard'), 2, 'export GIT_DIR=upstream; reset'],
  ['upstream-readonly.sh', bash('GIT_DIR=upstream/inkweave/.git; git status'), 0, 'GIT_DIR=upstream; status (read-only)'],
  ['upstream-readonly.sh', bash('export GIT_DIR=upstream/inkweave/.git; unset GIT_DIR; git add .'), 0, 'unset GIT_DIR clears it'],
  ['upstream-readonly.sh', bash('bash -lc "git -C upstream/inkweave commit -m x"'), 2, 'bash -lc nested commit'],
  ['upstream-readonly.sh', bash('bash -l -c "cd upstream/inkweave && git add -A"'), 2, 'bash -l -c nested add'],
  ['upstream-readonly.sh', bash('bash -o pipefail -c "git -C upstream/inkweave reset --hard"'), 2, 'bash -o pipefail -c nested reset'],
  ['upstream-readonly.sh', bash('bash -lc "git -C upstream/inkweave status"'), 0, 'bash -lc nested status (read-only)'],
  // upstream-readonly: PowerShell subexpressions (CodeRabbit, after the cubic round)
  ['upstream-readonly.sh', pwsh('Write-Output "$((git -C upstream/inkweave reset --hard))"'), 2, 'PS "$((git ...))" nested subexpression'],
  ['upstream-readonly.sh', pwsh('"$(Get-Date) and $(git -C upstream/inkweave checkout -- .)"'), 2, 'PS two subexpressions, second writes'],
  ['upstream-readonly.sh', pwsh("Write-Output \"$(Write-Output 'a)b'; git -C upstream/inkweave reset --hard)\""), 2, "PS subexpression with a quoted ')'"],
  ['upstream-readonly.sh', pwsh('Write-Output "$(git -C upstream/inkweave log -1)"'), 0, 'PS "$(git ... log)" read-only'],
  ['upstream-readonly.sh', pwsh('Write-Output "cost: `$(git -C upstream/inkweave reset --hard)"'), 0, 'PS backtick-escaped `$( is text'],
  // upstream-readonly: single quotes, bash $'...' and PowerShell comments and here-strings (#9)
  ['upstream-readonly.sh', bash("echo '$(git -C upstream/inkweave reset --hard)'"), 0, 'single-quoted $(...) is text'],
  ['upstream-readonly.sh', bash("echo '`git -C upstream/inkweave reset --hard`'"), 0, 'single-quoted `...` is text'],
  ['upstream-readonly.sh', bash('echo "$(echo \'$(git -C upstream/inkweave reset --hard)\')"'), 0, 'single quotes inside a substitution'],
  ['upstream-readonly.sh', bash('echo "it\'s $(git -C upstream/inkweave reset --hard)"'), 2, "' inside double quotes is text, $(...) runs"],
  ['upstream-readonly.sh', bash('echo \'a\' "$(git -C upstream/inkweave reset --hard)" \'b\''), 2, '$(...) between single-quoted words'],
  ['upstream-readonly.sh', bash("cat <<EOF\n'$(git -C upstream/inkweave reset --hard)'\nEOF"), 2, 'unquoted heredoc: quotes are text, $(...) runs'],
  ['upstream-readonly.sh', bash("echo $'\\'' ; git -C upstream/inkweave reset --hard ; ''"), 2, "$'\\'' then a git write"],
  ['upstream-readonly.sh', bash("echo $'\\'' \"$(git -C upstream/inkweave reset --hard)\" ''"), 2, "$'\\'' then \"$(...)\""],
  ['upstream-readonly.sh', bash("echo $'it\\'s $(git -C upstream/inkweave reset --hard)'"), 0, "$'...' is text"],
  ['upstream-readonly.sh', bash("echo $'\\'' # ' ; git -C upstream/inkweave reset --hard"), 0, "$'\\'' then a comment"],
  ['upstream-readonly.sh', pwsh("Write-Output '$(git -C upstream/inkweave reset --hard)'"), 0, 'PS single-quoted $(...) is text'],
  ['upstream-readonly.sh', pwsh("Write-Output 'it''s $(git -C upstream/inkweave reset --hard)'"), 0, "PS '' inside single quotes"],
  ['upstream-readonly.sh', pwsh('Write-Output "it\'s $(git -C upstream/inkweave reset --hard)"'), 2, "PS ' inside double quotes, $(...) runs"],
  ['upstream-readonly.sh', pwsh('$m = @"\n$(git -C upstream/inkweave reset --hard)\n"@'), 2, 'PS @"..."@ here-string runs its $(...)'],
  ['upstream-readonly.sh', pwsh('$m = @"\nit\'s $(git -C upstream/inkweave reset --hard)\n"@'), 2, 'PS @"..."@: quotes in the body are text'],
  ['upstream-readonly.sh', pwsh("$m = @'\n$(git -C upstream/inkweave reset --hard)\n'@"), 0, "PS @'...'@ here-string is text"],
  ['upstream-readonly.sh', pwsh("Write-Output ok # it's\ngit -C upstream/inkweave reset --hard # '"), 2, "PS comment with ', then a git write"],
  ['upstream-readonly.sh', pwsh("<# it's #> git -C upstream/inkweave reset --hard"), 2, 'PS <# ... #> comment, then a git write'],
  ['upstream-readonly.sh', pwsh("git log -1 # don't worry"), 0, "PS comment with ' after a read-only git"],
  ['upstream-readonly.sh', pwsh('Write-Output "a # b" ; git -C upstream/inkweave reset --hard'), 2, 'PS # inside double quotes is text'],
  ['upstream-readonly.sh', pwsh("Write-Output 'a # b' ; git -C upstream/inkweave reset --hard"), 2, 'PS # inside single quotes is text'],
  ['upstream-readonly.sh', pwsh('git log --format=%h#%s -1; git -C upstream/inkweave reset --hard'), 2, 'PS # inside a word is not a comment'],
  // upstream-readonly: substitutions run where they appear, and bash runs them and ( ... ) in a subshell (#11)
  ['upstream-readonly.sh', bash('echo "$(cd upstream/inkweave; git reset --hard)" && cd /tmp'), 2, '"$(cd upstream; write)" before a later cd'],
  ['upstream-readonly.sh', bash('echo $(cd upstream/inkweave; git reset --hard) && cd /tmp'), 2, '$(cd upstream; write) before a later cd'],
  ['upstream-readonly.sh', bash('cd upstream/inkweave; echo $(cd /tmp); git reset --hard'), 2, 'cd inside $(...) stays in its subshell'],
  ['upstream-readonly.sh', bash('cd upstream/inkweave; echo `cd /tmp`; git reset --hard'), 2, 'cd inside `...` stays in its subshell'],
  ['upstream-readonly.sh', bash('cd upstream/inkweave; echo "$(cd /tmp)"; git reset --hard'), 2, 'cd inside "$(...)" stays in its subshell'],
  ['upstream-readonly.sh', bash('cd upstream/inkweave; (cd /tmp); git reset --hard'), 2, 'cd inside ( ... ) stays in its subshell'],
  ['upstream-readonly.sh', bash('(cd upstream/inkweave && git reset --hard)'), 2, 'write inside ( ... ) in upstream'],
  ['upstream-readonly.sh', bash('(cd upstream/inkweave); git reset --hard'), 0, 'cd inside ( ... ) does not move the next command'],
  ['upstream-readonly.sh', bash('echo "$(cd upstream/inkweave)"; git reset --hard'), 0, 'cd inside $(...) does not move the next command'],
  ['upstream-readonly.sh', bash('cd /tmp && echo "$(git -C upstream/inkweave reset --hard)"'), 0, '$(...) after cd /tmp runs outside the project'],
  ['upstream-readonly.sh', bash('echo $((1 + 2)); git -C upstream/inkweave reset --hard'), 2, '$((...)) arithmetic, then a write'],
  ['upstream-readonly.sh', pwsh('Write-Output "$(Set-Location upstream/inkweave; git reset --hard)"; Set-Location C:\\'), 2, 'PS $(Set-Location upstream; write) before a later Set-Location'],
  ['upstream-readonly.sh', pwsh('Write-Output "$(Set-Location upstream/inkweave)"; git reset --hard'), 2, 'PS Set-Location inside $(...) carries on'],
  // git-write-protection (verbatim app copy)
  ['git-write-protection.sh', pwsh("git commit -m 'x'"), 2, 'PS commit (prefix impossible there)'],
  ['git-write-protection.sh', bash('git commit --allow-empty -m probe'), 2, 'unapproved commit'],
  ['git-write-protection.sh', bash('USER_APPROVED=1 git commit -m x'), 0, 'approved commit'],
  ['git-write-protection.sh', bash('USER_APPROVED=1 git push | tail -3'), 2, 'approved but piped push'],
  ['git-write-protection.sh', bash('git reset --hard'), 2, 'reset --hard'],
  ['git-write-protection.sh', bash('git -C upstream/inkweave commit -m x'), 0, 'git -C commit (its known gap; upstream-readonly covers it)'],
];

// branch-verification: throwaway repositories on main and on a feature branch.
function branchCases(repos) {
  const call = (repo, ...segments) => ({payload: edit(path.join(repos[repo], ...segments)), env: {CLAUDE_PROJECT_DIR: repos[repo]}});
  return [
    [call('main', 'src', 'main.tsx'), 2, 'main: edit src/main.tsx'],
    [call('main', 'scripts', 'x.mjs'), 2, 'main: edit scripts/x.mjs (dir missing, falls back to project dir)'],
    [call('main', 'README.md'), 0, 'main: edit README.md'],
    [call('main', 'upstream', 'inkweave', 'src', 'a.ts'), 0, 'main: upstream path (left to upstream-readonly)'],
    [call('feature/1-probe', 'src', 'main.tsx'), 0, 'feature branch: edit src/main.tsx'],
    [
      {...call('main', 'src', 'main.tsx'), env: {CLAUDE_PROJECT_DIR: repos.main, GIT_DIR: path.join(repos['feature/1-probe'], '.git')}},
      2,
      'main: inherited GIT_DIR of a feature repo (review on PR #5)',
    ],
    [call('main', 'SRC', 'Main.TSX'), 2, 'main: mixed-case SRC/Main.TSX (cubic)'],
  ];
}

// Each repository is recorded as soon as its directory exists, so the caller's
// cleanup also covers a setup that fails halfway.
function makeRepos(repos) {
  for (const branch of ['main', 'feature/1-probe']) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-hooks-'));
    repos[branch] = dir;
    execFileSync('git', ['init', '-q', '-b', branch, dir]);
    fs.mkdirSync(path.join(dir, 'src'));
  }
}

/** Runs one case, and prints it when the exit code is wrong. */
function passes({hook, payload, env, want, label}) {
  const got = runHook(hook, payload, env);
  if (got.code === want) return true;
  console.log(`FAIL ${hook}: ${label}\n     expected exit ${want}, got ${got.code}${got.err ? ` (${got.err})` : ''}`);
  return false;
}

function main() {
  const repos = {};
  try {
    makeRepos(repos);
    const all = [
      ...cases.map(([hook, payload, want, label]) => ({hook, payload, env: {}, want, label})),
      ...branchCases(repos).map(([{payload, env}, want, label]) => ({hook: 'branch-verification.sh', payload, env, want, label})),
    ];
    let failures = 0;
    for (const check of all) if (!passes(check)) failures++;
    console.log(`${all.length - failures}/${all.length} hook cases passed`);
    return failures ? 1 : 0;
  } finally {
    for (const dir of Object.values(repos)) fs.rmSync(dir, {recursive: true, force: true});
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main();
}
