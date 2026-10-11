#!/usr/bin/env python3
"""Roomsong tracker: a local page that shows the plan, the work and what needs Parth, and sends Mac alerts.
Not part of the app: nothing here is built, shipped or imported by the project. Read-only on the repository
(it reads the sprint plan, the status files, git and the agent logs; its only file is .tmp/tracker-events.json).

Run:   python3 tracker/server.py        then open http://127.0.0.1:4180/
The page refreshes itself every 10 seconds. It costs no tokens.
"""
import datetime
import json
import os
import pathlib
import re
import subprocess
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
PORT = int(os.environ.get('DASHBOARD_PORT', '4180'))
YEAR = 2026
# name, goal, first day, last day (SPRINT_PLAN calendar, v2.1)
PHASES = [
    ('Phase 0', 'Prove', (10, 10), (10, 17)),
    ('Phase 1', 'One path', (10, 18), (10, 24)),
    ('Phase 2', 'Differentiator & payoff', (10, 25), (11, 3)),
    ('Phase 3', 'Polish', (11, 4), (11, 11)),
    ('Phase 4', 'Release', (11, 12), (11, 17)),
]
GATES = [('G0', (10, 17)), ('Headset due', (10, 20)), ('G1', (10, 24)), ('G2', (11, 3)),
         ('Feature freeze', (11, 12)), ('Code freeze', (11, 15)), ('Submit', (11, 17))]
AGENT_QUIET_S = 300  # an agent silent this long without handing back was stopped with its session


def git(*args):
    try:
        return subprocess.run(['git', *args], cwd=ROOT, capture_output=True, text=True, timeout=10).stdout.strip()
    except Exception:
        return ''


def plain(text):
    """Markdown to plain text, enough for table cells and list items."""
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
    return ' '.join(re.sub(r'[*`~]', '', text).split())


def read(path):
    try:
        return (ROOT / path).read_text(encoding='utf-8')
    except OSError:
        return ''


def row_cells(line):
    return [c.strip() for c in line.strip().strip('|').split('|')]


def section(text, heading):
    """The body of a '## heading' section."""
    if heading not in text:
        return ''
    return text.split(heading, 1)[1].split('\n## ', 1)[0]


def day(month_day):
    return datetime.date(YEAR, *month_day)


# ---------- sprint plan ----------
def load_plan():
    phases, current = [], None
    for line in read('specs/07-workflow/SPRINT_PLAN.md').split('\n'):
        m = re.match(r'^### (Phase \d) — ([^(]+)', line)
        if m:
            current = {'name': m.group(1), 'goal': m.group(2).strip(), 'tasks': []}
            phases.append(current)
            continue
        if line.startswith('## '):
            current = None
        m = re.match(r'^\| \*{0,2}(T-\d+)\*{0,2} \|', line)
        if not (m and current):
            continue
        cells = row_cells(line)
        status = plain(cells[-1])
        low = status.lower()
        state = 'done' if low.startswith('done') else 'running' if low.startswith('doing') else 'maybe' if low.startswith('could') else 'todo'
        detail = plain('|'.join(cells[1:-5]))
        title = re.split(r' \(|:|;| — |\. ', detail, maxsplit=1)[0]
        current['tasks'].append({
            'id': m.group(1), 'title': title, 'detail': detail, 'owner': plain(cells[-5]), 'depsText': plain(cells[-4]),
            'acceptance': plain(cells[-2]), 'status': status, 'state': state, 'human': 'human' in cells[-3],
        })
    done = {t['id'] for p in phases for t in p['tasks'] if t['state'] == 'done'}
    for phase in phases:
        ids = [t['id'] for t in phase['tasks']]
        for task in phase['tasks']:
            deps = set(re.findall(r'T-\d+', task['depsText']))
            for lo, hi in re.findall(r'T-(\d+)\.\.T-(\d+)', task['depsText']):
                deps |= {f'T-{n}' for n in range(int(lo), int(hi) + 1)} & set(ids)
            if task['depsText'].lower().startswith('all'):
                deps |= set(ids) - {task['id']}
            task['waitingFor'] = sorted(deps - done)
            if task['human'] and task['state'] != 'done':
                task['state'] = 'you'
            task['ready'] = task['state'] == 'todo' and not task['waitingFor']
    return phases


