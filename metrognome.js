window.playCount = 0;

function noteToFrequency(note) {
  const noteRegex = /^([A-Ga-g])(#|b)?(\d+)?$/;
  const match = noteRegex.exec(note.trim());
  if (!match) {
    console.warn("Invalid note format:", note);
    return null;
  }

  let [, letter, accidental, octave] = match;
  letter = letter.toUpperCase();
  accidental = accidental || '';
  octave = parseInt(octave, 10);

  // Default to octave 4 if none is provided
  if (!octave || isNaN(octave)) octave = 4;

  const semitoneMap = {
    "C": 0, "C#": 1, "Db": 1,
    "D": 2, "D#": 3, "Eb": 3,
    "E": 4,
    "F": 5, "F#": 6, "Gb": 6,
    "G": 7, "G#": 8, "Ab": 8,
    "A": 9, "A#": 10, "Bb": 10,
    "B": 11
  };

  const key = letter + accidental;
  const semitone = semitoneMap[key];

  if (semitone == null) {
    console.warn("Unknown note name:", key);
    return null;
  }

  const midi = (octave + 1) * 12 + semitone;
  const fact = Math.pow(2, (midi - 69) / 12);
  return 440*fact; 
}

class Metronome {
  constructor() {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.isPlaying = false;
    this.currentNote = 0;
    this.nextNoteTime = 0;
    this.intervalId = null;
    this.scheduleAheadTime = 0.1;
    this.lookahead = 0.0;
    this.sequence = [];
    this.currentMeasure = 0;
    this.currentBeat = 0;
    this.addMeasure();
  }

  addMeasure(tempo = 120, timeSignature = [4, 4], tones = []) {
    const measure = { tempo, timeSignature, tones };
    this.sequence.push(measure);
    this.renderMeasures();
  }

  deleteMeasure(index) {
    if (this.sequence[index]) {
      this.sequence.splice(index, 1);
      this.renderMeasures();
    }
  }

  saveSequenceToFile(filename = "sequence.json") {
    const blob = new Blob([JSON.stringify(this.sequence, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  loadSequence() {
    document.getElementById('file-input').click();
  }

  start() {
    if (this.sequence.length === 0) {
      alert('No measures in the sequence!');
      return;
    }
    this.isPlaying = true;
    this.currentMeasure = 0;
    this.currentNote = 0;
    this.currentBeat = 0;
    this.nextNoteTime = this.audioContext.currentTime;
    this.renderMeasures();
    this.intervalId = setInterval(() => this.scheduler(), this.lookahead);
  }

  stop() {
    window.playCount = 0;
    renderFretboard();
    this.isPlaying = false;
    if (this.intervalId) clearInterval(this.intervalId);
    this.renderMeasures();
  }

  nextNote() {
    const currentMeasureData = this.sequence[this.currentMeasure];
    const beatsPerMeasure = currentMeasureData.timeSignature[0];
    const secondsPerBeat = 60.0 / currentMeasureData.tempo;
    this.nextNoteTime += secondsPerBeat;
    this.currentNote++;
    if (this.currentNote === beatsPerMeasure) {
      this.currentNote = 0;
      this.currentMeasure = (this.currentMeasure + 1) % this.sequence.length;
    }
    this.currentBeat = this.currentNote;
  }

  scheduler() {
	if (this.sequence.length === 0) {
	  this.stop();
	  return;
	}
    while (this.nextNoteTime < this.audioContext.currentTime + this.scheduleAheadTime) {
      this.playNote();
      this.nextNote();
    }
  }

  playNote() {
    window.playCount++;
    renderFretboard();
    const currentMeasureData = this.sequence[this.currentMeasure];
    const overrideToneToggle = document.getElementById('overrideToneToggle').checked;

    const scaleRootName = document.getElementById('scaleRootSelect').value.toUpperCase();
    const minFrequency = scaleRootName ? noteToFrequency(scaleRootName) : 440;
    let tone = overrideToneToggle && window.metroNote ? noteToFrequency(window.metroNote) : currentMeasureData.tones[this.currentNote];
	tone = overrideToneToggle && tone < minFrequency ? tone * 2 : tone;
    const osc = this.audioContext.createOscillator();
    osc.frequency.value = tone || 440;
  const gain = this.audioContext.createGain();
  osc.connect(gain);
  gain.connect(this.audioContext.destination);

  const startTime = this.nextNoteTime;
  const stopTime = startTime + 0.1;

  // Apply smooth envelope
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(0.3, startTime + 0.005); // quick fade-in
  gain.gain.linearRampToValueAtTime(0, stopTime); // fade-out

  osc.start(startTime);
  osc.stop(stopTime);
    this.renderMeasures();
  }

  renderMeasures() {
    const measuresContainer = document.getElementById('measures');
    measuresContainer.innerHTML = '';
    this.sequence.forEach((measure, index) => {
      const div = document.createElement('div');
      div.className = 'measure';

      const tempoInput = this.createInput(measure.tempo, 'Tempo (BPM): ', val => {
        this.sequence[index].tempo = parseInt(val, 10) || 0;
      });

      const tsNumInput = this.createInput(measure.timeSignature[0], 'Time Signature: ', val => {
        const n = parseInt(val, 10) || 0;
        this.sequence[index].timeSignature[0] = n;
        this.sequence[index].tones.length = n;
        this.renderMeasures();
      }, 30);

      const tsDenInput = this.createInput(measure.timeSignature[1], '/ ', val => {
        this.sequence[index].timeSignature[1] = parseInt(val, 10) || 0;
      }, 30);

      div.append(tempoInput, document.createElement("br"), tsNumInput, tsDenInput);
		const toneContainer = document.createElement('div');
		toneContainer.className = 'tone-column';

		for (let i = 0; i < measure.timeSignature[0]; i++) {
		  const toneVal = measure.tones[i] ?? (i === 0 ? 880 : 440);
		  measure.tones[i] = toneVal;

		  const toneInput = this.createInput(toneVal, `B${i + 1}: `, val => {
			this.sequence[index].tones[i] = parseFloat(val) || 0;
		  }, 60);

		  if (this.isPlaying && index === this.currentMeasure && i === this.currentBeat) {
			toneInput.querySelector('input').classList.add('active-beat');
		  }

		  toneContainer.appendChild(toneInput);
		}
		div.appendChild(toneContainer);
      const deleteButton = document.createElement('button');
      deleteButton.textContent = 'Delete';
      deleteButton.onclick = () => this.deleteMeasure(index);
      div.appendChild(deleteButton);

      measuresContainer.appendChild(div);
    });
  }

  createInput(value, labelText, onChange, width = 60) {
    const label = document.createElement('label');
    label.textContent = `${labelText}`;
    const input = document.createElement('input');
    input.type = 'number';
    input.value = value;
    input.style.width = `${width}px`;
    input.addEventListener('input', () => onChange(input.value));
    label.appendChild(input);
    return label;
  }
}

const metronome = new Metronome();

document.getElementById('start').addEventListener('pointerup', () => {
  if (!metronome.isPlaying) metronome.start();
});

document.getElementById('stop').addEventListener('pointerup', () => {
  metronome.stop();
});

document.getElementById('add-measure').addEventListener('pointerup', () => {
  metronome.addMeasure();
});

document.getElementById('save-sequence').addEventListener('pointerup', () => {
  const filename = prompt("Enter filename:", "sequence.json");
  if (filename) {
    metronome.saveSequenceToFile(filename);
  }
});

document.getElementById('load-sequence').addEventListener('pointerup', () => {
  metronome.loadSequence();
});

document.getElementById('file-input').addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const loadedSequence = JSON.parse(e.target.result);
        if (Array.isArray(loadedSequence)) {
          metronome.sequence = loadedSequence;
          metronome.renderMeasures();
          alert('Sequence loaded from JSON file!');
        } else {
          alert('Invalid file format.');
        }
      } catch (error) {
        alert('Failed to load sequence. Please ensure the file is valid JSON.');
      }
    };
    reader.readAsText(file);
  }
  event.target.value = null;
});

