// Jest globals are available without import when using jest-environment
import { VersionManager, VERSION } from '../src/VersionManager';

describe('VersionManager', () => {
  it('should expose current version and validate semver format', () => {
    const v = VERSION || (VersionManager as any).VERSION || (VersionManager as any).version;
    expect(typeof v).toBe('string');
    expect(v).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