# ---------- status files ----------
def load_status():
    text = read('specs/08-status/PROGRESS.md')
    needs, resolved = [], []
    for line in section(text, '## Blocked on human').split('\n'):
        m = re.match(r'^(\d+)\. (.*)', line)
        if not m:
            continue
        number, body = int(m.group(1)), m.group(2)
        title = re.search(r'\*\*(.+?)\*\*', body) or re.search(r'~~(.+?)~~', body)
        item = {'n': number, 'title': plain(title.group(1)).rstrip(':') if title else ' '.join(plain(body).split()[:5]),
                'text': plain(body)}
        (resolved if body.startswith('~~') else needs).append(item)
    gates = {}
    for line in section(text, '## Gates').split('\n'):
        cells = row_cells(line)
        if len(cells) >= 3 and re.match(r'^(G\d|H1)', cells[0]):
            gates[cells[0].split()[0]] = plain(cells[2])
    tests = [dict(zip(('suite', 'when', 'result'), map(plain, row_cells(line)[:3])))
             for line in section(text, '## Test status').split('\n')
             if line.startswith('|') and not line.startswith('|---') and 'Suite' not in line]
    perf = plain(next((l for l in section(text, '## Perf').split('\n') if l.strip() and not l.startswith('#')), ''))
    banner = [plain(l.lstrip('> ')) for l in text.split('\n') if l.startswith('> **ONE DRIVER') or l.startswith('> **Push hold')]
    standup = []
    for line in section(text, '## Stand-ups').split('\n'):
        if line.startswith('### ') and standup:
            break
        if line.startswith('- '):
            standup.append(plain(line[2:]))
    return {'needs': needs, 'resolved': resolved, 'gateResults': gates, 'tests': tests, 'perf': perf,
            'banner': banner, 'standup': standup[:8]}


def load_decisions():
    out = []
    for line in read('specs/08-status/DECISIONS_LOG.md').split('\n'):
        if re.match(r'^\| D-\d+ \|', line):
            c = row_cells(line)
            out.append({'id': c[0], 'date': c[1], 'decision': plain(c[2]), 'why': plain(c[3]) if len(c) > 3 else '',
                        'who': plain(c[4]) if len(c) > 4 else ''})
    return out[::-1]


def load_bugs():
    out = []
    for line in read('specs/05-testing/BUG_LOG.md').split('\n'):
        if re.match(r'^\| BUG-\d+ \|', line):
            c = row_cells(line)
            if len(c) >= 9 and 'template' not in line:
                out.append({'id': c[0], 'sev': c[2], 'title': plain(c[4]), 'status': plain(c[8])})
    return out


# ---------- agents (Agent-tool agents: one log + meta file each under <session>/subagents/) ----------
def stamp(text):
    try:
        return datetime.datetime.fromisoformat(text.replace('Z', '+00:00')).timestamp()
    except Exception:
        return None


def load_agents():
    project = pathlib.Path.home() / '.claude/projects' / re.sub(r'[^A-Za-z0-9]', '-', str(ROOT))
    agents = []
    metas = list(project.glob('*/subagents/agent-*.meta.json')) + list(project.glob('*/subagents/workflows/*/agent-*.meta.json'))
    for meta in metas:
        log = meta.with_name(meta.name.replace('.meta.json', '.jsonl'))
        if not log.exists() or time.time() - log.stat().st_mtime > 8 * 3600:
            continue
        try:
            info = json.loads(meta.read_text(encoding='utf-8'))
        except ValueError:
            info = {}
        agent = {'label': info.get('description') or '?', 'role': (info.get('agentType') or '').split(':')[-1],
                 'first': None, 'last': None, 'steps': 0, 'doing': ''}
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
                for block in content if isinstance(content, list) else []:
                    if isinstance(block, dict) and block.get('type') == 'tool_use':
                        agent['steps'] += 1
                        args = block.get('input') or {}
                        tool = block.get('name') or ''
                        agent['doing'] = (args.get('description') or
                                          (f'{tool} {os.path.basename(args["file_path"])}' if args.get('file_path') else tool))
        handed_back = agent['doing'] in ('SubagentHandback', 'StructuredOutput')
        quiet = time.time() - (agent['last'] or 0)
        agent['state'] = 'done' if handed_back else 'running' if quiet < AGENT_QUIET_S else 'stopped'
        if handed_back:
            agent['doing'] = 'finished and reported back'
        agent['minutes'] = round(((agent['last'] or 0) - (agent['first'] or 0)) / 60) if agent['state'] != 'running' else round((time.time() - (agent['first'] or time.time())) / 60)
        agent['quietSeconds'] = round(quiet)
        agents.append(agent)
    return sorted(agents, key=lambda a: -(a['last'] or 0))


