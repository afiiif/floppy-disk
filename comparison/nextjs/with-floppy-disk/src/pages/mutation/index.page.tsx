import { createMutation } from 'floppy-disk';
import Head from 'next/head';

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
  const { mutate, response, isWaiting } = useMyMutation();
  return (
    <section className="border p-5 rounded-lg mt-6 flex items-start gap-6 flex-wrap">
      <button className="btn" onClick={() => mutate(title)}>
        Add {title}
      </button>
      {isWaiting ? <div>Loading...</div> : <pre>{JSON.stringify(response, null, 2)}</pre>}
    </section>
  );
}

function IsMutating() {
  const { isWaiting } = useMyMutation((state) => [state.isWaiting]);
  return <div className="mt-6">Is mutating: {isWaiting}</div>;
}
