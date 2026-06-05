"use client";

import { useEffect, useState } from "react";
import type { Conversation } from "@/lib/types";
import { listConversations, deleteConversation } from "@/lib/client";

type Props = {
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  refreshKey: number;
};

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function Sidebar({ activeId, onSelect, onNew, refreshKey }: Props) {
  const [items, setItems] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listConversations()
      .then((list) => {
        if (!cancelled) setItems(list);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (!confirm("Apagar esta conversa?")) return;
    try {
      await deleteConversation(id);
      setItems((prev) => prev.filter((c) => c.id !== id));
      if (activeId === id) onNew();
    } catch {
      // ignore
    }
  }

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-gray-200 bg-gray-50">
      <div className="border-b border-gray-200 px-4 py-4">
        <h1 className="text-sm font-semibold tracking-wide text-gray-900">
          votia-gpt
        </h1>
        <p className="mt-0.5 text-[10px] uppercase tracking-widest text-gray-400">
          análise PL · 2026
        </p>
      </div>

      <button
        onClick={onNew}
        className="mx-3 mt-3 flex items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-colors hover:border-gray-900"
      >
        <span className="text-lg leading-none">+</span> Nova análise
      </button>

      <div className="mt-4 px-3 text-[10px] uppercase tracking-widest text-gray-400">
        Histórico
      </div>

      <nav className="mt-2 flex-1 overflow-y-auto px-2 pb-4">
        {loading ? (
          <div className="px-2 py-3 text-xs text-gray-400">Carregando…</div>
        ) : items.length === 0 ? (
          <div className="px-2 py-3 text-xs text-gray-400">
            Nenhuma análise ainda
          </div>
        ) : (
          <ul className="space-y-0.5">
            {items.map((c) => {
              const active = c.id === activeId;
              return (
                <li key={c.id}>
                  <button
                    onClick={() => onSelect(c.id)}
                    className={`group flex w-full items-start justify-between gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors ${
                      active
                        ? "bg-gray-200 text-gray-900"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <span className="line-clamp-2 flex-1 leading-tight">
                      {c.title?.trim() || "Sem título"}
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      <span className="text-[10px] text-gray-400">
                        {formatWhen(c.updated_at)}
                      </span>
                      <span
                        onClick={(e) => handleDelete(e, c.id)}
                        className="hidden text-gray-300 hover:text-red-500 group-hover:inline"
                        title="Apagar"
                      >
                        ×
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </nav>
    </aside>
  );
}
