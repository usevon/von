import React from 'react';
import ReactDOM from 'react-dom/client';
import { VonProvider } from '@usevon/react';
import { Button } from '@usevon/ui';

const App = () => {
  return (
    <VonProvider apiUrl="http://localhost:3000">
      <div>
        <h1>Von Dashboard</h1>
        <p>Manage your webhooks</p>
        <Button variant="primary">View Logs</Button>
      </div>
    </VonProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
