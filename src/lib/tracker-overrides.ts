export type VentaOverride = {
  moneda: "ARS" | "USD";
  monto: number;
  cotiz: number;
  ticketUsd?: number;
};

const STORAGE_KEY = "david-hq-venta-overrides";

export function loadOverrides(): Record<string, VentaOverride> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, VentaOverride>) : {};
  } catch {
    return {};
  }
}

export function saveOverride(notionId: string, data: VentaOverride) {
  const all = loadOverrides();
  all[notionId] = data;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function removeOverride(notionId: string) {
  const all = loadOverrides();
  delete all[notionId];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}
