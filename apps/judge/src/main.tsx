import "antd-mobile/es/global";
import "./styles/base.css";
import { unstableSetRender } from "antd-mobile";
import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { App } from "./app/App.js";
import { AppProviders } from "./app/providers.js";

const antdMobileRoots = new WeakMap<Element | DocumentFragment, Root>();

unstableSetRender((node, container) => {
  let root = antdMobileRoots.get(container);
  if (!root) {
    root = createRoot(container);
    antdMobileRoots.set(container, root);
  }

  root.render(node);

  return async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    root.unmount();
    antdMobileRoots.delete(container);
  };
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>
);
