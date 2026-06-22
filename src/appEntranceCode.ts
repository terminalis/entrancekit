import type { EntranceConfig } from './config';

export interface AppEntranceOutput {
  setup: string;
  assetNote: string;
  code: string;
}

function js(value: string | number | boolean): string {
  return JSON.stringify(value);
}

function lineIf(condition: boolean, line: string): string[] {
  return condition ? [line] : [];
}

function renderConfig(config: EntranceConfig): string {
  const lines = [
    'const entranceConfig = {',
    '  asset: {',
    `    kind: ${js(config.asset.kind)},`,
    `    src: ${js(config.asset.path)},`,
    `    fit: ${js(config.asset.fit)},`,
    `    background: ${js(config.asset.background)},`,
    ...lineIf(config.asset.kind === 'image', `    alt: ${js(config.asset.alt || 'App entrance')},`),
    '  },',
    '  open: {',
    `    effect: ${js(config.open.effect)},`,
    `    durationMs: ${js(Math.round(config.open.durationMs))},`,
    `    delayMs: ${js(Math.round(config.open.delayMs))},`,
    '  },',
    ...lineIf(config.asset.kind === 'image', `  durationMs: ${js(Math.round(config.hold.durationMs))},`),
    '  reveal: {',
    `    effect: ${js(config.reveal.effect)},`,
    `    durationMs: ${js(Math.round(config.reveal.durationMs))},`,
    '  },',
    '  safety: {',
    `    reducedMotion: ${js(config.safety.reducedMotion)},`,
    `    fallbackAfter: ${js(Math.round(config.safety.timeoutMs))},`,
    `    skipControl: ${js(config.safety.skipButton)},`,
    `    skipLabel: ${js(config.safety.skipLabel)},`,
    `    showOnce: ${js(config.safety.showOnce)},`,
    `    storageKey: ${js(config.safety.storageKey)},`,
    `    readinessHook: ${js(config.safety.readinessHook)},`,
    '  },',
    '} as const;',
  ];

  return lines.join('\n');
}

function renderAssetReadyEffect(config: EntranceConfig): string {
  if (config.asset.kind === 'image') {
    return `  useEffect(() => {
    if (phase !== 'preload') return;
    if (mediaRef.current?.complete) setAssetReady(true);
  }, [phase]);`;
  }

  return `  useEffect(() => {
    if (phase !== 'preload') return;
    if (mediaRef.current && mediaRef.current.readyState >= 2) setAssetReady(true);
  }, [phase]);`;
}

function renderPlaybackEffect(config: EntranceConfig): string {
  if (config.asset.kind === 'image') {
    return `  useEffect(() => {
    if (phase !== 'play') return;
    const timer = window.setTimeout(
      complete,
      entranceConfig.open.delayMs + entranceConfig.open.durationMs + entranceConfig.durationMs
    );
    return () => window.clearTimeout(timer);
  }, [phase]);`;
  }

  return `  useEffect(() => {
    if (phase !== 'play') return;
    const video = mediaRef.current;
    if (!video) return;

    try {
      const playback = video.play();
      if (playback && typeof playback.catch === 'function') {
        playback.catch(() => finish());
      }
    } catch {
      finish();
    }
  }, [phase]);`;
}

function renderMediaElement(config: EntranceConfig): string {
  if (config.asset.kind === 'image') {
    return `      <img
        ref={mediaRef}
        src={entranceConfig.asset.src}
        alt={entranceConfig.asset.alt}
        decoding="async"
        loading="eager"
        onLoad={() => setAssetReady(true)}
        onError={finish}
        style={mediaStyle}
      />`;
  }

  return `      <video
        ref={mediaRef}
        src={entranceConfig.asset.src}
        muted
        playsInline
        preload="auto"
        onCanPlayThrough={() => setAssetReady(true)}
        onLoadedData={() => setAssetReady(true)}
        onEnded={complete}
        onError={finish}
        style={mediaStyle}
      />`;
}

