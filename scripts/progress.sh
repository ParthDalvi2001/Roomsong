#!/usr/bin/env bash
# Roomsong text progress dashboard. Read-only: it only reads the sprint plan, git and the agent journals.
# Usage: bash scripts/progress.sh      Refresh every minute in your own terminal (costs no tokens):
#   while true; do clear; bash scripts/progress.sh; sleep 60; done
cd "$(dirname "$0")/.." && exec python3 -I - <<'PY'
import collections, datetime, json, os, pathlib, re, subprocess, time

root = pathlib.Path.cwd()

def git(*args):
    try:
        return subprocess.run(['git', *args], capture_output=True, text=True, timeout=10).stdout.strip()
    except Exception:
        return ''

def ago(seconds):
    seconds = int(seconds)
    return f'{seconds}s' if seconds < 90 else f'{seconds // 60}m' if seconds < 5400 else f'{seconds // 3600}h'

now = datetime.datetime.now()
print(f'ROOMSONG PROGRESS    {now:%a %d %b %H:%M}')
print()

# 1. Tasks by phase, from the sprint plan (one square per task).
phases, phase = collections.OrderedDict(), None
for line in (root / 'specs/07-workflow/SPRINT_PLAN.md').read_text(encoding='utf-8').split('\n'):
    m = re.match(r'^### (Phase \d) — ([^(]+)', line)
    if m:
        phase = f'{m.group(1)}  {m.group(2).strip()}'
        phases[phase] = []
        continue
    if line.startswith('## '):
        phase = None
    m = re.match(r'^\| \*{0,2}(T-\d+)\*{0,2} \|', line)
    if m and phase:
        status = line.strip().strip('|').split('|')[-1].strip().lower().replace('*', '')
        phases[phase].append((m.group(1), 'done' if status.startswith('done') else 'doing' if status.startswith('doing') else 'todo'))

print('TASKS   █ done  ▒ running  ░ to do')
total = done = 0
for name, tasks in phases.items():
    counts = collections.Counter(state for _, state in tasks)
    total += len(tasks)
    done += counts['done']
    bar = '█' * counts['done'] + '▒' * counts['doing'] + '░' * counts['todo']
    print(f'  {name[:26]:<26} {bar:<18} {counts["done"]}/{len(tasks)} done' + (f', {counts["doing"]} running' if counts['doing'] else ''))
running = [task for tasks in phases.values() for task, state in tasks if state == 'doing']
print(f'  All phases: {done} of {total} done' + (f'   running: {" ".join(running)}' if running else ''))
print()

# 2. Agents, from the workflow journals of the last 12 hours.
project = pathlib.Path.home() / '.claude/projects' / re.sub(r'[^A-Za-z0-9]', '-', str(root))
journals = [j for j in project.glob('*/subagents/workflows/*/journal.jsonl') if time.time() - j.stat().st_mtime < 12 * 3600]
print('AGENTS')
if not journals:
    print('  no workflow has run in the last 12 hours')
for journal in sorted(journals, key=lambda j: j.stat().st_mtime):
    run = journal.parent.name
    scripts = list(journal.parents[3].glob(f'workflows/scripts/*-{run}.js'))
    name = scripts[0].stem[: -len(run) - 1] if scripts else run
    agents, finished = collections.OrderedDict(), False
    for raw in journal.read_text(encoding='utf-8').split('\n'):
        try:
            event = json.loads(raw)
        except ValueError:
            continue
        kind, agent_id = event.get('type'), event.get('agentId')
        if kind == 'started':
            agents[agent_id] = {'label': event.get('label') or '?', 'phase': event.get('phase') or '', 'state': 'running'}
        elif kind == 'result' and agent_id in agents:
            agents[agent_id]['state'] = 'done' if event.get('result') is not None else 'failed'
        elif kind in ('completed', 'finished', 'returned', 'done', 'error', 'aborted'):
            finished = True
    live = sum(1 for a in agents.values() if a['state'] == 'running')
    state = 'finished' if finished or (agents and not live and time.time() - journal.stat().st_mtime > 120) else f'{live} running'
    print(f'  {name}: {sum(1 for a in agents.values() if a["state"] == "done")} of {len(agents)} started agents done, {state}')
    for agent_id, agent in agents.items():
        mark = {'done': '[done]   ', 'running': '[running]', 'failed': '[FAILED] '}[agent['state']]
        log = journal.parent / f'agent-{agent_id}.jsonl'
        active = f'  active {ago(time.time() - log.stat().st_mtime)} ago' if agent['state'] == 'running' and log.exists() else ''
        print(f'    {mark} {agent["phase"][:9]:<9} {agent["label"][:36]}{active}')
print()

# 3. Code lanes: agent branches ahead of develop.
print('CODE')
lanes = [b for b in git('branch', '--format=%(refname:short)').split('\n') if b.startswith('worktree-')]
for branch in lanes:
    ahead = git('rev-list', '--count', f'develop..{branch}')
    last = git('log', '-1', '--format=%cr | %s', branch)
    print(f'  {branch[-14:]:<14} {ahead:>3} commits ahead   last {last[:62]}')
editing = [l for l in git('status', '--porcelain').split('\n') if l.strip()]
if editing:
    print(f'  main checkout: {len(editing)} file(s) being edited, not yet committed')
unpushed = git('rev-list', '--count', 'origin/develop..develop') or '?'
print(f'  develop: {git("rev-parse", "--short", "develop")}   not pushed yet: {unpushed} commit(s)   push is on hold until Parth says go')
print()

# 4. Days left.
gates = [('G0', 10, 17), ('Headset', 10, 20), ('G1', 10, 24), ('G2', 11, 3), ('Freeze', 11, 12), ('Submit', 11, 17)]
left = [(label, (datetime.date(2026, month, day) - now.date()).days) for label, month, day in gates]
print('DAYS LEFT   ' + '   '.join(f'{label} {days}' for label, days in left if days >= 0))
PY
