import { AppShell } from "@/components/layout/app-shell";
import { PlaceholderSection } from "@/components/ui/placeholder-section";

export default function DashboardPage() {
  return (
    <AppShell
      title="Dashboard"
      description="Resumen del mes: ventas, comisiones, potenciales y señas pendientes"
    >
      <PlaceholderSection message="Acá van las stats del mes, el funnel de potenciales, señas pendientes y las últimas 5 ventas." />
    </AppShell>
  );
}
