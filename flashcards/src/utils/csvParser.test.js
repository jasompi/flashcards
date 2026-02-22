import { mapColumns } from './csvParser';

describe('csvParser - mapColumns', () => {
  test('handles default 1st/2nd column mapping', () => {
    const headers = ['Chinese', 'Pinyin', 'English'];
    const mapping = mapColumns(headers);
    expect(mapping.frontIndex).toBe(0);
    expect(mapping.backIndex).toBe(1);
    expect(mapping.frontSecondaryIndex).toBe(-1);
    expect(mapping.backSecondaryIndex).toBe(-1);
    expect(mapping.frontAudioIndex).toBe(0);
    expect(mapping.backAudioIndex).toBe(1);
  });

  test('handles trailing number side specification', () => {
    const headers = ['Chinese', 'Pinyin 1', 'English Meaning 2'];
    const mapping = mapColumns(headers);
    expect(mapping.frontIndex).toBe(0); // Col 0 defaults to Front (Side 1)
    expect(mapping.frontSecondaryIndex).toBe(1); // Col 1 explicitly Side 1
    expect(mapping.backIndex).toBe(2); // Col 2 explicitly Side 2
    expect(mapping.frontSecondaryAbove).toBe(false);
    expect(mapping.backSecondaryAbove).toBe(false);
    expect(mapping.frontAudioIndex).toBe(0);
    expect(mapping.backAudioIndex).toBe(1); // Redirection from 'English Meaning 2' -> index 1
  });

  test('handles ^ prefix for secondary text placement', () => {
    const headers = ['Chinese', 'Pinyin ^1', 'English Meaning 2'];
    const mapping = mapColumns(headers);
    expect(mapping.frontIndex).toBe(0);
    expect(mapping.frontSecondaryIndex).toBe(1);
    expect(mapping.frontSecondaryAbove).toBe(true);
    expect(mapping.backIndex).toBe(2);
    expect(mapping.backSecondaryAbove).toBe(false);
  });

  test('handles multiple secondary columns per side correctly', () => {
    const headers = ['Front', 'Back', 'Extra 1', 'Extra 2', 'Extra 3 1'];
    const mapping = mapColumns(headers);
    expect(mapping.frontIndex).toBe(0);
    expect(mapping.frontSecondaryIndex).toBe(2); // First extra for side 1
    expect(mapping.backIndex).toBe(1);
    expect(mapping.backSecondaryIndex).toBe(3); // First extra for side 2
    // 'Extra 3 1' should be ignored because front already has a secondary
  });

  test('audio redirection from header numbers', () => {
    const headers = ['Spanish 2', 'English 1'];
    // Spanish 2 -> Side 2, Audio redirected to index 1 (English)
    // English 1 -> Side 1, Audio redirected to index 0 (Spanish)
    const mapping = mapColumns(headers);
    expect(mapping.frontIndex).toBe(1);
    expect(mapping.backIndex).toBe(0);
    expect(mapping.frontAudioIndex).toBe(0); // From 'English 1'
    expect(mapping.backAudioIndex).toBe(1); // From 'Spanish 2'
  });
});
