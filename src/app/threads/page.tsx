import { AppLayout } from "@/components/layout/AppLayout";
import { Threads as ThreadsPage } from "@/views/Threads";

export default function ThreadsRoute() {
  return (
    <AppLayout>
      <ThreadsPage />
    </AppLayout>
  );
}
