import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './main';

describe('EntranceKit builder', () => {
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createObjectURL = vi.fn((file: File) => `blob:${file.name}`);
    revokeObjectURL = vi.fn();
    URL.createObjectURL = createObjectURL as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = revokeObjectURL as unknown as typeof URL.revokeObjectURL;
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('detects uploaded PNG and MP4 files and updates generated code', async () => {
    const user = userEvent.setup();
    render(<App />);

    const input = screen.getByTestId('asset-input') as HTMLInputElement;
    await user.upload(input, new File(['png'], 'launch.png', { type: 'image/png' }));

    expect(screen.getByTestId('asset-status')).toHaveTextContent('launch.png selected');
    expect(screen.getByTestId('generated-code')).not.toHaveTextContent(
      '@entrancekit/react'
    );
    expect(screen.getByTestId('generated-code')).toHaveTextContent('<img');
    expect(screen.getByTestId('generated-code')).toHaveTextContent('src: "./launch.png"');

    await user.upload(input, new File(['mp4'], 'intro.mp4', { type: 'video/mp4' }));

    expect(screen.getByTestId('generated-code')).not.toHaveTextContent(
      '@entrancekit/react'
    );
    expect(screen.getByTestId('generated-code')).toHaveTextContent('<video');
    expect(screen.getByTestId('generated-code')).toHaveTextContent('src: "./intro.mp4"');
  });

  it('cleans up object URLs on replacement and unmount', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);

    const input = screen.getByTestId('asset-input') as HTMLInputElement;
    await user.upload(input, new File(['one'], 'one.png', { type: 'image/png' }));
    await user.upload(input, new File(['two'], 'two.png', { type: 'image/png' }));

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:one.png');

    unmount();

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:two.png');
  });

  it('updates preview metadata and generated code from controls', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('tab', { name: 'Opening' }));
    await user.selectOptions(screen.getByTestId('open-control'), 'scale');

    await user.click(screen.getByRole('tab', { name: 'Closing' }));
    await user.selectOptions(screen.getByTestId('reveal-control'), 'curtain');

    expect(screen.getByTestId('preview-stage')).toHaveAttribute(
      'data-preview-open',
      'scale'
    );
    expect(screen.getByTestId('preview-stage')).toHaveAttribute(
      'data-preview-reveal',
      'curtain'
    );
    expect(screen.getByTestId('generated-code')).toHaveTextContent('effect: "scale"');
    expect(screen.getByTestId('generated-code')).toHaveTextContent('effect: "curtain"');
  });

  it('renders the live preview through the generated AppEntrance markup', async () => {
    render(<App />);

    await waitFor(() => {
      expect(document.querySelector('[data-app-entrance]')).toBeInTheDocument();
    });

    expect(document.querySelector('[data-entrancekit-overlay]')).toBeNull();
    expect(document.querySelector('[data-entrancekit-asset]')).toBeNull();
    expect(screen.getByRole('button', { name: 'Skip intro' })).toBeInTheDocument();
  });

  it('contains settings in final tabs and keeps Behavior untitled', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole('tab', { name: 'Asset' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByRole('tab', { name: 'Opening' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Behavior' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Closing' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Display' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Production' })).not.toBeInTheDocument();
    expect(screen.getByTestId('asset-input')).toBeInTheDocument();
    expect(screen.queryByTestId('open-control')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Behavior' }));

    expect(screen.getByRole('tab', { name: 'Behavior' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.queryByRole('heading', { name: 'Display' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Production' })).not.toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Image hold 1800ms' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Reduced motion' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Skip control' })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Closing' }));

    expect(screen.getByRole('tab', { name: 'Closing' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByTestId('reveal-control')).toBeInTheDocument();
    expect(
      screen.queryByRole('combobox', { name: 'Reduced motion' })
    ).not.toBeInTheDocument();
  });
});
