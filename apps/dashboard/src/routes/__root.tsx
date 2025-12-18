import {
  createRootRoute,
  HeadContent,
  Link,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { VonProvider } from "@usevon/react";
import type { ReactNode } from "react";
import { signOut, useSession } from "@/lib/auth/client";
import appCss from "@/styles/app.css?url";

const NotFound = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="text-center">
      <h1 className="font-bold text-4xl">404</h1>
      <p className="mt-2 text-gray-600">Page not found</p>
    </div>
  </div>
);

const Navbar = () => {
  const { data: session, isPending } = useSession();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <nav className="flex items-center justify-between border-b px-5 py-3">
      <div className="flex items-center gap-5">
        <Link className="font-bold text-black no-underline" to="/">
          Von
        </Link>
        <Link
          className="text-gray-600 no-underline hover:text-black"
          to="/test-auth"
        >
          Test Auth
        </Link>
        <Link
          className="text-gray-600 no-underline hover:text-black"
          to="/webhooks"
        >
          Webhooks
        </Link>
        <Link
          className="text-gray-600 no-underline hover:text-black"
          to="/endpoints"
        >
          Endpoints
        </Link>
        <Link
          className="text-gray-600 no-underline hover:text-black"
          to="/inbound"
        >
          Inbound
        </Link>
      </div>
      <div>
        {isPending ? (
          <span className="text-gray-400">Loading...</span>
        ) : session ? (
          <div className="flex items-center gap-3">
            <span className="text-gray-600">{session.user.email}</span>
            <button
              className="cursor-pointer"
              onClick={handleSignOut}
              type="button"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <span className="text-gray-400">Not logged in</span>
        )}
      </div>
    </nav>
  );
};

const RootComponent = () => {
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8080";

  return (
    <VonProvider apiUrl={apiUrl}>
      <Navbar />
      <Outlet />
    </VonProvider>
  );
};

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      { title: "Von Dashboard" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  component: RootComponent,
  shellComponent: RootDocument,
  notFoundComponent: NotFound,
});

function RootDocument(props: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {props.children}
        <Scripts />
      </body>
    </html>
  );
}
