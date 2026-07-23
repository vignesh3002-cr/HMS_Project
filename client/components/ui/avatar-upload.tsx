import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { UploadCloud, UserRound } from "lucide-react";
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

// Uploaded photos are resized/compressed client-side before being turned
// into a data URL — an unresized phone photo can be several MB, which
// balloons past the server's request size limit once base64-encoded.
const MAX_DIMENSION = 480;
const JPEG_QUALITY = 0.75;
const DEFAULT_MAX_SIZE_MB = 1;

function resizeImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not read image"));
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > MAX_DIMENSION) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else if (height > MAX_DIMENSION) {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function AvatarUpload({
  value,
  onChange,
  label = "Photo",
  hint,
  size = 128,
  className,
  maxSizeMB = DEFAULT_MAX_SIZE_MB,
  readOnly,
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const readFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    
    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setError(`File size must be less than ${maxSizeMB}MB`);
      return;
    }
    setError(null);
    
    resizeImageFile(file)
      .then((dataUrl) => onChange(dataUrl))
      .catch(() => {});
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) readFile(file);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) readFile(file);
  };

  const sizeHint = `Max ${maxSizeMB}MB`;

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
              onClick: () => inputRef.current?.click(),
              onKeyDown: (e: React.KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  inputRef.current?.click();
                }
              },
              onDragOver: (e: React.DragEvent) => {
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
          "relative rounded-full border-4 border-white shadow-md overflow-hidden bg-[#D6E3FF] transition-all",
          readOnly ? "cursor-default" : "group cursor-pointer",
          !readOnly && isDragging && "ring-2 ring-[#00488D] ring-offset-2",
        )}
      >
        {value ? (
          <img
            src={value}
            alt="Patient photo"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#00488D]">
            <UserRound className="w-1/2 h-1/2" />
          </div>
        )}

        {!readOnly && (
          <div className="absolute inset-0 bg-[#00488D]/60 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <UploadCloud className="w-6 h-6 text-white" />
            <span className="text-white text-[10px] font-bold uppercase tracking-widest">
              {value ? "Change" : "Upload"}
            </span>
          </div>
        )}
      </div>

      {label && <p className="mt-3 text-sm font-bold text-gray-800">{label}</p>}
      {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
      {!readOnly && <p className="text-xs text-gray-400 mt-0.5">{sizeHint}</p>}
      {!readOnly && error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  );
}
