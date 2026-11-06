"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { CheckCircle2, AlertCircle, ExternalLink, X, Loader2 } from "lucide-react";

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info" | "loading";
  title: string;
  description?: string;
  txHash?: string;
}

interface ToastContextType {
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, "id">) => string;
  removeToast: (id: string) => void;
  updateToast: (id: string, updates: Partial<ToastMessage>) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (toast: Omit<ToastMessage, "id">): string => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);

    if (toast.type !== "loading") {
      setTimeout(() => {
        removeToast(id);
      }, 7000);
    }
    return id;
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const updateToast = (id: string, updates: Partial<ToastMessage>) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
    if (updates.type && updates.type !== "loading") {
      setTimeout(() => {
        removeToast(id);
      }, 7000);
    }
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, updateToast }}>
      {children}
      {/* Toast Render Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-xl border shadow-lg bg-white transition-all animate-in slide-in-from-bottom-3 duration-200 ${
              toast.type === "success"
                ? "border-emerald-200 text-slate-900"
                : toast.type === "error"
                ? "border-rose-200 text-slate-900"
                : toast.type === "loading"
                ? "border-blue-200 text-slate-900"
                : "border-slate-200 text-slate-900"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {toast.type === "success" && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                )}
                {toast.type === "error" && (
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                )}
                {toast.type === "loading" && (
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                )}
                {toast.type === "info" && (
                  <CheckCircle2 className="w-5 h-5 text-slate-500" />
                )}
              </div>

              <div className="flex-1 space-y-0.5">
                <h4 className="font-semibold text-sm text-slate-900">{toast.title}</h4>
                {toast.description && (
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {toast.description}
                  </p>
                )}
                {toast.txHash && (
                  <a
                    href={`https://explorer.testnet.whitechain.io/tx/${toast.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-mono text-blue-600 hover:text-blue-800 underline mt-1"
                  >
                    View on Whitechain Explorer <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
