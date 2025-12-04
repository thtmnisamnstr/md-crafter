import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/themes.css';  // Load themes FIRST - defines CSS variables
import './styles/globals.css';  // Then globals - uses CSS variables
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

