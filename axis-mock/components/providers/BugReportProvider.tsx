"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface BugReportContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const BugReportContext = createContext<BugReportContextType | undefined>(undefined);

export function BugReportProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  return (
    <BugReportContext.Provider value={{ isOpen, open, close }}>
      {children}
    </BugReportContext.Provider>
  );
}

export function useBugReport() {
  const context = useContext(BugReportContext);
  if (context === undefined) {
    throw new Error("useBugReport must be used within a BugReportProvider");
  }
  return context;
}
