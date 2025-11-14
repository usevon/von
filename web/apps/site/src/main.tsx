import React from 'react';
import ReactDOM from 'react-dom/client';
import { Button } from '@usevon/ui';

const App = () => {
  return (
    <div>
      <h1>Von</h1>
      <p>Webhooks infrastructure that just works.</p>
      <Button variant="primary">Get Started</Button>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
