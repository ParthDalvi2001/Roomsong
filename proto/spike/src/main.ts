// T-104 device capability spike, the 2D page: one tap on Start, then the results as a table and as JSON to copy.
// Every run is kept in this browser's localStorage (never sent) and saved after each step of the probe, so the
// runs of the device script are copied together and a run that is cut short still shows after a reload.
import { RUNS_KEY } from './config';
import { runProbe, type Results } from './probe';

const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const start = element<HTMLButtonElement>('start');
const status = element('status');
const json = element<HTMLTextAreaElement>('json');
const answers = {
  run: element<HTMLSelectElement>('run'),
  crackle: element<HTMLSelectElement>('crackle'),
  permission: element<HTMLSelectElement>('permission'),
};

const say = (text: string) => {
  status.textContent = text;
};

function storedRuns(): Results[] {
  try {
    return JSON.parse(localStorage.getItem(RUNS_KEY) ?? '[]') as Results[];
  } catch {
    return []; // unreadable storage: start again rather than block the probe
  }
}
const runs = storedRuns();
let saved = true;

/** One row per value: nested fields become dotted paths, lists of plain values stay on one row. */
function rows(value: unknown, path = ''): [path: string, text: string][] {
  const plainList = Array.isArray(value) && value.every((item) => typeof item !== 'object');
  if (value !== null && typeof value === 'object' && !plainList) {
    return Object.entries(value).flatMap(([key, child]) => rows(child, path ? `${path}.${key}` : key));
  }
  return [[path, plainList ? (value as unknown[]).join(', ') || '(none)' : String(value)]];
}

function show() {
  const latest = runs[runs.length - 1];
  if (!latest) return;
  const { reasons, ...fields } = latest;
  element('results').hidden = false;
  element('caption').textContent = latest.emulator
    ? `Latest run: emulator values (${latest.emulator}), not a headset result`
    : 'Latest run';
  element('table').replaceChildren(
    ...rows(fields).map(([path, text]) => {
      const row = document.createElement('tr');
      const name = row.appendChild(document.createElement('th'));
      name.scope = 'row';
      name.textContent = path;
      // A null carries its reason: its own, one given for every item of its list, or the session's.
      const forList = path.replace(/\.\d+(?=\.)/g, '');
      const why = text === 'null' ? (reasons[path] ?? reasons[forList] ?? reasons.session) : undefined;
      row.appendChild(document.createElement('td')).textContent = why ? `null (${why})` : text;
      return row;
    }),
  );
  answers.run.value = latest.human.run ?? '';
  answers.crackle.value = String(latest.human.crackleFromVoices ?? '');
  answers.permission.value = latest.human.spacePermission ?? '';
  json.value = JSON.stringify(runs, null, 2);
}

function save() {
  try {
    localStorage.setItem(RUNS_KEY, JSON.stringify(runs));
    saved = true;
  } catch {
    saved = false; // said with the run's last status, below
  }
  show();
}

start.addEventListener('click', () => {
  start.disabled = true;
  say('Starting.');
  const slot = runs.length;
  // The probe hands over the results after every step: what a stalled or interrupted run measured is kept.
  runProbe(say, (results) => {
    runs[slot] = results;
    save();
  })
    .then((results) => {
      const ended = results.completed
        ? 'Done. The results are below.'
        : `Stopped early: ${results.reasons.session}`;
      say(saved ? ended : `${ended} They could not be saved in this browser: copy them before you reload.`);
    })
    .catch((error: unknown) => say(`The probe failed: ${String(error)}`))
    .finally(() => {
      start.disabled = false; // usable again after any ending
    });
});

// What only a person can tell: which run of the script this was, when the sound broke up, and what they
// answered to the headset's prompt.
for (const select of Object.values(answers)) {
  select.addEventListener('change', () => {
    const latest = runs[runs.length - 1];
    if (!latest) return;
    latest.human = {
      run: answers.run.value || null,
      crackleFromVoices: answers.crackle.value ? Number(answers.crackle.value) : null,
      spacePermission: answers.permission.value || null,
    };
    save();
  });
}

element('copy').addEventListener('click', () => {
  navigator.clipboard.writeText(json.value).then(
    () => say('Copied.'),
    () => {
      json.select();
      say('Copying was blocked. The text is selected: copy it by hand.');
    },
  );
});

show();
