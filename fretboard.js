window.metroNote = undefined;
const maxFretWidth = 90;
const minFretWidth = 50;
const scales = Object.fromEntries(window.scaleDefs);
const noteMap = {
  "C": 0, "C#": 1, "DB": 1, "D": 2, "D#": 3, "EB": 3,
  "E": 4, "FB": 4, "F": 5, "F#": 6, "GB": 6,
  "G": 7, "G#": 8, "AB": 8, "A": 9, "A#": 10, "BB": 10, "B": 11, "CB": 11
};
window.noteMap = noteMap;
const noteNames = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
window.noteNames = noteNames;
window.scales = scales;

const pitchColors = {
      "C": "#e6194b",  "C#": "#f58231", "D": "#ffe119",
      "D#": "#bfef45", "E": "#3cb44b",  "F": "#42d4f4",
      "F#": "#4363d8", "G": "#911eb4",  "G#": "#f032e6",
      "A": "#a9a9a9",  "A#": "#fabebe", "B": "#ffd8b1"
};

function getNoteName(i) {
  return noteNames[i % 12];
}
window.getNoteName = getNoteName;

function parseNotes(input) {
  return input.toUpperCase().split(/[\s,]+/)
    .map(n => noteMap[n] != null ? getNoteName(noteMap[n]) : null)
    .filter(Boolean);
}

const patternState = {
  activePatternId: ''
};

function updatePatternStatus(message) {
  const statusEl = document.getElementById('patternStatus');
  if (!statusEl) return;
  statusEl.textContent = message || '';
}

function clearPatternSelection() {
  patternState.activePatternId = '';
  const select = document.getElementById('patternSelect');
  if (select) select.value = '';
  updatePatternStatus('');
}

function getFretboardContext() {
  const tuningInput = document.getElementById('tuningInput')?.value.trim().toUpperCase() || '';
  const tuningNotes = tuningInput.split(/\s+/).map(n => noteMap[n] ?? 4);

  const fretsInput = parseInt(document.getElementById('fretsInput')?.value, 10);
  const fretCount = (Number.isFinite(fretsInput) ? fretsInput : 24) + 1;

  const scaleRootName = document.getElementById('scaleRootSelect')?.value.toUpperCase() || '';
  const scaleName = document.getElementById('scaleSelect')?.value || '';
  const rootValue = noteMap[scaleRootName];
  const scaleIntervals = scaleName && scales[scaleName] ? scales[scaleName] : undefined;
  const scaleNotes = scaleIntervals && rootValue != null
    ? scaleIntervals.map(interval => getNoteName((rootValue + interval) % 12))
    : [];
  const scaleSet = new Set(scaleNotes);

  const startFretValue = parseInt(document.getElementById('patternStartFret')?.value, 10);
  const startFret = Number.isFinite(startFretValue) ? startFretValue : 0;

  return {
    tuningNotes,
    fretCount,
    scaleName,
    scaleRootName,
    scaleIntervals,
    scaleNotes,
    scaleSet,
    rootValue,
    startFret
  };
}
window.getFretboardContext = getFretboardContext;

function syncPatternStartFretMax() {
  const patternStartInput = document.getElementById('patternStartFret');
  if (!patternStartInput) return;
  const context = getFretboardContext();
  const max = Math.max((context.fretCount || 1) - 1, 0);
  patternStartInput.max = max;
}

function populatePatternSelect() {
  const select = document.getElementById('patternSelect');
  if (!select) return;

  const patterns = Array.isArray(window.patternLibrary) ? window.patternLibrary : [];
  select.innerHTML = '';

  const noneOption = document.createElement('option');
  noneOption.value = '';
  noneOption.textContent = '--None--';
  select.appendChild(noneOption);

  patterns.forEach(pattern => {
    if (!pattern || !pattern.id) return;
    const option = document.createElement('option');
    option.value = pattern.id;
    option.textContent = pattern.name || pattern.id;
    if (pattern.description) option.title = pattern.description;
    select.appendChild(option);
  });
}

function applyActivePattern() {
  const patternId = patternState.activePatternId;
  const notesInputEl = document.getElementById('notesInput');
  if (!notesInputEl) return;

  if (!patternId) {
    updatePatternStatus('');
    renderFretboard();
    return;
  }

  const patterns = Array.isArray(window.patternLibrary) ? window.patternLibrary : [];
  const pattern = patterns.find(p => p?.id === patternId);
  if (!pattern || typeof pattern.generator !== 'function') {
    updatePatternStatus('Selected pattern is unavailable.');
    renderFretboard();
    return;
  }

  const context = getFretboardContext();
  const result = pattern.generator(context) || {};

  if (result.error) {
    updatePatternStatus(result.error);
    renderFretboard();
    return;
  }

  if (Array.isArray(result.notes)) {
    notesInputEl.value = result.notes.join(' ');
  }

  const message = result.message || pattern.description || '';
  updatePatternStatus(message);

  renderFretboard();
}

