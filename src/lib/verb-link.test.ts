import { describe, it, expect } from 'vitest';
import { findVerb } from './verb-link';

describe('findVerb', () => {
  it('maps conjugated forms to the infinitive card', () => {
    expect(findVerb('kommt')?.word).toBe('kommen');
    expect(findVerb('ist')?.word).toBe('sein');
    expect(findVerb('lebt')?.word).toBe('leben');
    expect(findVerb('isst')?.word).toBe('essen');
  });

  it('prefers the public A1.1 deck', () => {
    expect(findVerb('kommt')?.lang).toBe('german_a11');
  });

  it('ignores non-verbs', () => {
    expect(findVerb('und')).toBeNull();
    expect(findVerb('aus')).toBeNull();
    expect(findVerb('Name')).toBeNull();
    expect(findVerb('bitte')).toBeNull();
  });
});
