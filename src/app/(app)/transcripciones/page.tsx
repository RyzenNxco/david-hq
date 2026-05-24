import { AppShell } from "@/components/layout/app-shell";
import { PlaceholderSection } from "@/components/ui/placeholder-section";

export default function TranscripcionesPage() {
  return (
    <AppShell
      title="Transcripciones"
      description="Gestión de transcripciones vinculadas a leads"
    >
      <PlaceholderSection message="Lista de transcripciones con vínculo a leads y accesos rápidos al Tracker y Potenciales." />
    </AppShell>
  );
}
