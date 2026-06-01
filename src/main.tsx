import { StrictMode, Component, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "@xterm/xterm/css/xterm.css";

class RenderErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, fontFamily: "monospace", color: "#f77", background: "#1a0a0a", height: "100vh" }}>
          <h2>Render Error</h2>
          <pre>{this.state.error.stack || this.state.error.message}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

window.addEventListener("error", (event) => {
  document.body.innerHTML = `<div style="padding:40px;font-family:monospace;color:#f77;background:#1a0a0a;height:100vh"><h2>Fatal Error</h2><pre>${event.message}\n${event.filename}:${event.lineno}</pre></div>`;
});

window.addEventListener("unhandledrejection", (event) => {
  document.body.innerHTML = `<div style="padding:40px;font-family:monospace;color:#f77;background:#1a0a0a;height:100vh"><h2>Unhandled Promise Rejection</h2><pre>${String(event.reason)}</pre></div>`;
});

const container = document.getElementById("root");
if (!container) throw new Error("Missing #root element");

createRoot(container).render(
  <StrictMode>
    <RenderErrorBoundary>
      <App />
    </RenderErrorBoundary>
  </StrictMode>
);
