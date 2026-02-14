"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

type ShellUIState = {
  sidebarOpen: boolean;
  modulePanelOpen: boolean;
  searchOpen: boolean;
};

type ShellUIActions = {
  setSidebarOpen: (open: boolean) => void;
  setModulePanelOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  openModulePanel: () => void;
  closeModulePanel: () => void;
  openSearch: () => void;
  closeSearch: () => void;
  toggleSearch: () => void;
};

const ShellUIContext = createContext<(ShellUIState & ShellUIActions) | null>(
  null
);

export function ShellUIProvider({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modulePanelOpen, setModulePanelOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const openModulePanel = useCallback(() => setModulePanelOpen(true), []);
  const closeModulePanel = useCallback(() => setModulePanelOpen(false), []);
  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const toggleSearch = useCallback(
    () => setSearchOpen((prev) => !prev),
    []
  );

  const value: ShellUIState & ShellUIActions = {
    sidebarOpen,
    modulePanelOpen,
    searchOpen,
    setSidebarOpen,
    setModulePanelOpen,
    setSearchOpen,
    openSidebar,
    closeSidebar,
    openModulePanel,
    closeModulePanel,
    openSearch,
    closeSearch,
    toggleSearch,
  };

  return (
    <ShellUIContext.Provider value={value}>{children}</ShellUIContext.Provider>
  );
}

export function useShellUI() {
  const ctx = useContext(ShellUIContext);
  if (!ctx) {
    throw new Error("useShellUI must be used within ShellUIProvider");
  }
  return ctx;
}
