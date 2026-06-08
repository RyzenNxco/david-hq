import {
  CalendarPlus,
  ClipboardList,
  FileText,
  Kanban,
  LayoutDashboard,
  Mic,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
};

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    description: "Resumen del mes y actividad reciente",
  },
  {
    label: "Tracker de Comisiones",
    href: "/tracker",
    icon: ClipboardList,
    description: "Ventas sincronizadas desde Notion",
  },
  {
    label: "Potenciales",
    href: "/potenciales",
    icon: Kanban,
    description: "Kanban del funnel de ventas",
  },
  {
    label: "Agendar Lead",
    href: "/agendar",
    icon: CalendarPlus,
    description: "Registrar leads desde ManyChat",
  },
  {
    label: "Plantillas",
    href: "/plantillas",
    icon: FileText,
    description: "Textos rápidos para copiar y pegar",
  },
  {
    label: "Transcripciones",
    href: "/transcripciones",
    icon: Mic,
    description: "Transcripciones vinculadas a leads",
  },
];
