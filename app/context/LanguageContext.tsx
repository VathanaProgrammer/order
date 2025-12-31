// context/LanguageContext.jsx
"use client";
import { createContext, useContext, useState, useMemo } from "react";

// Define the context type
interface LanguageContextType {
  language: "en" | "km";
  toggleLanguage: () => void;
  t: Record<string, string>;
}

// Create context with proper type
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation dictionary outside component to avoid re-renders
const translations = {
  en: {
    back: "Back",
    title: "SOB",
    subtitle: "Sign In to access Your Account",
    phoneLabel: "Phone Number",
    phonePlaceholder: "Enter your phone number",
    signIn: "Sign In",
    signingIn: "Signing in...",
    newUser: "New user?",
    createAccount: "Create account",
    invalidCredentials: "Invalid phone or username",
    error: "Something went wrong. Try again.",
    search: "Search...",
    home: "Home",
    chat: "Chat",
    total: "Total",
    checkout: "Checkout",
    redeemYourRewards: "Redeem Your Rewards",
    myAccount: "My Account",
    profileInformation: "Profile Information",
    shippingAddresses: "Shipping Addresses",
    rewards: "Rewards",
    logout: "Logout",
    manageYourNameAndPhoneNumber: "Manage your name, and phone number.",
    viewAndUpdateYourShippingAndBillingAddresses: "View and update your shipping and billing addresses.",
    checkAvailableCoupons: "Check available coupons and loyalty points.",
    editProfile: "Edit Profile",
    manageAddresses: "Manage Addresses",
    viewRewards: "View Rewards",
    loadingAcounts: "Loading accounts...",
    updateYourPersonalInformation: "Update your personal information.",
    phone: "Phone",
    availableRewardPoints: "Available Reward Points",
    name: "Name",
    current: "Current",
    phoneNumber: "Phone Number",
    phoneNumberWillBeNormalizedToDigitsOnlyFormat: "Phone number will be normalized to digits-only format",
    reset: "Reset",
    saveChanges: "Save Changes",
    requiredFields: "Required fields. Changes will be reflected immediately across your account.",
    updating: "Updating...",
    youHaveUnsavedChanges: "You have unsaved changes.",
    redirectingToAccountPage: "Redirecting to account page...",
    shippingAddress: "Shipping Address",
    orderSummary: "Order Summary",
    yourCartIsEmpty: "Your cart is empty.",
    addOrUse: "Add / Use Current Location",
    label: "Label",
    details: "Details",
    useThisAddress: "Use this address",
    paymentMethod: "Payment Method",
    QR: "QR",
    cash: "Cash",
    YouWillPayWithCashUponDelivery: "You will pay with cash upon delivery.",
    scanQRCode: "Scan QR Code",
    scanWithYourBankingApp: "Scan with your banking app",
    amount: "Amount",
    downloadQR: "Download QR",
    close: "Close",
    addNewAddress: "Add New Address",
    cancel: "Cancel",
    saveAddress: "Save Address",
    select: "Select",
    points: "Point",
    yourReward: "Your Reward",
    labelHomeWork: "Label (Home, Work)",
    clickToSelectLocation: "Click to select location on map",
    currentLocation: "Current Location",
    yourCurrentLocationIs: "Your current location is",
    selectLocation: "Select Location",
    selectedCoordinates: "Selected Coordinates",
    latitude: "Latitude",
    longtitude: "Longitude",
    pleaseSelectALocationOnTheMap: "Please select a location on the map",
    clear: "Clear",
    fillYourDetails: "Fill your details to continue with us",
    username: "Username",
    enterYourUsername: "Enter your username",
    enterYourPhoneNumber: "Enter your phone number",
    signUp: "Sign Up",
    alreadyHaveAnAccount: "Already have an account?",
    logInToYourAccount: "Log in to your account",
    edit: "Edit",
    delete: "Delete",
    addressDeletedSuccessfully: "Address deleted successfully!",
    addressSavedSuccessfully: "Address saved successfully!",
    addressUpdatedSuccessfully: "Address updated successfully!",
  },
  km: {
    back: "ត្រឡប់ក្រោយ",
    title: "SOB",
    subtitle: "ចូលគណនីដើម្បីចូលប្រើក្នុងគណនីរបស់អ្នក",
    phoneLabel: "លេខទូរស័ព្ទ",
    phonePlaceholder: "បញ្ចូលលេខទូរស័ព្ទរបស់អ្នក",
    signIn: "ចូលគណនី",
    signingIn: "កំពុងចូលគណនី...",
    newUser: "អ្នកប្រើថ្មី?",
    createAccount: "បង្កើតគណនី",
    invalidCredentials: "លេខទូរស័ព្ទ ឬឈ្មោះអ្នកប្រើមិនត្រឹមត្រូវ",
    error: "មានបញ្ហាបានកើតឡើង។ សូមព្យាយាមម្តងទៀត។",
    search: "ស្វែងរក...",
    home: "ទំព័រដើម",
    chat: "សារ",
    total: "សរុប",
    checkout: "ការទូទាត់",
    redeemYourRewards: "ប្ដូរពិន្ទុយករង្វាន់",
    myAccount: "គណនីរបស់ខ្ញុំ",
    profileInformation: "ព័ត៌មានគណនី",
    shippingAddresses: "អាសយដ្ឋានការទូទាត់",
    rewards: "រង្វាន់",
    logout: "ចាកចេញ",
    name: "ឈ្មោះ",
    current: "បច្ចុប្បន្ន",
    manageYourNameAndPhoneNumber: "គ្រប់គ្រងឈ្មោះ និងលេខទូរស័ព្ទរបស់អ្នក",
    viewAndUpdateYourShippingAndBillingAddresses: "មើល និងធ្វើបច្ចុប្បន្នភាពអាសយដ្ឋានការទូទាត់ និងវិក្កយបត្រ",
    checkAvailableCoupons: "រកមើលគូប៉ុង និងពិន្ទុយករង្វាន់",
    manageAddresses: "គ្រប់គ្រងអាសយដ្ឋាន",
    viewRewards: "មើលរង្វាន់",
    editProfile: "កែសម្រួលព័ត៌មានគណនី",
    loadingAcounts: "កំពុងផ្ទុកគណនី...",
    updateYourPersonalInformation: "ធ្វើបច្ចុប្បន្នភាពព័ត៌មានផ្ទាល់ខ្លួនរបស់អ្នក។",
    phone: "ទូរស័ព្ទ",
    availableRewardPoints: "ពិន្ទុយករង្វាន់ដែលអាចប្រើបាន",
    phoneNumberWillBeNormalizedToDigitsOnlyFormat: "លេខទូរស័ព្ទនឹងត្រូវធ្វើឲ្យមានលេខទាំងអស់",
    reset: "កំណត់ឡើងវិញ",
    saveChanges: "រក្សាទុកការផ្លាស់ប្តូរ",
    requiredFields: "ចន្លោះត្រូវបំពេញ។ ការផ្លាស់ប្តូរនឹងត្រូវបានបង្ហាញភ្លាមៗនៅលើគណនីរបស់អ្នក។",
    updating: "កំពុងធ្វើបច្ចុប្បន្នភាព...",
    orderSummary: "សង្ខេបការកម្មង់",
    yourCartIsEmpty: "កន្ត្រករបស់អ្នកគឺទទេ",
    shippingAddress: "អាសយដ្ឋានការទូទាត់",
    addOrUse: "បន្ថែម / ​ប្រើទីតាំងធ្វើបច្ចុប្បន្ន",
    useThisAddress: "ប្រើអាសយដ្ឋាននេះ",
    label: "ឈ្មោះកន្លែង",
    details: "ពិពណ៌នា",
    paymentMethod: "វិធីបង់ប្រាក់",
    QR: "QR",
    cash: "ប្រាក់សុទ្ធ",
    YouWillPayWithCashUponDelivery: "អ្នកនឹងទូទាត់ប្រាក់សុទ្ធក្នុងពេលទទួលទំនិញ",
    scanQRCode: "ស្គែនQRកូដ",
    scanWithYourBankingApp: "ស្គែនជាមួយកម្មវិធីធនាគាររបស់អ្នក",
    amount: "ចំនួនទឹកប្រាក់",
    downloadQR: "ទាញយក QR",
    close: "បិទ",
    youHaveUnsavedChanges: "អ្នកមានការផ្លាស់ប្តូរ",
    redirectingToAccountPage: "កំពុងបញ្ជូនទៅកាន់ទំព័រគណនីរបស់អ្នក...",
    addNewAddress: "បន្ថែមអាសយដ្ឋានថ្មី",
    cancel: "បោះបង់",
    saveAddress: "រក្សាទុកអាសយដ្ឋាន",
    select: "ជ្រើសរើស",
    points: "ពិន្ទុ",
    yourReward: "រង្វាន់របស់អ្នក",
    labelHomeWork: "ឈ្មោះកន្លែង (ផ្ទះ, ការងារ)",
    clickToSelectLocation: "ចុចដើម្បីជ្រើសរើសទឺតាំងនៅលើផែនទី",
    currentLocation: "ទីតាំងបច្ចុប្បន្ន",
    yourCurrentLocationIs: "ទីតាំងបច្ចុប្បន្នរបស់អ្នកគឺ",
    selectLocation: "ជ្រើសរើសទីតាំង",
    selectedCoordinates: "កូអរដោនេដែលបានជ្រើសរើស",
    latitude: "រយៈទទឹង",
    longtitude: "រយៈបណ្តោយ",
    pleaseSelectALocationOnTheMap: "សូមជ្រើសរើសទីតាំងមួយលើផែនទី",
    clear: "សម្អាត",
    username: "ឈ្មោះអ្នកប្រើ",
    enterYourUsername: "បញ្ចូលឈ្មោះអ្នកប្រើរបស់អ្នក",
    enterYourPhoneNumber: "បញ្ចូលលេខទូរស័ព្ទរបស់អ្នក",
    signUp: "ចុះឈ្មោះ",
    alreadyHaveAnAccount: "មានគណនីរួចរាល់មែនទេ?",
    logInToYourAccount: "ចូលទៅកាន់គណនីរបស់អ្នក",
    addressDeletedSuccessfully: "អាសយដ្ឋានត្រូវបានលុបដោយជោគជ័យ!",
    addressUpdatedSuccessfully: "អាសយដ្ឋានត្រូវបានកែដោយជោគជ័យ!",
    addressSavedSuccessfully: "អាសយដ្ឋានត្រូវបានរក្សាទុកដោយជោគជ័យ!",
  },
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<"en" | "km">("km");

  const toggleLanguage = () => {
    setLanguage(prev => prev === "en" ? "km" : "en");
  };

  // Use useMemo to prevent unnecessary re-renders
  const t = useMemo(() => translations[language], [language]);

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  ); 
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};