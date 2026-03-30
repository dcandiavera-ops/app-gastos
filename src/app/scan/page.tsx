'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, LoaderCircle, ReceiptText, Save, Upload, X } from 'lucide-react';
import { DEFAULT_EXPENSE_CATEGORIES } from '@/lib/category-defaults';

type ScannedReceipt = {
  merchant: string;
  amount: number | null;
  date: string | null;
  description: string;
  confidence: 'high' | 'medium' | 'low';
  rawText: string;
  suggestedCategory: {
    name: string;
    color: string;
    confidence: 'high' | 'medium' | 'low';
  } | null;
};

type CategoryOption = {
  id?: string;
  name: string;
  color: string;
};

const OCR_MAX_FILE_SIZE_BYTES = 1024 * 1024;
const MIN_COMPRESSED_DIMENSION = 1400;

async function loadImageElement(file: File) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('No se pudo abrir la imagen'));
      img.src = objectUrl;
    });

    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function canvasToFile(canvas: HTMLCanvasElement, quality: number, fileName: string) {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', quality);
  });

  if (!blob) {
    throw new Error('No se pudo comprimir la imagen');
  }

  return new File([blob], fileName.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
}

async function optimizeReceiptImage(file: File) {
  if (file.size <= OCR_MAX_FILE_SIZE_BYTES) {
    return file;
  }

  const image = await loadImageElement(file);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('No se pudo preparar la compresion de la imagen');
  }

  const longestSide = Math.max(image.width, image.height);
  const scale = longestSide > 2200 ? 2200 / longestSide : 1;
  let width = Math.max(1, Math.round(image.width * scale));
  let height = Math.max(1, Math.round(image.height * scale));
  let quality = 0.9;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    canvas.width = width;
    canvas.height = height;
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    const compressedFile = await canvasToFile(canvas, quality, file.name);
    if (compressedFile.size <= OCR_MAX_FILE_SIZE_BYTES) {
      return compressedFile;
    }

    quality -= 0.12;

    if (quality < 0.5) {
      quality = 0.82;
      width = Math.max(MIN_COMPRESSED_DIMENSION, Math.round(width * 0.82));
      height = Math.max(MIN_COMPRESSED_DIMENSION, Math.round(height * 0.82));
    }
  }

  return null;
}

export default function Scanner() {
  const router = useRouter();
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [receipt, setReceipt] = useState<ScannedReceipt | null>(null);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    const loadCategories = async () => {
      try {
        const response = await fetch('/api/categories');
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as CategoryOption[];
        if (!ignore) {
          setCategories(payload.length > 0 ? payload : DEFAULT_EXPENSE_CATEGORIES);
        }
      } catch (loadError) {
        console.error(loadError);
        if (!ignore) {
          setCategories(DEFAULT_EXPENSE_CATEGORIES);
        }
      }
    };

    loadCategories();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

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

  useEffect(() => {
    if (!receipt) {
      setSelectedCategoryName(null);
      return;
    }

    setSelectedCategoryName(receipt.suggestedCategory?.name ?? null);
  }, [receipt]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setError('');
    setReceipt(null);

    try {
      const optimizedFile = await optimizeReceiptImage(file);

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      setPreviewUrl(URL.createObjectURL(optimizedFile ?? file));

      if (!optimizedFile) {
        setError('La imagen sigue superando 1 MB incluso despues de comprimirla. Sube una foto mas liviana o recortada.');
        return;
      }

      setIsScanning(true);

      const formData = new FormData();
      formData.append('file', optimizedFile);

      const response = await fetch('/api/scan-receipt', {
        method: 'POST',
        body: formData,
      });

      const payload = await response.json();
      if (!response.ok) {
        const providerMessage = payload.providerError ? ` Detalle OCR: ${payload.providerError}` : '';
        const fallbackMessage = payload.usedFallbackKey
          ? ' El servidor sigue usando la clave demo de OCR.space.'
          : '';
        setError((payload.error || 'No se pudo procesar la boleta') + providerMessage + fallbackMessage);
        return;
      }

      setReceipt(payload.receipt);
    } catch (scanError) {
      console.error(scanError);
      setError('No se pudo preparar o escanear la boleta. Intenta con otra foto mas clara.');
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
          suggestedCategoryName: selectedCategoryName ?? receipt.suggestedCategory?.name ?? null,
          suggestedCategoryColor:
            categories.find((category) => category.name === selectedCategoryName)?.color ??
            receipt.suggestedCategory?.color ??
            null,
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

  const handleCancel = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl('');
    setReceipt(null);
    setError('');
  };

  return (
    <main className="min-h-screen w-full bg-surface relative overflow-x-hidden flex flex-col pt-24 pb-32">
      <div className="px-6 flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tighter text-on-surface">Escaner web</h1>
          <p className="text-sm text-on-surface/60 font-medium mt-1">Sube una boleta y extrae monto, fecha y comercio con OCR gratuito</p>
          <p className="text-xs text-on-surface/40 font-medium mt-2">La imagen se comprime automaticamente si supera 1 MB para que el OCR pueda procesarla.</p>
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

                <div className="mt-4 rounded-2xl bg-surface-container-highest/50 px-4 py-4 border border-outline-variant/20">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface/40 font-bold">Categoria sugerida</p>
                  {receipt.suggestedCategory ? (
                    <div className="mt-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span
                          className="h-3.5 w-3.5 rounded-full border border-white/10"
                          style={{ backgroundColor: receipt.suggestedCategory.color }}
                        />
                        <p className="text-lg font-black">{receipt.suggestedCategory.name}</p>
                      </div>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                        {receipt.suggestedCategory.confidence === 'high' ? 'Alta confianza' : 'Sugerida'}
                      </span>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-on-surface/60">No se pudo inferir una categoria automaticamente.</p>
                  )}
                </div>

                <div className="mt-4 rounded-2xl bg-surface-container-highest/50 px-4 py-4 border border-outline-variant/20">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface/40 font-bold">Categoria para guardar</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {categories.map((category) => {
                      const isSelected = selectedCategoryName === category.name;

                      return (
                        <button
                          key={category.name}
                          onClick={() => setSelectedCategoryName(category.name)}
                          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition-all ${
                            isSelected
                              ? 'border-primary/40 bg-primary/15 text-primary'
                              : 'border-outline-variant/20 bg-surface text-on-surface/70'
                          }`}
                          type="button"
                        >
                          <span
                            className="h-2.5 w-2.5 rounded-full border border-white/10"
                            style={{ backgroundColor: category.color }}
                          />
                          {category.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface/40 font-bold">Texto OCR</p>
                  <pre className="whitespace-pre-wrap text-sm text-on-surface/70 bg-surface-container-highest/40 rounded-2xl p-4 border border-outline-variant/20 max-h-64 overflow-auto">{receipt.rawText}</pre>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="w-full bg-surface-container-highest text-on-surface font-extrabold text-lg py-5 rounded-full border border-outline-variant/20 active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all flex items-center justify-center gap-3"
                >
                  <X className="h-5 w-5" />
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || receipt.amount === null}
                  className="w-full bg-primary text-surface font-extrabold text-lg py-5 rounded-full shadow-[0_12px_24px_rgba(170,255,220,0.2)] active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all flex items-center justify-center gap-3"
                >
                  {isSaving ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                  {isSaving ? 'Guardando...' : 'Guardar como gasto'}
                </button>
              </div>
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
