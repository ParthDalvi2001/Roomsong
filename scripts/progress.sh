#!/usr/bin/env bash
# Roomsong text progress dashboard. Read-only: it reads the sprint plan, the progress file, git and the agent logs.
# Usage: bash scripts/progress.sh      Refresh every minute in your own terminal (costs no tokens):
#   while true; do clear; bash scripts/progress.sh; sleep 60; done
cd "$(dirname "$0")/.." && exec python3 -I - <<'PY'
import collections, datetime, json, os, pathlib, re, subprocess, time

ROOT = pathlib.Path.cwd()
NOW = datetime.datetime.now()
PHASE_DAYS = [('P0', (10, 10), (10, 17)), ('P1', (10, 18), (10, 24)), ('P2', (10, 25), (11, 3)),
              ('P3', (11, 4), (11, 11)), ('P4', (11, 12), (11, 17))]
GATES = [('G0', 10, 17), ('headset due', 10, 20), ('G1', 10, 24), ('G2', 11, 3), ('feature freeze', 11, 12), ('submit', 11, 17)]
STAGES = (('Build', ('Implement', 'Draft')), ('Review', ('Review', 'Challenge')), ('Fix', ('Fix',)))


def git(*args):
    try:
        return subprocess.run(['git', *args], capture_output=True, text=True, timeout=10).stdout.strip()
    except Exception:
        return ''


def span(seconds):
    seconds = max(0, int(seconds))
    return f'{seconds}s' if seconds < 90 else f'{seconds // 60}m' if seconds < 5400 else f'{seconds / 3600:.1f}h'


def stamp(text):
    try:
        return datetime.datetime.fromisoformat(text.replace('Z', '+00:00')).timestamp()
    except Exception:
        return None


def short(text, width):
    text = ' '.join(str(text).split())
    return text if len(text) <= width else text[: width - 1] + '…'


def section(fn):
    try:
        fn()
    except Exception as error:  # the dashboard must never crash on one bad section
        print(f'  (section unavailable: {type(error).__name__}: {error})')
    print()


# ---------- data: sprint plan ----------
def load_plan():
    phases, phase = collections.OrderedDict(), None
    for line in (ROOT / 'specs/07-workflow/SPRINT_PLAN.md').read_text(encoding='utf-8').split('\n'):
        m = re.match(r'^### (Phase \d) — ([^(]+)', line)
        if m:
            phase = f'{m.group(1)} {m.group(2).strip()}'
            phases[phase] = []
            continue
        if line.startswith('## '):
            phase = None
        m = re.match(r'^\| \*{0,2}(T-\d+)\*{0,2} \|', line)
        if not (m and phase):
            continue
        cells = [c.strip() for c in line.strip().strip('|').split('|')]
        status = cells[-1].lower().replace('*', '')
        state = ('done' if status.startswith('done') else 'running' if status.startswith('doing')
                 else 'could' if status.startswith('could') else 'todo')
        title = re.sub(r'[*`]', '', '|'.join(cells[1:-5]))
        title = re.split(r' \(|:|;| — |\. ', title, maxsplit=1)[0]
        phases[phase].append({'id': m.group(1), 'state': state, 'title': title, 'owner': cells[-5],
                              'human': 'human' in cells[-3], 'pending_device': 'pending headset' in status})
    return phases


