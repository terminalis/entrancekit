# EntranceKit

EntranceKit turns a local PNG or MP4 into a self-contained React app entrance.

Use the builder to upload an asset, tune the open, hold/play, reveal, and teardown
timeline, preview it over a mock app shell, and copy one ready `AppEntrance.tsx`
file into your app. The generated component includes its own overlay, media
lifecycle, reduced-motion handling, skip control, timeout fallback, optional
show-once behavior, and inline styles.

## What It Generates

- A copyable, self-contained `AppEntrance.tsx` component.
- PNG output backed by a native `<img>`.
- MP4 output backed by a native `<video>`.
- Separate opening and reveal controls.
- Reduced-motion handling, skip control, timeout fallback, asset error fallback,
  optional show-once behavior, and clean teardown.
- Short setup and asset-path notes for placing the file beside your app assets.

## Generated Shape

```tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

const entranceConfig = {
  asset: {
    kind: 'image',
    src: './launch.png',
    fit: 'contain',
    background: '#0b0f19',
    alt: 'App entrance',
  },
  open: {
    effect: 'scale',
    durationMs: 550,
    delayMs: 0,
  },
  durationMs: 1800,
  reveal: {
    effect: 'mask',
    durationMs: 650,
  },
  safety: {
    reducedMotion: 'skip',
    fallbackAfter: 5000,
    skipControl: true,
    skipLabel: 'Skip intro',
    showOnce: 'off',
    storageKey: 'entrancekit:./launch.png',
    readinessHook: false,
  },
} as const;

export function AppEntrance() {
  // The builder emits the complete implementation here.
}
```

## Run The Builder Locally

```sh
npm install
npm --prefix website install
npm --prefix website run dev
```

Build the website:

```sh
npm --prefix website run build
```

## Development

The builder is driven by an `EntranceConfig` model in `src/`. The website uses
that same model to render both:

- the live preview over a mock application shell
- the generated self-contained `AppEntrance.tsx` code

Useful checks:

```sh
npm run typecheck
npm run test
npm --prefix website run build
npm run build
```

## License

MIT