function handleControlChange(event) {
  syncPatternStartFretMax();
  if (event?.target?.id === 'notesInput' && patternState.activePatternId) {
    clearPatternSelection();
  }

  if (patternState.activePatternId) {
    applyActivePattern();
  } else {
    renderFretboard();
  }
}

function populateSelectors() {
  const rootSelect = document.getElementById('scaleRootSelect');
  rootSelect.innerHTML = "<option></option>" + noteNames.map(n => `<option>${n}</option>`).join('');
  
  const scaleSelect = document.getElementById('scaleSelect');
  scaleSelect.innerHTML = `<option value="">--None--</option>` + window.scaleDefs.map(
    ([name]) => `<option value="${name}">${name}</option>`
  ).join('');
}

function getScaleNotes(rootVal, scaleIntervals) {
  return new Set(scaleIntervals.map(i => getNoteName((rootVal + i) % 12)));
}

function renderFretboard() {
  const fb = document.getElementById('fretboard');
  const lb = document.getElementById('labels');
  const context = getFretboardContext();
  const tuningNotes = context.tuningNotes || [];
  const frets = Math.max(context.fretCount || 0, 1);
  const notesInputEl = document.getElementById('notesInput');
  const highlightNotes = parseNotes(notesInputEl.value);
  const showAll = document.getElementById('showAllNotesToggle').checked;
  const highlightRootToggle = document.getElementById('highlightRootToggle').checked;
  const pitchToggle = document.getElementById('pitchColorsToggle').checked;

  const rootVal = context.rootValue ?? '';
  const scaleNotes = context.scaleNotes || [];
  const scaleSet = new Set(scaleNotes);

  const highlightsSet = new Set(highlightNotes.map(n => n.toUpperCase()));
  if (scaleSet.size) {
    highlightsSet.forEach(note => scaleSet.add(note));
  }

  const strings = tuningNotes.slice().reverse();

  fb.innerHTML = '';
  const fretWidth = maxFretWidth - ((maxFretWidth - minFretWidth) / frets);
  fb.style.gridTemplateColumns = `repeat(${frets},90px)`;
  fb.style.gridTemplateRows = `repeat(${strings.length},50px)`;

  document.querySelectorAll('.string-line').forEach(e => e.remove());
  strings.forEach((_, i) => {
    const line = document.createElement('div');
    line.className = 'string-line';
    line.style.top = `${(i + 0.5) * 50}px`;
    line.style.height = `${i * .3 + 1}px`;
    fb.appendChild(line);
  });

  const metroSync = document.getElementById('metroSyncSelect')?.value || 'none';
  window.metroNote = metroSync === 'active'
    ? highlightNotes[(window.playCount - 1) % highlightNotes.length]
    : metroSync === 'scale' ? scaleNotes[(window.playCount - 1) % scaleNotes.length] : undefined;

  for (let s = 0; s < strings.length; s++) {
    for (let f = 0; f < frets; f++) {
      const openVal = strings[s];
      const noteIndex = (openVal + f) % 12;
      const noteName = getNoteName(noteIndex);
      const div = document.createElement('div');
      div.className = 'fret';
      div.style.width = fretWidth;
      div.dataset.fret = f;
      div.dataset.note = noteName;
      div.dataset.string = s;
      if (f === 0) div.classList.add('open');

      const isRoot = noteIndex === rootVal;
      const isScale = scaleSet.has(noteName);
      const isUserHighlight = highlightsSet.has(noteName);

      if (!showAll && f !== 0 && !isRoot && !isScale && !isUserHighlight) {
        div.textContent = '';
      } else {
        div.textContent = noteName;
      }

      const pitchHighlight = (target, note, className) => {
        target.classList.add(className);
        if (pitchToggle) {
          target.classList.add('ring');
          target.style.setProperty('--ring-color', pitchColors[note]);
        }
      };
      if (window.playCount > 0 && noteName === window.metroNote) {
        pitchHighlight(div, noteName, 'metro-highlight');
      } else if (isRoot && highlightRootToggle) {
        pitchHighlight(div, noteName, 'root-highlight');
      } else if (isUserHighlight) {
        pitchHighlight(div, noteName, 'highlight');
      } else if (isScale) {
        pitchHighlight(div, noteName, 'scale-highlight');
      }

      div.addEventListener('pointerup', () => {
        if (patternState.activePatternId) {
          clearPatternSelection();
        }
        const currentNotes = parseNotes(notesInputEl.value);
        const clickedNote = noteName;
        const index = currentNotes.indexOf(clickedNote);
        if (index !== -1) {
          currentNotes.splice(index, 1);
        } else {
          currentNotes.push(clickedNote);
        }
        notesInputEl.value = currentNotes.join(' ');
        renderFretboard();
        analyzeHighlightedNotes();
      });

      fb.appendChild(div);
    }
  }

  lb.innerHTML = '';
  lb.style.gridTemplateColumns = `repeat(${frets},90px)`;
  for (let f = 0; f < frets; f++) {
    const D = document.createElement('div');
    D.textContent = f;
    lb.appendChild(D);
  }
  analyzeHighlightedNotes();
}