# ---------- data: workflow journals and agent logs ----------
def load_workflows():
    project = pathlib.Path.home() / '.claude/projects' / re.sub(r'[^A-Za-z0-9]', '-', str(ROOT))
    flows = []
    journals = [j for j in project.glob('*/subagents/workflows/*/journal.jsonl') if time.time() - j.stat().st_mtime < 12 * 3600]
    for journal in sorted(journals, key=lambda j: j.stat().st_mtime):
        run = journal.parent.name
        scripts = list(journal.parents[3].glob(f'workflows/scripts/*-{run}.js'))
        name = scripts[0].stem[: -len(run) - 1] if scripts else run
        declared = re.findall(r"\{ title: '([^']+)'", scripts[0].read_text(encoding='utf-8')) if scripts else []
        agents = collections.OrderedDict()
        for raw in journal.read_text(encoding='utf-8').split('\n'):
            try:
                event = json.loads(raw)
            except ValueError:
                continue
            kind, agent_id = event.get('type'), event.get('agentId')
            if kind == 'started':
                agents[agent_id] = {'id': agent_id, 'label': event.get('label') or '?', 'phase': event.get('phase') or '',
                                    'state': 'running', 'result': None}
            elif kind == 'result' and agent_id in agents:
                agents[agent_id]['result'] = event.get('result')
                agents[agent_id]['state'] = 'done' if event.get('result') is not None else 'failed'
        for agent in agents.values():
            read_agent_log(journal.parent, agent)
        live = sum(1 for a in agents.values() if a['state'] == 'running')
        idle = time.time() - journal.stat().st_mtime
        flows.append({'name': name, 'phases': declared or list(dict.fromkeys(a['phase'] for a in agents.values())),
                      'agents': list(agents.values()), 'finished': bool(agents) and not live and idle > 120})
    return flows


def read_agent_log(folder, agent):
    agent.update({'type': '', 'first': None, 'last': None, 'tools': 0, 'doing': ''})
    meta = folder / f'agent-{agent["id"]}.meta.json'
    if meta.exists():
        try:
            agent['type'] = json.loads(meta.read_text(encoding='utf-8')).get('agentType', '').split(':')[-1]
        except ValueError:
            pass
    log = folder / f'agent-{agent["id"]}.jsonl'
    if not log.exists():
        return
    with log.open(encoding='utf-8') as handle:
        for raw in handle:
            try:
                record = json.loads(raw)
            except ValueError:
                continue
            when = stamp(record.get('timestamp') or '')
            if when:
                agent['first'] = agent['first'] or when
                agent['last'] = when
            message = record.get('message')
            content = message.get('content') if isinstance(message, dict) else None
            if not isinstance(content, list):
                continue
            for block in content:
                if isinstance(block, dict) and block.get('type') == 'tool_use':
                    agent['tools'] += 1
                    args = block.get('input') or {}
                    tool = block.get('name') or ''
                    if tool == 'StructuredOutput':
                        agent['doing'] = 'writing its report'
                    elif args.get('description'):
                        agent['doing'] = args['description']
                    elif args.get('file_path'):
                        agent['doing'] = f'{tool} {os.path.basename(args["file_path"])}'
                    else:
                        agent['doing'] = f'{tool} {args.get("pattern") or args.get("query") or ""}'.strip()


def outcome(agent):
    result = agent['result']
    if not isinstance(result, dict):
        return 'no result returned' if agent['state'] == 'failed' else ''
    parts = []
    if 'verdict' in result:
        parts.append('APPROVED' if result['verdict'] == 'approve' else 'changes required')
    if 'verifyGreen' in result:
        parts.append('verify green' if result['verifyGreen'] else 'verify RED')
    if isinstance(result.get('acceptance'), list) and result['acceptance']:
        met = sum(1 for a in result['acceptance'] if a.get('met'))
        parts.append(f'acceptance {met}/{len(result["acceptance"])}')
    if isinstance(result.get('findings'), list):
        sev = collections.Counter(f.get('severity') for f in result['findings'])
        parts.append('findings: ' + (', '.join(f'{sev[k]} {k}' for k in ('blocker', 'major', 'minor', 'nit') if sev[k]) or 'none'))
    if isinstance(result.get('fixed'), list):
        parts.append(f'fixed {len(result["fixed"])}, left {len(result.get("notFixed") or [])}')
    if isinstance(result.get('decisions'), list):
        parts.append(f'{len(result["decisions"])} design decisions')
    return ' · '.join(parts)


PLAN = load_plan()
FLOWS = load_workflows()
AGENTS = [a for flow in FLOWS for a in flow['agents']]


def stage_bar(task_id):
    mine = [a for a in AGENTS if re.search(rf'\b{task_id}\b', a['label'])]
    if not mine:
        return ''
    cells = []
    for label, phases in STAGES:
        group = [a for a in mine if a['phase'] in phases]
        glyph = ('░░░░' if not group else '▒▒▒▒' if any(a['state'] == 'running' for a in group)
                 else 'XXXX' if any(a['state'] == 'failed' for a in group) else '████')
        cells.append(f'{label} {glyph}')
    return '  '.join(cells) + '  Merge ░░░░'


