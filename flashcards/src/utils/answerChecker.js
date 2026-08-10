/**
 * Local (no-LLM) fuzzy answer checking for Test mode.
 *
 * CSV answer cells encode multiple acceptable answers inconsistently:
 *  - "/" alternation:              "el amigo / la amiga"
 *  - comma/semicolon synonym list: "el esposo, el marido" / "Decoration; to decorate"
 *  - gender-suffix shorthand:      "alto(a)", "todos(as)"
 *  - compound article+suffix:      "el/la hijo(a)", "el/la suegro/a"
 * expandAnswer() normalizes all of these into a flat list of acceptable full answers.
 */

const ARTICLE_PAIR_RE = /^(el|la|los|las)\/(el|la|los|las)\s+(.+)$/i;
const GENDER_SUFFIX_RE = /^(\S+)(?:\((a|as|o|os)\)|\/(a|as|o|os))$/i;

export const hasMathContent = (text) => typeof text === 'string' && text.includes('$');

export const normalize = (str) => {
  return String(str ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents/tone marks (combining diacriticals)
    .replace(/[¿¡?!.,;:"'()`~]/g, '') // strip punctuation
    .replace(/\s+/g, ' ')
    .trim();
};

const applySuffixRule = (base, suffix) => {
  const lowerSuffix = suffix.toLowerCase();
  if (lowerSuffix === 'a') {
    return base.endsWith('o') ? `${base.slice(0, -1)}a` : `${base}a`;
  }
  if (lowerSuffix === 'as') {
    return base.endsWith('os') ? `${base.slice(0, -2)}as` : `${base}as`;
  }
  if (lowerSuffix === 'o') {
    return base.endsWith('a') ? `${base.slice(0, -1)}o` : `${base}o`;
  }
  if (lowerSuffix === 'os') {
    return base.endsWith('as') ? `${base.slice(0, -2)}os` : `${base}os`;
  }
  return base;
};

export const expandGenderSuffix = (token) => {
  const match = token.match(GENDER_SUFFIX_RE);
  if (!match) {
    return [token, token];
  }
  const base = match[1];
  const suffix = match[2] || match[3];
  return [base, applySuffixRule(base, suffix)];
};

export const expandAnswer = (rawAnswerCell) => {
  const cell = String(rawAnswerCell ?? '').trim();
  if (!cell) return [];

  const clauses = cell.split(/[,;]/).map((c) => c.trim()).filter(Boolean);
  const results = [];

  clauses.forEach((clause) => {
    const articlePairMatch = clause.match(ARTICLE_PAIR_RE);
    if (articlePairMatch) {
      const [, art1, art2, rest] = articlePairMatch;
      const [base, alt] = expandGenderSuffix(rest.trim());
      results.push(`${art1} ${base}`, `${art2} ${alt}`);
      return;
    }

    const slashParts = clause.split(/\s*\/\s*/).map((p) => p.trim()).filter(Boolean);
    slashParts.forEach((part) => {
      const [base, alt] = expandGenderSuffix(part);
      results.push(base);
      if (alt !== base) results.push(alt);
    });
  });

  return Array.from(new Set(results.filter(Boolean)));
};

export const levenshtein = (a, b) => {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
};

const allowedDistanceFor = (maxLen) => {
  if (maxLen <= 2) return 0;
  if (maxLen <= 4) return 1;
  if (maxLen <= 8) return 2;
  return Math.floor(maxLen / 4);
};

export const isFuzzyMatch = (input, candidate) => {
  const normInput = normalize(input);
  const normCandidate = normalize(candidate);

  if (!normInput || !normCandidate) return false;
  if (normInput === normCandidate) return true;

  const distance = levenshtein(normInput, normCandidate);
  const maxLen = Math.max(normInput.length, normCandidate.length);
  return distance <= allowedDistanceFor(maxLen);
};

export const checkAnswer = (userInput, rawAnswerCell) => {
  return expandAnswer(rawAnswerCell).some((alt) => isFuzzyMatch(userInput, alt));
};
