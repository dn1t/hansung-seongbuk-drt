import { Title } from "@solidjs/meta";
import { Loading } from "solid-js";
import { env } from "virtual:solid-env/client";

import { Nav } from "./components/layout/nav";

import "./tailwind.css";
import { paths, Router } from "./router";

export default function App() {
  return (
    <Router>
      {(props) => (
        <>
          <Title>{env.VITE_APP_NAME}</Title>
          <Nav />
          <nav class="site-nav">
            <a href={paths()}>Home</a>
            <a href={paths.users()}>Users</a>
          </nav>
          <Loading fallback={<main>Loading…</main>}>{props.children}</Loading>
        </>
      )}
    </Router>
  );
}
