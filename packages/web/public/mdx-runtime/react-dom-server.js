const ReactDOMServer = globalThis.__MDCRAFTER_REACT_DOM_SERVER__;
if (!ReactDOMServer) {
  throw new Error('MDX runtime bridge: react-dom/server singleton is not initialized');
}

export default ReactDOMServer;
export const renderToReadableStream = ReactDOMServer.renderToReadableStream;
export const renderToStaticMarkup = ReactDOMServer.renderToStaticMarkup;
export const renderToString = ReactDOMServer.renderToString;
export const renderToPipeableStream = ReactDOMServer.renderToPipeableStream;
export const version = ReactDOMServer.version;
