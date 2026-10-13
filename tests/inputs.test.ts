import { describe, expect, it, vi } from 'vitest';

import { readInputs } from '../src/inputs.js';

describe('readInputs', () => {
  it('requests an untrimmed optional version input', () => {
    const getInput = vi.fn(() => '0.1.0-preview.2');

    expect(readInputs(getInput)).toEqual({ version: '0.1.0-preview.2' });
    expect(getInput).toHaveBeenCalledWith('version', {
      required: false,
      trimWhitespace: false,
    });
  });

  it('uses latest stable resolution when the input is omitted', () => {
    expect(readInputs(() => '')).toEqual({ version: undefined });
  });

  it('does not silently trim the version', () => {
    expect(() => readInputs(() => ' 0.1.0-preview.2')).toThrowError(
      'The version input must be an exact semantic version',
    );
  });
});
