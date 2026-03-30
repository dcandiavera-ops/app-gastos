'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, LoaderCircle, ReceiptText, Save, Upload } from 'lucide-react';

type ScannedReceipt = {
  merchant: string;
  amount: number | null;
  date: string | null;
  description: string;
  confidence: 'high' | 'medium' | 'low';
  rawText: string;
};

export default function Scanner() {
  const router = useRouter();
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [receipt, setReceipt] = useState<ScannedReceipt | null>(null);

  const confidenceLabel = useMemo(() => {
    if (!receipt) {
      return '';
    }

    if (receipt.confidence === 'high') {
      return 'Lectura alta';
    }
    if (receipt.confidence === 'medium') {
      return 'Lectura media';
    }
    return 'Revision recomendada';
  }, [receipt]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setError('');
    setReceipt(null);
    setPreviewUrl(URL.createObjectURL(file));
    setIsScanning(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/scan-receipt', {
        method: 'POST',
        body: formData,
      });

      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error || 'No se pudo procesar la boleta');
        return;
      }

      setReceipt(payload.receipt);
    } catch (scanError) {
      console.error(scanError);
      setError('Fallo el escaneo de la boleta');
    } finally {
      setIsScanning(false);
      event.target.value = '';
    }
  };

  const handleSave = async () => {
    if (!receipt || receipt.amount === null) {
      setError('Confirma un monto valido antes de guardar');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: receipt.amount,
          date: receipt.date ?? new Date().toISOString(),
          description: receipt.description,
          type: 'EXPENSE',
        }),
      });

      if (!response.ok) {
        const payload = await response.json();
        setError(payload.error || 'No se pudo guardar la transaccion');
        return;
      }

      router.push('/history');
      router.refresh();
    } catch (saveError) {
      console.error(saveError);
      setError('No se pudo guardar la transaccion');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="min-h-screen w-full bg-surface relative overflow-x-hidden flex flex-col pt-24 pb-32">
      <div className="px-6 flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tighter text-on-surface">Escaner web</h1>
          <p className="text-sm text-on-surface/60 font-medium mt-1">Sube una boleta y extrae monto, fecha y comercio con OCR gratuito</p>
        </div>
      </div>

      <div className="w-full px-6 mb-8">
        <div className="relative w-full aspect-[4/3] rounded-[2rem] overflow-hidden bg-[#060e20] shadow-2xl border border-outline-variant/20">
          {previewUrl ? (
            <div
              aria-label="Vista previa de la boleta"
              className="absolute inset-0 bg-center bg-cover opacity-70"
              style={{ backgroundImage: `url("${previewUrl}")` }}
            ></div>
          ) : (
            <div className="absolute inset-0 flex flex-col gap-4 items-center justify-center">
              <Camera className="h-10 w-10 animate-pulse text-on-surface/30" />
              <p className="text-on-surface/50 font-medium tracking-widest text-xs uppercase">Carga una boleta desde el celular o navegador</p>
            </div>
          )}

          <div className="absolute inset-4 rounded-[1.5rem] border-[1px] border-white/20 flex flex-col items-center justify-end pb-6">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 border border-white/10 rounded-[1rem] flex items-center justify-center">
              <div className="w-2 h-2 bg-primary rounded-full shadow-[0_0_10px_rgba(170,255,220,1)] hover:scale-150 transition-transform cursor-crosshair"></div>
            </div>

            {isScanning ? (
              <div className="bg-surface/90 px-6 py-3 rounded-full border border-primary/50 shadow-[0_0_30px_rgba(170,255,220,0.4)] flex items-center gap-3">
                <LoaderCircle className="h-5 w-5 animate-spin text-primary" />
                <span className="font-bold tracking-widest text-[10px] uppercase text-primary">Analizando boleta...</span>
              </div>
            ) : (
              <label className="cursor-pointer">
                <input
                  className="hidden"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                />
                <span className="inline-flex items-center gap-3 px-6 py-4 bg-white/10 backdrop-blur-md rounded-full border-2 border-white/50 hover:bg-white/20 active:scale-90 transition-all shadow-lg">
                  <Upload className="h-5 w-5" />
                  Subir boleta
                </span>
              </label>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 px-6 flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-primary" />
            Resultado del escaneo
          </h2>
          <span className="text-[10px] uppercase tracking-[0.2em] text-on-surface/40 font-bold">OCR.space gratis</span>
        </div>

        <div className="bg-surface-container-lowest rounded-[2rem] border border-outline-variant/10 p-5 space-y-4">
          {error ? (
            <div className="rounded-2xl border border-error/30 bg-error/10 px-4 py-3 text-error text-sm">
              {error}
            </div>
          ) : null}

          {receipt ? (
            <>
              <div className="glass-card p-5 rounded-2xl border border-outline-variant/20">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface/40 font-bold">Comercio</p>
                    <p className="text-2xl font-black mt-2">{receipt.merchant}</p>
                  </div>
                  <div className="rounded-full bg-primary/10 border border-primary/20 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-primary font-bold">
                    {confidenceLabel}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 mt-6">
                  <div className="rounded-2xl bg-surface-container-highest/50 px-4 py-4 border border-outline-variant/20">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface/40 font-bold">Monto detectado</p>
                    <p className="text-2xl font-black mt-2">
                      {receipt.amount !== null ? `$${new Intl.NumberFormat('es-CL').format(receipt.amount)}` : 'No detectado'}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-surface-container-highest/50 px-4 py-4 border border-outline-variant/20">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface/40 font-bold">Fecha detectada</p>
                    <p className="text-2xl font-black mt-2">
                      {receipt.date ? new Date(receipt.date).toLocaleDateString('es-CL') : 'No detectada'}
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface/40 font-bold">Texto OCR</p>
                  <pre className="whitespace-pre-wrap text-sm text-on-surface/70 bg-surface-container-highest/40 rounded-2xl p-4 border border-outline-variant/20 max-h-64 overflow-auto">{receipt.rawText}</pre>
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={isSaving || receipt.amount === null}
                className="w-full bg-primary text-surface font-extrabold text-lg py-5 rounded-full shadow-[0_12px_24px_rgba(170,255,220,0.2)] active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all flex items-center justify-center gap-3"
              >
                {isSaving ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                {isSaving ? 'Guardando...' : 'Guardar como gasto'}
              </button>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-outline-variant/30 px-5 py-10 text-center">
              <p className="font-bold">Sube una foto de la boleta para extraer los datos.</p>
              <p className="text-sm text-on-surface/50 mt-2">No se guarda ninguna imagen en la app. Solo se envia al OCR para leer texto.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