def load_driver(agents):
    """Is Claude working right now? Read off the processes, the main session log and the agents' logs."""
    project = pathlib.Path.home() / '.claude/projects' / re.sub(r'[^A-Za-z0-9]', '-', str(ROOT))
    copies = leftovers = 0
    try:
        listing = subprocess.run(['ps', '-axo', 'pid,ppid,comm'], capture_output=True, text=True, timeout=5).stdout
        for line in listing.split('\n'):
            if not line.rstrip().endswith('native-binary/claude'):
                continue
            cwd = subprocess.run(['lsof', '-a', '-p', line.split()[0], '-d', 'cwd', '-Fn'], capture_output=True, text=True, timeout=5).stdout
            if any(l[1:].startswith(str(ROOT)) for l in cwd.split('\n') if l.startswith('n')):
                # parent 1 = its editor window is gone: a leftover copy that nobody can see or answer
                if line.split()[1] == '1':
                    leftovers += 1
                else:
                    copies += 1
    except Exception:
        pass
    logs = [f.stat().st_mtime for f in project.glob('*.jsonl')]
    main_quiet = time.time() - max(logs) if logs else 1e9
    running = [a for a in agents if a['state'] == 'running']
    agent_quiet = min((a['quietSeconds'] for a in running), default=1e9)
    quiet = min(main_quiet, agent_quiet)
    state = 'stopped' if not copies else 'working' if quiet < 120 else 'idle'
    return {'state': state, 'quietSeconds': round(quiet), 'agents': len(running), 'copies': copies, 'leftovers': leftovers}


def task_stage(task_id, agents):
    """Build / review / fix progress of one task, read off the labels of the agents that worked on it."""
    stages = {'build': 'none', 'review': 'none', 'fix': 'none'}
    for agent in reversed(agents):  # oldest first, so the latest attempt wins
        if not re.search(rf'\b{task_id}\b', agent['label']):
            continue
        key = 'review' if agent['label'].lower().startswith('review') else 'fix' if agent['label'].lower().startswith('fix') else 'build'
        stages[key] = agent['state']
    return stages


# ---------- what was done, per task ----------
def load_notes():
    """Task id -> the note of its row in PROGRESS 'Now' (what was done, in plain words)."""
    notes = {}
    for line in section(read('specs/08-status/PROGRESS.md'), '## Now').split('\n'):
        cells = row_cells(line)
        m = re.match(r'^\*{0,2}(T-\d+)', cells[0]) if len(cells) >= 4 else None
        if m:
            notes[m.group(1)] = ' '.join(filter(None, [notes.get(m.group(1)), plain(cells[3])]))
    return notes


def load_task_commits():
    """Task id -> its commits, newest first (all branches, so work that is not merged yet shows too)."""
    out = {}
    for line in git('log', '--all', '-600', '--format=%h|%cs|%s').split('\n'):
        parts = line.split('|', 2)
        if len(parts) == 3:
            for task_id in set(re.findall(r'T-\d+', parts[2])):
                out.setdefault(task_id, []).append({'hash': parts[0], 'date': parts[1], 'subject': parts[2]})
    return out


# ---------- day by day ----------
DONE_DATES = {'key': None, 'dates': {}}


def done_dates():
    """Task id -> the day its plan status became done, read from the sprint plan's git history."""
    path = 'specs/07-workflow/SPRINT_PLAN.md'
    key = git('log', '-1', '--format=%H', '--', path)
    if key != DONE_DATES['key']:
        dates = {}
        for line in reversed(git('log', '--format=%H %cs', '--', path).split('\n')):  # oldest first
            commit, _, when = line.partition(' ')
            for task_id, status in re.findall(r'^\| \*{0,2}(T-\d+)\*{0,2} \|.*\|([^|\n]*)\|[ \t]*$', git('show', f'{commit}:{path}'), re.M):
                if not plain(status).lower().startswith('done'):
                    dates.pop(task_id, None)
                elif task_id not in dates:
                    dates[task_id] = when
        DONE_DATES.update(key=key, dates=dates)
    return DONE_DATES['dates']