function analyzeHighlightedNotes() {
  const output = document.getElementById('analysisOutput');
  const highlightedNotes = new Set(parseNotes(document.getElementById('notesInput').value));

  if (highlightedNotes.size === 0) {
    output.textContent = "No highlighted notes selected. Select notes to see scale analysis automatically.";
    return;
  }

  const results = new Map();

  for (let rootIndex = 0; rootIndex < 12; rootIndex++) {
    const rootName = getNoteName(rootIndex);
    for (const [scaleName, intervals] of window.scaleDefs) {
      const scaleNotesSet = getScaleNotes(rootIndex, intervals);
      const fits = [...highlightedNotes].every(note => scaleNotesSet.has(note));
      if (fits) {
        const key = [...scaleNotesSet].sort().join(',');
        const label = `${rootName} ${scaleName}`;
        if (!results.has(key)) results.set(key, []);
        results.get(key).push(label);
      }
    }
  }

  if (results.size === 0) {
    output.textContent = "No scale/root combinations contain all highlighted notes.";
  } else {
	output.innerHTML = `<strong>Scales containing all highlighted notes:</strong><br>`;
	const groupBy = document.getElementById('groupBySelect')?.value || 'root';

	const grouped = new Map();

    for (const [scaleNotes, scaleLabels] of results.entries()) {
	  for (const label of scaleLabels) {
		const [root, ...scaleParts] = label.split(' ');
		const scale = scaleParts.join(' ');
		const key = groupBy === 'root' ? root : groupBy === 'scale' ? scale : scaleNotes;
		const text = groupBy === 'root' ? scale : groupBy === 'scale' ? root : label;
		if (!grouped.has(key)) { grouped.set(key, []); }
		grouped.get(key).push({ root, scale, text });
	  }
    }

	const list = document.createElement('ul');
    for (const [groupKey, entries] of [...grouped.entries()].sort((a, b) => {
          return a[0].localeCompare(b[0]); // Sort by groupKey
    })) {
	  const groupItem = document.createElement('li');
	  groupItem.innerHTML = `<strong>${groupKey}</strong>: `;

	  entries.sort((a, b) => a.scale.localeCompare(b.scale));
	  for (const { root, scale, text } of entries) {
		const btn = document.createElement('button');
		btn.textContent = `${text}`;

		const scaleRootSelect = document.getElementById('scaleRootSelect');
		const scaleSelect = document.getElementById('scaleSelect');

		if (scaleRootSelect.value === root && scaleSelect.value === scale) {
		  btn.classList.add('selected-scale');
		}

		btn.onpointerup = () => {
		  if (scaleRootSelect.value === root && scaleSelect.value === scale) {
			scaleRootSelect.value = '';
			scaleSelect.value = '';
		  } else {
			scaleRootSelect.value = root;
			scaleSelect.value = scale;
		  }
		  renderFretboard();
		};
		groupItem.appendChild(btn);
	  }
	  list.appendChild(groupItem);
	}
	output.appendChild(list);
  }
}

populateSelectors();
populatePatternSelect();
syncPatternStartFretMax();
renderFretboard();

['notesInput','scaleRootSelect','scaleSelect','tuningInput','fretsInput','highlightRootToggle','showAllNotesToggle','pitchColorsToggle','groupBySelect','patternStartFret'].forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('change', (event) => {
    handleControlChange(event);
  });
});

const patternSelectEl = document.getElementById('patternSelect');
if (patternSelectEl) {
  patternSelectEl.addEventListener('change', (event) => {
    const value = event.target.value;
    if (!value) {
      clearPatternSelection();
      renderFretboard();
      return;
    }
    patternState.activePatternId = value;
    applyActivePattern();
  });
}
