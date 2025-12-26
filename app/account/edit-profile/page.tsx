"use client";

import { useState, useEffect, FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/api/api";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";

const EditProfileForm = () => {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
  });
  const [originalData, setOriginalData] = useState({
    name: "",
    phone: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isChanged, setIsChanged] = useState(false);
  const { t } = useLanguage();

  // Initialize form with current user data
  useEffect(() => {
    if (user) {
      // Check both phone and mobile fields
      const phoneValue = user.phone || user.mobile || "";
      const nameValue = user.name || "";
      
      const newData = {
        name: nameValue,
        phone: phoneValue,
      };
      setFormData(newData);
      setOriginalData(newData);
    }
  }, [user]);

  // Check if form has changed
  useEffect(() => {
    const hasChanged = 
      formData.name !== originalData.name || 
      formData.phone !== originalData.phone;
    setIsChanged(hasChanged);
  }, [formData, originalData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear messages when user starts typing
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError("Name is required");
      return false;
    }

    if (!formData.phone.trim()) {
      setError("Phone number is required");
      return false;
    }

    // Phone validation (accepts various formats)
    const cleanedPhone = formData.phone.replace(/[\s\-()]/g, "");
    const phoneRegex = /^\+?[0-9]{3,15}$/;
    if (!phoneRegex.test(cleanedPhone)) {
      setError("Please enter a valid phone number (3-15 digits)");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.put(
        "/user/profile",
        {
          name: formData.name.trim(),
          phone: formData.phone.trim(),
        },
        { withCredentials: true }
      );

      console.log("Update response:", response.data);

      if (response.data.success) {
        setSuccess("Profile updated successfully!");
        setOriginalData(formData); // Update original data
        
        // Refresh user data in auth context
        await refreshUser();
        
        // Clear success message after 3 seconds and redirect
        setTimeout(() => {
          setSuccess(null);
          router.push("/account");
        }, 2000);
      } else {
        setError(response.data.message || "Failed to update profile");
      }
    } catch (err: any) {
      console.error("Update profile error:", err);
      setError(
        err.response?.data?.message || 
        err.message || 
        "An error occurred while updating your profile"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setFormData(originalData);
    setError(null);
    setSuccess(null);
  };

  const handleDebug = () => {
    console.log("Current user data:", user);
    console.log("Form data:", formData);
    console.log("Original data:", originalData);
    alert(`User Data:\nID: ${user?.id}\nName: ${user?.name}\nPhone: ${user?.phone}\nMobile: ${user?.mobile}`);
  };

  if (!user) {
    return (
      <div className="p-8 text-center bg-white rounded-lg shadow">
        <p className="text-gray-600">Please log in to edit your profile.</p>
      </div>
    );
  }

  // Get display phone (check both phone and mobile fields)
  const displayPhone = user.phone || user.mobile || "Not set";

  return (
    <div className="max-w-md mx-auto my-8 p-6 bg-white rounded-xl shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{t.editProfile}</h2>
          <p className="text-gray-600">{t.updateYourPersonalInformation}</p>
        </div>
        {/* <button
          onClick={handleDebug}
          className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
        >
          Debug
        </button> */}
      </div>

      {/* Display current user info */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-center space-x-3">
          {user.image_url ? (
            <img
              src={user.image_url}
              alt={user.name}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-semibold">
                {(user.name || "U").charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <p className="font-semibold text-gray-800">{user.name || "No name"}</p>
            <p className="text-sm text-gray-600">
              {t.phone}: {displayPhone}
            </p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-blue-100">
          <p className="text-sm text-gray-600">
            {t.availableRewardPoints}:{" "}
            <span className="font-bold text-green-600">
              {user.reward_points.available}
            </span>
          </p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border-l-4 border-green-500 rounded">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-green-700 text-sm">{success}</p>
              <p className="text-xs text-green-600 mt-1">{t.redirectingToAccountPage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            {t.name} *
            <span className="ml-2 text-xs text-gray-500">
              {t.current}: {user.name || "Not set"}
            </span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            disabled={isLoading}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder="Enter your full name"
            required
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            {t.phoneNumber} *
            <span className="ml-2 text-xs text-gray-500">
              Current: {displayPhone}
            </span>
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            disabled={isLoading}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder="e.g., 01234567890"
            required
          />
          <p className="mt-1 text-xs text-gray-500">
            {t.phoneNumberWillBeNormalizedToDigitsOnlyFormat}
          </p>
        </div>

        {/* Change Indicator */}
        {isChanged && !isLoading && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-yellow-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-yellow-700">{t.youHaveUnsavedChanges}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-4 flex space-x-3">
          <button
            type="button"
            onClick={handleReset}
            disabled={isLoading || !isChanged}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t.reset}
          </button>
          <button
            type="submit"
            disabled={isLoading || !isChanged}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t.updating}
              </>
            ) : (
              t.saveChanges
            )}
          </button>
        </div>

        {/* Form Note */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            * {t.requiredFields}
          </p>
        </div>
      </form>
    </div>
  );
};

export default EditProfileForm;