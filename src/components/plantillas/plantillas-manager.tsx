"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Copy,
  Check,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  Download,
  RefreshCw,
  Image as ImageIcon,
  Upload,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Papa from "papaparse";

// Plantilla type matching Supabase table
type Plantilla = {
  id: string;
  nombre: string;
  texto: string;
  tipo_mensaje: string | null;
  envios: number | null;
  respuestas: number | null;
  tasa_respuesta: number | null;
  etapa: string | null;
  area: string | null;
  etapa_embudo: string | null;
  tiene_foto: boolean;
  url_imagen: string | null;
  tiene_video: boolean;
  url_video: string | null;
  activa: boolean;
  created_at: string;
  updated_at: string;
};

// --- Agrupado por area + etapa del embudo ---
const AREA_ORDER = ["COMERCIAL", "SISTEMA"];

const ETAPA_ORDER: Record<string, string[]> = {
  COMERCIAL: ["analisis", "pitch", "precio", "sena", "reactivacion", "general"],
  SISTEMA: ["sistema", "otros"],
};

const AREA_LABELS: Record<string, string> = {
  COMERCIAL: "COMERCIAL",
  SISTEMA: "SISTEMA",
};

const ETAPA_LABELS: Record<string, string> = {
  analisis: "Análisis",
  pitch: "Pitch",
  precio: "Precio",
  sena: "Seña",
  reactivacion: "Reactivación",
  general: "General",
  sistema: "Sistema",
  otros: "Otros",
};

const ETAPA_COLORS: Record<string, string> = {
  analisis: "#60a5fa",
  pitch: "#a78bfa",
  precio: "#4ade80",
  sena: "#fbbf24",
  reactivacion: "#f97316",
  general: "#94a3b8",
  sistema: "#e2e8f0",
  otros: "#94a3b8",
};

// Segundo nivel de filtros (solo COMERCIAL)
const COMERCIAL_ETAPAS = ETAPA_ORDER.COMERCIAL;

type SortBy = "etapa" | "nombre" | "reciente";

const areaRank = (area: string) => {
  const i = AREA_ORDER.indexOf(area);
  return i === -1 ? AREA_ORDER.length : i;
};

const etapaRank = (area: string, etapa: string) => {
  const order = ETAPA_ORDER[area] || [];
  const i = order.indexOf(etapa);
  return i === -1 ? order.length : i;
};

const etapaLabel = (etapa: string) =>
  etapa === "—" ? "Sin etapa" : ETAPA_LABELS[etapa] || etapa;

// CSV row type
type CSVRow = {
  Nombre: string;
  Texto: string;
  Tipo_Mensaje?: string;
  Envios?: string;
  Respuestas?: string;
  Tasa?: string;
  Etapa?: string;
  Tiene_Foto?: string;
  URL_Imagen?: string;
};

const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTjn8PTQFjIfe5IHlhrMEna4QuSs4gTv79v60RN9AKEfHqthGAoZQw3WySqOVUeIY_Fx62ikEH5Sbht/pub?gid=405383393&single=true&output=csv";

