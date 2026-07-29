const runtime = globalThis.__MDCRAFTER_REACT_JSX_DEV_RUNTIME__;
if (!runtime) {
  throw new Error('MDX runtime bridge: react/jsx-dev-runtime singleton is not initialized');
}

export default runtime;
export const Fragment = runtime.Fragment;
export const jsx = runtime.jsx;
export const jsxs = runtime.jsxs;
export const jsxDEV = runtime.jsxDEV;
