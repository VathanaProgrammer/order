"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import api from "@/api/api";

const OtpPage = () => {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const searchParams = useSearchParams();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  // Autofill OTP from query string
  useEffect(() => {
    const otpFromQuery = searchParams.get("otp");
    if (otpFromQuery && otpFromQuery.length === 6) {
      const otpArray = otpFromQuery.split("");
      setOtp(otpArray);

      // Autofocus last input
      inputsRef.current[5]?.focus();

      // Auto-submit after a tiny delay
      setTimeout(() => submitOtp(otpFromQuery), 300);
    } else {
      inputsRef.current[0]?.focus();
    }
  }, [searchParams]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // only digits allowed
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Focus next input if value is entered
    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }

    // Auto-submit if all filled
    if (newOtp.every((d) => d.length === 1)) {
      submitOtp(newOtp.join(""));
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const submitOtp = async (code: string) => {
    setLoading(true);
    setError("");
    try {
      // const res = await api.post(
      //   "/verify-otp",
      //   { phone: searchParams.get("phone"), code },
      //   { withCredentials: true }
      // );
      // if (!res.data.success) {
      //   setError(res.data.message || "Invalid OTP");
      //   setLoading(false);
      //   return;
      // }
      // Simulate verifying (you can uncomment real API call later)
      // Simulate verifying OTP
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // // ✅ After verification, fetch user from backend
      // const res = await api.get("/user", { withCredentials: true });
      // console.log("User after OTP verify:", res.data);

      // if (res.data) {
      //   router.push("/");
      // } else {
      //   setError("Unable to fetch user after OTP verification");
      // }
      await refreshUser();

      router.replace("/");
    } catch (err) {
      setError("Server error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.some((d) => d === "")) {
      setError("Please enter all digits");
      return;
    }
    submitOtp(otp.join(""));
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="w-full max-w-md flex flex-col items-center">
        <h1 className="text-3xl font-bold mb-8">Enter OTP</h1>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col items-center gap-6"
        >
          <div className="flex justify-between gap-3">
            {otp.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputsRef.current[idx] = el; // ✅ TypeScript-safe
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-12 h-12 text-center text-xl border-b-2 border-gray-400 focus:border-blue-500 outline-none"
              />
            ))}

          </div>

          {error && <span className="text-red-500 text-sm">{error}</span>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Verify OTP"}
          </button>
        </form>

        <button
          onClick={() => router.push("/")}
          className="mt-4 text-blue-600 hover:underline"
        >
          Resend OTP
        </button>
      </div>
    </div>
  );
};

export default OtpPage;
