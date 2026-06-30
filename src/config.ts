export type ImageAssetFormat = 'png';
export type VideoAssetFormat = 'mp4';
export type AssetFormat = ImageAssetFormat | VideoAssetFormat;
export type AssetKind = 'image' | 'video';
export type ReducedMotionMode = 'skip' | 'play';
export type EntranceOpenEffect = 'none' | 'fade' | 'scale' | 'slide-up';
export type EntranceRevealEffect = 'fade' | 'mask' | 'curtain';
export type EntranceFitMode = 'contain' | 'cover';
export type ShowOnceMode = 'off' | 'session' | 'local';

export interface EntranceAsset {
  kind: AssetKind;
  format: AssetFormat;
  path: string;
  fit: EntranceFitMode;
  background: string;
  alt: string;
}

export interface EntranceConfig {
  asset: EntranceAsset;
  open: {
    effect: EntranceOpenEffect;
    durationMs: number;
    delayMs: number;
  };
  hold: {
    durationMs: number;
  };
  reveal: {
    effect: EntranceRevealEffect;
    durationMs: number;
  };
  safety: {
    reducedMotion: ReducedMotionMode;
    skipButton: boolean;
    skipLabel: string;
    timeoutMs: number;
    showOnce: ShowOnceMode;
    storageKey: string;
    readinessHook: boolean;
  };
}

export interface InferredAsset {
  kind: AssetKind;
  format: AssetFormat;
}

export function normalizeAssetPath(name: string): string {
  const trimmed = name.trim();
  if (
    trimmed.startsWith('./') ||
    trimmed.startsWith('../') ||
    trimmed.startsWith('/') ||
    /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
  ) {
    return trimmed;
  }

  const fileName = trimmed.split(/[\\/]/).filter(Boolean).pop() ?? trimmed;
  return `./${fileName}`;
}

export function inferAssetFromName(name: string): InferredAsset | null {
  const cleanName = name.split(/[?#]/, 1)[0] ?? name;
  const extension = cleanName.split('.').pop()?.toLowerCase();
  if (extension === 'png') return { kind: 'image', format: 'png' };
  if (extension === 'mp4') return { kind: 'video', format: 'mp4' };
  return null;
}

export function createDefaultEntranceConfig(name: string): EntranceConfig {
  const inferred = inferAssetFromName(name);
  if (!inferred) {
    throw new Error(`Unsupported entrance asset "${name}". Use MP4 or PNG.`);
  }

  const path = normalizeAssetPath(name);

  return {
    asset: {
      ...inferred,
      path,
      fit: 'contain',
      background: '#0b0f19',
      alt: '',
    },
    open: {
      effect: 'fade',
      durationMs: 550,
      delayMs: 0,
    },
    hold: {
      durationMs: inferred.kind === 'video' ? 0 : 1800,
    },
    reveal: {
      effect: 'fade',
      durationMs: 650,
    },
    safety: {
      reducedMotion: 'skip',
      skipButton: true,
      skipLabel: 'Skip intro',
      timeoutMs: 5000,
      showOnce: 'off',
      storageKey: `entrancekit:${path}`,
      readinessHook: false,
    },
  };
}