# ---------- sections ----------
def header():
    start, end = datetime.date(2026, 10, 10), datetime.date(2026, 11, 17)
    day = (NOW.date() - start).days + 1
    unpushed = git('rev-list', '--count', 'origin/develop..develop') or '?'
    print(f'ROOMSONG PROGRESS   {NOW:%a %d %b %H:%M}   day {day} of {(end - start).days + 1}   push ON HOLD ({unpushed} local commits waiting)')
    print()
    bars = []
    for label, (m1, d1), (m2, d2) in PHASE_DAYS:
        first, last = datetime.date(2026, m1, d1), datetime.date(2026, m2, d2)
        length = (last - first).days + 1
        gone = min(length, max(0, (NOW.date() - first).days + 1))
        bars.append(f'{label} {"█" * gone}{"░" * (length - gone)}')
    print('CALENDAR   one square = one day, filled = used')
    print('  ' + '  '.join(bars))
    left = [(label, (datetime.date(2026, m, d) - NOW.date()).days) for label, m, d in GATES]
    print('  ' + ' · '.join(f'{label} in {days}d' for label, days in left if days >= 0))


def phases():
    print('ALL PHASES   █ done  ▒ running  ░ to do')
    total = done = 0
    for name, tasks in PLAN.items():
        count = collections.Counter(t['state'] for t in tasks)
        total += len(tasks)
        done += count['done']
        bar = '█' * count['done'] + '▒' * count['running'] + '░' * (count['todo'] + count['could'])
        human = sum(1 for t in tasks if t['human'] and t['state'] != 'done')
        notes = [f'{count["done"]}/{len(tasks)} done']
        if count['running']:
            notes.append(f'{count["running"]} running')
        if human:
            notes.append(f'{human} need you')
        print(f'  {short(name, 30):<30} {bar:<18} {", ".join(notes)}')
    print(f'  Total: {done} of {total} tasks done ({100 * done // max(total, 1)}%)')


def current_phase():
    name, tasks = next(((n, t) for n, t in PLAN.items() if any(x['state'] != 'done' for x in t)), list(PLAN.items())[-1])
    print(f'{name.upper()} — EVERY TASK')
    marks = {'done': '[done]   ', 'running': '[running]', 'todo': '[to do]  ', 'could': '[maybe]  '}
    for task in tasks:
        mark = '[YOU]    ' if task['human'] and task['state'] != 'done' else marks[task['state']]
        tail = stage_bar(task['id']) if task['state'] == 'running' else ''
        if task['state'] == 'running' and not tail:
            tail = 'see the workflow below'
        print(f'  {task["id"]} {mark} {short(task["title"], 36):<36} {short(task["owner"], 22):<22} {tail}'.rstrip())


def agents():
    print('AGENTS')
    if not FLOWS:
        print('  no workflow has run in the last 12 hours')
    for flow in FLOWS:
        steps = []
        for title in flow['phases']:
            group = [a for a in flow['agents'] if a['phase'] == title]
            glyphs = ''.join('█' if a['state'] == 'done' else '▒' if a['state'] == 'running' else 'X' for a in group) or '·'
            steps.append(f'{title} {glyphs}')
        state = 'FINISHED' if flow['finished'] else 'running'
        print(f'  {flow["name"]}  [{state}]   ' + '   '.join(steps))
        for agent in sorted(flow['agents'], key=lambda a: a['state'] != 'running'):
            took = span((time.time() if agent['state'] == 'running' else agent['last'] or 0) - (agent['first'] or time.time()))
            if agent['state'] == 'running':
                quiet = span(time.time() - (agent['last'] or time.time()))
                print(f'    [running] {short(agent["label"], 30):<30} {short(agent["type"], 18):<18} {took:>5}  {agent["tools"]:>3} steps  last step {quiet} ago')
                print(f'              now: {short(agent["doing"] or "thinking", 92)}')
            else:
                mark = '[done]   ' if agent['state'] == 'done' else '[FAILED] '
                print(f'    {mark} {short(agent["label"], 30):<30} {short(agent["type"], 18):<18} {took:>5}  {agent["tools"]:>3} steps  {outcome(agent)}')


