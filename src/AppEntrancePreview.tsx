import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import type { EntranceConfig } from './config';

export interface AppEntrancePreviewProps {
  config: EntranceConfig;
  container: HTMLElement;
}

type Phase = 'idle' | 'preload' | 'play' | 'reveal' | 'done';

const openEasing = 'cubic-bezier(.2,.8,.2,1)';
const revealEasing = 'ease';

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  );
}

function getShowOnceStore(config: EntranceConfig): Storage | null {
  if (typeof window === 'undefined') return null;
  if (config.safety.showOnce === 'session') return window.sessionStorage;
  if (config.safety.showOnce === 'local') return window.localStorage;
  return null;
}

function wasAlreadyShown(config: EntranceConfig): boolean {
  try {
    return getShowOnceStore(config)?.getItem(config.safety.storageKey) === 'shown';
  } catch {
    return false;
  }
}

function rememberShown(config: EntranceConfig): void {
  try {
    getShowOnceStore(config)?.setItem(config.safety.storageKey, 'shown');
  } catch {
    // Storage can be unavailable in private or locked-down browsing contexts.
  }
}

function waitForReadiness(config: EntranceConfig): Promise<unknown> {
  if (!config.safety.readinessHook) return Promise.resolve();
  if (typeof document === 'undefined') return Promise.resolve();
  return 'fonts' in document ? document.fonts.ready : Promise.resolve();
}

export function AppEntrancePreview({
  config,
  container,
}: AppEntrancePreviewProps): ReactNode {
  const mediaRef = useRef<HTMLImageElement | HTMLVideoElement>(null);
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [assetReady, setAssetReady] = useState(false);
  const [readinessReady, setReadinessReady] = useState(!config.safety.readinessHook);

  function finish(): void {
    setPhase((current) =>
      current === 'done' || current === 'idle' ? current : 'reveal'
    );
  }

  function complete(): void {
    finish();
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (config.safety.reducedMotion === 'skip' && prefersReducedMotion()) {
      setPhase('done');
      return;
    }

    if (wasAlreadyShown(config)) {
      setPhase('done');
      return;
    }

    setPhase('preload');
  }, [mounted]);

  useEffect(() => {
    if (phase !== 'preload') return;
    let cancelled = false;

    waitForReadiness(config)
      .then(() => {
        if (!cancelled) setReadinessReady(true);
      })
      .catch(() => {
        if (!cancelled) finish();
      });

    return () => {
      cancelled = true;
    };
  }, [phase, config]);

  useEffect(() => {
    if (phase !== 'preload' || config.asset.kind !== 'image') return;
    const image = mediaRef.current as HTMLImageElement | null;
    if (image?.complete) setAssetReady(true);
  }, [phase, config.asset.kind]);

  useEffect(() => {
    if (phase !== 'preload' || config.asset.kind !== 'video') return;
    const video = mediaRef.current as HTMLVideoElement | null;
    if (video && video.readyState >= 2) setAssetReady(true);
  }, [phase, config.asset.kind]);

  useEffect(() => {
    if (phase !== 'preload' || !assetReady || !readinessReady) return;
    rememberShown(config);
    setPhase('play');
  }, [phase, assetReady, readinessReady, config]);

  useEffect(() => {
    if (phase !== 'play' || config.asset.kind !== 'image') return;
    const timer = window.setTimeout(
      complete,
      config.open.delayMs + config.open.durationMs + config.hold.durationMs
    );
    return () => window.clearTimeout(timer);
  }, [
    phase,
    config.asset.kind,
    config.open.delayMs,
    config.open.durationMs,
    config.hold.durationMs,
  ]);

  useEffect(() => {
    if (phase !== 'play' || config.asset.kind !== 'video') return;
    const video = mediaRef.current as HTMLVideoElement | null;
    if (!video) return;

    try {
      const playback = video.play();
      if (playback && typeof playback.catch === 'function') {
        playback.catch(() => finish());
      }
    } catch {
      finish();
    }
  }, [phase, config.asset.kind]);

  useEffect(() => {
    if (phase !== 'preload' && phase !== 'play') return;
    const timer = window.setTimeout(finish, config.safety.timeoutMs);
    return () => window.clearTimeout(timer);
  }, [phase, config.safety.timeoutMs]);

  useEffect(() => {
    if (phase !== 'reveal') return;
    const timer = window.setTimeout(() => setPhase('done'), config.reveal.durationMs);
    return () => window.clearTimeout(timer);
  }, [phase, config.reveal.durationMs]);

  const openSettled = phase === 'play' || phase === 'reveal';
  const revealActive = phase === 'reveal';
  const showOverlay = mounted && phase !== 'idle' && phase !== 'done';
  const showSkip = config.safety.skipButton && (phase === 'preload' || phase === 'play');

  const overlayStyle = useMemo<CSSProperties>(() => {
    const revealEffect = config.reveal.effect;
    return {
      position: 'absolute',
      inset: 0,
      zIndex: 10,
      pointerEvents: 'none',
      background: config.asset.background,
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
          ? `opacity ${config.reveal.durationMs}ms ${revealEasing}`
          : `clip-path ${config.reveal.durationMs}ms ${revealEasing}`
        : undefined,
      overflow: 'hidden',
    };
  }, [
    config.asset.background,
    config.reveal.durationMs,
    config.reveal.effect,
    revealActive,
  ]);

  const mediaStyle = useMemo<CSSProperties>(() => {
    const openEffect = config.open.effect;
    return {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      display: 'block',
      objectFit: config.asset.fit,
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
              `opacity ${config.open.durationMs}ms ${openEasing} ${config.open.delayMs}ms`,
              `transform ${config.open.durationMs}ms ${openEasing} ${config.open.delayMs}ms`,
            ].join(', '),
      willChange: openEffect === 'none' ? undefined : 'opacity, transform',
    };
  }, [
    config.asset.fit,
    config.open.delayMs,
    config.open.durationMs,
    config.open.effect,
    openSettled,
  ]);

  if (!showOverlay) return null;

  return createPortal(
    <div data-app-entrance="" style={overlayStyle}>
      {config.asset.kind === 'image' ? (
        <img
          ref={mediaRef as RefObject<HTMLImageElement>}
          src={config.asset.path}
          alt={config.asset.alt || 'App entrance'}
          decoding="async"
          loading="eager"
          onLoad={() => setAssetReady(true)}
          onError={finish}
          style={mediaStyle}
        />
      ) : (
        <video
          ref={mediaRef as RefObject<HTMLVideoElement>}
          src={config.asset.path}
          muted
          playsInline
          preload="auto"
          onCanPlayThrough={() => setAssetReady(true)}
          onLoadedData={() => setAssetReady(true)}
          onEnded={complete}
          onError={finish}
          style={mediaStyle}
        />
      )}
      {showSkip && (
        <button
          type="button"
          onClick={finish}
          aria-label={config.safety.skipLabel}
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
          {config.safety.skipLabel}
        </button>
      )}
    </div>,
    container
  );
}
