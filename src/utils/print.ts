/**
 * Print utility: renders a React element in a hidden container and triggers window.print().
 * Uses the #print-container approach with @media print CSS to hide everything else.
 */
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import React from "react";

export function printElement(element: React.ReactElement): void {
  // Remove any existing print container
  const existing = document.getElementById("print-container");
  if (existing) existing.remove();

  // Create container
  const container = document.createElement("div");
  container.id = "print-container";
  container.style.display = "none";
  document.body.appendChild(container);

  // Render the React element synchronously so content is ready before print
  const root = createRoot(container);
  flushSync(() => {
    root.render(element);
  });

  window.print();

  // Cleanup after print dialog closes
  setTimeout(() => {
    root.unmount();
    container.remove();
  }, 500);
}
