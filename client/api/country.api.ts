import API from "./axios";

export interface Country {
  country_id: string;
  country_name: string;
}

export const countryApi = {
  getAll: () =>
    API.get<{ success: boolean; data: Country[] }>("/countries"),
};
