"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
} from "lucide-react";

// Types
type Template = {
  id: string;
  title: string;
  body: string;
};

type Category = {
  id: string;
  name: string;
  templates: Template[];
  isExpanded: boolean;
};

// Default categories and templates
const DEFAULT_CATEGORIES: Category[] = [
  {
    id: "seguimiento",
    name: "Seguimiento",
    isExpanded: true,
    templates: [
      {
        id: "seg-1",
        title: "Primer contacto post-análisis",
        body: "Hola! Te escribo porque vi que abriste el análisis que te mandé. Qué te pareció? Tenés alguna duda?",
      },
      {
        id: "seg-2",
        title: "No respondió análisis",
        body: "Hola! Cómo estás? Te quería preguntar si pudiste ver el análisis que te mandé. Cualquier duda que tengas me avisas!",
      },
      {
        id: "seg-3",
        title: "Recordatorio seña",
        body: "Hola! Te escribo para recordarte que quedó pendiente la seña para avanzar. Me confirmas así coordinamos?",
      },
    ],
  },
  {
    id: "cierre",
    name: "Cierre",
    isExpanded: false,
    templates: [
      {
        id: "cie-1",
        title: "Confirmación de seña",
        body: "Perfecto! Una vez que me confirmes la transferencia te paso toda la info para arrancar.",
      },
      {
        id: "cie-2",
        title: "Datos para transferencia",
        body: "Te paso los datos para la transferencia:\n\nAlias: [ALIAS]\nCBU: [CBU]\nTitular: [NOMBRE]\n\nUna vez que la hagas, mandame el comprobante!",
      },
    ],
  },
  {
    id: "objeciones",
    name: "Objeciones",
    isExpanded: false,
    templates: [
      {
        id: "obj-1",
        title: "Precio alto",
        body: "Entiendo que es una inversión importante. Te cuento que el retorno que vas a tener es...",
      },
      {
        id: "obj-2",
        title: "Lo tengo que pensar",
        body: "Dale, sin problema! Qué es lo que te gustaría pensar? Así te puedo ayudar con más info.",
      },
      {
        id: "obj-3",
        title: "No tengo tiempo",
        body: "Te entiendo, el tiempo es clave. Justamente este programa está diseñado para gente ocupada porque...",
      },
    ],
  },
  {
    id: "info",
    name: "Info general",
    isExpanded: false,
    templates: [
      {
        id: "inf-1",
        title: "Qué incluye el programa",
        body: "El programa incluye:\n\n✅ Acceso a la plataforma\n✅ Sesiones semanales en vivo\n✅ Grupo de soporte\n✅ Material descargable",
      },
      {
        id: "inf-2",
        title: "Duración del programa",
        body: "El programa tiene una duración de X semanas/meses. Durante ese tiempo vas a tener acceso completo a todo el material y soporte.",
      },
    ],
  },
];

