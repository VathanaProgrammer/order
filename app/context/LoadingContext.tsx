"use client";
import React, { createContext, useContext, useState } from "react";
import { useLanguage } from "./LanguageContext";

interface LoadingContextProps {
  loading: boolean;
  setLoading: (value: boolean) => void;
}

const LoadingContext = createContext<LoadingContextProps>({
  loading: false,
  setLoading: () => {},
});

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();

  return (
    <LoadingContext.Provider value={{ loading, setLoading }}>
      {children}
      {loading && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 pointer-events-auto">
          <div className="bg-white p-6 rounded-lg flex flex-col items-center shadow-lg animate-fadeIn">
            <div className="loader mb-2"></div>
            <p className="text-gray-700 font-medium">{t.loading}</p>
          </div>
        </div>
      )}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => useContext(LoadingContext);
