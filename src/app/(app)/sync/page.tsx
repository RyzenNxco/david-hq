import { AppShell } from "@/components/layout/app-shell";
import { ManyChatSync } from "@/components/sync/manychat-sync";

export default function SyncPage() {
  return (
    <AppShell
      title="ManyChat Sync"
      description="Extraé de ManyChat con los bookmarklets, subí el JSON y se guarda clasificado en Supabase"
    >
      <ManyChatSync />
    </AppShell>
  );
}
