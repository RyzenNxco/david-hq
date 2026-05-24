export type VentaCategoria = "clase" | "seguimiento";
export type VentaPago = "sena" | "payfull" | "downsell";
export type VentaProducto = "inscripcion" | "downsell";

export type CalcInput = {
  moneda: "ARS" | "USD";
  monto: number;
  cotiz: number;
  ticketUsdIn?: number;
  cat: VentaCategoria;
  pago: VentaPago;
  prod?: VentaProducto;
};

export type CalcResult = {
  cobUsd: number;
  cobArs: number;
  ticketUsd: number;
  ticketArs: number;
  netoArs: number;
  comision: number;
  pct: number;
  saldoUsd: number | null;
  saldoArs: number | null;
};

export function calcCommission(inp: CalcInput): CalcResult {
  const { moneda, monto, cotiz, ticketUsdIn, cat, pago, prod = "inscripcion" } = inp;

  let cobUsd = 0;
  let cobArs = 0;
  if (moneda === "USD") {
    cobUsd = monto;
    cobArs = cotiz > 0 ? monto * cotiz : 0;
  } else {
    cobArs = monto;
    cobUsd = cotiz > 0 ? monto / cotiz : 0;
  }

  let ticketUsd = ticketUsdIn || (prod === "downsell" ? 55 : 197);
  let ticketArs = ticketUsd && cotiz > 0 ? ticketUsd * cotiz : 0;

  if (pago === "payfull") {
    ticketUsd = cobUsd || ticketUsd;
    ticketArs = cobArs || ticketArs;
  }

  const netoArs = cobArs * 0.93;
  const pct = cat === "clase" ? 0.02 : 0.18;
  const comision = netoArs * pct;

  let saldoUsd: number | null = null;
  let saldoArs: number | null = null;
  if (pago === "sena" && ticketUsd > 0) {
    saldoUsd = Math.max(0, ticketUsd - cobUsd);
    saldoArs = cotiz > 0 ? saldoUsd * cotiz : Math.max(0, ticketArs - cobArs);
  }

  return {
    cobUsd,
    cobArs,
    ticketUsd,
    ticketArs,
    netoArs,
    comision,
    pct,
    saldoUsd,
    saldoArs,
  };
}

export function formatMoney(n: number, currency: "ARS" | "USD" = "ARS") {
  const prefix = currency === "USD" ? "U$D " : "$ ";
  return (
    prefix +
    n.toLocaleString("es-AR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
  );
}

export function pagoLabel(pago: VentaPago) {
  if (pago === "sena") return "Seña";
  if (pago === "downsell") return "Downsell";
  return "Pay Full";
}

export function catLabel(cat: VentaCategoria) {
  return cat === "clase" ? "Clase" : "Seguimiento";
}
