type PlaceholderSectionProps = {
  message: string;
};

export function PlaceholderSection({ message }: PlaceholderSectionProps) {
  return (
    <div className="glass flex min-h-[280px] flex-col items-center justify-center rounded-xl p-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
        <span className="text-lg">⚡</span>
      </div>
      <p className="max-w-md text-sm text-muted">{message}</p>
      <p className="mt-3 font-mono text-[11px] text-muted/60">
        Próximo paso: implementar esta sección
      </p>
    </div>
  );
}
