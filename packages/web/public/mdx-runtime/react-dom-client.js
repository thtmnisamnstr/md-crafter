const ReactDOMClient = globalThis.__MDCRAFTER_REACT_DOM_CLIENT__;
if (!ReactDOMClient) {
  throw new Error('MDX runtime bridge: react-dom/client singleton is not initialized');
}

export default ReactDOMClient;
export const createRoot = ReactDOMClient.createRoot;
export const hydrateRoot = ReactDOMClient.hydrateRoot;
export const version = ReactDOMClient.version;
