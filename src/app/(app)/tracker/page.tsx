import { AppShell } from "@/components/layout/app-shell";
import { PlaceholderSection } from "@/components/ui/placeholder-section";

export default function TrackerPage() {
  return (
    <AppShell
      title="Tracker de Comisiones"
      description="Ventas sincronizadas desde Notion con cálculo de comisión"
    >
      <PlaceholderSection message="Tabla de ventas con sync Notion, filtro por mes y modal para completar montos pendientes." />
    </AppShell>
  );
}
