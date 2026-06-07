import { describe, expect, it } from 'vitest';
import { levenshtein, nearestMatch } from './did-you-mean.js';

describe('levenshtein', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshtein('abc', 'abc')).toBe(0);
  });
  it('counts insertions, deletions, substitutions', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
    expect(levenshtein('foo', 'foobar')).toBe(3);
    expect(levenshtein('foo', '')).toBe(3);
  });
});

describe('nearestMatch', () => {
  const ids = [
    'personal.foundations/git-basics',
    'personal.foundations/cli-fluency',
    'personal.intermediate/data-structures',
  ];

  it('finds an obvious typo within cutoff', () => {
    expect(nearestMatch('personal.foundations/git-basicx', ids)).toBe(
      'personal.foundations/git-basics',
    );
  });
  it('returns undefined when nothing is close', () => {
    expect(nearestMatch('completely-unrelated-id', ids)).toBeUndefined();
  });
  it('skips an exact match', () => {
    expect(nearestMatch('personal.foundations/git-basics', ids)).toBeUndefined();
  });
  it('respects short-id cutoff', () => {
    // Short ids get a tight cutoff; "abc" → "abz" (distance 1) is allowed but
    // "abc" → "xyz" (distance 3) is rejected.
    expect(nearestMatch('abc', ['abz'])).toBe('abz');
    expect(nearestMatch('abc', ['xyz'])).toBeUndefined();
  });
});
