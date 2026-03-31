import {
  isRouteErrorResponse,
  Links,
  Meta,
  NavLink,
  Outlet,
  Scripts,
  ScrollRestoration,
} from 'react-router';

import type { Route } from './+types/root';
import './app.css';

export const links: Route.LinksFunction = () => [
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap',
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        {process.env.NODE_ENV === 'production' && (
          <link rel="icon" href="/floppy-disk/favicon.ico" />
        )}
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <>
      <header>
        <nav className="p-4 sm:p-6 max-w-2xl mx-auto sm:flex sm:gap-7 sm:items-start">
          <NavLink to="/" className="!inline-block">
            Home
          </NavLink>
          <span>
            <div className="hidden sm:block"> .</div>
            <div className="flex">
              <div> ├── </div>
              <NavLink to="/store/zustand">Zustand's store</NavLink>
            </div>
            <div className="flex">
              <div>
                {' '}
                <span className="sm:hidden">├</span>
                <span className="hidden sm:inline">└</span>──{' '}
              </div>
              <NavLink to="/store/floppy-disk">FloppyDisk's store</NavLink>
            </div>
          </span>
          <span>
            <div className="hidden sm:block"> .</div>
            <div className="flex">
              <div> ├── </div>
              <NavLink to="/async/tanstack">TanStack's query & mutation</NavLink>
            </div>
            <div className="flex">
              <div> └── </div>
              <NavLink to="/async/floppy-disk">FloppyDisk's query & mutation</NavLink>
            </div>
          </span>
        </nav>
      </header>
      <main className="px-4 py-9 sm:px-6 sm:py-12 max-w-2xl mx-auto">
        <Outlet key={Date.now()} />
        <div className="h-12" />
      </main>
    </>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = 'Oops!';
  let details = 'An unexpected error occurred.';
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? '404' : 'Error';
    details =
      error.status === 404 ? 'The requested page could not be found.' : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
