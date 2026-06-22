import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import {
  AppEntrancePreview,
  createDefaultEntranceConfig,
  generateAppEntranceCode,
  inferAssetFromName,
  normalizeAssetPath,
  renderAppEntranceOutput,
  type EntranceConfig,
  type EntranceFitMode,
  type EntranceOpenEffect,
  type EntranceRevealEffect,
  type ReducedMotionMode,
  type ShowOnceMode,
} from '../../src/index';

const SAMPLE_ASSET =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 520">
  <rect width="900" height="520" fill="#111418"/>
  <rect x="255" y="116" width="390" height="244" rx="34" fill="#f5f1e7"/>
  <path d="M305 300h290" stroke="#111418" stroke-width="18" stroke-linecap="round"/>
  <circle cx="380" cy="226" r="58" fill="#46a67e"/>
  <circle cx="506" cy="226" r="58" fill="#d85842"/>
  <text x="450" y="423" text-anchor="middle" fill="#f5f1e7" font-family="Arial, sans-serif" font-size="42" font-weight="800">EntranceKit</text>
</svg>`);

interface BuilderState {
  config: EntranceConfig;
  previewUrl: string | null;
  uploadedName: string | null;
  status: string;
}

const SETTINGS_TABS = [
  { id: 'asset', label: 'Asset' },
  { id: 'opening', label: 'Opening' },
  { id: 'behavior', label: 'Behavior' },
  { id: 'closing', label: 'Closing' },
] as const;

type SettingsTabId = (typeof SETTINGS_TABS)[number]['id'];

function cloneConfig(config: EntranceConfig): EntranceConfig {
  return JSON.parse(JSON.stringify(config)) as EntranceConfig;
}

function fileNameFromPath(path: string): string {
  return path.split('/').filter(Boolean).pop() ?? path;
}

export function App() {
  const [state, setState] = useState<BuilderState>(() => ({
    config: createDefaultEntranceConfig('launch.png'),
    previewUrl: null,
    uploadedName: null,
    status: 'Sample PNG loaded',
  }));
  const [previewRun, setPreviewRun] = useState(0);
  const [previewHost, setPreviewHost] = useState<HTMLDivElement | null>(null);
  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTabId>('asset');
  const latestPreviewUrl = useRef<string | null>(null);

  useEffect(() => {
    latestPreviewUrl.current = state.previewUrl;
  }, [state.previewUrl]);

  useEffect(() => {
    return () => {
      if (latestPreviewUrl.current) URL.revokeObjectURL(latestPreviewUrl.current);
    };
  }, []);

  const output = useMemo(() => renderAppEntranceOutput(state.config), [state.config]);
  const code = useMemo(() => generateAppEntranceCode(state.config), [state.config]);
  const previewConfig = useMemo(() => {
    const next = cloneConfig(state.config);
    next.safety.showOnce = 'off';
    next.safety.readinessHook = false;
    next.asset.path = state.previewUrl ?? SAMPLE_ASSET;
    return next;
  }, [state.config, state.previewUrl]);

  function updateConfig(updater: (config: EntranceConfig) => void): void {
    setState((current) => {
      const config = cloneConfig(current.config);
      updater(config);
      config.asset.path = normalizeAssetPath(config.asset.path);
      config.safety.storageKey = `entrancekit:${config.asset.path}`;
      return { ...current, config };
    });
  }

  function onAssetUpload(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    if (!file) return;
    const inferred = inferAssetFromName(file.name);
    if (!inferred) {
      setState((current) => ({ ...current, status: 'Use a PNG or MP4 file' }));
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    if (latestPreviewUrl.current) URL.revokeObjectURL(latestPreviewUrl.current);
    latestPreviewUrl.current = previewUrl;
    setState(() => {
      const config = createDefaultEntranceConfig(file.name);
      return {
        config,
        previewUrl,
        uploadedName: file.name,
        status: `${file.name} selected`,
      };
    });
    setPreviewRun((run) => run + 1);
  }

  function copyCode(): void {
    void navigator.clipboard?.writeText(code);
  }

  function renderSettingsPanel(): ReactNode {
    switch (activeSettingsTab) {
      case 'asset':
        return (
          <ControlSection title="Asset">
            <label className="upload" htmlFor="assetInput">
              <span className="upload__title">PNG or MP4</span>
              <span className="upload__meta" data-testid="asset-status">
                {state.status}
              </span>
              <input
                id="assetInput"
                data-testid="asset-input"
                type="file"
                accept=".png,.mp4,image/png,video/mp4"
                onChange={onAssetUpload}
              />
            </label>
            <Field label="Asset path">
              <input
                data-testid="asset-path"
                type="text"
                value={state.config.asset.path}
                spellCheck={false}
                onChange={(event) =>
                  updateConfig((config) => {
                    config.asset.path = event.target.value;
                  })
                }
              />
            </Field>
            <div className="field-row">
              <Field label="Fit">
                <select
                  value={state.config.asset.fit}
                  onChange={(event) =>
                    updateConfig((config) => {
                      config.asset.fit = event.target.value as EntranceFitMode;
                    })
                  }
                >
                  <option value="contain">Contain</option>
                  <option value="cover">Cover</option>
                </select>
              </Field>
              <Field label="Background">
                <input
                  data-testid="background-control"
                  type="color"
                  value={state.config.asset.background}
                  onChange={(event) =>
                    updateConfig((config) => {
                      config.asset.background = event.target.value;
                    })
                  }
                />
              </Field>
            </div>
          </ControlSection>
        );

      case 'opening':
        return (
          <ControlSection title="Opening">
            <Field label="Style">
              <select
                data-testid="open-control"
                value={state.config.open.effect}
                onChange={(event) =>
                  updateConfig((config) => {
                    config.open.effect = event.target.value as EntranceOpenEffect;
                  })
                }
              >
                <option value="fade">Fade</option>
                <option value="scale">Scale</option>
                <option value="slide-up">Slide up</option>
                <option value="none">None</option>
              </select>
            </Field>
            <Range
              label="Duration"
              value={state.config.open.durationMs}
              min={0}
              max={2400}
              step={50}
              onChange={(value) =>
                updateConfig((config) => {
                  config.open.durationMs = value;
                })
              }
            />
            <Range
              label="Delay"
              value={state.config.open.delayMs}
              min={0}
              max={1200}
              step={50}
              onChange={(value) =>
                updateConfig((config) => {
                  config.open.delayMs = value;
                })
              }
            />
          </ControlSection>
        );

      case 'behavior':
        return (
          <ControlGroup>
            <Range
              label={
                state.config.asset.kind === 'video' ? 'Video playback' : 'Image hold'
              }
              value={state.config.hold.durationMs}
              min={0}
              max={6000}
              step={100}
              disabled={state.config.asset.kind === 'video'}
              onChange={(value) =>
                updateConfig((config) => {
                  config.hold.durationMs = value;
                })
              }
            />
            <Field label="Reduced motion">
              <select
                value={state.config.safety.reducedMotion}
                onChange={(event) =>
                  updateConfig((config) => {
                    config.safety.reducedMotion = event.target.value as ReducedMotionMode;
                  })
                }
              >
                <option value="skip">Skip</option>
                <option value="play">Play</option>
              </select>
            </Field>
            <Field label="Show once">
              <select
                value={state.config.safety.showOnce}
                onChange={(event) =>
                  updateConfig((config) => {
                    config.safety.showOnce = event.target.value as ShowOnceMode;
                  })
                }
              >
                <option value="off">Every visit</option>
                <option value="session">Session</option>
                <option value="local">Browser</option>
              </select>
            </Field>
            <Range
              label="Timeout"
              value={state.config.safety.timeoutMs}
              min={1000}
              max={10000}
              step={250}
              onChange={(value) =>
                updateConfig((config) => {
                  config.safety.timeoutMs = value;
                })
              }
            />
            <label className="check">
              <input
                type="checkbox"
                checked={state.config.safety.skipButton}
                onChange={(event) =>
                  updateConfig((config) => {
                    config.safety.skipButton = event.target.checked;
                  })
                }
              />
              <span>Skip control</span>
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={state.config.safety.readinessHook}
                onChange={(event) =>
                  updateConfig((config) => {
                    config.safety.readinessHook = event.target.checked;
                  })
                }
              />
              <span>Readiness hook</span>
            </label>
          </ControlGroup>
        );

      case 'closing':
        return (
          <ControlSection title="Closing">
            <Field label="Style">
              <select
                data-testid="reveal-control"
                value={state.config.reveal.effect}
                onChange={(event) =>
                  updateConfig((config) => {
                    config.reveal.effect = event.target.value as EntranceRevealEffect;
                  })
                }
              >
                <option value="fade">Fade</option>
                <option value="mask">Mask</option>
                <option value="curtain">Curtain</option>
              </select>
            </Field>
            <Range
              label="Duration"
              value={state.config.reveal.durationMs}
              min={0}
              max={2400}
              step={50}
              onChange={(value) =>
                updateConfig((config) => {
                  config.reveal.durationMs = value;
                })
              }
            />
          </ControlSection>
        );
    }
  }

  return (
    <main className="builder-shell">
      <header className="builder-topbar">
        <div className="brand" aria-label="EntranceKit">
          <span className="brand__mark" />
          <span>EntranceKit Builder</span>
        </div>
        <div className="topbar-meta">
          <span>{state.config.asset.kind.toUpperCase()}</span>
          <span>{fileNameFromPath(state.config.asset.path)}</span>
        </div>
      </header>

      <section className="workspace" aria-label="Entrance builder workspace">
        <aside className="panel controls" aria-label="Entrance controls">
          <div className="settings-tabs" role="tablist" aria-label="Entrance settings">
            {SETTINGS_TABS.map((tab) => {
              const isSelected = activeSettingsTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`settings-tab-${tab.id}`}
                  className="settings-tab"
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  aria-controls={`settings-panel-${tab.id}`}
                  onClick={() => setActiveSettingsTab(tab.id)}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
          <div
            id={`settings-panel-${activeSettingsTab}`}
            className="settings-panel"
            role="tabpanel"
            aria-labelledby={`settings-tab-${activeSettingsTab}`}
          >
            {renderSettingsPanel()}
          </div>
        </aside>

        <section className="preview-column" aria-label="Entrance preview">
          <div className="preview-toolbar">
            <div>
              <h1>Local Entrance Builder</h1>
              <p>{state.uploadedName ?? 'Sample asset'} over mock app shell</p>
            </div>
            <button
              className="button"
              type="button"
              onClick={() => setPreviewRun((run) => run + 1)}
            >
              Replay
            </button>
          </div>
          <div
            className="preview-stage"
            ref={setPreviewHost}
            data-testid="preview-stage"
            data-preview-open={state.config.open.effect}
            data-preview-reveal={state.config.reveal.effect}
          >
            <MockApp />
            {previewHost && (
              <PreviewEntrance
                key={previewRun}
                config={previewConfig}
                container={previewHost}
              />
            )}
          </div>
        </section>

        <aside className="panel code-panel" aria-label="Generated code">
          <div className="code-panel__head">
            <div>
              <h2>AppEntrance.tsx</h2>
              <p>{output.setup}</p>
            </div>
            <button className="button button--primary" type="button" onClick={copyCode}>
              Copy
            </button>
          </div>
          <p className="asset-note">{output.assetNote}</p>
          <pre>
            <code data-testid="generated-code">{code}</code>
          </pre>
        </aside>
      </section>
    </main>
  );
}

function PreviewEntrance({
  config,
  container,
}: {
  config: EntranceConfig;
  container: HTMLElement;
}) {
  return <AppEntrancePreview config={config} container={container} />;
}

function ControlSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="control-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function ControlGroup({ children }: { children: ReactNode }) {
  return <section className="control-section">{children}</section>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Range({
  label,
  value,
  min,
  max,
  step,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className="range">
      <span>
        {label} <b>{value}ms</b>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function MockApp() {
  return (
    <div className="mock-app" aria-hidden="true">
      <header>
        <span className="mock-logo" />
        <strong>Northstar</strong>
        <nav>
          <span>Home</span>
          <span>Launch</span>
          <span>Metrics</span>
        </nav>
      </header>
      <section className="mock-hero">
        <p>Q3 Release</p>
        <h2>Application shell stays mounted beneath the entrance.</h2>
      </section>
      <section className="mock-grid">
        <div>
          <strong>84%</strong>
          <span>Activation</span>
        </div>
        <div>
          <strong>12k</strong>
          <span>Visitors</span>
        </div>
        <div>
          <strong>4.9</strong>
          <span>Rating</span>
        </div>
      </section>
    </div>
  );
}

const root = document.getElementById('root');
if (root) createRoot(root).render(<App />);
