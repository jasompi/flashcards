/**
 * Maps CSV column headers to flashcard side and audio indices.
 * 
 * Rules:
 * 1. A column with a trailing '1' or '^1' belongs to the Front side (Side 1).
 * 2. A column with a trailing '2' or '^2' belongs to the Back side (Side 2).
 * 3. Prefix '^' (e.g., '^1', '^2') indicates secondary text should be ABOVE primary text.
 * 4. Default assignments for columns without a trailing number:
 *    - The 1st such column (index 0) is the Front side's primary text.
 *    - The 2nd such column (index 1) is the Back side's primary text.
 *    - Any subsequent columns without trailing numbers are ignored.
 * 5. Primary vs Secondary:
 *    - For each side, the first column assigned to it is "Primary".
 *    - The second column assigned to it is "Secondary".
 * 6. Audio Redirection:
 *    - If a column's header ends in a number (e.g., "Pinyin 1"), audio for that text
 *      is fetched from the column index specified by that number (1-based).
 * 
 * @param {string[]} headers - The CSV header row.
 * @returns {Object} Mapping object with indices and flags.
 */
export const mapColumns = (headers) => {
  let frontIndex = -1;
  let backIndex = -1;
  let frontSecondaryIndex = -1;
  let backSecondaryIndex = -1;
  let frontSecondaryAbove = false;
  let backSecondaryAbove = false;

  const assignments = headers.map((header, i) => {
    const tokens = header.trim().split(/\s+/);
    const lastToken = tokens[tokens.length - 1];
    const match = lastToken.match(/^(\^?)([12])$/);

    if (match) {
      return {
        index: i,
        side: parseInt(match[2], 10),
        above: match[1] === '^',
        explicit: true,
        audioRedirect: parseInt(match[2], 10) - 1
      };
    }
    return { index: i, side: null, explicit: false };
  });

  // Assign sides to columns without explicit side markers
  let nextDefaultSide = 1;
  assignments.forEach((a) => {
    if (!a.explicit && nextDefaultSide <= 2) {
      a.side = nextDefaultSide;
      nextDefaultSide++;
    }
  });

  // Organize by side
  assignments.forEach((a) => {
    if (a.side === 1) {
      if (frontIndex === -1) {
        frontIndex = a.index;
      } else if (frontSecondaryIndex === -1) {
        frontSecondaryIndex = a.index;
        frontSecondaryAbove = a.above;
      }
    } else if (a.side === 2) {
      if (backIndex === -1) {
        backIndex = a.index;
      } else if (backSecondaryIndex === -1) {
        backSecondaryIndex = a.index;
        backSecondaryAbove = a.above;
      }
    }
  });

  // Helper to get audio index from header
  const getAudioIndex = (index, defaultIndex) => {
    if (index === -1) return defaultIndex;
    const header = headers[index];
    const tokens = header.trim().split(/\s+/);
    const lastToken = tokens[tokens.length - 1];
    // Check if it ends in a number (might have ^ prefix)
    const match = lastToken.match(/\^?(\d+)$/);
    if (match) {
      return parseInt(match[1], 10) - 1;
    }
    return index;
  };

  const frontAudioIndex = getAudioIndex(frontIndex, 0);
  const backAudioIndex = getAudioIndex(backIndex, 1);

  return {
    frontIndex,
    backIndex,
    frontSecondaryIndex,
    backSecondaryIndex,
    frontSecondaryAbove,
    backSecondaryAbove,
    frontAudioIndex,
    backAudioIndex
  };
};