def reviews():
    shown = False
    for agent in AGENTS:
        result = agent['result']
        if not (isinstance(result, dict) and isinstance(result.get('findings'), list) and result['findings']):
            continue
        if not shown:
            print('REVIEW FINDINGS (worst first)')
            shown = True
        print(f'  {agent["label"]}')
        order = {'blocker': 0, 'major': 1, 'minor': 2, 'nit': 3}
        for finding in sorted(result['findings'], key=lambda f: order.get(f.get('severity'), 9))[:4]:
            what = finding.get('summary') or finding.get('problem') or ''
            print(f'    {finding.get("severity", "?"):<7} {short(os.path.basename(finding.get("file", "")), 24):<24} {short(what, 70)}')
        if len(result['findings']) > 4:
            print(f'    … and {len(result["findings"]) - 4} more')
    if not shown:
        print('REVIEW FINDINGS   none reported yet')


def code():
    print('CODE LANES (agent branches not yet merged into develop)')
    owners = {a['result'].get('branch'): a['label'] for a in AGENTS if isinstance(a['result'], dict) and a['result'].get('branch')}
    lanes = [b for b in git('branch', '--format=%(refname:short)').split('\n') if b.startswith('worktree-')]
    if not lanes:
        print('  none')
    for branch in lanes:
        ahead = git('rev-list', '--count', f'develop..{branch}')
        stat = git('diff', '--shortstat', f'develop...{branch}')
        numbers = re.findall(r'(\d+) (file|insertion|deletion)', stat)
        size = ' '.join(f'{"+" if kind == "insertion" else "−" if kind == "deletion" else ""}{value}{" files" if kind == "file" else ""}' for value, kind in numbers)
        last = git('log', '-1', '--format=%cr: %s', branch)
        print(f'  {short(owners.get(branch, "older work, " + branch[-8:]), 30):<30} {ahead:>3} commits  {size:<22} last {short(last, 58)}')
    print()
    print('REPOSITORY (develop)')
    files = [f for f in git('ls-files', 'src', 'tests', 'proto', 'scripts').split('\n') if f]
    def lines(prefix):
        chosen = [f for f in files if f.startswith(prefix) and f.endswith(('.ts', '.tsx', '.mjs', '.sh'))]
        total = 0
        for f in chosen:
            try:
                total += sum(1 for _ in (ROOT / f).open(encoding='utf-8'))
            except OSError:
                pass
        return f'{len(chosen)} files, {total} lines'
    print(f'  app code src/: {lines("src/")}   tests/: {lines("tests/")}   prototypes proto/: {lines("proto/")}')
    editing = [l for l in git('status', '--porcelain').split('\n') if l.strip()]
    print(f'  head {git("rev-parse", "--short", "develop")}   main checkout: {len(editing)} file(s) being edited and not yet committed')
    print('  latest commits on any branch:')
    for line in git('log', '--all', '-4', '--format=%cr|%s').split('\n'):
        when, _, subject = line.partition('|')
        print(f'    {when:<15} {short(subject, 84)}')


def waiting():
    text = (ROOT / 'specs/08-status/PROGRESS.md').read_text(encoding='utf-8')
    block = text.split('## Blocked on human', 1)[1].split('\n## ', 1)[0] if '## Blocked on human' in text else ''
    items = [l for l in block.split('\n') if re.match(r'^\d+\. ', l) and not re.match(r'^\d+\. ~~', l)]
    print(f'WAITING ON YOU ({len(items)})')
    for item in items:
        number, rest = item.split('. ', 1)
        title = re.search(r'\*\*(.+?)\*\*', rest)
        body = re.sub(r'[*`]', '', rest.split('**', 2)[-1] if title else rest)
        name = title.group(1).rstrip(':') if title else ' '.join(body.split()[:4])
        print(f'  {number:>2}. {short(name, 38):<38} {short(body.lstrip(": "), 62)}')


for part in (header, phases, current_phase, agents, reviews, code, waiting):
    section(part)
PY
