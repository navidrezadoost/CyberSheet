declare module 'jest-axe' {
  import type axe = require('axe-core');

  export function axe(
    html: Element | string,
    options?: axe.RunOptions,
  ): Promise<axe.AxeResults>;

  export const toHaveNoViolations: {
    toHaveNoViolations(results: axe.AxeResults): {
      actual: axe.Result[];
      message(): string;
      pass: boolean;
    };
  };
}

declare namespace jest {
  interface Matchers<R, T = {}> {
    toHaveNoViolations(): R;
  }
}

