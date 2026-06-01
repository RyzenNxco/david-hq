"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2, Check } from "lucide-react";

type Task = {
  id: string;
  text: string;
  done: boolean;
};

const DEFAULT_TASKS: Omit<Task, "id">[] = [
  { text: "Rastrillaje: sacar el maximo de ventas hoy", done: false },
  { text: "Seguimiento analisis de perfil (vieron y no respondieron)", done: false },
  { text: "Claude-in-Chrome: relevar chats por etiqueta (pendiente, largo plazo)", done: false },
  { text: "Revisar senas / urgentes", done: false },
];

const STORAGE_KEY = "checklist-hoy-tasks";

function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

function loadTasks(): Task[] {
  if (typeof window === "undefined") return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Invalid JSON, use defaults
  }
  
  // Return default tasks with IDs
  return DEFAULT_TASKS.map((t) => ({ ...t, id: generateId() }));
}

function saveTasks(tasks: Task[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

export function ChecklistHoy() {
  const [isOpen, setIsOpen] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTasks(loadTasks());
    setMounted(true);
  }, []);

  const updateTasks = useCallback((updater: (prev: Task[]) => Task[]) => {
    setTasks((prev) => {
      const next = updater(prev);
      saveTasks(next);
      return next;
    });
  }, []);

  const toggleTask = (id: string) => {
    updateTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  const deleteTask = (id: string) => {
    updateTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const addTask = () => {
    const text = newTask.trim();
    if (!text) return;
    updateTasks((prev) => [...prev, { id: generateId(), text, done: false }]);
    setNewTask("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTask();
    }
  };

  const completedCount = tasks.filter((t) => t.done).length;
  const totalCount = tasks.length;

  if (!mounted) {
    return (
      <div className="rounded-xl border border-border bg-surface/50 p-4">
        <p className="text-sm text-muted">Cargando checklist...</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface/50 overflow-hidden">
      {/* Header - Collapsible */}
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-surface-2/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-muted" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted" />
          )}
          <span className="font-semibold">Checklist de hoy</span>
        </div>
        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">
          {completedCount}/{totalCount}
        </span>
      </button>

      {/* Content */}
      {isOpen ? (
        <div className="border-t border-border px-4 py-3 space-y-2">
          {/* Task List */}
          {tasks.map((task) => (
            <div
              key={task.id}
              className="group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-surface-2/30 transition-colors"
            >
              <button
                type="button"
                onClick={() => toggleTask(task.id)}
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all ${
                  task.done
                    ? "bg-success/20 border-success/50 text-success"
                    : "border-border hover:border-muted"
                }`}
              >
                {task.done ? <Check className="h-3 w-3" /> : null}
              </button>
              <span
                className={`flex-1 text-sm transition-all ${
                  task.done ? "text-muted line-through" : "text-foreground"
                }`}
              >
                {task.text}
              </span>
              <button
                type="button"
                onClick={() => deleteTask(task.id)}
                className="opacity-0 group-hover:opacity-100 text-muted hover:text-danger transition-all"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          {/* Add New Task */}
          <div className="flex items-center gap-2 pt-2 border-t border-border/50">
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Agregar tarea..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted/50 outline-none"
            />
            <button
              type="button"
              onClick={addTask}
              disabled={!newTask.trim()}
              className="flex items-center gap-1 rounded-md bg-accent/20 border border-accent/30 px-2 py-1 text-xs font-medium text-accent hover:bg-accent/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="h-3 w-3" />
              Agregar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
