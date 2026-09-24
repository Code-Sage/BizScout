import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { DashboardPage } from './DashboardPage';
import { ErrorBoundary } from './ErrorBoundary';
import { createQueryClient } from './query-client';

export function App() {
  const [queryClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <DashboardPage />
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
