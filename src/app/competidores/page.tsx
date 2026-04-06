import { AppLayout } from "@/components/layout/AppLayout";
import { Competidores as CompetidoresPage } from "@/views/Competidores";

export default function CompetidoresRoute() {
  return (
    <AppLayout>
      <CompetidoresPage />
    </AppLayout>
  );
}
