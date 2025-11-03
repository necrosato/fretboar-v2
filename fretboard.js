window.metroNote = undefined;
const maxFretWidth = 90;
const minFretWidth = 50;
const scales = Object.fromEntries(window.scaleDefs);
const noteMap = {
  "C": 0, "C#": 1, "DB": 1, "D": 2, "D#": 3, "EB": 3,
  "E": 4, "FB": 4, "F": 5, "F#": 6, "GB": 6,
  "G": 7, "G#": 8, "AB": 8, "A": 9, "A#": 10, "BB": 10, "B": 11, "CB": 11
};
const noteNames = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];

const pitchColors = {
      "C": "#e6194b",  "C#": "#f58231", "D": "#ffe119",
      "D#": "#bfef45", "E": "#3cb44b",  "F": "#42d4f4",
      "F#": "#4363d8", "G": "#911eb4",  "G#": "#f032e6",
      "A": "#a9a9a9",  "A#": "#fabebe", "B": "#ffd8b1"
};

function getNoteName(i) {
  return noteNames[i % 12];
}

function parseNotes(input) {
  return input.toUpperCase().split(/[\s,]+/)
    .map(n => noteMap[n] != null ? getNoteName(noteMap[n]) : null)
    .filter(Boolean);
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
  const tuningInput = document.getElementById('tuningInput').value.trim().toUpperCase();
  const tuningNotes = tuningInput.split(/\s+/).map(n => noteMap[n] ?? 4);
  const frets = parseInt(document.getElementById('fretsInput').value, 10) + 1;
  const notesInputEl = document.getElementById('notesInput');
  const highlightNotes = parseNotes(notesInputEl.value);
  const scaleRootName = document.getElementById('scaleRootSelect').value.toUpperCase();
  const scaleName = document.getElementById('scaleSelect').value;
  const showAll = document.getElementById('showAllNotesToggle').checked;
  const highlightRootToggle = document.getElementById('highlightRootToggle').checked;
  const colorMode = document.getElementById('colorModeSelect')?.value || '';
  const pitchColorsEnabled = colorMode !== '';
  const relativeColorsEnabled = colorMode === 'relative';

  const rootVal = noteMap[scaleRootName] ?? '';

  let scaleSet = new Set();
  let scaleNotes = [];
  if (scaleName && scales[scaleName]) {
    scaleNotes = scales[scaleName].map(interval => getNoteName((rootVal + interval) % 12));
    scaleSet = new Set(scaleNotes);
  }

  const highlightsSet = new Set(highlightNotes.map(n => n.toUpperCase()));
  if (scaleSet.size) {
    highlightsSet.forEach(note => scaleSet.add(note));
  }

  const scaleDegreeColorMap = new Map();
  if (relativeColorsEnabled && scaleNotes.length && scaleName) {
    const baseScaleNotes = scales[scaleName].map(interval => getNoteName(interval % 12));
    scaleNotes.forEach((note, index) => {
      if (!scaleDegreeColorMap.has(note)) {
        const baseDegreeNote = baseScaleNotes[index % baseScaleNotes.length];
        const degreeColor = pitchColors[baseDegreeNote] || pitchColors[note];
        if (degreeColor) {
          scaleDegreeColorMap.set(note, degreeColor);
        }
      }
    });
  }

  const getRingColor = (note) => {
    if (!pitchColorsEnabled) return null;
    if (relativeColorsEnabled && scaleDegreeColorMap.size && scaleDegreeColorMap.has(note)) {
      return scaleDegreeColorMap.get(note);
    }
    return pitchColors[note];
  };

  const strings = tuningNotes.slice().reverse();

  fb.innerHTML = '';
  const fretWidth = maxFretWidth - ((maxFretWidth - minFretWidth)/frets);
  fb.style.gridTemplateColumns = `repeat(${frets},90px)`;
  fb.style.gridTemplateRows = `repeat(${strings.length},50px)`;

  document.querySelectorAll('.string-line').forEach(e => e.remove());
  strings.forEach((_, i) => {
    const line = document.createElement('div');
    line.className = 'string-line';
    line.style.top = `${(i + 0.5) * 50}px`;
    line.style.height = `${i*.3+1}px`;
    fb.appendChild(line);
  });

  const metroSync = document.getElementById('metroSyncSelect')?.value || 'none';
  window.metroNote = metroSync === 'active' ? 
        highlightNotes[(window.playCount-1) % highlightNotes.length] :
        metroSync === 'scale' ? scaleNotes[(window.playCount-1) % scaleNotes.length] : undefined;

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

      let pitchHighlight = (div, note, cname)=>{
                  div.classList.add(cname);
          const ringColor = getRingColor(note);
          if (ringColor) {
                        div.classList.add('ring');
                        div.style.setProperty('--ring-color', ringColor);
          }
      };
      if (window.playCount > 0 && noteName == window.metroNote) {
        pitchHighlight(div, noteName, 'metro-highlight');
      } else if (isRoot && highlightRootToggle) {
        pitchHighlight(div, noteName, 'root-highlight');
      } else if (isUserHighlight) {
        pitchHighlight(div, noteName, 'highlight');
      } else if (isScale) {
        pitchHighlight(div, noteName, 'scale-highlight');
      }

      div.addEventListener('pointerup', () => {
        let currentNotes = parseNotes(notesInputEl.value);
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
renderFretboard();

[
  'notesInput',
  'scaleRootSelect',
  'scaleSelect',
  'tuningInput',
  'fretsInput',
  'highlightRootToggle',
  'showAllNotesToggle',
  'colorModeSelect',
  'groupBySelect'
].forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('change', () => {
    renderFretboard();
  });
});

const satoModeButton = document.getElementById('satoModeButton');
if (satoModeButton) {
  const body = document.body;
  const updateSatoModeButton = () => {
    const engaged = body.classList.contains('sato-mode-engaged');
    satoModeButton.textContent = engaged ? 'Sato Mode: Engaged' : 'Sato Mode';
    satoModeButton.classList.toggle('engaged', engaged);
    satoModeButton.setAttribute('aria-pressed', engaged ? 'true' : 'false');
  };

  satoModeButton.addEventListener('click', () => {
    body.classList.toggle('sato-mode-engaged');
    updateSatoModeButton();
  });

  updateSatoModeButton();
}
