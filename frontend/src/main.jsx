/**
 * ==========================================================
 * File: main.js
 * Purpose: Entry point of the React application.
 * - Mounts the root React component (App) into the DOM.
 * - Wraps the application in StrictMode for highlighting
 *   potential problems during development.
 * ==========================================================
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

// ----------------------------------------------------------
// Create a root DOM node where the React app will be rendered
// ----------------------------------------------------------
const rootElement = document.getElementById('root');

// ----------------------------------------------------------
// Render the <App /> component wrapped in <StrictMode>
// StrictMode helps detect potential issues in development
// ----------------------------------------------------------
createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
