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
}

export function AvatarUpload({
  value,
  onChange,
  label = "Photo",
  hint,
  size = 128,
  className,
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const readFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      onChange((event.target?.result as string) ?? null);
    };
    reader.readAsDataURL(file);
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

  return (
    <div className={cn("flex flex-col items-center text-center", className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <div
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        aria-label={value ? "Change photo" : "Upload photo"}
        style={{ width: size, height: size }}
        className={cn(
          "relative group cursor-pointer rounded-full border-4 border-white shadow-md overflow-hidden bg-[#D6E3FF] transition-all",
          isDragging && "ring-2 ring-[#00488D] ring-offset-2",
        )}
      >
        {value ? (
          <img
            src={value}
            alt="Uploaded preview"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#00488D]">
            <UserRound className="w-1/2 h-1/2" />
          </div>
        )}

        <div className="absolute inset-0 bg-[#00488D]/60 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <UploadCloud className="w-6 h-6 text-white" />
          <span className="text-white text-[10px] font-bold uppercase tracking-widest">
            {value ? "Change" : "Upload"}
          </span>
        </div>
      </div>

      {label && <p className="mt-3 text-sm font-bold text-gray-800">{label}</p>}
      {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}
