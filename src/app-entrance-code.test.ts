import { describe, expect, it } from 'vitest';
import { createDefaultEntranceConfig, renderAppEntranceOutput } from './index';

describe('renderAppEntranceOutput', () => {
  it('generates a self-contained PNG AppEntrance component', () => {
    const config = createDefaultEntranceConfig('launch.png');
    config.open.effect = 'scale';
    config.reveal.effect = 'mask';
    config.safety.showOnce = 'session';
    config.safety.readinessHook = true;

    const output = renderAppEntranceOutput(config);

    expect(output.setup).toBe('No npm package required. Paste this component into your React app.');
    expect(output.assetNote).toContain('./launch.png');
    expect(output.code).not.toContain('@entrancekit/react');
    expect(output.code).not.toContain('EntranceImage');
    expect(output.code).toContain("import { useEffect, useMemo, useRef, useState } from 'react';");
    expect(output.code).toContain("const entranceConfig = {");
    expect(output.code).toContain('src: "./launch.png"');
    expect(output.code).toContain('durationMs: 1800');
    expect(output.code).toMatch(/open:\s*{\s*effect: "scale"/s);
    expect(output.code).toMatch(/reveal:\s*{\s*effect: "mask"/s);
    expect(output.code).toContain('showOnce: "session"');
    expect(output.code).toContain('document.fonts.ready');
    expect(output.code).toContain('<img');
    expect(output.code).toContain('sessionStorage');
    expect(output.code).toContain('aria-label={entranceConfig.safety.skipLabel}');
    expect(output.code).not.toContain('aria-hidden="true"');
  });

  it('generates a self-contained MP4 AppEntrance component that uses natural video playback', () => {
    const config = createDefaultEntranceConfig('intro.mp4');
    config.reveal.effect = 'curtain';
    config.safety.skipButton = false;

    const output = renderAppEntranceOutput(config);

    expect(output.code).not.toContain('@entrancekit/react');
    expect(output.code).not.toContain('EntranceVideo');
    expect(output.code).toContain('src: "./intro.mp4"');
    expect(output.code).not.toContain('entranceConfig.durationMs');
    expect(output.code).toMatch(/reveal:\s*{\s*effect: "curtain"/s);
    expect(output.code).toContain('skipControl: false');
    expect(output.code).toContain('<video');
    expect(output.code).toContain('onEnded={complete}');
  });
});
