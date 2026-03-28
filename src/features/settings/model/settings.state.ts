import { create } from "zustand";

type SettingsState = {
  expanded: boolean;
  toggleExpanded: () => void;
};

export const useSettingsState = create<SettingsState>((set, get) => ({
  expanded: false,
  toggleExpanded: () => set({ expanded: !get().expanded }),
}));
