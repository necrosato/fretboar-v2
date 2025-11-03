(function() {
  function requireScaleContext(context, patternName) {
    if (!context || !context.scaleIntervals || context.rootValue == null) {
      return {
        error: `Select a scale and root to generate the ${patternName} pattern.`
      };
    }
    return null;
  }

  function computeStringBasePitches(tuningNotes) {
    if (!Array.isArray(tuningNotes) || !tuningNotes.length) {
      return [];
    }

    const bases = [tuningNotes[0]];
    for (let i = 1; i < tuningNotes.length; i++) {
      const prevClass = tuningNotes[i - 1];
      const currentClass = tuningNotes[i];
      const prevAbs = bases[i - 1];
      let interval = (currentClass - prevClass + 12) % 12;
      if (interval === 0) interval = 12;
      bases.push(prevAbs + interval);
    }
    return bases;
  }

  function clampStartFret(startFret, maxFret) {
    if (!Number.isFinite(startFret)) return 0;
    const max = Math.max(maxFret, 0);
    if (startFret < 0) return 0;
    if (startFret > max) return max;
    return startFret;
  }

  function threeNotesPerStringAscending(context) {
    const scaleCheck = requireScaleContext(context, '3NPS');
    if (scaleCheck) return scaleCheck;

    const getNoteName = window.getNoteName;
    if (typeof getNoteName !== 'function') {
      return { error: 'Note name helper is not available yet.' };
    }

    const maxFret = Math.max((context.fretCount || 1) - 1, 0);
    const startFret = clampStartFret(context.startFret, maxFret);
    const tuningNotes = Array.isArray(context.tuningNotes) ? context.tuningNotes : [];
    const scaleSet = context.scaleSet instanceof Set ? context.scaleSet : new Set();

    const basePitches = computeStringBasePitches(tuningNotes);
    const patternPositions = [];
    let nextPitch = (basePitches[0] ?? 0) + startFret;

    for (let stringIndex = 0; stringIndex < tuningNotes.length; stringIndex++) {
      const openClass = tuningNotes[stringIndex];
      const openAbs = basePitches[stringIndex] ?? (openClass + stringIndex * 12);
      const candidates = [];

      for (let fret = 0; fret <= maxFret; fret++) {
        const noteName = getNoteName((openClass + fret) % 12);
        if (scaleSet.has(noteName)) {
          candidates.push({
            stringIndex,
            fret,
            noteName,
            absPitch: openAbs + fret
          });
        }
      }

      if (!candidates.length) {
        continue;
      }

      let startIndex = candidates.findIndex(candidate => candidate.absPitch >= nextPitch);
      if (startIndex === -1) {
        startIndex = Math.max(candidates.length - 3, 0);
      }

      let selection = candidates.slice(startIndex, startIndex + 3);
      if (selection.length < 3 && candidates.length >= 3) {
        selection = candidates.slice(-3);
      }

      patternPositions.push(...selection);
      if (selection.length) {
        nextPitch = selection[selection.length - 1].absPitch + 1;
      }
    }

    const sequence = patternPositions.map(step => step.noteName);
    const message = sequence.length
      ? `Generated ${sequence.length} note steps using a 3-notes-per-string approach.`
      : 'No pattern notes found within the current fret range.';

    return {
      notes: sequence,
      positions: patternPositions,
      message
    };
  }

  function rootPositionTriad(context) {
    const scaleCheck = requireScaleContext(context, 'triad arpeggio');
    if (scaleCheck) return scaleCheck;

    const getNoteName = window.getNoteName;
    if (typeof getNoteName !== 'function') {
      return { error: 'Note name helper is not available yet.' };
    }

    const scaleIntervals = context.scaleIntervals || [];
    if (scaleIntervals.length < 5) {
      return { error: 'Selected scale does not provide enough degrees for a triad pattern.' };
    }

    const rootValue = context.rootValue;
    const triadDegrees = [0, 2, 4];
    const triadNotes = triadDegrees.map(index => {
      const interval = scaleIntervals[index % scaleIntervals.length];
      return getNoteName((rootValue + interval) % 12);
    });
    triadNotes.push(triadNotes[0]);

    return {
      notes: triadNotes,
      message: `Root position triad arpeggio generated for ${context.scaleRootName} ${context.scaleName}.`
    };
  }

  window.patternLibrary = [
    {
      id: 'three-notes-per-string-asc',
      name: '3 Notes Per String (Ascending)',
      description: 'Generates an ascending three-notes-per-string sequence across the fretboard.',
      usesStartFret: true,
      requiresScale: true,
      generator: threeNotesPerStringAscending
    },
    {
      id: 'root-position-triad',
      name: 'Root Position Triad Arpeggio',
      description: 'Root, third, fifth, and octave arpeggio from the selected scale.',
      requiresScale: true,
      generator: rootPositionTriad
    }
  ];
})();
