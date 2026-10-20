import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useCyberSheet, type UseCyberSheetReturn } from '../useCyberSheet';

function HookProbe(props: { options: Parameters<typeof useCyberSheet>[0]; observe: (state: UseCyberSheetReturn) => void }) {
  const state = useCyberSheet(props.options);
  props.observe(state);
  return <div ref={state.containerRef} />;
}

async function renderHookWith(options: Parameters<typeof useCyberSheet>[0]) {
  Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', { value: true, configurable: true });
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root: Root = createRoot(host);
  let observed: UseCyberSheetReturn | undefined;

  await act(async () => {
    root.render(<HookProbe options={options} observe={(state) => { observed = state; }} />);
    await Promise.resolve();
  });

  return {
    get state() { return observed; },
    async dispose() {
      await act(async () => root.unmount());
      host.remove();
    },
  };
}

describe('useCyberSheet R1 initialization failure visibility', () => {
  test('reports rejected initial content without publishing a worksheet or renderer', async () => {
    const rendered = await renderHookWith({ data: [['required initial value']] });
    try {
      expect(rendered.state?.initializationError?.message).toMatch(/initial workbook cell data is unavailable/i);
      expect(rendered.state?.worksheet).toBeNull();
      expect(rendered.state?.renderer).toBeNull();
    } finally {
      await rendered.dispose();
    }
  });

  test('reports rejected collaboration initialization without publishing an empty workbook', async () => {
    const rendered = await renderHookWith({ enableCollaboration: true });
    try {
      expect(rendered.state?.initializationError?.message).toMatch(/collaboration writes are unavailable/i);
      expect(rendered.state?.worksheet).toBeNull();
      expect(rendered.state?.renderer).toBeNull();
    } finally {
      await rendered.dispose();
    }
  });
});
