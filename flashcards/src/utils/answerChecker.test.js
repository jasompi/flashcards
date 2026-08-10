import {
  hasMathContent,
  normalize,
  expandGenderSuffix,
  expandAnswer,
  levenshtein,
  isFuzzyMatch,
  checkAnswer,
} from './answerChecker';

describe('hasMathContent', () => {
  test('detects LaTeX delimiters', () => {
    expect(hasMathContent('$f(x)=x^n$')).toBe(true);
  });

  test('returns false for plain text', () => {
    expect(hasMathContent('alto(a)')).toBe(false);
  });
});

describe('normalize', () => {
  test('strips accents', () => {
    expect(normalize('café')).toBe('cafe');
  });

  test('lowercases and trims', () => {
    expect(normalize('  Hola  ')).toBe('hola');
  });

  test('strips punctuation including Spanish inverted marks', () => {
    expect(normalize('¿Qué?')).toBe('que');
  });

  test('collapses internal whitespace', () => {
    expect(normalize('el   amigo')).toBe('el amigo');
  });
});

describe('expandGenderSuffix', () => {
  test('expands (a) suffix on -o base', () => {
    expect(expandGenderSuffix('alto(a)')).toEqual(['alto', 'alta']);
  });

  test('expands (as) suffix on -os base', () => {
    expect(expandGenderSuffix('todos(as)')).toEqual(['todos', 'todas']);
  });

  test('appends (a) when base has no vowel to swap', () => {
    expect(expandGenderSuffix('trabajador(a)')).toEqual(['trabajador', 'trabajadora']);
  });

  test('supports slash-suffix form', () => {
    expect(expandGenderSuffix('suegro/a')).toEqual(['suegro', 'suegra']);
  });

  test('returns token unchanged when no suffix pattern matches', () => {
    expect(expandGenderSuffix('amigo')).toEqual(['amigo', 'amigo']);
  });
});

describe('expandAnswer', () => {
  test('splits plain slash alternation', () => {
    expect(expandAnswer('el amigo / la amiga')).toEqual(['el amigo', 'la amiga']);
  });

  test('expands gender-suffix shorthand', () => {
    expect(expandAnswer('alto(a)')).toEqual(['alto', 'alta']);
  });

  test('expands (as) shorthand', () => {
    expect(expandAnswer('todos(as)')).toEqual(['todos', 'todas']);
  });

  test('resolves compound article-pair + gender-suffix shorthand', () => {
    expect(expandAnswer('el/la hijo(a)')).toEqual(['el hijo', 'la hija']);
  });

  test('resolves compound article-pair + slash-suffix shorthand', () => {
    expect(expandAnswer('el/la suegro/a')).toEqual(['el suegro', 'la suegra']);
  });

  test('handles multiple compound clauses in one cell', () => {
    expect(expandAnswer('el/la mesero(a), el/la camarero(a)')).toEqual([
      'el mesero',
      'la mesera',
      'el camarero',
      'la camarera',
    ]);
  });

  test('splits comma-separated synonyms', () => {
    expect(expandAnswer('el esposo, el marido')).toEqual(['el esposo', 'el marido']);
  });

  test('splits semicolon-separated synonyms', () => {
    expect(expandAnswer('Decoration; to decorate')).toEqual(['Decoration', 'to decorate']);
  });

  test('splits multiple slash alternatives', () => {
    expect(expandAnswer('enough / rather / quite')).toEqual(['enough', 'rather', 'quite']);
  });

  test('returns empty array for empty input', () => {
    expect(expandAnswer('')).toEqual([]);
  });
});

describe('levenshtein', () => {
  test('known distance', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
  });

  test('identical strings have distance 0', () => {
    expect(levenshtein('hola', 'hola')).toBe(0);
  });

  test('distance against empty string equals length', () => {
    expect(levenshtein('', 'abc')).toBe(3);
    expect(levenshtein('abc', '')).toBe(3);
  });
});

describe('isFuzzyMatch', () => {
  test('matches exactly after normalization', () => {
    expect(isFuzzyMatch('Café', 'cafe')).toBe(true);
  });

  test('tolerates a single typo on a medium-length word', () => {
    expect(isFuzzyMatch('amgio', 'amigo')).toBe(true);
  });

  test('requires exact match on very short words', () => {
    expect(isFuzzyMatch('el', 'la')).toBe(false);
  });

  test('rejects wildly different long strings', () => {
    expect(isFuzzyMatch('completely different phrase', 'something else entirely')).toBe(false);
  });
});

describe('checkAnswer', () => {
  test('accepts a plain alternate form', () => {
    expect(checkAnswer('la amiga', 'el amigo / la amiga')).toBe(true);
  });

  test('accepts a gender-expanded form', () => {
    expect(checkAnswer('alta', 'alto(a)')).toBe(true);
  });

  test('accepts a compound article-pair expanded form', () => {
    expect(checkAnswer('la hija', 'el/la hijo(a)')).toBe(true);
  });

  test('rejects an unrelated answer', () => {
    expect(checkAnswer('xyz', 'el amigo / la amiga')).toBe(false);
  });
});
