import API from "./axios";

export const referralApi = {
  // Returns distinct referral_type values from the referral master table.
  getTypes: async (): Promise<string[]> => {
    const res = await API.get("/referral/types");
    return res.data?.data ?? [];
  },

  // Returns distinct referred_by + referral_contact values, and sync maps,
  // for the given referral_type. Used to populate the dependent dropdowns.
  getOptions: async (type: string): Promise<{
    referred_by: string[];
    referral_contact: string[];
    nameToContacts: Record<string, string[]>;
    contactToNames: Record<string, string[]>;
  }> => {
    const res = await API.get("/referral/options", { params: { type } });
    return res.data?.data ?? {
      referred_by: [],
      referral_contact: [],
      nameToContacts: {},
      contactToNames: {},
    };
  },
};
