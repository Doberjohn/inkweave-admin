import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {ToolIndex} from './shell/ToolIndex';

const root = document.getElementById('root');
if (!root) throw new Error('index.html is missing the #root element');

createRoot(root).render(
  <StrictMode>
    <ToolIndex />
  </StrictMode>,
);
