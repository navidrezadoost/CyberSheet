import * as Vue from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCyberSheet } from '../useCyberSheet';
// @ts-ignore The package tsconfig is rooted under src; the BA Vitest config resolves this to the actual Core source entry.
import * as Core from '../../../core/src/index';
import { rendererConstructor } from './fixtures/renderer-canvas';

const { defineComponent, nextTick } = Vue as any;

function mountComposable(errorHandler: (error: unknown) => void) {
  return mount(defineComponent({
    setup() {
      return { ...useCyberSheet() };
    },
    template: '<div ref="containerRef" />',
  }), {
    global: { config: { errorHandler } },
  });
}

describe('P1-08BA Vue renderer-construction failure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps refs unpublished when the renderer throws and permits a later clean mount', async () => {
    const failure = new Error('renderer construction failed');
    const errors: unknown[] = [];
    const createWorkbook = vi.spyOn((Core as any).Workbook, 'create');
    rendererConstructor.mockImplementation(() => {
      throw failure;
    });

    const failedWrapper = mountComposable((error) => errors.push(error));
    await flushPromises();
    await nextTick();

    expect(createWorkbook).toHaveBeenCalledOnce();
    expect(rendererConstructor).toHaveBeenCalledOnce();
    expect(errors).toEqual([failure]);
    expect((failedWrapper.vm as any).worksheet).toBeNull();
    expect((failedWrapper.vm as any).renderer).toBeNull();
    expect(failedWrapper.find('div').element.childElementCount).toBe(0);

    const failedElement = failedWrapper.element;
    failedWrapper.unmount();
    expect(failedElement.isConnected).toBe(false);

    rendererConstructor.mockImplementation(() => undefined);
    const retryWrapper = mountComposable((error) => {
      throw error;
    });
    await flushPromises();
    await nextTick();

    expect(createWorkbook).toHaveBeenCalledTimes(2);
    expect(rendererConstructor).toHaveBeenCalledTimes(2);
    expect((retryWrapper.vm as any).worksheet.name).toBe('Sheet1');
    expect((Core as any).Workbook.isWorkbookIssuedSheetView((retryWrapper.vm as any).worksheet)).toBe(true);
    expect((retryWrapper.vm as any).renderer).not.toBeNull();
    retryWrapper.unmount();
    createWorkbook.mockRestore();
  });
});