def load_daily(plan, today):
    """Per day: how many tasks should be done by that evening and how many are.
    The plan dates phases, not tasks, so each phase's tasks are spread evenly over its days."""
    dates, start, now = done_dates(), day(PHASES[0][2]), today.isoformat()
    spans = [(name, day(first), day(last), [t for t in phase['tasks'] if t['state'] != 'maybe'])
             for (name, _, first, last), phase in zip(PHASES, plan)]
    finished = {}
    for _, _, _, tasks in spans:
        for task in tasks:
            if task['state'] == 'done':  # done but not committed yet counts as today
                finished.setdefault(max(start.isoformat(), min(now, dates.get(task['id'], now))), []).append(task['id'])
    days, done = [], 0
    for n in range((day(PHASES[-1][3]) - start).days + 1):
        d = start + datetime.timedelta(days=n)
        done += len(finished.get(d.isoformat(), []))
        target = sum(len(tasks) * min(1, max(0, ((d - first).days + 1) / ((last - first).days + 1))) for _, first, last, tasks in spans)
        days.append({'date': d.isoformat(), 'target': round(target), 'done': done if d <= today else None,
                     'finished': sorted(finished.get(d.isoformat(), []))})
    return days


# ---------- everything ----------
def collect():
    today = datetime.date.today()
    plan = load_plan()
    agents = load_agents()
    notes, task_commits, dates = load_notes(), load_task_commits(), done_dates()
    for phase in plan:
        for task in phase['tasks']:
            task['stage'] = task_stage(task['id'], agents) if task['state'] == 'running' else None
            task['phase'] = phase['name']
            task['note'] = notes.get(task['id'], '')
            task['commits'] = task_commits.get(task['id'], [])[:12]
            task['doneOn'] = dates.get(task['id']) if task['state'] == 'done' else None
    tasks = [t for p in plan for t in p['tasks']]
    calendar = []
    for (name, goal, first, last), phase in zip(PHASES, plan):
        calendar.append({'name': name, 'goal': goal, 'start': day(first).isoformat(), 'end': day(last).isoformat(),
                         'days': (day(last) - day(first)).days + 1,
                         'daysUsed': min((day(last) - day(first)).days + 1, max(0, (today - day(first)).days + 1)),
                         'current': day(first) <= today <= day(last),
                         'counts': {s: sum(1 for t in phase['tasks'] if t['state'] == s) for s in ('done', 'running', 'you', 'todo', 'maybe')}})
    total_days = (day((11, 17)) - day((10, 10))).days + 1
    lanes = []
    for branch in git('branch', '--format=%(refname:short)').split('\n'):
        if branch.startswith('worktree-'):
            lanes.append({'branch': branch, 'ahead': int(git('rev-list', '--count', f'develop..{branch}') or 0),
                          'last': git('log', '-1', '--format=%cr|%s', branch)})
    commits = [dict(zip(('when', 'subject'), line.split('|', 1))) for line in git('log', '-14', '--format=%cr|%s', 'develop').split('\n') if '|' in line]
    return {
        'generatedAt': datetime.datetime.now().strftime('%a %d %b %H:%M:%S'),
        'pageVersion': (HERE / 'index.html').stat().st_mtime,  # the open tab reloads itself when the page changes
        'today': today.isoformat(),
        'dayNumber': (today - day((10, 10))).days + 1, 'totalDays': total_days,
        'daysToSubmit': (day((11, 17)) - today).days,
        'gates': [{'name': n, 'date': day(d).isoformat(), 'daysLeft': (day(d) - today).days} for n, d in GATES],
        'phases': plan, 'calendar': calendar, 'daily': load_daily(plan, today),
        'totals': {s: sum(1 for t in tasks if t['state'] == s) for s in ('done', 'running', 'you', 'todo', 'maybe')},
        'ready': [{'id': t['id'], 'title': t['title'], 'owner': t['owner']} for t in tasks if t['ready']],
        'agents': agents, 'driver': load_driver(agents), 'status': load_status(), 'decisions': load_decisions(), 'bugs': load_bugs(),
        'git': {'head': git('rev-parse', '--short', 'develop'), 'unpushed': int(git('rev-list', '--count', 'origin/develop..develop') or 0),
                'editing': len([l for l in git('status', '--porcelain').split('\n') if l.strip()]), 'lanes': lanes, 'commits': commits},
    }


