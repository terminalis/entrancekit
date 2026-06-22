import { describe, expect, it } from 'vitest';
import {
  createDefaultEntranceConfig,
  inferAssetFromName,
  normalizeAssetPath,
} from './index';

describe('entrance asset config', () => {
  it('defaults generated asset paths to browser-public relative paths', () => {
    expect(normalizeAssetPath('intro.mp4')).toBe('./intro.mp4');
    expect(normalizeAssetPath('./launch.png')).toBe('./launch.png');
    expect(normalizeAssetPath('/assets/splash.png')).toBe('/assets/splash.png');
  });

  it('classifies v1 builder asset formats only', () => {
    expect(inferAssetFromName('splash.png')).toMatchObject({ kind: 'image', format: 'png' });
    expect(inferAssetFromName('intro.MP4')).toMatchObject({ kind: 'video', format: 'mp4' });
    expect(inferAssetFromName('logo.svg')).toBeNull();
    expect(inferAssetFromName('intro.webm')).toBeNull();
  });

  it('creates an image-first config with separate open, hold, and reveal controls', () => {
    expect(createDefaultEntranceConfig('brand.png')).toMatchObject({
      asset: {
        kind: 'image',
        format: 'png',
        path: './brand.png',
        fit: 'contain',
      },
      open: { effect: 'fade', durationMs: 550, delayMs: 0 },
      hold: { durationMs: 1800 },
      reveal: { effect: 'fade', durationMs: 650 },
      safety: {
        reducedMotion: 'skip',
        timeoutMs: 5000,
        showOnce: 'off',
        readinessHook: false,
      },
    });
  });
});
