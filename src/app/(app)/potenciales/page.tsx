import { AppShell } from "@/components/layout/app-shell";
import { PlaceholderSection } from "@/components/ui/placeholder-section";

export default function PotencialesPage() {
  return (
    <AppShell
      title="Potenciales"
      description="Kanban del funnel — datos desde Supabase"
    >
      <PlaceholderSection message="Tablero Kanban con 5 columnas, drag & drop, semáforo de contacto y link a ManyChat." />
    </AppShell>
  );
}
