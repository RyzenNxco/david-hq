import { AppShell } from "@/components/layout/app-shell";
import { TrackerView } from "@/components/tracker/tracker-view";

export default function TrackerPage() {
  return (
    <AppShell
      title="Tracker de Comisiones"
      description="Ventas sincronizadas desde Notion con cálculo de comisión"
    >
      <TrackerView />
    </AppShell>
  );
}
