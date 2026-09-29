#!/usr/bin/env bash
# Hook: upstream/inkweave is the pinned app submodule and is read-only here.
# Type: PreToolUse (Edit|Write, and Bash|PowerShell). App changes belong in
# Doberjohn/inkweave; admin picks them up by bumping the pin (CLAUDE.md,
# "Updating the app pin").
#
# Edit|Write: any file under upstream/inkweave/ is blocked.
#
# Bash|PowerShell: git-write-protection.sh is a verbatim copy of the app's hook
# and matches only the literal text `git commit` / `git push`. This part covers
# what that misses (#1, plan-check comment of 2026-09-26):
#   hard block  a git subcommand that can write, run inside upstream/ through
#               `git -C <dir>`, `--git-dir`/`--work-tree`, a cd/Set-Location/
#               pushd earlier in the command, the shell's current directory, or
#               `git submodule foreach`. Read-only subcommands (status, log,
#               diff, show, ...) pass.
#   hard block  a shell redirection (`>`, `>>`, `&>`, ...) whose target is inside
#               upstream/. Only redirections are checked: other file-writing
#               commands (cp, tee, Set-Content, ...) are not analyzable in general.
#   soft block  (USER_APPROVED=1 bypass, as in git-write-protection.sh)
#               `git submodule update --remote`, which moves the pin, and a
#               commit or push the literal match misses (`git -c k=v commit`,
#               `git -C . push`). Piping one of those is a hard block, as there.
#               PowerShell cannot carry the prefix, so there these always block.
#
# Exit 2 = block (stderr shown to Claude), exit 0 = allow.

INPUT=$(cat)

