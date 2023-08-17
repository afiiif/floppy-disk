import { useIsMutating, useMutation } from '@tanstack/react-query';
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
  const { mutate, isIdle, isLoading, isSuccess, isError, data } = useMyMutation();
  return (
    <section className="border p-5 rounded-lg mt-6 flex items-start gap-6 flex-wrap">
      <button className="btn" onClick={() => mutate(title)}>
        Add {title}
      </button>
      <pre className="text-sm">
        {JSON.stringify({ isIdle, isLoading, isSuccess, isError, data }, null, 2)}
      </pre>
    </section>
  );
}

function IsMutating() {
  const isMutating = useIsMutating({ mutationKey: ['my-mutation'] });
  return <div className="mt-6">Is mutating: {String(isMutating)}</div>;
}
