import { TextDecoder, TextEncoder } from 'node:util';
import '@testing-library/jest-dom';

// JSDOM omits the Encoding API globals used by XLSX export.
Object.assign(globalThis, { TextDecoder, TextEncoder });
