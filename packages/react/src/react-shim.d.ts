declare module 'react' {
  export type CSSProperties = Record<string, any>;
  export type FC<P = {}> = (props: P & { children?: any }) => any;
  export const useEffect: any;
  export const useRef: any;
  export const useCallback: any;
  export const useMemo: any;
  export function useState<T>(initial: T): [T, (v: T) => void];
  const React: { createElement: any };
  export default React;
}

declare module 'react-dom' {
  const ReactDOM: any;
  export default ReactDOM;
}

declare module 'react/jsx-runtime' {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}
