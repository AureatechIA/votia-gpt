"use client";

import { useState } from "react";
import type { User } from "@/lib/types";
import { AuthModal } from "./AuthModal";

type Props = {
  user: User | null;
  onLogin: (u: User) => void;
  onLogout: () => void;
};

function initial(nome: string): string {
  const parts = nome.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return (parts[0][0] + (parts[parts.length - 1][0] ?? "")).toUpperCase();
}

export function AuthButton({ user, onLogin, onLogout }: Props) {
  const [open, setOpen] = useState<"none" | "modal" | "menu">("none");

  if (!user) {
    return (
      <>
        <button
          onClick={() => setOpen("modal")}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-900 transition-colors hover:border-gray-900"
        >
          Entrar
        </button>
        {open === "modal" && (
          <AuthModal
            onClose={() => setOpen("none")}
            onSuccess={(u) => {
              onLogin(u);
              setOpen("none");
            }}
          />
        )}
      </>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(open === "menu" ? "none" : "menu")}
        className="flex items-center gap-2 rounded-full border border-gray-200 bg-white py-1 pl-1 pr-3 text-xs font-medium text-gray-900 transition-colors hover:border-gray-400"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-900 text-[10px] font-semibold text-white">
          {initial(user.nome)}
        </span>
        <span className="hidden max-w-[120px] truncate sm:inline">
          {user.nome.split(" ")[0]}
        </span>
      </button>

      {open === "menu" && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen("none")}
          />
          <div className="absolute right-0 z-20 mt-1 w-56 rounded-md border border-gray-200 bg-white shadow-lg">
            <div className="border-b border-gray-100 px-3 py-2">
              <p className="text-sm font-medium text-gray-900">{user.nome}</p>
              <p className="text-xs text-gray-500">{user.telefone}</p>
              {user.role === "admin" ? (
                <span className="mt-1 inline-block rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                  ADMIN
                </span>
              ) : null}
            </div>
            <button
              onClick={() => {
                setOpen("none");
                onLogout();
              }}
              className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              Sair
            </button>
          </div>
        </>
      )}
    </div>
  );
}