export function PlantillasManager() {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingPlantilla, setEditingPlantilla] = useState<Plantilla | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [selectedEtapaEmbudo, setSelectedEtapaEmbudo] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>("etapa");
  const [showConFoto, setShowConFoto] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const supabase = createClient();

  // Load plantillas from Supabase
  const loadPlantillas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("plantillas")
        .select("*")
        .eq("activa", true)
        .order("area", { ascending: true })
        .order("etapa_embudo", { ascending: true })
        .order("nombre", { ascending: true });

      if (fetchError) throw fetchError;
      setPlantillas(data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar plantillas");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadPlantillas();
  }, [loadPlantillas]);

  // Get unique etapas for filter chips
  const etapas = useMemo(() => {
    const unique = new Set(plantillas.map((p) => p.etapa).filter(Boolean));
    return Array.from(unique).sort() as string[];
  }, [plantillas]);

  // Filter plantillas based on search, area, etapa_embudo, and foto
  const filteredPlantillas = useMemo(() => {
    let filtered = plantillas;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.nombre.toLowerCase().includes(query) ||
          p.texto.toLowerCase().includes(query)
      );
    }

    // Area filter
    if (selectedArea) {
      filtered = filtered.filter(
        (p) => (p.area || "").toUpperCase() === selectedArea
      );
    }

    // Etapa del embudo filter (solo aplica dentro de COMERCIAL)
    if (selectedArea === "COMERCIAL" && selectedEtapaEmbudo) {
      filtered = filtered.filter((p) => p.etapa_embudo === selectedEtapaEmbudo);
    }

    // Con foto filter
    if (showConFoto) {
      filtered = filtered.filter((p) => p.tiene_foto && p.url_imagen);
    }

    return filtered;
  }, [plantillas, searchQuery, selectedArea, selectedEtapaEmbudo, showConFoto]);

  // Agrupado por area -> etapa_embudo -> nombre (para orden "etapa")
  const groupedPlantillas = useMemo(() => {
    const map = new Map<string, Map<string, Plantilla[]>>();
    for (const p of filteredPlantillas) {
      const area = (p.area || "—").toUpperCase();
      const etapa = p.etapa_embudo || "—";
      if (!map.has(area)) map.set(area, new Map());
      const etapaMap = map.get(area)!;
      if (!etapaMap.has(etapa)) etapaMap.set(etapa, []);
      etapaMap.get(etapa)!.push(p);
    }

    const groups: { area: string; etapa: string; items: Plantilla[] }[] = [];
    const areas = Array.from(map.keys()).sort(
      (a, b) => areaRank(a) - areaRank(b) || a.localeCompare(b)
    );
    for (const area of areas) {
      const etapaMap = map.get(area)!;
      const etapas = Array.from(etapaMap.keys()).sort(
        (a, b) => etapaRank(area, a) - etapaRank(area, b) || a.localeCompare(b)
      );
      for (const etapa of etapas) {
        const items = etapaMap
          .get(etapa)!
          .slice()
          .sort((a, b) => a.nombre.localeCompare(b.nombre));
        groups.push({ area, etapa, items });
      }
    }
    return groups;
  }, [filteredPlantillas]);

  // Lista plana ordenada (para orden "nombre" o "reciente")
  const flatSortedPlantillas = useMemo(() => {
    const arr = filteredPlantillas.slice();
    if (sortBy === "nombre") {
      arr.sort((a, b) => a.nombre.localeCompare(b.nombre));
    } else if (sortBy === "reciente") {
      arr.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
    }
    return arr;
  }, [filteredPlantillas, sortBy]);

  // Copy text to clipboard
  const handleCopy = async (plantilla: Plantilla) => {
    try {
      await navigator.clipboard.writeText(plantilla.texto);
      setCopiedId(plantilla.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Delete plantilla (soft delete - set activa = false)
  const handleDelete = async (id: string) => {
    if (!confirm("Eliminar esta plantilla?")) return;

    try {
      const { error: deleteError } = await supabase
        .from("plantillas")
        .update({ activa: false })
        .eq("id", id);

      if (deleteError) throw deleteError;
      setPlantillas((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al eliminar");
    }
  };

  // Import from Google Sheet CSV
  const handleImport = async () => {
    setImporting(true);
    setImportMessage(null);
    setError(null);

    try {
      // Fetch CSV
      const response = await fetch(CSV_URL);
      if (!response.ok) throw new Error("Error al descargar el CSV");

      const csvText = await response.text();

      // Parse CSV with papaparse
      const parsed = Papa.parse<CSVRow>(csvText, {
        header: true,
        skipEmptyLines: true,
      });

      if (parsed.errors.length > 0) {
        console.error("CSV parse errors:", parsed.errors);
      }

      const rows = parsed.data;
      let imported = 0;

      for (const row of rows) {
        if (!row.Nombre || !row.Texto) continue;

        // Parse tasa (remove % if present)
        let tasaValue: number | null = null;
        if (row.Tasa) {
          const tasaStr = row.Tasa.replace("%", "").trim();
          const parsedTasa = parseFloat(tasaStr);
          if (!isNaN(parsedTasa)) tasaValue = parsedTasa;
        }

        // Parse tiene_foto
        const tieneFoto =
          row.Tiene_Foto?.toLowerCase() === "sí" ||
          row.Tiene_Foto?.toLowerCase() === "si" ||
          row.Tiene_Foto?.toLowerCase() === "yes" ||
          row.Tiene_Foto === "1" ||
          row.Tiene_Foto?.toLowerCase() === "true";

        // Build upsert object
        const plantillaData: Partial<Plantilla> = {
          nombre: row.Nombre.trim(),
          texto: row.Texto.trim(),
          tipo_mensaje: row.Tipo_Mensaje?.trim() || null,
          envios: row.Envios ? parseInt(row.Envios, 10) || null : null,
          respuestas: row.Respuestas ? parseInt(row.Respuestas, 10) || null : null,
          tasa_respuesta: tasaValue,
          etapa: row.Etapa?.trim() || null,
          tiene_foto: tieneFoto,
          activa: true,
        };

        // Only set url_imagen if it has a value
        if (row.URL_Imagen?.trim()) {
          plantillaData.url_imagen = row.URL_Imagen.trim();
        }

        // Upsert by nombre
        const { error: upsertError } = await supabase.from("plantillas").upsert(
          plantillaData,
          {
            onConflict: "nombre",
            ignoreDuplicates: false,
          }
        );

        if (upsertError) {
          console.error("Upsert error for", row.Nombre, upsertError);
        } else {
          imported++;
        }
      }

      setImportMessage(`Importadas ${imported} plantillas`);
      await loadPlantillas();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al importar");
    } finally {
      setImporting(false);
    }
  };

  // Format tasa as percentage
  const formatTasa = (tasa: number | null) => {
    if (tasa === null) return null;
    return `${tasa.toFixed(1)}%`;
  };

  // Render a single plantilla card
  const renderCard = (plantilla: Plantilla) => {
    const etapaColor = plantilla.etapa_embudo
      ? ETAPA_COLORS[plantilla.etapa_embudo]
      : undefined;
    return (
      <div
        key={plantilla.id}
        className="bg-surface border border-border rounded-xl overflow-hidden hover:border-accent/50 transition-colors flex flex-col"
      >
        {/* Image thumbnail */}
        {plantilla.tiene_foto && plantilla.url_imagen && (
          <div className="relative aspect-video bg-surface-2">
            <img
              src={plantilla.url_imagen}
              alt={plantilla.nombre}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        )}

        {/* Content */}
        <div className="p-4 flex-1 flex flex-col">
          {/* Title */}
          <h3 className="font-semibold text-foreground text-sm mb-2 line-clamp-1">
            {plantilla.nombre}
          </h3>

          {/* Text preview */}
          <p className="text-muted text-sm line-clamp-3 mb-3 flex-1">
            {plantilla.texto}
          </p>

          {/* Badges row */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {/* Area badge */}
            {plantilla.area && (
              <span className="px-2 py-0.5 bg-surface-2 text-muted text-xs rounded-full font-medium border border-border">
                {AREA_LABELS[plantilla.area.toUpperCase()] || plantilla.area}
              </span>
            )}

            {/* Etapa del embudo badge */}
            {plantilla.etapa_embudo && (
              <span
                className="px-2 py-0.5 text-xs rounded-full font-medium"
                style={{
                  color: etapaColor,
                  backgroundColor: etapaColor ? `${etapaColor}22` : undefined,
                }}
              >
                {etapaLabel(plantilla.etapa_embudo)}
              </span>
            )}

            {/* Metrics badges */}
            {plantilla.envios !== null && plantilla.envios > 0 && (
              <span className="px-2 py-0.5 bg-surface-2 text-muted text-xs rounded-full">
                {plantilla.envios} env
              </span>
            )}
            {plantilla.respuestas !== null && plantilla.respuestas > 0 && (
              <span className="px-2 py-0.5 bg-surface-2 text-muted text-xs rounded-full">
                {plantilla.respuestas} resp
              </span>
            )}
            {plantilla.tasa_respuesta !== null && (
              <span className="px-2 py-0.5 bg-success/20 text-success text-xs rounded-full font-medium">
                {formatTasa(plantilla.tasa_respuesta)}
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 pt-2 border-t border-border">
            <button
              onClick={() => handleCopy(plantilla)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                copiedId === plantilla.id
                  ? "bg-success/20 text-success"
                  : "bg-surface-2 text-muted hover:text-foreground hover:bg-accent/10"
              }`}
            >
              {copiedId === plantilla.id ? (
                <>
                  <Check className="h-4 w-4" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copiar
                </>
              )}
            </button>
            <button
              onClick={() => setEditingPlantilla(plantilla)}
              className="p-2 text-muted hover:text-accent hover:bg-accent/10 rounded-lg transition-colors"
              title="Editar"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDelete(plantilla.id)}
              className="p-2 text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
              title="Eliminar"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <p className="text-center text-sm text-muted py-12">
        Cargando plantillas...
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with search and actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Search bar */}
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            type="text"
            placeholder="Buscar por nombre o texto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-surface border border-border rounded-lg text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadPlantillas}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted hover:text-foreground transition-colors"
          >
            <RefreshCw className="h-4 w-4" /> Actualizar
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={importing}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted hover:text-foreground disabled:opacity-50 transition-colors"
          >
            <Download className="h-4 w-4" />
            {importing ? "Importando..." : "Importar desde Sheet"}
          </button>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> Nueva
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="space-y-3">
        {/* Nivel 1: Area + orden */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Area tabs */}
          {[
            { value: null, label: "Todas" },
            { value: "COMERCIAL", label: "COMERCIAL" },
            { value: "SISTEMA", label: "SISTEMA" },
          ].map((tab) => (
            <button
              key={tab.label}
              onClick={() => {
                setSelectedArea(tab.value);
                setSelectedEtapaEmbudo(null);
              }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedArea === tab.value
                  ? "bg-accent text-accent-foreground"
                  : "bg-surface-2 text-muted hover:text-foreground border border-border"
              }`}
            >
              {tab.label}
            </button>
          ))}

          {/* Con foto chip */}
          <button
            onClick={() => setShowConFoto(!showConFoto)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
              showConFoto
                ? "bg-violet text-white"
                : "bg-surface-2 text-muted hover:text-foreground border border-border"
            }`}
          >
            <ImageIcon className="h-3.5 w-3.5" />
            Con foto
          </button>

          {/* Ordenar por */}
          <div className="ml-auto flex items-center gap-2">
            <label className="text-xs text-muted">Ordenar por:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="px-2.5 py-1.5 bg-surface-2 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
            >
              <option value="etapa">Etapa</option>
              <option value="nombre">Nombre A-Z</option>
              <option value="reciente">Más recientes</option>
            </select>
          </div>
        </div>

        {/* Nivel 2: Etapa del embudo (solo COMERCIAL) */}
        {selectedArea === "COMERCIAL" && (
          <div className="flex flex-wrap gap-2 pl-1">
            <button
              onClick={() => setSelectedEtapaEmbudo(null)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedEtapaEmbudo === null
                  ? "bg-accent text-accent-foreground"
                  : "bg-surface-2 text-muted hover:text-foreground border border-border"
              }`}
            >
              Todas
            </button>
            {COMERCIAL_ETAPAS.map((etapa) => (
              <button
                key={etapa}
                onClick={() =>
                  setSelectedEtapaEmbudo(
                    selectedEtapaEmbudo === etapa ? null : etapa
                  )
                }
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedEtapaEmbudo === etapa
                    ? "bg-accent text-accent-foreground"
                    : "bg-surface-2 text-muted hover:text-foreground border border-border"
                }`}
              >
                {ETAPA_LABELS[etapa]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
          <p className="mt-2 text-xs text-muted">
            Verificá que la tabla <code className="text-foreground">plantillas</code>{" "}
            exista en Supabase y que RLS permita lectura/escritura con la anon key.
          </p>
        </div>
      )}

      {/* Import success message */}
      {importMessage && (
        <div className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          {importMessage}
        </div>
      )}

      {/* Cards grid */}
      {filteredPlantillas.length === 0 ? (
        <div className="text-center py-12 text-muted">
          {searchQuery || selectedArea || selectedEtapaEmbudo || showConFoto
            ? "No hay plantillas que coincidan con los filtros"
            : "No hay plantillas. Importá desde Google Sheet o creá una nueva."}
        </div>
      ) : sortBy === "etapa" ? (
        // Agrupado por area -> etapa con separadores
        <div className="space-y-8">
          {groupedPlantillas.map((group) => (
            <div key={`${group.area}-${group.etapa}`}>
              <SectionHeader
                area={group.area}
                etapa={group.etapa}
                count={group.items.length}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {group.items.map((plantilla) => renderCard(plantilla))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Lista plana ordenada
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {flatSortedPlantillas.map((plantilla) => renderCard(plantilla))}
        </div>
      )}

      {/* Count */}
      {filteredPlantillas.length > 0 && (
        <p className="text-xs text-muted text-center">
          Mostrando {filteredPlantillas.length} de {plantillas.length} plantillas
        </p>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingPlantilla) && (
        <PlantillaModal
          plantilla={editingPlantilla}
          etapas={etapas}
          onSave={async () => {
            setShowCreateModal(false);
            setEditingPlantilla(null);
            await loadPlantillas();
          }}
          onClose={() => {
            setShowCreateModal(false);
            setEditingPlantilla(null);
          }}
        />
      )}
    </div>
  );
}

// Section header / separator for area + etapa groups
function SectionHeader({
  area,
  etapa,
  count,
}: {
  area: string;
  etapa: string;
  count: number;
}) {
  const areaLabel = AREA_LABELS[area] || (area === "—" ? "Sin área" : area);
  return (
    <div
      className="flex items-center gap-3 mb-4 px-3 py-1.5 rounded-lg"
      style={{ backgroundColor: "#0d0e1a" }}
    >
      <div className="h-px flex-1" style={{ backgroundColor: "#a78bfa33" }} />
      <span
        className="text-xs font-medium tracking-wide whitespace-nowrap"
        style={{ color: "#a78bfa" }}
      >
        {areaLabel} · {etapaLabel(etapa)} ({count})
      </span>
      <div className="h-px flex-1" style={{ backgroundColor: "#a78bfa33" }} />
    </div>
  );
}

// Plantilla create/edit modal
function PlantillaModal({
  plantilla,
  etapas,
  onSave,
  onClose,
}: {
  plantilla: Plantilla | null;
  etapas: string[];
  onSave: () => void;
  onClose: () => void;
}) {
  const [nombre, setNombre] = useState(plantilla?.nombre || "");
  const [texto, setTexto] = useState(plantilla?.texto || "");
  const [etapa, setEtapa] = useState(plantilla?.etapa || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(plantilla?.url_imagen || null);
  const [newEtapa, setNewEtapa] = useState("");

  const supabase = createClient();

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      // Generate unique filename
      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("plantillas")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("plantillas")
        .getPublicUrl(fileName);

      setImageUrl(urlData.publicUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir imagen");
    } finally {
      setUploading(false);
    }
  };

  // Handle save
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !texto.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const finalEtapa = newEtapa.trim() || etapa || null;

      const plantillaData = {
        nombre: nombre.trim(),
        texto: texto.trim(),
        etapa: finalEtapa,
        tiene_foto: !!imageUrl,
        url_imagen: imageUrl,
        activa: true,
      };

      if (plantilla) {
        // Update
        const { error: updateError } = await supabase
          .from("plantillas")
          .update(plantillaData)
          .eq("id", plantilla.id);

        if (updateError) throw updateError;
      } else {
        // Insert
        const { error: insertError } = await supabase
          .from("plantillas")
          .insert(plantillaData);

        if (insertError) throw insertError;
      }

      onSave();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-border rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-surface">
          <h3 className="font-semibold text-foreground">
            {plantilla ? "Editar plantilla" : "Nueva plantilla"}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-muted hover:text-foreground rounded transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Error */}
          {error && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}

          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Título *
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Primer contacto"
              className="w-full px-3 py-2 bg-surface-2 border border-border rounded-lg text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
              autoFocus
            />
          </div>

          {/* Texto */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Contenido *
            </label>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Escribe el texto de la plantilla..."
              rows={6}
              className="w-full px-3 py-2 bg-surface-2 border border-border rounded-lg text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
            />
          </div>

          {/* Etapa */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Etapa
            </label>
            <select
              value={etapa}
              onChange={(e) => setEtapa(e.target.value)}
              className="w-full px-3 py-2 bg-surface-2 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
            >
              <option value="">Sin etapa</option>
              {etapas.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
            <div className="mt-2">
              <input
                type="text"
                value={newEtapa}
                onChange={(e) => setNewEtapa(e.target.value)}
                placeholder="O escribí una nueva etapa..."
                className="w-full px-3 py-2 bg-surface-2 border border-border rounded-lg text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 text-sm"
              />
            </div>
          </div>

          {/* Image upload */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Foto
            </label>

            {imageUrl && (
              <div className="relative mb-2 rounded-lg overflow-hidden border border-border">
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="w-full h-32 object-cover"
                />
                <button
                  type="button"
                  onClick={() => setImageUrl(null)}
                  className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <label className="flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-border rounded-lg cursor-pointer hover:border-accent/50 transition-colors">
              <Upload className="h-4 w-4 text-muted" />
              <span className="text-sm text-muted">
                {uploading
                  ? "Subiendo..."
                  : imageUrl
                  ? "Cambiar imagen"
                  : "Subir imagen"}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-muted hover:text-foreground border border-border rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!nombre.trim() || !texto.trim() || saving}
              className="px-4 py-2 bg-accent text-accent-foreground rounded-lg font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving
                ? "Guardando..."
                : plantilla
                ? "Guardar cambios"
                : "Crear plantilla"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
