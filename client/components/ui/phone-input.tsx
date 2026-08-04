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

  const baseInputClasses =
    "w-full h-10 px-4 bg-white border border-gray-200 rounded-xl text-[13.5px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-[3px] focus:ring-blue-500/15 focus:border-blue-500 transition-all duration-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed";

  const errorClasses = "border-red-500 focus:border-red-500 focus:ring-red-500/15";

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
        className={cn(
          "w-full flex items-center",
          error && "focus-within:ring-2 focus-within:ring-red-500/20",
          className,
        )}
        inputClassName={cn(
          "flex-1 h-10 bg-transparent border-none outline-none text-[13.5px] text-gray-900 placeholder:text-gray-400",
          disabled && "bg-gray-50 text-gray-400 cursor-not-allowed",
        )}
        countrySelectorStyleProps={{
          className: cn(
            "flex items-center h-10 px-3 bg-white border-r border-gray-200 rounded-l-xl text-gray-900",
            disabled && "bg-gray-50 text-gray-400 cursor-not-allowed",
            error && "border-r-red-500",
          ),
          buttonClassName: "flex items-center gap-1.5",
          buttonContentWrapperClassName: "flex items-center gap-1.5",
          flagClassName: "w-5 h-3.5 rounded",
          dropdownArrowClassName: "text-gray-400",
          dropdownStyleProps: {
            className: "border border-gray-200 rounded-xl shadow-lg mt-1",
          },
        }}
        inputStyle={{
          border: "none",
          boxShadow: "none",
          backgroundColor: "transparent",
        }}
        style={{
          border: `1px solid ${error ? "#ef4444" : "#e5e7eb"}`,
          borderRadius: "0.75rem",
          backgroundColor: disabled ? "#f9fafb" : "#ffffff",
          transition: "all 200ms ease",
          boxShadow: error
            ? "0 0 0 3px rgb(239 68 68 / 0.1)"
            : "none",
        }}
      />
    </div>
  );
}