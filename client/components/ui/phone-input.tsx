import "react-international-phone/style.css";
import { PhoneInput as RPhoneInput, type CountryIso2, type ParsedCountry } from "react-international-phone";
import { type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface PhoneInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "ref"> {
  value: string;
  onChange: (value: string) => void;
  defaultCountry?: CountryIso2;
  disabled?: boolean;
  placeholder?: string;
  error?: boolean;
  label?: string;
  required?: boolean;
  optional?: boolean;
  name?: string;
}

export function PhoneInput({
  value,
  onChange,
  defaultCountry = "in",
  disabled = false,
  placeholder = "Enter phone number",
  error = false,
  label,
  required = false,
  optional = false,
  name,
  className,
  id,
  ...props
}: PhoneInputProps) {
  const handleChange = (phone: string, meta: { country: ParsedCountry; inputValue: string }) => {
    onChange(phone);
  };

  return (
    <div className="w-full">
      {(label || required || optional) && (
        <label className="block text-[12.5px] font-semibold text-gray-700 mb-1.5">
          {label}
          {required && <span className="text-red-600 ml-0.5">*</span>}
          {optional && (
            <span className="text-gray-400 text-[11px] font-normal ml-1">(optional)</span>
          )}
        </label>
      )}
      
      {/* Outer wrapper controls the border and focus ring (removed overflow-hidden) */}
      <div
        className={cn(
          "flex w-full items-center h-10 rounded-xl border bg-white transition-all duration-200",
          error
            ? "border-red-500 focus-within:ring-2 focus-within:ring-red-500/20"
            : "border-gray-200 focus-within:border-blue-500 focus-within:ring-[3px] focus-within:ring-blue-500/15",
          disabled && "bg-gray-50 cursor-not-allowed",
          className
        )}
      >
        <RPhoneInput
          value={value}
          onChange={handleChange}
          defaultCountry={defaultCountry}
          disabled={disabled}
          placeholder={placeholder}
          name={name}
          required={required}
          preferredCountries={["in", "us", "gb", "ae", "sa"]}
          inputProps={{
            id: id || name,
            ...props,
          }}
          className="w-full flex items-center border-none bg-transparent"
          style={{
            border: "none",
            boxShadow: "none",
            background: "transparent",
            height: "100%",
          }}
          inputClassName="flex-1 h-full bg-transparent border-none outline-none text-[13.5px] text-gray-900 placeholder:text-gray-400"
          inputStyle={{
            border: "none",
            boxShadow: "none",
            background: "transparent",
            height: "100%",
            paddingLeft: "4px",
          }}
          countrySelectorStyleProps={{
            className: "flex items-center h-full bg-transparent border-none",
            style: {
              border: "none",
              boxShadow: "none",
              background: "transparent",
              height: "100%",
            },
            buttonStyle: {
              border: "none",
              boxShadow: "none",
              background: "transparent",
              height: "100%",
            },
            // Added 'rounded-md' so the hover state looks clean inside the rounded box
            buttonClassName: "flex items-center gap-1.5 hover:bg-gray-100 rounded-md transition-colors h-full ml-1 px-2",
            buttonContentWrapperClassName: "flex items-center gap-1.5",
            flagClassName: "w-5 h-3.5 rounded",
            dropdownArrowClassName: "text-gray-400",
            dropdownStyleProps: {
              className: "border border-gray-200 rounded-xl shadow-lg mt-1 bg-white z-50",
            },
          }}
        />
      </div>
    </div>
  );
}