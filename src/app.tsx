import { Title } from "@solidjs/meta";
import { env } from "virtual:solid-env/client";

import { Root } from "./components/layout/root";
import { Router } from "./router";

import "./tailwind.css";

export default function App() {
  return (
    <Router>
      {(props) => (
        <>
          <Title>{env.VITE_APP_NAME}</Title>
          <Root>{props.children}</Root>
        </>
      )}
    </Router>
  );
}
