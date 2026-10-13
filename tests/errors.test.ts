import { describe, expect, it } from 'vitest';

import { safeErrorMessage, SetupError } from '../src/errors.js';

describe('safeErrorMessage', () => {
  it('preserves reviewed setup errors', () => {
    expect(safeErrorMessage(new SetupError('Checksum mismatch.'))).toBe(
      'Checksum mismatch.',
    );
  });

  it('does not expose arbitrary exceptions', () => {
    expect(safeErrorMessage(new Error('private runtime detail'))).not.toContain(
      'private runtime detail',
    );
  });

  it('handles non-error values', () => {
    expect(safeErrorMessage('unexpected')).toContain('failed unexpectedly');
  });
});
