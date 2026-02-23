/**
 * Runtime detection for Overwolf vs standalone Electron.
 * Single import point — all conditional code paths use this.
 */

let _isOverwolf: boolean | null = null;

export function isOverwolfRuntime(): boolean {
  if (_isOverwolf !== null) return _isOverwolf;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { isOverwolf } = require('@overwolf/electron-is-overwolf');
    _isOverwolf = isOverwolf === true;
  } catch {
    _isOverwolf = false;
  }
  return _isOverwolf;
}
