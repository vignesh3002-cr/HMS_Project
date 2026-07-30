import { useState, useEffect, useRef } from "react";
import { Country, State, City } from "country-state-city";
import type { ICountry, IState, ICity } from "country-state-city";
import { Globe, MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { FormDropdown } from "@/components/ui/form-dropdown";
import type { FormDropdownOption } from "@/components/ui/form-dropdown";

interface CountryStateCitySelectProps {
  country?: string;
  state?: string;
  district?: string;
  onCountryChange: (country: string) => void;
  onCountryCodeChange?: (isoCode: string) => void;
  onStateChange: (state: string) => void;
  onDistrictChange: (district: string) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  countryPlaceholder?: string;
  statePlaceholder?: string;
  districtPlaceholder?: string;
  hideCountry?: boolean;
  fixedCountry?: string;
}

export function CountryStateCitySelect({
  country,
  state,
  district,
  onCountryChange,
  onCountryCodeChange,
  onStateChange,
  onDistrictChange,
  disabled = false,
  required = false,
  className,
  countryPlaceholder = "Select Country",
  statePlaceholder = "Select State",
  districtPlaceholder = "Select District",
  hideCountry = false,
  fixedCountry,
}: CountryStateCitySelectProps) {
  const [countries, setCountries] = useState<ICountry[]>([]);
  const [states, setStates] = useState<IState[]>([]);
  const [cities, setCities] = useState<ICity[]>([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  const prevCountryRef = useRef<string | undefined>(country);
  const prevStateRef = useRef<string | undefined>(state);

  const resolvedCountry = hideCountry ? (fixedCountry || "India") : country;

  const selectedCountry = countries.find(
    (c) =>
      c.name?.toLowerCase().trim() === resolvedCountry?.toLowerCase().trim() ||
      c.isoCode?.toLowerCase().trim() === resolvedCountry?.toLowerCase().trim(),
  );
  const selectedState = states.find(
    (s) =>
      s.name?.toLowerCase().trim() === state?.toLowerCase().trim() ||
      s.isoCode?.toLowerCase().trim() === state?.toLowerCase().trim(),
  );

  useEffect(() => {
    const allCountries = Country.getAllCountries();
    setCountries(allCountries);
  }, []);

  // Load states when country changes
  useEffect(() => {
    if (resolvedCountry) {
      const sc = countries.find(
        (c) =>
          c.name === resolvedCountry || c.isoCode === resolvedCountry,
      );

      if (sc) {
        const countryChanged = prevCountryRef.current !== resolvedCountry;
        prevCountryRef.current = resolvedCountry;

        setLoadingStates(true);
        setStates([]);
        setCities([]);

        if (countryChanged) {
          onStateChange("");
          onDistrictChange("");
        }

        setTimeout(() => {
          setStates(State.getStatesOfCountry(sc.isoCode));
          setLoadingStates(false);
        }, 100);
      }
    } else {
      prevCountryRef.current = undefined;
      setStates([]);
      setCities([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedCountry, countries]);

  // Load cities when state changes
  useEffect(() => {
    if (state && resolvedCountry) {
      const sc = countries.find(
        (c) =>
          c.name?.toLowerCase().trim() ===
            resolvedCountry?.toLowerCase().trim() ||
          c.isoCode?.toLowerCase().trim() ===
            resolvedCountry?.toLowerCase().trim(),
      );
      const ss = states.find(
        (s) =>
          s.name?.toLowerCase().trim() === state?.toLowerCase().trim() ||
          s.isoCode?.toLowerCase().trim() === state?.toLowerCase().trim(),
      );

      if (sc && ss) {
        const stateChanged = prevStateRef.current !== state;
        prevStateRef.current = state;

        setLoadingCities(true);
        setCities([]);

        if (stateChanged) {
          onDistrictChange("");
        }

        setTimeout(() => {
          setCities(City.getCitiesOfState(sc.isoCode, ss.isoCode));
          setLoadingCities(false);
        }, 100);
      }
    } else {
      prevStateRef.current = undefined;
      setCities([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, resolvedCountry, states, countries]);

  const countryOptions: FormDropdownOption[] = countries.map((c) => ({
    label: c.name,
    value: c.name,
  }));

  const stateOptions: FormDropdownOption[] = states.map((s) => ({
    label: s.name,
    value: s.name,
  }));

  const cityOptions: FormDropdownOption[] = cities.map((c) => ({
    label: c.name,
    value: c.name,
  }));

  const handleCountrySelect = (val: string) => {
    const c = countries.find((x) => x.name === val);
    if (c) {
      onCountryChange(c.name);
      onCountryCodeChange?.(c.isoCode);
      onStateChange("");
      onDistrictChange("");
    }
  };

  const handleStateSelect = (val: string) => {
    const s = states.find((x) => x.name === val);
    if (s) {
      onStateChange(s.name);
      onDistrictChange("");
    }
  };

  const handleCitySelect = (val: string) => {
    onDistrictChange(val);
  };

  const labelStyle = "block text-sm font-semibold text-gray-800 mb-1.5";

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-x-6 gap-y-6",
        hideCountry ? "md:grid-cols-2" : "md:grid-cols-3",
        className,
      )}
    >
      {/* Country */}
      {!hideCountry && (
        <div className="flex flex-col gap-0">
          <label className={labelStyle}>
            Country{" "}
            {required && <span className="text-red-600 ml-0.5">*</span>}
          </label>
          <FormDropdown
            options={countryOptions}
            value={resolvedCountry}
            onValueChange={handleCountrySelect}
            placeholder={countryPlaceholder}
            disabled={disabled}
            emptyMessage="No countries found"
            leftIcon={
              <Globe className="h-5 w-5 text-gray-400" />
            }
          />
        </div>
      )}

      {/* State */}
      <div className="flex flex-col gap-0">
        <label className={labelStyle}>
          State{" "}
          {required && <span className="text-red-600 ml-0.5">*</span>}
        </label>
        {loadingStates ? (
          <div className="flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            Loading...
          </div>
        ) : (
          <FormDropdown
            options={stateOptions}
            value={state}
            onValueChange={handleStateSelect}
            placeholder={
              !resolvedCountry ? "Select Country first" : statePlaceholder
            }
            disabled={
              disabled || !resolvedCountry || states.length === 0
            }
            emptyMessage="No states found"
            leftIcon={
              <MapPin className="h-5 w-5 text-gray-400" />
            }
          />
        )}
      </div>

      {/* City / District */}
      <div className="flex flex-col gap-0">
        <label className={labelStyle}>
          District{" "}
          {required && <span className="text-red-600 ml-0.5">*</span>}
        </label>
        {loadingCities ? (
          <div className="flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            Loading...
          </div>
        ) : (
          <FormDropdown
            options={cityOptions}
            value={district}
            onValueChange={handleCitySelect}
            placeholder={
              !state ? "Select State first" : districtPlaceholder
            }
            disabled={
              disabled || !state || !resolvedCountry || cities.length === 0
            }
            emptyMessage="No districts found"
            leftIcon={
              <MapPin className="h-5 w-5 text-gray-400" />
            }
          />
        )}
      </div>
    </div>
  );
}
