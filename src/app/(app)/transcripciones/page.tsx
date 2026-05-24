import { AppShell } from "@/components/layout/app-shell";
import { TranscripcionesList } from "@/components/transcripciones/transcripciones-list";

export default function TranscripcionesPage() {
  return (
    <AppShell
      title="Transcripciones"
      description="Gestión de transcripciones vinculadas a leads"
    >
      <TranscripcionesList />
    </AppShell>
  );
}
