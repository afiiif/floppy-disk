import { cn } from '@/utils';
import { IconDotsVertical, IconX } from '@tabler/icons-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function Menu() {
  const { pathname } = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <>
      <button
        title="Menu"
        aria-label="Menu"
        className="px-5 py-4 lg:hidden"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <IconDotsVertical />
      </button>
      <button
        title="Close"
        aria-label="Close"
        hidden={!isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed w-full h-full bg-rose-700/70 backdrop-blur inset-0 lg:hidden"
      />
      <div
        className={cn(
          'absolute right-5 top-5 bg-rose-600 rounded-lg py-2 backdrop-blur border border-neutral-300 hidden',
          'lg:!flex lg:relative lg:right-0 lg:top-0 lg:bg-transparent lg:border-none lg:pr-3',
          isOpen && '!block',
        )}
      >
        <button
          title="Close"
          aria-label="Close"
          className="absolute w-9 h-9 flex items-center justify-center right-2 top-2.right-2 lg:hidden"
          onClick={() => setIsOpen((prev) => !prev)}
        >
          <IconX />
        </button>
        <Link
          className="block px-5 py-2 font-medium hover:bg-white/10 lg:hover:bg-transparent lg:hover:text-white lg:px-4"
          href="/store"
        >
          Store
        </Link>
        <Link
          className="block px-5 py-2 font-medium hover:bg-white/10 lg:hover:bg-transparent lg:hover:text-white lg:px-4"
          href="/single-query"
        >
          Single Query
        </Link>
        <Link
          className="block px-5 py-2 font-medium hover:bg-white/10 lg:hover:bg-transparent lg:hover:text-white lg:px-4"
          href="/infinite-query"
        >
          Infinite Query
        </Link>
        <Link
          className="block px-5 py-2 font-medium hover:bg-white/10 lg:hover:bg-transparent lg:hover:text-white lg:px-4"
          href="/infinite-query-ssg"
        >
          Infinite Query SSG
        </Link>
        <Link
          className="block px-5 py-2 font-medium hover:bg-white/10 lg:hover:bg-transparent lg:hover:text-white lg:px-4"
          href="/mutation"
        >
          Mutation
        </Link>
      </div>
    </>
  );
}
