import { useIsMutating, useMutation, useQueryClient } from '@tanstack/react-query';
import Head from 'next/head';

const useMyMutation = () =>
  useMutation({
    mutationFn: async (variable: string): Promise<{ success: boolean; createdAt: string }> => {
      await new Promise((r) => setTimeout(r, 2000));
      if (variable === 'Baz') throw new Error('Nah!');
      return { success: true, createdAt: new Date().toLocaleString() };
    },
    mutationKey: ['my-mutation'],
  });

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
  const { mutate, data, isLoading } = useMyMutation();
  return (
    <section className="border p-5 rounded-lg mt-6 flex items-start gap-6 flex-wrap">
      <button className="btn" onClick={() => mutate(title)}>
        Add {title}
      </button>
      {isLoading ? <div>Loading...</div> : <pre>{JSON.stringify(data, null, 2)}</pre>}
    </section>
  );
}

function IsMutating() {
  const isMutating = useIsMutating({ mutationKey: ['my-mutation'] });
  return <div className="mt-6">Is mutating: {isMutating}</div>;
}
