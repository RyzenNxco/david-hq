import { AppShell } from "@/components/layout/app-shell";
import { KanbanBoard } from "@/components/potenciales/kanban-board";

export default function PotencialesPage() {
  return (
    <AppShell
      title="Potenciales"
      description="Kanban del funnel — datos desde Supabase"
    >
      <KanbanBoard />
    </AppShell>
  );
}
