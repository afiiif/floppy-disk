import Head from 'next/head';

import { createMutation } from '../../src';

const useMyMutation = createMutation<string>(
  async (variable): Promise<{ success: boolean; createdAt: string }> => {
    await new Promise((r) => setTimeout(r, 2000));
    if (variable === 'Baz') throw new Error('Nah!');
    return { success: true, createdAt: new Date().toLocaleString() };
  },
);

export default function MutationPage() {
  return (
    <>
      <Head>
        <title>Mutation</title>
        <meta property="og:title" content="Mutation" key="title" />
      </Head>
      <h1 className="h1">Mutation</h1>

      <MutationComponent title="Foo" />
      <MutationComponent title="Bar" />
      <MutationComponent title="Baz" />

      <IsMutating />
    </>
  );
}

function MutationComponent({ title }: { title: string }) {
  const { mutate, isWaiting, isSuccess, response, responseUpdatedAt, isError, errorUpdatedAt } =
    useMyMutation();
  return (
    <section className="border p-5 rounded-lg mt-6 flex items-start gap-6 flex-wrap">
      <button className="btn" onClick={() => mutate(title)}>
        Add {title}
      </button>
      <pre className="text-sm">
        {JSON.stringify(
          { isWaiting, isSuccess, isError, response, responseUpdatedAt, errorUpdatedAt },
          null,
          2,
        )}
      </pre>
    </section>
  );
}

function IsMutating() {
  const { isWaiting } = useMyMutation((state) => [state.isWaiting]);
  return <div className="mt-6">Is mutating: {String(isWaiting)}</div>;
}
