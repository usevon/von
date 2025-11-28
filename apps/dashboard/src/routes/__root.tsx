import type { ReactNode } from 'react';
import { createRootRoute, HeadContent, Scripts, Outlet, Link } from '@tanstack/react-router';
import appCss from '@/styles/app.css?url';
import { useSession, signOut } from '@/lib/auth/client';
import { AuthenticatedVonProvider } from '@/lib/providers/authenticated-von-provider';

const NotFound = () => {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="mt-2 text-gray-600">Page not found</p>
      </div>
    </div>
  );
};

const Navbar = () => {
  const { data: session, isPending } = useSession();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <nav className="flex items-center justify-between border-b px-5 py-3">
      <div className="flex items-center gap-5">
        <Link to="/" className="font-bold text-black no-underline">Von</Link>
        <Link to="/test-auth" className="text-gray-600 no-underline hover:text-black">Test Auth</Link>
        <Link to="/webhooks" className="text-gray-600 no-underline hover:text-black">Webhooks</Link>
        <Link to="/endpoints" className="text-gray-600 no-underline hover:text-black">Endpoints</Link>
        <Link to="/inbound" className="text-gray-600 no-underline hover:text-black">Inbound</Link>
      </div>
      <div>
        {isPending ? (
          <span className="text-gray-400">Loading...</span>
        ) : session ? (
          <div className="flex items-center gap-3">
            <span className="text-gray-600">{session.user.email}</span>
            <button onClick={handleSignOut} className="cursor-pointer">Sign Out</button>
          </div>
        ) : (
          <span className="text-gray-400">Not logged in</span>
        )}
      </div>
    </nav>
  );
};

const RootComponent = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';

  return (
    <AuthenticatedVonProvider apiUrl={apiUrl}>
      <Navbar />
      <Outlet />
    </AuthenticatedVonProvider>
  );
};

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      { title: 'Von Dashboard' },
    ],
    links: [
      {
        rel: 'stylesheet',
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
    <html>
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
