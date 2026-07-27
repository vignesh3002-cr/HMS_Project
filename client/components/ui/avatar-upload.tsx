import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Camera, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AvatarUploadProps {
  value?: string | null;
  onChange: (dataUrl: string | null) => void;
  label?: string;
  hint?: string;
  size?: number;
  className?: string;
  maxSizeMB?: number;
  readOnly?: boolean;
}

// Final photo is rendered onto a square canvas at OUTPUT_SIZE and compressed
// to JPEG before being turned into a data URL — an unresized phone photo can
// be several MB, which balloons past the server's request size limit once
// base64-encoded.
const OUTPUT_SIZE = 320;
const JPEG_QUALITY = 0.85;
const DEFAULT_MAX_SIZE_MB = 1;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const VIEWPORT = 220; // crop stage diameter, px

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read image"));
    img.src = src;
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

interface PhotoEditorProps {
  src: string;
  onCancel: () => void;
  onSave: (dataUrl: string) => void;
}

// Full-screen align/zoom stage: drag to reposition, slider to zoom,
// renders the visible circle onto a canvas on save.
function PhotoEditor({ src, onCancel, onSave }: PhotoEditorProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragState = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadImage(src).then((img) => {
      if (!cancelled) setImage(img);
    });
    return () => {
      cancelled = true;
    };
  }, [src]);

  if (!image) return null;

  const baseScale = Math.max(VIEWPORT / image.width, VIEWPORT / image.height);
  const totalScale = baseScale * zoom;
  const displayedWidth = image.width * totalScale;
  const displayedHeight = image.height * totalScale;
  const maxPanX = Math.max(0, (displayedWidth - VIEWPORT) / 2);
  const maxPanY = Math.max(0, (displayedHeight - VIEWPORT) / 2);
  const boundedPan = { x: clamp(pan.x, -maxPanX, maxPanX), y: clamp(pan.y, -maxPanY, maxPanY) };

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, panX: boundedPan.x, panY: boundedPan.y };
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setPan({
      x: clamp(dragState.current.panX + dx, -maxPanX, maxPanX),
      y: clamp(dragState.current.panY + dy, -maxPanY, maxPanY),
    });
  };

  const handlePointerUp = () => {
    dragState.current = null;
  };

  const handleSave = () => {
    const offsetX = VIEWPORT / 2 + boundedPan.x - displayedWidth / 2;
    const offsetY = VIEWPORT / 2 + boundedPan.y - displayedHeight / 2;
    const sx = -offsetX / totalScale;
    const sy = -offsetY / totalScale;
    const sSize = VIEWPORT / totalScale;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(image, sx, sy, sSize, sSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    onSave(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-800">Adjust photo</h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel"
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          className="relative mx-auto mt-4 touch-none overflow-hidden rounded-full bg-gray-100 shadow-inner"
          style={{ width: VIEWPORT, height: VIEWPORT, cursor: "grab" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <img
            src={src}
            alt="Photo preview"
            draggable={false}
            className="pointer-events-none absolute select-none"
            style={{
              width: displayedWidth,
              height: displayedHeight,
              left: "50%",
              top: "50%",
              transform: `translate(calc(-50% + ${boundedPan.x}px), calc(-50% + ${boundedPan.y}px))`,
            }}
          />
          {/* subtle ring to signal the crop boundary */}
          <div className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-black/10" />
        </div>

        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(parseFloat(e.target.value))}
          className="mt-4 w-full accent-[#00488D]"
          aria-label="Zoom"
        />

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#00488D] py-2 text-sm font-semibold text-white hover:bg-[#003a70]"
          >
            <Check className="h-4 w-4" />
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export function AvatarUpload({
  value,
  onChange,
  label = "Photo",
  hint,
  size = 72,
  className,
  maxSizeMB = DEFAULT_MAX_SIZE_MB,
  readOnly,
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingSrc, setPendingSrc] = useState<string | null>(null);

  const openPicker = () => inputRef.current?.click();

  const stageFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;

    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setError(`File must be under ${maxSizeMB}MB`);
      return;
    }
    setError(null);
    readFileAsDataUrl(file)
      .then((dataUrl) => setPendingSrc(dataUrl))
      .catch(() => setError("Couldn't read that file"));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) stageFile(file);
    e.target.value = ""; // allow re-selecting the same file later
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) stageFile(file);
  };

  return (
    <div className={cn("flex flex-col items-center text-center", className)}>
      {!readOnly && (
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      )}

      <div
        {...(!readOnly
          ? {
              onClick: openPicker,
              onKeyDown: (e: KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openPicker();
                }
              },
              onDragOver: (e: DragEvent<HTMLDivElement>) => {
                e.preventDefault();
                setIsDragging(true);
              },
              onDragLeave: () => setIsDragging(false),
              onDrop: handleDrop,
              role: "button" as const,
              tabIndex: 0,
              "aria-label": value ? "Change photo" : "Upload photo",
            }
          : {})}
        style={{ width: size, height: size }}
        className={cn(
          "relative rounded-full border-2 border-white shadow-sm overflow-visible bg-[#D6E3FF] transition-shadow",
          !readOnly && "cursor-pointer",
          !readOnly && isDragging && "ring-2 ring-[#00488D] ring-offset-2",
        )}
      >
        <div className="h-full w-full overflow-hidden rounded-full">
          {value ? (
            <img src={value} alt="Photo" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[#00488D]/70">
              <Camera className="h-1/3 w-1/3" />
            </div>
          )}
        </div>

        {!readOnly && (
          <div
            className="absolute bottom-0 right-0 flex items-center justify-center rounded-full border-2 border-white bg-[#00488D] text-white shadow-sm"
            style={{ width: size * 0.36, height: size * 0.36 }}
          >
            <Camera style={{ width: size * 0.18, height: size * 0.18 }} />
          </div>
        )}
      </div>

      {label && <p className="mt-2 text-xs font-semibold text-gray-700">{label}</p>}
      {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
      {!readOnly && <p className="text-[11px] text-gray-400">Max {maxSizeMB}MB</p>}
      {!readOnly && error && <p className="text-[11px] text-red-500">{error}</p>}

      {pendingSrc && (
        <PhotoEditor
          src={pendingSrc}
          onCancel={() => setPendingSrc(null)}
          onSave={(dataUrl) => {
            onChange(dataUrl);
            setPendingSrc(null);
          }}
        />
      )}
    </div>
  );
}