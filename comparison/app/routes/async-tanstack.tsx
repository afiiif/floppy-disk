import { QueryClient, QueryClientProvider, useMutation, useQuery } from '@tanstack/react-query';

const queryClient = new QueryClient();

export function meta() {
  return [
    { title: 'TanStack-Query for Async State Management' },
    { name: 'description', content: 'TanStack-Query for async state management' },
  ];
}

export default function AsyncStateTanstack() {
  console.info(useQuery, useMutation);
  return (
    <QueryClientProvider client={queryClient}>
      {/* TODO */}
      <div>AsyncStateTanstack</div>
    </QueryClientProvider>
  );
}
