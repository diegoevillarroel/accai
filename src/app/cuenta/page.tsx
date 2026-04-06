import { AppLayout } from "@/components/layout/AppLayout";
import { Cuenta as CuentaPage } from "@/views/Cuenta";

export default function CuentaRoute() {
  return (
    <AppLayout>
      <CuentaPage />
    </AppLayout>
  );
}
