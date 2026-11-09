import * as Vue from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCyberSheet, type UseCyberSheetOptions } from '../useCyberSheet';
// @ts-ignore The Vue package project is rooted at packages/vue/src; Vite's lane config maps the composable import to this same Core source module.
import * as Core from '../../../core/src/index';
import { rendererConstructor } from './fixtures/renderer-canvas';

const { defineComponent, nextTick } = Vue as any;

function mountComposable(options: UseCyberSheetOptions = {}) {
  return mount(defineComponent({
    setup() {
      return { ...useCyberSheet(options) };
    },
    template: '<div ref="containerRef" />',
  }), {
    global: {
      config: {
        errorHandler: (error: unknown) => {
          throw error;
        },
      },
    },
  });
}

describe('Vue useCyberSheet initialization boundary (P1-08AZ)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('publishes a Workbook-backed view and renderer for empty configuration', async () => {
    const createSpy = vi.spyOn((Core as any).Workbook, 'create');
    const wrapper = mountComposable();
    await flushPromises();
    await nextTick();

    expect(createSpy).toHaveBeenCalledOnce();
    expect(createSpy).toHaveBeenCalledWith({ sheets: [{ name: 'Sheet1' }] });
    expect(rendererConstructor).toHaveBeenCalledOnce();
    const worksheet = (wrapper.vm as any).worksheet;
    expect(worksheet.name).toBe('Sheet1');
    expect((Core as any).Workbook.isWorkbookIssuedSheetView(worksheet)).toBe(true);
    expect(rendererConstructor.mock.calls[0][1].name).toBe('Sheet1');
    expect((Core as any).Workbook.isWorkbookIssuedSheetView(rendererConstructor.mock.calls[0][1])).toBe(true);
    expect((wrapper.vm as any).renderer).not.toBeNull();

    wrapper.unmount();
    createSpy.mockRestore();
  });

  it('rejects non-empty initial data before creating or publishing Workbook state', async () => {
    const capturedErrors: unknown[] = [];
    const createSpy = vi.spyOn((Core as any).Workbook, 'create');
    const wrapper = mount(defineComponent({
      setup() {
        return { ...useCyberSheet({ data: [['sentinel']] }) };
      },
      template: '<div ref="containerRef" />',
    }), {
      global: {
        config: {
          errorHandler: (error: unknown) => capturedErrors.push(error),
        },
      },
    });

    await flushPromises();
    await nextTick();

    expect(capturedErrors).toHaveLength(1);
    expect(capturedErrors[0]).toBeInstanceOf(Error);
    expect((capturedErrors[0] as Error).message).toBe(
      'Initial workbook cell data is unavailable until the R2 journal slice is authorized',
    );
    expect(createSpy).not.toHaveBeenCalled();
    expect(rendererConstructor).not.toHaveBeenCalled();
    expect((wrapper.vm as any).worksheet).toBeNull();
    expect((wrapper.vm as any).renderer).toBeNull();

    wrapper.unmount();
    createSpy.mockRestore();
  });
});
