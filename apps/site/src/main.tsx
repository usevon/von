import { Button } from "@usevon/ui";
import React from "react";
import ReactDOM from "react-dom/client";

const App = () => (
  <div>
    <h1>Von</h1>
    <p>Webhooks infrastructure that just works.</p>
    <Button variant="default">Get Started</Button>
  </div>
);

const root = document.getElementById("root");
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
