import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>HASS-ODPS — scaffold OK</h1>
    </div>
  </StrictMode>
);