FILE_PATH=$(echo "$INPUT" | node -e "
  let d = '';
  process.stdin.on('data', c => d += c);
  process.stdin.on('end', () => {
    try { console.log(JSON.parse(d).tool_input?.file_path || ''); } catch { console.log(''); }
  });
")
# Windows paths are case-insensitive, so Upstream/Inkweave/... must match too.
FILE_PATH=$(echo "$FILE_PATH" | sed 's|\\|/|g' | tr '[:upper:]' '[:lower:]')

case "$FILE_PATH" in
  */upstream/inkweave/*|upstream/inkweave/*)
    echo "upstream/inkweave is the pinned app submodule and is read-only here. Change the app in Doberjohn/inkweave, then bump the pin." >&2
    exit 2
    ;;
esac

# Shell tool calls: analyze the command's git invocations and redirections. The
# analyzer is plain JavaScript in a quoted heredoc, so nothing in it is
# shell-expanded.
printf '%s' "$INPUT" | node -e "$(cat <<'JS'
const fs = require('node:fs');
const path = require('node:path');

let input = {};
try { input = JSON.parse(fs.readFileSync(0, 'utf8')); } catch { process.exit(0); }
const command = input.tool_input?.command || '';
if (!command.trim()) process.exit(0);
const powershell = input.tool_name === 'PowerShell';
const approved = /^USER_APPROVED=1 /.test(command);

function block(message) {
  process.stderr.write(message + '\n');
  process.exit(2);
}
const APPROVAL = powershell
  ? 'PowerShell cannot carry the USER_APPROVED=1 prefix: after explicit user approval, run it with the Bash tool and the prefix.'
  : 'Get explicit user approval first, then retry with the USER_APPROVED=1 prefix.';

// --- Paths: Git Bash (/d/x), Windows (D:\x, D:/x) and relative forms ---------
const slash = (p) => p.replace(/\\/g, '/');
const norm = (p) =>
  slash(p)
    .replace(/^\/([a-zA-Z])(?=\/|$)/, (_, d) => d.toUpperCase() + ':')
    .replace(/^([a-z]):/, (_, d) => d.toUpperCase() + ':');

function resolveDir(base, target) {
  const t = norm(target);
  if (/^[A-Z]:/.test(t)) return slash(path.win32.resolve(t));
  if (t.startsWith('/')) return path.posix.resolve(t);
  const b = norm(base);
  return /^[A-Z]:/.test(b) ? slash(path.win32.resolve(b, t)) : path.posix.resolve(b || '/', t);
}

const projectDir = norm(process.env.CLAUDE_PROJECT_DIR || '').replace(/\/$/, '').toLowerCase();
function inUpstream(dir) {
  const d = norm(dir).toLowerCase() + '/';
  // An unexpanded variable ($ROOT/upstream/...) can't be resolved; judge by the segment.
  if (!projectDir || d.includes('$')) return /(^|\/)upstream\//.test(d);
  return d.startsWith(projectDir + '/upstream/');
}

// --- Shell words: quotes, escapes, separators, redirections -----------------
// Bash escapes with a backslash; PowerShell with a backtick, where backslashes
// are literal path separators and '' / "" double a quote. Bash's $'...' takes
// backslash escapes, so its \' does not end it.
//
// Heredoc bodies and PowerShell here-strings are data, so they are removed
// before parsing: only the body, through its terminator line, so the commands
// after it are still analyzed. A bash `<<WORD` counts when it sits in shell text,
// which includes the inside of $(...) within double quotes (the usual
// `git commit -m "$(cat <<'EOF' ...)"`); `<<<` is a herestring, not a heredoc,
// and a `#` comment is not shell text. An unquoted delimiter (`<<EOF`, not
// `<<'EOF'`) makes bash expand the body, so its command substitutions are kept,
// and so are those of an expandable PowerShell here-string (@"..."@).
// Comments are dropped in both shells, following quotes, so an apostrophe in one
// cannot open a quote that hides the commands after it.

// Index of the ' closing the quote that opens at `start`: bash '...' has no
// escapes, bash $'...' takes backslash escapes, and PowerShell doubles it ('').
function quoteEnd(text, start, {ansi = false, ps = false} = {}) {
  for (let i = start + 1; i < text.length; i++) {
    if (ansi && text[i] === '\\') {
      i++;
    } else if (text[i] === "'") {
      if (!(ps && text[i + 1] === "'")) return i;
      i++;
    }
  }
  return text.length;
}

// Command substitutions in a string. Bash: $(...) with nesting and `...`, skipping
// `\$(` and $(( arithmetic. PowerShell: $(...) subexpressions, where the escape
// is a backtick and $((...)) is code, not arithmetic. Single-quoted text (and
// bash's $'...') is literal and skipped, except in a heredoc or here-string body
// (`literal`), where quote characters are plain text.
function substitutions(text, ps = false, literal = false) {
  const escape = ps ? '`' : '\\';
  const found = [];
  let dq = false; // inside "...", where a ' is plain text
  for (let i = 0; i < text.length; i++) {
    const quoting = !literal && !dq; // a ' here opens a literal span
    if (text[i] === escape) {
      i++;
    } else if (!literal && text[i] === '"') {
      dq = !dq;
    } else if (quoting && text[i] === "'") {
      i = quoteEnd(text, i, {ps});
    } else if (quoting && !ps && text.startsWith("$'", i)) {
      i = quoteEnd(text, i + 1, {ansi: true});
    } else if (!ps && text[i] === '`') {
      const end = text.indexOf('`', i + 1);
      if (end === -1) break;
      found.push(text.slice(i, end + 1));
      i = end;
    } else if (text[i] === '$' && text[i + 1] === '(' && (ps || text[i + 2] !== '(')) {
      const end = substitutionEnd(text, i, escape);
      found.push(text.slice(i, end + 1));
      i = end;
    }
  }
  return found;
}

// Index of the `)` closing the $( at `start`.
function substitutionEnd(text, start, escape) {
  return parenEnd(text, start + 1, escape);
}

// Index of the `)` matching the `(` at `open`, following the shell's quoting inside
// it: parentheses in '...' or "..." do not count, a nested $( within "..." does.
function parenEnd(text, open, escape) {
  const ps = escape === '`';
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    const c = text[i];
    if (c === escape) {
      i++;
    } else if (c === "'") {
      i = quoteEnd(text, i, {ps});
    } else if (!ps && text.startsWith("$'", i)) {
      i = quoteEnd(text, i + 1, {ansi: true});
    } else if (c === '"') {
      for (i++; i < text.length && text[i] !== '"'; i++) {
        if (text[i] === escape) i++;
        else if (text[i] === '$' && text[i + 1] === '(') i = substitutionEnd(text, i, escape);
      }
    } else if (c === '(') {
      depth++;
    } else if (c === ')' && --depth === 0) {
      return i;
    }
  }
  return text.length - 1;
}

// The command substitution starting at `i`, or '' if none does: $(...) (but not
// bash's $((...)) arithmetic) and bash's `...`.
function substitutionAt(src, i, ps) {
  if (src.startsWith('$(', i) && (ps || src[i + 2] !== '(')) {
    return src.slice(i, substitutionEnd(src, i, ps ? '`' : '\\') + 1);
  }
  if (!ps && src[i] === '`') {
    const end = src.indexOf('`', i + 1);
    return src.slice(i, end === -1 ? src.length : end + 1);
  }
  return '';
}

// A PowerShell here-string is data, but an expandable @"..."@ runs its $(...)
// subexpressions, so those are kept, as for an unquoted bash heredoc.
function hereString(_, quote, body) {
  return quote === '"' ? ` ${substitutions(body, true, true).join('\n')}\n` : ' ';
}

// Index of the " closing the PowerShell string that opens at `start`: `" and ""
// are quote characters, and a $(...) inside may hold quotes of its own.
function psStringEnd(text, start) {
  for (let i = start + 1; i < text.length; i++) {
    if (text[i] === '`') {
      i++;
    } else if (text.startsWith('$(', i)) {
      i = substitutionEnd(text, i, '`');
    } else if (text[i] === '"') {
      if (text[i + 1] !== '"') return i;
      i++;
    }
  }
  return text.length;
}

// PowerShell comments: a # that starts a word runs to the end of the line, and
// <# ... #> is a block. Strings and escapes are copied whole, so a # or ' inside
// one stays text, as PowerShell reads it.
function stripPsComments(src) {
  let out = '';
  let i = 0;
  while (i < src.length) {
    const wordStart = i === 0 || /[\s;&|(){}]/.test(src[i - 1]);
    if (wordStart && src.startsWith('<#', i)) {
      const end = src.indexOf('#>', i + 2);
      i = end === -1 ? src.length : end + 2;
      out += ' ';
    } else if (wordStart && src[i] === '#') {
      const nl = src.indexOf('\n', i);
      i = nl === -1 ? src.length : nl;
    } else {
      let end = i;
      if (src[i] === "'") end = quoteEnd(src, i, {ps: true});
      else if (src[i] === '"') end = psStringEnd(src, i);
      else if (src[i] === '`') end = i + 1;
      out += src.slice(i, end + 1);
      i = end + 1;
    }
  }
  return out;
}

function stripDocs(src, ps) {
  if (ps) return stripPsComments(src.replace(/@(['"])\r?\n([\s\S]*?)\r?\n\1@/g, hereString));
  let out = '';
  const ctx = ['sh']; // sh = shell text, sq = '...', ansi = $'...', dq = "..."
  const pending = []; // heredocs opened on the current line, in order
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    const top = ctx[ctx.length - 1];
    if (c === '\n') {
      out += c;
      i++;
      while (pending.length) {
        const {word, dash, quoted} = pending.shift();
        while (i < src.length) {
          const nl = src.indexOf('\n', i);
          const raw = src.slice(i, nl === -1 ? src.length : nl);
          let line = raw.replace(/\r$/, '');
          if (dash) line = line.replace(/^\t+/, '');
          i = nl === -1 ? src.length : nl + 1;
          if (line === word) break;
          if (!quoted) for (const sub of substitutions(raw, false, true)) out += sub + '\n';
        }
      }
      continue;
    }
    if (top === 'sq') {
      if (c === "'") ctx.pop();
      out += c;
      i++;
      continue;
    }
    if (top === 'ansi') {
      // $'...' takes backslash escapes, so \' does not end it.
      const n = c === '\\' ? 2 : 1;
      if (c === "'") ctx.pop();
      out += src.slice(i, i + n);
      i += n;
      continue;
    }
    if (c === '\\') {
      out += src.slice(i, i + 2);
      i += 2;
      continue;
    }
    if (top === 'dq') {
      if (c === '"') ctx.pop();
      else if (c === '$' && src[i + 1] === '(') {
        ctx.push('sh');
        out += '$(';
        i += 2;
        continue;
      }
      out += c;
      i++;
      continue;
    }
    if (c === '#' && (i === 0 || /[\s;&|()]/.test(src[i - 1]))) {
      // A comment runs to the end of the line, and bash ignores all of it.
      const nl = src.indexOf('\n', i);
      i = nl === -1 ? src.length : nl;
      continue;
    }
    if (c === '$' && src[i + 1] === "'") {
      ctx.push('ansi');
      out += "$'";
      i += 2;
      continue;
    }
    if (c === "'") ctx.push('sq');
    else if (c === '"') ctx.push('dq');
    else if (c === '(') ctx.push('sh');
    else if (c === ')' && ctx.length > 1) ctx.pop();
    else if (c === '<' && src[i + 1] === '<' && src[i + 2] !== '<' && src[i - 1] !== '<') {
      // The delimiter is the whole word (END.txt, E"OF", 'END-OF-FILE'), quotes removed.
      const m = /^<<(-?)[ \t]*((?:'[^'\n]*'|"[^"\n]*"|\\.|[^\s;&|<>()'"\\])+)/.exec(src.slice(i));
      if (m) {
        const word = m[2].replace(/'([^']*)'|"([^"]*)"|\\(.)/g, (_, sq, dq, esc) => sq ?? dq ?? esc);
        pending.push({word, dash: m[1] === '-', quoted: /['"\\]/.test(m[2])});
        out += m[0];
        i += m[0].length;
        continue;
      }
    }
    out += c;
    i++;
  }
  return out;
}

// Reserved words after which a bash ( still starts a command, and so a subshell:
// `if (...)`, `while (...)`, `! (...)`, `{ (...); }`.
const SUBSHELL_LEADS = new Set(['!', '{', 'if', 'then', 'else', 'elif', 'while', 'until', 'do', 'time']);

// Each command is {words, redirects: [{op, target}], piped, subs, group}. A
// redirection's target is the word after its operator; stream duplicates (2>&1,
// >&-) name no file. `subs` lists the command substitutions in its words, quoted or
// not, which also stay in those words; `group` is the inside of a bash ( ... ).
function splitCommands(src, ps) {
  const cmds = [];
  let words = [];
  let redirects = [];
  let subs = [];
  let group = null;
  let word = '';
  let has = false;
  let quote = null;
  let ansi = false; // the open ' is bash's $'...', which takes backslash escapes
  let redirect = null;
  const addSub = (sub) => {
    subs.push(sub);
    word += sub;
    has = true;
  };
  const endWord = () => {
    if (has) {
      if (redirect) redirects.push({op: redirect, target: word});
      else words.push(word);
      redirect = null;
    }
    word = '';
    has = false;
  };
  const endCmd = (piped) => {
    endWord();
    redirect = null;
    if (words.length || redirects.length || group !== null) cmds.push({words, redirects, piped, subs, group});
    words = [];
    redirects = [];
    subs = [];
    group = null;
  };
  const separators = ps ? ';\n(){}' : ';\n()';
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    // $(...) and bash `...` run in double quotes too; '...' and $'...' stay text.
    const sub = quote === "'" ? '' : substitutionAt(src, i, ps);
    if (sub) {
      addSub(sub);
      i += sub.length - 1;
      continue;
    }
    if (quote) {
      if (ansi && c === '\\' && i + 1 < src.length) {
        word += src[++i];
      } else if (c === quote) {
        if (ps && src[i + 1] === quote) word += src[++i];
        else quote = null;
      } else if (quote === '"' && ps && c === '`' && i + 1 < src.length) {
        word += src[++i];
      } else if (quote === '"' && !ps && c === '\\' && '$`"\\\n'.includes(src[i + 1] || 'x')) {
        word += src[++i];
      } else {
        word += c;
      }
      continue;
    }
    if (!ps && c === '$' && src[i + 1] === "'") {
      quote = "'";
      ansi = true;
      has = true;
      i++;
    } else if (c === "'" || c === '"') {
      quote = c;
      ansi = false;
      has = true;
    } else if (c === (ps ? '`' : '\\')) {
      if (i + 1 < src.length) word += src[++i];
      has = true;
    } else if (c === ' ' || c === '\t' || c === '\r') {
      endWord();
    } else if (c === '>' || (c === '<' && !ps) || (c === '&' && src[i + 1] === '>')) {
      // A digit word (or PowerShell's `*`) right before the operator is its stream number.
      if (has && (/^\d+$/.test(word) || (ps && word === '*'))) {
        word = '';
        has = false;
      } else endWord();
      const m = /^(&>>?|>\||>>?|<<<|<<|<>|<)(&(\d+|-))?/.exec(src.slice(i));
      i += m[0].length - 1;
      if (!m[2]) redirect = m[1];
    } else if (c === '|') {
      if (src[i + 1] === '|') {
        i++;
        endCmd(false);
      } else endCmd(true);
    } else if (c === '&' && !/[<>]/.test(src[i - 1] || '')) {
      if (src[i + 1] === '&') i++;
      endCmd(false);
    } else if (!ps && c === '(' && !has && words.every((w) => SUBSHELL_LEADS.has(w)) && src[i + 1] !== '(') {
      // A bash ( ... ) that starts a command, alone or after if/while/!/{..., is a subshell.
      const end = parenEnd(src, i, '\\');
      group = src.slice(i + 1, end);
      i = end;
    } else if (separators.includes(c)) {
      endCmd(false);
    } else {
      word += c;
      has = true;
    }
  }
  endCmd(false);
  return cmds;
}

function parse(src, ps) {
  return splitCommands(stripDocs(src, ps), ps).map((c) => ({...c, ps}));
}

// --- Git invocations ----------------------------------------------------------
const WRAPPERS = new Set(['env', 'command', 'builtin', 'exec', 'time', 'nohup', '{', '}', '!', 'if', 'then', 'else', 'elif', 'do', 'while', 'until']);
const CD = new Set(['cd', 'chdir', 'sl', 'set-location']);
const PUSHD = new Set(['pushd', 'push-location']);
const POPD = new Set(['popd', 'pop-location']);
const OPT_WITH_VALUE = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--exec-path', '--config-env', '--super-prefix', '--attr-source']);
const READ_ONLY = new Set([
  'status', 'log', 'show', 'diff', 'rev-parse', 'rev-list', 'ls-files', 'ls-tree', 'ls-remote',
  'cat-file', 'grep', 'blame', 'describe', 'shortlog', 'whatchanged', 'fetch', 'merge-base',
  'name-rev', 'for-each-ref', 'show-ref', 'check-ignore', 'check-attr', 'count-objects', 'var',
  'help', 'version',
]);
const LISTING_BRANCH_ARGS = new Set(['--show-current', '-a', '--all', '-r', '--remotes', '-l', '--list', '-v', '-vv', '--verbose']);
// Redirections that create or change a file, and targets that are not files.
const WRITE_OPS = new Set(['>', '>>', '>|', '&>', '&>>', '<>']);
const NULL_DEVICES = new Set(['/dev/null', '$null', 'nul']);

function readOnly(verb, args) {
  if (READ_ONLY.has(verb)) return true;
  const first = args[0];
  switch (verb) {
    case 'remote': return !first || ['-v', '--verbose', 'get-url', 'show'].includes(first);
    case 'branch': return args.every((a) => LISTING_BRANCH_ARGS.has(a));
    case 'tag': return !first || first === '-l' || first === '--list';
    case 'stash': return first === 'list' || first === 'show';
    case 'config': return args.some((a) => ['--get', '--get-all', '--get-regexp', '--list', '-l', 'get', 'list'].includes(a));
    case 'reflog': return !first || first === 'show' || first.startsWith('-');
    case 'worktree': return first === 'list';
    case 'submodule': return !first || first === 'status' || first === 'summary';
    default: return false;
  }
}

// What git-write-protection.sh already matches (grep is per line, hence /m).
const LITERAL = {commit: /git commit( |$|")/m, push: /git push( |$|")/m};

// The command string a nested shell runs, if this is one (bash -c, powershell -Command, cmd /c, iex).
function nestedShell(prog, args) {
  const name = prog.replace(/\.exe$/, '');
  if (name === 'bash' || name === 'sh') {
    // -c alone or among other short flags (-lc, -ec, -l -c); -o/-O/--rcfile take a value.
    let k = 0;
    let command = false;
    while (k < args.length && /^[-+]/.test(args[k])) {
      if (/^-[A-Za-z]*c[A-Za-z]*$/.test(args[k])) command = true;
      k += /^([-+][oO]|--rcfile|--init-file)$/.test(args[k]) ? 2 : 1;
    }
    if (command && args[k]) return {src: args[k], ps: false};
  }
  if (name === 'powershell' || name === 'pwsh') {
    const at = args.findIndex((a) => /^-(c|command)$/i.test(a));
    if (at >= 0 && args[at + 1]) return {src: args.slice(at + 1).join(' '), ps: true};
  }
  if (name === 'cmd' && /^\/c$/i.test(args[0] || '') && args[1]) return {src: args.slice(1).join(' '), ps: true};
  if ((name === 'iex' || name === 'invoke-expression') && args.length) return {src: args.join(' '), ps: true};
  return null;
}

// Where commands run: the working directory, the pushd stack, and the variables set
// on their own (`X=1`, `export X=1`) earlier in the command. A subshell gets a copy.
const newState = (cwd) => ({cwd, stack: [], vars: {}});
const fork = (state) => ({cwd: state.cwd, stack: [...state.stack], vars: {...state.vars}});

function analyze(cmds, state, insideAll) {
  for (const {words, redirects, piped, ps, subs, group} of cmds) {
    // A command's substitutions run before it, from where it runs. Bash gives each
    // one a subshell, so a cd inside stays inside; PowerShell runs $(...) in the
    // current scope, so a Set-Location inside carries on.
    for (const sub of subs) {
      const inner = sub.startsWith('$(') ? sub.slice(2, -1) : sub.slice(1, -1);
      analyze(parse(inner, ps), ps ? state : fork(state), insideAll);
    }
    for (const {op, target} of redirects) {
      const file = target.replace(/^&/, ''); // bash `>&file` sends both streams to a file
      if (WRITE_OPS.has(op) && file && !NULL_DEVICES.has(file.toLowerCase()) && inUpstream(resolveDir(state.cwd, file))) {
        block(
          `Blocked: a shell redirection would write ${file} inside upstream/inkweave, the pinned app submodule, which is read-only here. ` +
            'Change the app in Doberjohn/inkweave, then bump the pin.',
        );
      }
    }
    if (group !== null) {
      analyze(parse(group, ps), fork(state), insideAll);
      continue;
    }
    const w = words.slice();
    const assigned = {};
    while (w.length && (WRAPPERS.has(w[0]) || w[0] === 'export' || /^[A-Za-z_][A-Za-z0-9_]*=/.test(w[0]))) {
      const a = /^([A-Za-z_][A-Za-z0-9_]*)=([\s\S]*)$/.exec(w.shift());
      if (a) assigned[a[1]] = a[2];
    }
    if (!w.length) {
      Object.assign(state.vars, assigned);
      continue;
    }
    const prog = slash(w.shift()).toLowerCase();
    if (prog === 'unset') {
      for (const name of w) delete state.vars[name];
      continue;
    }
    if (CD.has(prog) || PUSHD.has(prog)) {
      const target = w.find((a) => !a.startsWith('-'));
      if (PUSHD.has(prog)) state.stack.push(state.cwd);
      if (target) state.cwd = resolveDir(state.cwd, target);
      continue;
    }
    if (POPD.has(prog)) {
      if (state.stack.length) state.cwd = state.stack.pop();
      continue;
    }
    const nested = nestedShell(prog.split('/').pop(), w);
    if (nested) {
      analyze(parse(nested.src, nested.ps), fork(state), insideAll);
      continue;
    }
    if (!/(^|\/)git(\.exe)?$/.test(prog)) continue;

    let dir = state.cwd;
    let inside = insideAll;
    // GIT_DIR / GIT_WORK_TREE, set for this git or earlier in the command, choose the repository too.
    for (const name of ['GIT_DIR', 'GIT_WORK_TREE']) {
      const value = assigned[name] ?? state.vars[name];
      if (value && inUpstream(resolveDir(state.cwd, value))) inside = true;
    }
    let i = 0;
    while (i < w.length && w[i].startsWith('-')) {
      const eq = w[i].indexOf('=');
      const name = eq > 0 ? w[i].slice(0, eq) : w[i];
      let value = eq > 0 ? w[i].slice(eq + 1) : undefined;
      if (value === undefined && OPT_WITH_VALUE.has(name)) value = w[++i];
      if (name === '-C' && value) dir = resolveDir(dir, value);
      if ((name === '--git-dir' || name === '--work-tree') && value && inUpstream(resolveDir(dir, value))) inside = true;
      i++;
    }
    const verb = w[i];
    const args = w.slice(i + 1);
    if (!verb) continue;
    if (inUpstream(dir)) inside = true;

    if (verb === 'submodule' && args[0] === 'foreach') {
      // foreach runs its command inside the submodule, upstream/inkweave.
      const inner = args.slice(1).filter((a) => !['--recursive', '--quiet', '-q'].includes(a));
      analyze(parse(inner.join(' '), ps), newState(resolveDir(dir, 'upstream/inkweave')), true);
      continue;
    }
    if (inside && !readOnly(verb, args)) {
      block(
        `Blocked: \`git ${verb}\` would run inside upstream/inkweave, the pinned app submodule, which is read-only here. ` +
          'Change the app in Doberjohn/inkweave, then bump the pin (CLAUDE.md, "Updating the app pin"). ' +
          'Read-only git (status, log, diff, show, rev-parse, ...) is allowed; anything else, run manually.',
      );
    }
    if (verb === 'submodule' && args[0] === 'update' && args.includes('--remote') && !approved) {
      block(`git submodule update --remote moves the app pin. ${APPROVAL}`);
    }
    if ((verb === 'commit' || verb === 'push') && !LITERAL[verb].test(command)) {
      if (piped) {
        block(`Piped git ${verb} detected. A pipeline reports the LAST command's exit status, so a rejected hook looks green. Run it unpiped and read the full output.`);
      }
      if (!approved) {
        block(`Git ${verb} detected behind git options, which git-write-protection.sh cannot see. Present a summary of changes first. ${APPROVAL}`);
      }
    }
  }
}

analyze(parse(command, powershell), newState(input.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd()), false);
process.exit(0);
JS
)"
exit $?
