import { AppShell } from "@/components/layout/app-shell";
import { PlaceholderSection } from "@/components/ui/placeholder-section";

type PageProps = {
  searchParams: Promise<{
    url?: string;
    name?: string;
    mode?: string;
  }>;
};

export default async function AgendarPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const fromManyChat = Boolean(params.url || params.name);
  const isPotencial = params.mode === "pot";

  return (
    <AppShell
      title="Agendar Lead"
      description="Registrar venta en Notion o potencial en Supabase"
    >
      {fromManyChat ? (
        <div className="glass mb-6 rounded-xl border border-accent/20 bg-accent/5 px-5 py-4">
          <p className="text-sm font-medium text-accent">Datos desde ManyChat</p>
          <p className="mt-1 text-sm text-muted">
            Modo:{" "}
            <span className="font-mono text-foreground">
              {isPotencial ? "Potencial (Supabase)" : "Venta (Notion)"}
            </span>
          </p>
          {params.name ? (
            <p className="mt-2 text-sm">
              Nombre: <span className="text-foreground">{decodeURIComponent(params.name)}</span>
            </p>
          ) : null}
        </div>
      ) : null}
      <PlaceholderSection message="Formulario venta/potencial con anti-duplicado en Notion y bookmarklet para ManyChat." />
    </AppShell>
  );
}
