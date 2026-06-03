"use client";

const STATUS_LABEL: Record<string, string> = {
  uploading: "Enviando vídeo…",
  pending: "Iniciando…",
  transcribing: "Transcrevendo áudio…",
  analyzing: "Analisando reação…",
};

export function LoadingWave({ status }: { status: string }) {
  const label = STATUS_LABEL[status] ?? "Processando…";

  return (
    <div className="flex flex-col items-center gap-8 py-12">
      <svg
        viewBox="0 0 200 60"
        className="h-16 w-72 text-gray-900"
        aria-hidden
      >
        <path
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        >
          <animate
            attributeName="d"
            values="
              M 0 30 Q 25 10 50 30 T 100 30 T 150 30 T 200 30;
              M 0 30 Q 25 50 50 30 T 100 30 T 150 30 T 200 30;
              M 0 30 Q 25 10 50 30 T 100 30 T 150 30 T 200 30
            "
            dur="1.5s"
            repeatCount="indefinite"
          />
        </path>
      </svg>
      <p className="text-sm tracking-wide text-gray-500">{label}</p>
    </div>
  );
}
