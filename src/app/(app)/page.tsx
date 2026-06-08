import { AppShell } from "@/components/layout/app-shell";
import { PlaceholderSection } from "@/components/ui/placeholder-section";
import { AgendaPotenciales } from "@/components/dashboard/agenda-potenciales";
import { ChecklistHoy } from "@/components/dashboard/checklist-hoy";

export default function DashboardPage() {
  return (
    <AppShell
      title="Dashboard"
      description="Resumen del mes: ventas, comisiones, potenciales y senas pendientes"
    >
      <div className="space-y-8">
        {/* Checklist de hoy - Collapsible */}
        <ChecklistHoy />

        {/* Agenda de Potenciales */}
        <AgendaPotenciales />

        {/* Placeholder for future stats */}
        <PlaceholderSection message="Aca van las stats del mes, el funnel de potenciales, senas pendientes y las ultimas 5 ventas." />
      </div>
    </AppShell>
  );
}