# ---------- alerts: Mac notifications sent from here, so they arrive even with the page closed ----------
EVENTS_FILE = ROOT / '.tmp/tracker-events.json'
try:
    EVENTS = json.loads(EVENTS_FILE.read_text(encoding='utf-8'))
except (OSError, ValueError):
    EVENTS = []
IDLE_ALERT_S = 240  # quiet this long = Claude stopped working (the longest single step, the e2e run, is under 3 min)


def alert(title, text):
    EVENTS.insert(0, {'ts': time.time(), 'title': title, 'text': text})
    del EVENTS[60:]
    try:
        EVENTS_FILE.parent.mkdir(exist_ok=True)
        EVENTS_FILE.write_text(json.dumps(EVENTS), encoding='utf-8')
        script = f'display notification {json.dumps(text, ensure_ascii=False)} with title {json.dumps(title, ensure_ascii=False)} sound name "Glass"'
        subprocess.run(['osascript', '-e', script], capture_output=True, timeout=5)
    except Exception:
        pass


def watch():
    """Every 20 s: alert on each new item that needs Parth, finished task, new decision, and when Claude stops working."""
    before = None
    while True:
        try:
            data = snapshot()
            driver = data['driver']
            now = {'needs': {n['n']: n['title'] for n in data['status']['needs']},
                   'done': {t['id']: f"{t['id']} {t['title']}" for p in data['phases'] for t in p['tasks'] if t['state'] == 'done'},
                   'decisions': {x['id']: f"{x['id']}: {x['decision']}"[:200] for x in data['decisions']},
                   'resting': driver['state'] == 'stopped' or driver['quietSeconds'] >= IDLE_ALERT_S}
            if before:
                for key, title in (('needs', 'Roomsong needs you'), ('done', 'Roomsong: task done'), ('decisions', 'Roomsong: new decision')):
                    for item in sorted(now[key].keys() - before[key].keys()):
                        alert(title, now[key][item])
                if now['resting'] and not before['resting']:
                    alert('Roomsong: Claude stopped working',
                          'Claude is not running. Open Claude in this project and type "continue".' if driver['state'] == 'stopped'
                          else f'Nothing has happened for {IDLE_ALERT_S // 60} minutes: Claude finished its turn or is waiting for you.')
            before = now
        except Exception:
            pass
        time.sleep(20)


CACHE = {'at': 0.0, 'data': None}


def snapshot():
    if CACHE['data'] is None or time.time() - CACHE['at'] > 3:
        CACHE['data'] = collect()
        CACHE['at'] = time.time()
    return CACHE['data']


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):  # noqa: N802 (name fixed by http.server)
        if self.path.split('?')[0] == '/data':
            try:
                body = json.dumps(dict(snapshot(), events=EVENTS[:25]))  # alerts are never served from the cache
            except Exception as error:  # never take the page down because one file is mid-edit
                body = json.dumps({'error': f'{type(error).__name__}: {error}'})
            self.reply(body.encode('utf-8'), 'application/json')
        elif self.path.split('?')[0] == '/test-alert':
            alert('Roomsong tracker', 'Test alert: if you can read this, alerts work.')
            self.reply(b'{"ok": true}', 'application/json')
        elif self.path.split('?')[0] == '/':
            self.reply((HERE / 'index.html').read_bytes(), 'text/html; charset=utf-8')
        else:
            self.send_error(404)

    def reply(self, body, kind):
        self.send_response(200)
        self.send_header('Content-Type', kind)
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass


if __name__ == '__main__':
    print(f'Roomsong tracker: http://127.0.0.1:{PORT}/   (Ctrl+C to stop)')
    threading.Thread(target=watch, daemon=True).start()
    ThreadingHTTPServer(('127.0.0.1', PORT), Handler).serve_forever()
