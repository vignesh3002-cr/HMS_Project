import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Camera, Check, Eye, Pencil, RefreshCw, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog"; // Make sure this path is correct

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

const OUTPUT_SIZE = 320;
const JPEG_QUALITY = 0.85;
const DEFAULT_MAX_SIZE_MB = 1;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const VIEWPORT = 220;

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
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
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingSrc, setPendingSrc] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);

  const openPicker = () => inputRef.current?.click();

  // Handle clicking outside to close the menu
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    // Use mousedown so it fires before the click event
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  const handleAvatarClick = () => {
    if (readOnly) return;
    if (value) {
      setMenuOpen((prev) => !prev);
    } else {
      openPicker();
    }
  };

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
    e.target.value = "";
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

      {/* Added ref={wrapperRef} here to track clicks */}
      <div
        ref={wrapperRef}
        {...(!readOnly
          ? {
              onClick: handleAvatarClick,
              onKeyDown: (e: KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleAvatarClick();
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

        {/* Context Menu Popup */}
        {!readOnly && menuOpen && (
          // Removed the invisible backdrop div, no longer needed!
          <div className="absolute right-0 top-full z-50 mt-2 w-36 rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5">
            <button
              type="button"
              onClick={() => {
                setViewOpen(true);
                setMenuOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-100"
            >
              <Eye className="h-3.5 w-3.5" /> View
            </button>
            <button
              type="button"
              onClick={() => {
                setPendingSrc(value ?? null);
                setMenuOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-100"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit Crop
            </button>
            <button
              type="button"
              onClick={() => {
                openPicker();
                setMenuOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-100"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Replace
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmRemoveOpen(true);
                setMenuOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-red-500 hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </button>
          </div>
        )}
      </div>

      {label && <p className="mt-2 text-xs font-semibold text-gray-700">{label}</p>}
      {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
      {!readOnly && <p className="text-[11px] text-gray-400">Max {maxSizeMB}MB</p>}
      {!readOnly && error && <p className="text-[11px] text-red-500">{error}</p>}

      {/* Image Viewer Modal */}
      {viewOpen && value && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setViewOpen(false)}
        >
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <img
              src={value}
              alt="Photo full view"
              className="max-h-[80vh] max-w-[80vw] rounded-lg object-contain"
            />
            <button
              type="button"
              className="absolute -top-3 -right-3 rounded-full bg-white p-1.5 text-gray-700 shadow-md hover:bg-gray-100"
              onClick={() => setViewOpen(false)}
              aria-label="Close view"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Remove Confirmation Dialog */}
      <ConfirmationDialog
        open={confirmRemoveOpen}
        type="danger"
        title="Remove Photo"
        description="Are you sure you want to remove this photo? This action cannot be undone."
        confirmText="Remove"
        onConfirm={() => {
          onChange(null);
          setConfirmRemoveOpen(false);
        }}
        onCancel={() => setConfirmRemoveOpen(false)}
      />

      {/* Photo Editor */}
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