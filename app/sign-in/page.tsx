"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import axios, { AxiosError } from "axios";
import { useLanguage } from "@/context/LanguageContext";
import { getSavedPhone } from "@/api/api";

const Page = () => {
  const router = useRouter();
  const { login, loading } = useAuth();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  
  // Get language context
  const { t } = useLanguage();

  // Pre-fill phone if saved
  useEffect(() => {
    const savedPhone = getSavedPhone();
    if (savedPhone) {
      setPhone(savedPhone);
    }
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate input
    if (!phone.trim()) {
      setError(t.phoneRequired || "Phone number is required");
      return;
    }

    try {
      // Pass empty string or phone as username (backend doesn't use it)
      await login(phone, phone); // Using phone as username since backend doesn't need it
    } catch (err: AxiosError | unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          setError(t.invalidCredentials || "Invalid phone number");
        } else if (err.response?.status === 404) {
          setError(t.endpointError || "Server error. Please try again.");
        } else {
          setError(err.response?.data?.message || t.error || "An error occurred");
        }
      } else {
        setError(t.error || "An unexpected error occurred");
        console.error(err);
      }
    }
  };

  return (
    <div className="h-full flex justify-center w-full">
      <div className="w-full max-w-md">
        {/* Back button at the top */}
        <button 
          type="button"
          onClick={() => router.push('/')}
          className="mb-4 text-gray-600 hover:text-gray-800 flex items-center gap-2"
        >
          <span className="text-xl">←</span>
          <span>{t.back || "Back"}</span>
        </button>
        
        <form onSubmit={handleSignIn} className="mt-8 w-full">
          <h1 className="text-2xl font-bold text-center text-gray-800">
            {t.title || "Welcome Back"}
          </h1>
          <h2 className="text-lg font-medium text-center text-gray-600 mb-6">
            {t.subtitle || "Sign in with your phone number"}
          </h2>

          {/* Phone Input Only */}
          <div className="w-full mt-4">
            <label className="text-[16px] font-medium text-gray-700">
              {t.phoneLabel || "Phone Number"}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t.phonePlaceholder || "Enter your phone number"}
              className="w-full px-4 min-h-[45px] py-2 border focus:outline-0 rounded-[5px] focus:border-blue-600 mt-1"
              required
              autoFocus
            />
            {getSavedPhone() === phone && (
              <p className="text-sm text-green-600 mt-1">
                ✓ Using saved phone number
              </p>
            )}
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 bg-gray-700 text-white py-3 rounded-lg font-semibold hover:bg-gray-800 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (t.signingIn || "Signing In...") : (t.signIn || "Sign In")}
          </button>

          <div className="mt-4 w-full">
            <p className="text-center text-[14px] font-medium">
              {t.newUser || "New user?"}{" "}
              <span
                onClick={() => router.push("/sign-up")}
                className="text-blue-600 cursor-pointer hover:underline"
              >
                {t.createAccount || "Create an account"}
              </span>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Page;