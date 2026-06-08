import { AppShell } from "@/components/layout/app-shell";
import { PlantillasManager } from "@/components/plantillas/plantillas-manager";

export default function PlantillasPage() {
  return (
    <AppShell
      title="Plantillas"
      description="Textos rápidos para copiar y pegar en ManyChat"
    >
      <PlantillasManager />
    </AppShell>
  );
}