function renderSelfContainedComponent(config: EntranceConfig): string {
  const mediaRefType = config.asset.kind === 'image' ? 'HTMLImageElement' : 'HTMLVideoElement';

  return `import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

${renderConfig(config)}

type Phase = 'idle' | 'preload' | 'play' | 'reveal' | 'done';

const openEasing = 'cubic-bezier(.2,.8,.2,1)';
const revealEasing = 'ease';

function getShowOnceStore(): Storage | null {
  if (typeof window === 'undefined') return null;
  if (entranceConfig.safety.showOnce === 'session') return window.sessionStorage;
  if (entranceConfig.safety.showOnce === 'local') return window.localStorage;
  return null;
}

function wasAlreadyShown(): boolean {
  try {
    return getShowOnceStore()?.getItem(entranceConfig.safety.storageKey) === 'shown';
  } catch {
    return false;
  }
}

function rememberShown(): void {
  try {
    getShowOnceStore()?.setItem(entranceConfig.safety.storageKey, 'shown');
  } catch {
    // Storage can be unavailable in private or locked-down browsing contexts.
  }
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  );
}

function waitForReadiness(): Promise<unknown> {
  if (!entranceConfig.safety.readinessHook) return Promise.resolve();
  if (typeof document === 'undefined') return Promise.resolve();
  return 'fonts' in document ? document.fonts.ready : Promise.resolve();
}

export function AppEntrance() {
  const mediaRef = useRef<${mediaRefType}>(null);
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [assetReady, setAssetReady] = useState(false);
  const [readinessReady, setReadinessReady] = useState(!entranceConfig.safety.readinessHook);

  function finish(): void {
    setPhase((current) => (current === 'done' || current === 'idle' ? current : 'reveal'));
  }

  function complete(): void {
    finish();
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (entranceConfig.safety.reducedMotion === 'skip' && prefersReducedMotion()) {
      setPhase('done');
      return;
    }

    if (wasAlreadyShown()) {
      setPhase('done');
      return;
    }

    setPhase('preload');
  }, [mounted]);

  useEffect(() => {
    if (phase !== 'preload') return;
    let cancelled = false;

    waitForReadiness()
      .then(() => {
        if (!cancelled) setReadinessReady(true);
      })
      .catch(() => {
        if (!cancelled) finish();
      });

    return () => {
      cancelled = true;
    };
  }, [phase]);

${renderAssetReadyEffect(config)}

  useEffect(() => {
    if (phase !== 'preload' || !assetReady || !readinessReady) return;
    rememberShown();
    setPhase('play');
  }, [phase, assetReady, readinessReady]);

${renderPlaybackEffect(config)}

  useEffect(() => {
    if (phase !== 'preload' && phase !== 'play') return;
    const timer = window.setTimeout(finish, entranceConfig.safety.fallbackAfter);
    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'reveal') return;
    const timer = window.setTimeout(() => setPhase('done'), entranceConfig.reveal.durationMs);
    return () => window.clearTimeout(timer);
  }, [phase]);

  const openSettled = phase === 'play' || phase === 'reveal';
  const revealActive = phase === 'reveal';
  const showOverlay = mounted && phase !== 'idle' && phase !== 'done';
  const showSkip = entranceConfig.safety.skipControl && (phase === 'preload' || phase === 'play');

  const overlayStyle = useMemo<CSSProperties>(() => {
    const revealEffect = entranceConfig.reveal.effect;
    return {
      position: 'fixed',
      inset: 0,
      zIndex: 2147483647,
      pointerEvents: 'none',
      background: entranceConfig.asset.background,
      opacity: revealActive && revealEffect === 'fade' ? 0 : 1,
      clipPath:
        revealEffect === 'mask'
          ? revealActive
            ? 'circle(0% at 50% 50%)'
            : 'circle(150% at 50% 50%)'
          : revealEffect === 'curtain'
            ? revealActive
              ? 'inset(0 50% 0 50%)'
              : 'inset(0 0 0 0)'
            : undefined,
      transition: revealActive
        ? revealEffect === 'fade'
          ? \`opacity \${entranceConfig.reveal.durationMs}ms \${revealEasing}\`
          : \`clip-path \${entranceConfig.reveal.durationMs}ms \${revealEasing}\`
        : undefined,
      overflow: 'hidden',
    };
  }, [revealActive]);

  const mediaStyle = useMemo<CSSProperties>(() => {
    const openEffect = entranceConfig.open.effect;
    return {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      display: 'block',
      objectFit: entranceConfig.asset.fit,
      opacity: openEffect === 'none' || openSettled ? 1 : 0,
      transform:
        openEffect === 'scale' && !openSettled
          ? 'scale(.94)'
          : openEffect === 'slide-up' && !openSettled
            ? 'translateY(28px)'
            : undefined,
      transition:
        openEffect === 'none'
          ? undefined
          : [
              \`opacity \${entranceConfig.open.durationMs}ms \${openEasing} \${entranceConfig.open.delayMs}ms\`,
              \`transform \${entranceConfig.open.durationMs}ms \${openEasing} \${entranceConfig.open.delayMs}ms\`,
            ].join(', '),
      willChange: openEffect === 'none' ? undefined : 'opacity, transform',
    };
  }, [openSettled]);

  if (!showOverlay) return null;

  return (
    <div data-app-entrance="" style={overlayStyle}>
${renderMediaElement(config)}
      {showSkip && (
        <button
          type="button"
          onClick={finish}
          aria-label={entranceConfig.safety.skipLabel}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            pointerEvents: 'auto',
            padding: '6px 12px',
            font: 'inherit',
            fontSize: 14,
            lineHeight: 1.2,
            color: '#fff',
            background: 'rgba(0, 0, 0, 0.55)',
            border: '1px solid rgba(255, 255, 255, 0.35)',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          {entranceConfig.safety.skipLabel}
        </button>
      )}
    </div>
  );
}`;
}

export function renderAppEntranceOutput(config: EntranceConfig): AppEntranceOutput {
  return {
    setup: 'No npm package required. Paste this component into your React app.',
    assetNote: `Place ${config.asset.path} next to the file that renders AppEntrance, or change src to the final deployed URL.`,
    code: renderSelfContainedComponent(config),
  };
}

export function generateAppEntranceCode(config: EntranceConfig): string {
  return renderAppEntranceOutput(config).code;
}
