import React from 'react';
import ReactDOM from 'react-dom/client';
import * as ReactNamespace from 'react';
import * as ReactJsxRuntime from 'react/jsx-runtime';
import * as ReactJsxDevRuntime from 'react/jsx-dev-runtime';
import * as ReactDomNamespace from 'react-dom';
import * as ReactDomClientNamespace from 'react-dom/client';
import * as ReactDomServerNamespace from 'react-dom/server';
import './styles/themes.css';  // Load themes FIRST - defines CSS variables
import './styles/globals.css';  // Then globals - uses CSS variables
import 'katex/dist/katex.min.css';
import App from './App';

(globalThis as Record<string, unknown>).__MDCRAFTER_REACT__ = ReactNamespace;
(globalThis as Record<string, unknown>).__MDCRAFTER_REACT_JSX_RUNTIME__ = ReactJsxRuntime;
(globalThis as Record<string, unknown>).__MDCRAFTER_REACT_JSX_DEV_RUNTIME__ = ReactJsxDevRuntime;
(globalThis as Record<string, unknown>).__MDCRAFTER_REACT_DOM__ = ReactDomNamespace;
(globalThis as Record<string, unknown>).__MDCRAFTER_REACT_DOM_CLIENT__ = ReactDomClientNamespace;
(globalThis as Record<string, unknown>).__MDCRAFTER_REACT_DOM_SERVER__ = ReactDomServerNamespace;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
