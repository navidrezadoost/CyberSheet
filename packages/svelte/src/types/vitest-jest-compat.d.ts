declare global {
  const jest: typeof import('vitest')['vi'];
}

import 'vitest';

declare module 'vitest' {
  interface Assertion<R extends void | Promise<void> = void, T = unknown> {
    toHaveNoViolations(): R;
  }
}

declare global {
  namespace jest {
    interface Matchers<R, T = {}> {
      toHaveNoViolations(): R;
    }
  }
}

declare module 'expect' {
  interface Matchers<R extends void | Promise<void>, T = unknown> {
    toHaveNoViolations(): R;
  }
}
