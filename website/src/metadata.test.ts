import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const websiteRoot = join(process.cwd(), 'website');
const publicRoot = join(websiteRoot, 'public');

function readPublicText(path: string): string {
  return readFileSync(join(publicRoot, path), 'utf8');
}

function expectPng(path: string, width: number, height: number): void {
  const file = join(publicRoot, path);
  expect(existsSync(file), `${path} should exist`).toBe(true);

  const buffer = readFileSync(file);
  expect([...buffer.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  expect(buffer.readUInt32BE(16)).toBe(width);
  expect(buffer.readUInt32BE(20)).toBe(height);
}

describe('website metadata assets', () => {
  it('declares PWA install icons and Open Graph imagery', () => {
    const html = readFileSync(join(websiteRoot, 'index.html'), 'utf8');

    expect(html).toContain('<link rel="manifest" href="./manifest.webmanifest" />');
    expect(html).toContain('<link rel="apple-touch-icon" href="./apple-touch-icon.png" />');
    expect(html).toContain('property="og:image"');
    expect(html).toContain('property="og:image:width" content="1200"');
    expect(html).toContain('property="og:image:height" content="630"');
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    expect(html).toContain('name="twitter:image"');
  });

  it('ships a web app manifest with reusable icon assets', () => {
    const manifest = JSON.parse(readPublicText('manifest.webmanifest')) as {
      name?: string;
      short_name?: string;
      display?: string;
      start_url?: string;
      icons?: Array<{ src: string; sizes: string; type: string; purpose?: string }>;
    };

    expect(manifest).toMatchObject({
      name: 'EntranceKit',
      short_name: 'EntranceKit',
      display: 'standalone',
      start_url: './',
    });
    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          src: './icon-192.png',
          sizes: '192x192',
          type: 'image/png',
        }),
        expect.objectContaining({
          src: './icon-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: expect.stringContaining('maskable'),
        }),
      ])
    );
  });

  it('ships valid generated image assets', () => {
    expectPng('apple-touch-icon.png', 180, 180);
    expectPng('icon-192.png', 192, 192);
    expectPng('icon-512.png', 512, 512);
    expect(readPublicText('og-image.svg')).toContain('viewBox="0 0 1200 630"');
  });
});
