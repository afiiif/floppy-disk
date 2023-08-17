import Link from 'next/link';
import { ReactNode } from 'react';
import Menu from './Menu';

interface Props {
  children: ReactNode;
}
export default function RootLayout({ children }: Props) {
  return (
    <>
      <header className="bg-rose-500">
        <nav className="text-neutral-200 flex justify-between items-center relative max-w-5xl mx-auto">
          <Link
            href="/"
            className="inline-block px-5 py-4 my-1 text-xl font-semibold hover:text-white"
          >
            Floppy Disk
          </Link>
          <Menu />
        </nav>
      </header>
      <main className="px-5 py-10 max-w-5xl mx-auto">{children}</main>
    </>
  );
}
