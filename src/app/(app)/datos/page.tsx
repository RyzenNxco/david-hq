import { AppShell } from "@/components/layout/app-shell";
import { DataViewer } from "@/components/datos/data-viewer";

export default function DatosPage() {
  return (
    <AppShell
      title="Base de Datos"
      description="Todo lo que está en ManyChat, sincronizado desde Supabase"
    >
      <DataViewer />
    </AppShell>
  );
}
