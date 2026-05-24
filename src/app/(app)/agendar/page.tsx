import { AppShell } from "@/components/layout/app-shell";
import { AgendarForm } from "@/components/agendar/agendar-form";

type PageProps = {
  searchParams: Promise<{
    url?: string;
    name?: string;
    mode?: string;
  }>;
};

export default async function AgendarPage({ searchParams }: PageProps) {
  const params = await searchParams;

  return (
    <AppShell
      title="Agendar Lead"
      description="Registrar venta en Notion o potencial en Supabase"
    >
      <AgendarForm
        initialUrl={params.url}
        initialName={params.name}
        isPotencial={params.mode === "pot"}
      />
    </AppShell>
  );
}
