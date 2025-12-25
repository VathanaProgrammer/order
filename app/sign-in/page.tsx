"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import axios, { AxiosError } from "axios";

const Page = () => {
  const router = useRouter();
  const { login, loading } = useAuth();
  const [phone, setPh] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const { refreshUser } = useAuth();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await login(phone, username);
    } catch (err: AxiosError | unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setError("Invalid email or password");
        console.log(err);
      } else {
        setError("Something went wrong. Try again.");
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
        onClick={() => router.back()}
        className="mb-4 text-gray-600 hover:text-gray-800 flex items-center gap-2"
      >
        <span className="text-xl">←</span>
        <span>Back</span>
      </button>
      <form onSubmit={handleSignIn} className="mt-18 w-full">
        <h1 onClick={() => router.push('/')} className="text-2xl font-bold text-center text-gray-800">SOB</h1>
        <h2 className="text-lg font-medium text-center text-gray-600 mb-6">
          Sign In to access Your Account
        </h2>

        <div className="w-full mt-6">
          <label className="text-[20px] font-medium text-gray-700">
            Phone Number
          </label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPh(e.target.value)}
            placeholder="Enter your phone number"
            className="w-full px-4 min-h-[45px] py-2 border focus:outline-0 rounded-[5px] focus:border-blue-600 mt-2"
          />
        </div>

        {/* <div className="w-full mt-6"> */}
          {/* <label className="text-[20px] font-medium text-gray-700"> */}
            {/* Username */}
          {/* </label> */}
          {/* <input */}
            {/* type="text" */}
            {/* value={username} */}
            {/* onChange={(e) => setUsername(e.target.value)} */}
            {/* placeholder="Enter your username" */}
            {/* className="w-full px-4 min-h-[45px] py-2 border focus:outline-0 rounded-[5px] focus:border-blue-600 mt-2" */}
          {/* /> */}
        {/* </div> */}

        {/* <div className="w-full mt-6"> */}
        {/* <label className="text-[20px] font-medium text-gray-700">Password</label> */}
        {/* <input */}
        {/* type="password" */}
        {/* value={password} */}
        {/* onChange={(e) => setPassword(e.target.value)} */}
        {/* placeholder="Enter your password" */}
        {/* className="w-full px-4 min-h-[45px] py-2 border focus:outline-0 rounded-[5px] focus:border-blue-600 mt-2" */}
        {/* /> */}
        {/* </div> */}

        {error && <p className="text-red-500 mt-2">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-8 bg-gray-700 text-white py-3 rounded-lg font-semibold hover:bg-gray-700 active:scale-95 transition"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>

        <div className="mt-2 w-full">
          <p className="text-center text-[16px] font-medium">
            New user?{" "}
            <span
              onClick={() => router.push("/sign-up")}
              className="text-blue-600 cursor-pointer"
            >
              Create account
            </span>
          </p>
        </div>
      </form>
    </div>
    </div>
  );
};

export default Page;
