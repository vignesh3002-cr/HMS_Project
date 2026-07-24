import { useState, useEffect, useCallback, useRef } from "react";
import { Country, State, City } from "country-state-city";
import type { ICountry, IState, ICity } from "country-state-city";
import { Globe, MapPin, ChevronDown, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Tolerates data-entry inconsistencies like "TamilNadu" vs "Tamil Nadu" by
// comparing with whitespace stripped, in addition to the exact trimmed match.
function normalizeForMatch(value?: string | null): string {
  return (value ?? "").toLowerCase().replace(/\s+/g, "").trim();
}

interface CountryStateCitySelectProps {
  country?: string;
  state?: string;
  district?: string;
  onCountryChange: (country: string) => void;
  onStateChange: (state: string) => void;
  onDistrictChange: (district: string) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  countryPlaceholder?: string;
  statePlaceholder?: string;
  districtPlaceholder?: string;
}

export function CountryStateCitySelect({
  country,
  state,
  district,
  onCountryChange,
  onStateChange,
  onDistrictChange,
  disabled = false,
  required = false,
  className,
  countryPlaceholder = "Select Country",
  statePlaceholder = "Select State",
  districtPlaceholder = "Select District",
}: CountryStateCitySelectProps) {
  const [countries, setCountries] = useState<ICountry[]>([]);
  const [states, setStates] = useState<IState[]>([]);
  const [cities, setCities] = useState<ICity[]>([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const prevCountryRef = useRef<string | undefined>(country);
  const prevStateRef = useRef<string | undefined>(state);

  const dropdownRefs = {
    country: useRef<HTMLDivElement>(null),
    state: useRef<HTMLDivElement>(null),
    city: useRef<HTMLDivElement>(null),
  };

  // Load all countries on mount
  useEffect(() => {
    const allCountries = Country.getAllCountries();
    setCountries(allCountries);
  }, []);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!dropdownRefs.country.current?.contains(target) &&
          !dropdownRefs.state.current?.contains(target) &&
          !dropdownRefs.city.current?.contains(target)) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load states when country changes
  useEffect(() => {
    if (country) {
      const selectedCountry = countries.find(c =>
        c.name === country || c.isoCode === country
      );

      if (selectedCountry) {
        const countryChanged = prevCountryRef.current !== country;
        prevCountryRef.current = country;

        setLoadingStates(true);
        setStates([]);
        setCities([]);

        // Only clear state and district when the country actually changed
        // (not just because state/district were updated elsewhere)
        if (countryChanged) {
          onStateChange("");
          onDistrictChange("");
        }

        setTimeout(() => {
          const countryStates = State.getStatesOfCountry(selectedCountry.isoCode);
          setStates(countryStates);
          setLoadingStates(false);
        }, 100);
      }
    } else {
      prevCountryRef.current = undefined;
      setStates([]);
      setCities([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country, countries]);

  // Load cities when state changes
  useEffect(() => {
    if (state && country) {
      const selectedCountry = countries.find(c =>
        c.name?.toLowerCase().trim() === country?.toLowerCase().trim() ||
        c.isoCode?.toLowerCase().trim() === country?.toLowerCase().trim()
      );
      const selectedState = states.find(s =>
        s.name?.toLowerCase().trim() === state?.toLowerCase().trim() ||
        s.isoCode?.toLowerCase().trim() === state?.toLowerCase().trim() ||
        normalizeForMatch(s.name) === normalizeForMatch(state)
      );

      if (selectedCountry && selectedState) {
        const stateChanged = prevStateRef.current !== state;
        prevStateRef.current = state;

        setLoadingCities(true);
        setCities([]);

        // Only clear district when the state actually changed
        if (stateChanged) {
          onDistrictChange("");
        }

        setTimeout(() => {
          const stateCities = City.getCitiesOfState(
            selectedCountry.isoCode,
            selectedState.isoCode
          );
          setCities(stateCities);
          setLoadingCities(false);
        }, 100);
      }
    } else {
      prevStateRef.current = undefined;
      setCities([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, country, states, countries]);

  // Helper to find selected items - more robust matching
  const selectedCountry = countries.find(c => 
    c.name?.toLowerCase().trim() === country?.toLowerCase().trim() || 
    c.isoCode?.toLowerCase().trim() === country?.toLowerCase().trim()
  );
  const selectedState = states.find(s =>
    s.name?.toLowerCase().trim() === state?.toLowerCase().trim() ||
    s.isoCode?.toLowerCase().trim() === state?.toLowerCase().trim() ||
    normalizeForMatch(s.name) === normalizeForMatch(state)
  );
  const selectedCity = cities.find(c =>
    c.name?.toLowerCase().trim() === district?.toLowerCase().trim() ||
    normalizeForMatch(c.name) === normalizeForMatch(district)
  );

  // Handle country selection
  const handleCountryChange = (selectedCountry: ICountry) => {
    onCountryChange(selectedCountry.name);
    onStateChange("");
    onDistrictChange("");
    setOpenDropdown(null);
  };

  // Handle state selection
  const handleStateChange = (selectedState: IState) => {
    onStateChange(selectedState.name);
    onDistrictChange("");
    setOpenDropdown(null);
  };

  // Handle city selection
  const handleCityChange = (selectedCity: ICity) => {
    onDistrictChange(selectedCity.name);
    setOpenDropdown(null);
  };

  // Clear a specific field
  const clearField = (field: 'country' | 'state' | 'city') => {
    if (disabled) return;
    
    switch (field) {
      case 'country':
        onCountryChange("");
        onStateChange("");
        onDistrictChange("");
        setStates([]);
        setCities([]);
        break;
      case 'state':
        onStateChange("");
        onDistrictChange("");
        setCities([]);
        break;
      case 'city':
        onDistrictChange("");
        break;
    }
  };

  const baseInputStyle = cn(
    "w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400",
    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
    "transition-all duration-200 disabled:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60",
    "flex items-center justify-between"
  );

  const labelStyle = "block text-sm font-semibold text-gray-800 mb-1.5";

  // Render dropdown options
  const renderDropdownOptions = (
    items: any[],
    selectedValue: string | undefined,
    onSelect: (item: any) => void,
    getKey: (item: any) => string,
    getDisplay: (item: any) => string,
    isLoading: boolean
  ) => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
          <span className="ml-2 text-sm text-gray-500">Loading...</span>
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="py-8 text-center text-sm text-gray-400">
          No options available
        </div>
      );
    }

    return items.map((item) => (
      <button
        key={getKey(item)}
        type="button"
        onClick={() => onSelect(item)}
        className={cn(
          "w-full px-4 py-2.5 text-left text-sm hover:bg-blue-50 transition-colors",
          "focus:outline-none focus:bg-blue-50",
          selectedValue === getDisplay(item) && "bg-blue-50 text-blue-600 font-medium"
        )}
      >
        {getDisplay(item)}
      </button>
    ));
  };

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-6", className)}>
      {/* Country Dropdown */}
      <div className="relative" ref={dropdownRefs.country}>
        <label className={labelStyle}>
          Country {required && <span className="text-red-600 ml-0.5">*</span>}
        </label>
        <div className="relative">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          
          <button
            type="button"
            onClick={() => !disabled && setOpenDropdown(openDropdown === 'country' ? null : 'country')}
            disabled={disabled}
            className={cn(
              baseInputStyle,
              "pl-10 pr-10",
              openDropdown === 'country' && "ring-2 ring-blue-500"
            )}
            aria-haspopup="listbox"
            aria-expanded={openDropdown === 'country'}
          >
            <span className={country ? "text-gray-900 truncate" : "text-gray-400 truncate"}>
              {selectedCountry?.name || countryPlaceholder}
            </span>
            
            <div className="flex items-center gap-1 flex-shrink-0">
              {country && !disabled && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearField('country');
                  }}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Clear country"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
              <ChevronDown className={cn(
                "w-4 h-4 text-gray-400 transition-transform duration-200",
                openDropdown === 'country' && "rotate-180"
              )} />
            </div>
          </button>

          {openDropdown === 'country' && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-auto">
              {renderDropdownOptions(
                countries,
                country,
                handleCountryChange,
                (c) => c.isoCode,
                (c) => c.name,
                false
              )}
            </div>
          )}
        </div>
      </div>

      {/* State Dropdown */}
      <div className="relative" ref={dropdownRefs.state}>
        <label className={labelStyle}>
          State {required && <span className="text-red-600 ml-0.5">*</span>}
        </label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          
          <button
            type="button"
            onClick={() => {
              if (!disabled && states.length > 0 && country) {
                setOpenDropdown(openDropdown === 'state' ? null : 'state');
              }
            }}
            disabled={disabled || !country || states.length === 0}
            className={cn(
              baseInputStyle,
              "pl-10 pr-10",
              openDropdown === 'state' && "ring-2 ring-blue-500",
              (!country || states.length === 0) && "opacity-60"
            )}
            aria-haspopup="listbox"
            aria-expanded={openDropdown === 'state'}
          >
            <span className={state ? "text-gray-900 truncate" : "text-gray-400 truncate"}>
              {selectedState?.name || 
                (!country ? "Select Country first" : statePlaceholder)}
            </span>
            
            <div className="flex items-center gap-1 flex-shrink-0">
              {state && !disabled && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearField('state');
                  }}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Clear state"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
              {loadingStates ? (
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
              ) : (
                <ChevronDown className={cn(
                  "w-4 h-4 text-gray-400 transition-transform duration-200",
                  openDropdown === 'state' && "rotate-180"
                )} />
              )}
            </div>
          </button>

          {openDropdown === 'state' && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-auto">
              {renderDropdownOptions(
                states,
                state,
                handleStateChange,
                (s) => s.isoCode,
                (s) => s.name,
                loadingStates
              )}
            </div>
          )}
        </div>
      </div>

      {/* City/District Dropdown */}
      <div className="relative" ref={dropdownRefs.city}>
        <label className={labelStyle}>
          District {required && <span className="text-red-600 ml-0.5">*</span>}
        </label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          
          <button
            type="button"
            onClick={() => {
              if (!disabled && cities.length > 0 && state && country) {
                setOpenDropdown(openDropdown === 'city' ? null : 'city');
              }
            }}
            disabled={disabled || !state || !country || cities.length === 0}
            className={cn(
              baseInputStyle,
              "pl-10 pr-10",
              openDropdown === 'city' && "ring-2 ring-blue-500",
              (!state || !country || cities.length === 0) && "opacity-60"
            )}
            aria-haspopup="listbox"
            aria-expanded={openDropdown === 'city'}
          >
            <span className={district ? "text-gray-900 truncate" : "text-gray-400 truncate"}>
              {selectedCity?.name || 
                (!state ? "Select State first" : districtPlaceholder)}
            </span>
            
            <div className="flex items-center gap-1 flex-shrink-0">
              {district && !disabled && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearField('city');
                  }}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Clear district"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
              {loadingCities ? (
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
              ) : (
                <ChevronDown className={cn(
                  "w-4 h-4 text-gray-400 transition-transform duration-200",
                  openDropdown === 'city' && "rotate-180"
                )} />
              )}
            </div>
          </button>

          {openDropdown === 'city' && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-auto">
              {renderDropdownOptions(
                cities,
                district,
                handleCityChange,
                (c) => c.name,
                (c) => c.name,
                loadingCities
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}