"use client";

import { useState } from "react";
import type { User } from "@/lib/types";
import { loginByPhone, signupByPhone } from "@/lib/client";
import { formatPhoneDisplay, normalizePhone } from "@/lib/phone";

type Props = {
  onClose: () => void;
  onSuccess: (u: User) => void;
};

type Tab = "login" | "signup";

export function AuthModal({ onClose, onSuccess }: Props) {
  const [tab, setTab] = useState<Tab>("login");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const phone = normalizePhone(telefone);
      const user =
        tab === "login"
          ? await loginByPhone(phone)
          : await signupByPhone(nome, phone);
      onSuccess(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setBusy(false);
    }
  }

  function onPhoneChange(v: string) {
    const normalized = normalizePhone(v);
    setTelefone(formatPhoneDisplay(normalized));
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {tab === "login" ? "Entrar" : "Criar conta"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-900"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <div className="mb-5 flex rounded-md border border-gray-200 p-0.5 text-xs">
          <button
            onClick={() => {
              setTab("login");
              setError(null);
            }}
            className={`flex-1 rounded py-1.5 transition-colors ${
              tab === "login"
                ? "bg-gray-900 text-white"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Entrar
          </button>
          <button
            onClick={() => {
              setTab("signup");
              setError(null);
            }}
            className={`flex-1 rounded py-1.5 transition-colors ${
              tab === "signup"
                ? "bg-gray-900 text-white"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Criar conta
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {tab === "signup" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Nome
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                autoFocus
                placeholder="Seu nome"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Telefone
            </label>
            <input
              type="tel"
              value={telefone}
              onChange={(e) => onPhoneChange(e.target.value)}
              required
              autoFocus={tab === "login"}
              placeholder="(11) 99999-9999"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
            />
          </div>

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-gray-900 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-40"
          >
            {busy
              ? "Aguarde…"
              : tab === "login"
              ? "Entrar"
              : "Criar conta e entrar"}
          </button>
        </form>

        <p className="mt-4 text-center text-[10px] text-gray-400">
          Acesso interno. Sem senha por enquanto.
        </p>
      </div>
    </div>
  );
}