const STORAGE_KEY = "david-hq-plantillas";

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export function PlantillasManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<{
    categoryId: string;
    template: Template | null;
  } | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setCategories(JSON.parse(stored));
      } catch {
        setCategories(DEFAULT_CATEGORIES);
      }
    } else {
      setCategories(DEFAULT_CATEGORIES);
    }
  }, []);

  // Save to localStorage on changes
  useEffect(() => {
    if (categories.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
    }
  }, [categories]);

  // Filter templates based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;

    const query = searchQuery.toLowerCase();
    return categories
      .map((cat) => ({
        ...cat,
        isExpanded: true,
        templates: cat.templates.filter(
          (t) =>
            t.title.toLowerCase().includes(query) ||
            t.body.toLowerCase().includes(query)
        ),
      }))
      .filter((cat) => cat.templates.length > 0);
  }, [categories, searchQuery]);

  // Copy to clipboard
  const handleCopy = async (template: Template) => {
    try {
      await navigator.clipboard.writeText(template.body);
      setCopiedId(template.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Toggle category expansion
  const toggleCategory = (categoryId: string) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === categoryId ? { ...cat, isExpanded: !cat.isExpanded } : cat
      )
    );
  };

  // Add new category
  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    const newCategory: Category = {
      id: generateId(),
      name: newCategoryName.trim(),
      templates: [],
      isExpanded: true,
    };
    setCategories((prev) => [...prev, newCategory]);
    setNewCategoryName("");
    setShowNewCategory(false);
  };

  // Delete category
  const handleDeleteCategory = (categoryId: string) => {
    if (confirm("Eliminar esta categoría y todas sus plantillas?")) {
      setCategories((prev) => prev.filter((cat) => cat.id !== categoryId));
    }
  };

  // Add/Edit template
  const handleSaveTemplate = (
    categoryId: string,
    template: { id?: string; title: string; body: string }
  ) => {
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id !== categoryId) return cat;
        if (template.id) {
          // Edit existing
          return {
            ...cat,
            templates: cat.templates.map((t) =>
              t.id === template.id
                ? { ...t, title: template.title, body: template.body }
                : t
            ),
          };
        } else {
          // Add new
          return {
            ...cat,
            templates: [
              ...cat.templates,
              { id: generateId(), title: template.title, body: template.body },
            ],
          };
        }
      })
    );
    setEditingTemplate(null);
  };

  // Delete template
  const handleDeleteTemplate = (categoryId: string, templateId: string) => {
    if (confirm("Eliminar esta plantilla?")) {
      setCategories((prev) =>
        prev.map((cat) =>
          cat.id === categoryId
            ? {
                ...cat,
                templates: cat.templates.filter((t) => t.id !== templateId),
              }
            : cat
        )
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar plantillas..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-10 py-2.5 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Categories */}
      <div className="space-y-4">
        {filteredCategories.map((category) => (
          <div
            key={category.id}
            className="bg-card border border-border rounded-lg overflow-hidden"
          >
            {/* Category header */}
            <div className="flex items-center justify-between p-3 bg-muted/30">
              <button
                onClick={() => toggleCategory(category.id)}
                className="flex items-center gap-2 text-foreground font-medium hover:text-accent transition-colors"
              >
                {category.isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                {category.name}
                <span className="text-xs text-muted-foreground">
                  ({category.templates.length})
                </span>
              </button>
              <div className="flex items-center gap-1">
                <button
                  onClick={() =>
                    setEditingTemplate({ categoryId: category.id, template: null })
                  }
                  className="p-1.5 text-muted-foreground hover:text-accent hover:bg-accent/10 rounded transition-colors"
                  title="Agregar plantilla"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteCategory(category.id)}
                  className="p-1.5 text-muted-foreground hover:text-danger hover:bg-danger/10 rounded transition-colors"
                  title="Eliminar categoría"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Templates list */}
            {category.isExpanded && (
              <div className="divide-y divide-border">
                {category.templates.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    No hay plantillas en esta categoría
                  </div>
                ) : (
                  category.templates.map((template) => (
                    <div
                      key={template.id}
                      className="p-3 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-foreground text-sm mb-1">
                            {template.title}
                          </h4>
                          <p className="text-muted-foreground text-sm whitespace-pre-wrap line-clamp-3">
                            {template.body}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleCopy(template)}
                            className={`p-2 rounded transition-colors ${
                              copiedId === template.id
                                ? "bg-success/20 text-success"
                                : "text-muted-foreground hover:text-accent hover:bg-accent/10"
                            }`}
                            title="Copiar"
                          >
                            {copiedId === template.id ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() =>
                              setEditingTemplate({
                                categoryId: category.id,
                                template,
                              })
                            }
                            className="p-2 text-muted-foreground hover:text-accent hover:bg-accent/10 rounded transition-colors"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() =>
                              handleDeleteTemplate(category.id, template.id)
                            }
                            className="p-2 text-muted-foreground hover:text-danger hover:bg-danger/10 rounded transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add new category */}
      {showNewCategory ? (
        <div className="flex items-center gap-2 p-3 bg-card border border-border rounded-lg">
          <input
            type="text"
            placeholder="Nombre de la categoría..."
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
            className="flex-1 px-3 py-2 bg-muted/50 border border-border rounded text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 text-sm"
            autoFocus
          />
          <button
            onClick={handleAddCategory}
            className="px-3 py-2 bg-accent text-accent-foreground rounded text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            Agregar
          </button>
          <button
            onClick={() => {
              setShowNewCategory(false);
              setNewCategoryName("");
            }}
            className="p-2 text-muted-foreground hover:text-foreground rounded transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowNewCategory(true)}
          className="flex items-center gap-2 px-4 py-2.5 text-muted-foreground hover:text-foreground border border-dashed border-border rounded-lg hover:border-accent/50 transition-colors w-full justify-center"
        >
          <Plus className="h-4 w-4" />
          Nueva categoría
        </button>
      )}

      {/* Edit/Add template modal */}
      {editingTemplate && (
        <TemplateModal
          template={editingTemplate.template}
          onSave={(data) => handleSaveTemplate(editingTemplate.categoryId, data)}
          onClose={() => setEditingTemplate(null)}
        />
      )}
    </div>
  );
}

// Template edit modal
function TemplateModal({
  template,
  onSave,
  onClose,
}: {
  template: Template | null;
  onSave: (data: { id?: string; title: string; body: string }) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(template?.title || "");
  const [body, setBody] = useState(template?.body || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    onSave({ id: template?.id, title: title.trim(), body: body.trim() });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-lg shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">
            {template ? "Editar plantilla" : "Nueva plantilla"}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Título
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Primer contacto"
              className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Contenido
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Escribe el texto de la plantilla..."
              rows={6}
              className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!title.trim() || !body.trim()}
              className="px-4 py-2 bg-accent text-accent-foreground rounded-lg font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {template ? "Guardar cambios" : "Crear plantilla"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
