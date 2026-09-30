import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

export const translations = {
  bn: {
    // Navigation
    'nav.dashboard': 'ড্যাশবোর্ড',
    'nav.customers': 'গ্রাহক তালিকা',
    'nav.customerManagement': 'গ্রাহক ব্যবস্থাপনা',
    'nav.dues': 'বকেয়া তালিকা',
    'nav.dueManagement': 'বকেয়া ব্যবস্থাপনা',
    'nav.collections': 'কালেকশন ইতিহাস',
    'nav.billing': 'মাসিক বিলিং',
    'nav.areas': 'এলাকা ব্যবস্থাপনা',
    'nav.collectors': 'কালেক্টর ব্যবস্থাপনা',
    'nav.packages': 'প্যাকেজ ব্যবস্থাপনা',
    'nav.reports': 'রিপোর্ট (১২ প্রকার)',
    'nav.import': 'বাল্ক কাস্টমার ইম্পোর্ট',
    'nav.settings': 'কোম্পানি সেটিংস',
    'nav.more': 'আরও মেনু',
    'nav.overview': 'ওভারভিউ',
    'nav.collectorDashboard': 'কালেক্টর ড্যাশবোর্ড',
    'nav.myCustomers': 'আমার এলাকার গ্রাহক',
    'nav.myCollections': 'আমার কালেকশন হিস্ট্রি',
    'nav.myAccount': 'আমার একাউন্ট ও বিল',
    'nav.logout': 'লগআউট',
    'nav.superadminOverview': 'ওভারভিউ',
    'nav.superadminCompanies': 'কোম্পানি ব্যবস্থাপনা',
    'nav.superadminSettings': 'লগইন পেজ সেটিংস ও লোগো',

    // Roles & Badges
    'role.superAdmin': 'Super Admin',
    'role.companyAdmin': 'Company Admin',
    'role.collector': 'Bill Collector',
    'role.customer': 'গ্রাহক',

    // Header
    'header.support': 'সাপোর্ট:',
    'header.superAdminMode': 'সুপার এডমিন অটো-লগইন মোড: আপনি বর্তমানে ব্রাউজ করছেন',
    'header.returnToSuperAdmin': 'সুপার এডমিন প্যানেলে ফিরুন ➔',

    // Common
    'common.save': 'সংরক্ষণ করুন',
    'common.saveChanges': 'পরিবর্তন সংরক্ষণ করুন',
    'common.saving': 'সংরক্ষণ হচ্ছে...',
    'common.saved': 'সংরক্ষিত হয়েছে',
    'common.cancel': 'বাতিল',
    'common.edit': 'এডিট',
    'common.delete': 'মুছুন',
    'common.search': 'অনুসন্ধান করুন...',
    'common.filter': 'ফিল্টার',
    'common.all': 'সকল',
    'common.active': 'সক্রিয়',
    'common.inactive': 'নিষ্ক্রিয়',
    'common.closed': 'বন্ধ',
    'common.free': 'ফ্রি',
    'common.paid': 'পরিশোধিত',
    'common.due': 'বকেয়া',
    'common.status': 'স্ট্যাটাস',
    'common.action': 'অ্যাকশন',
    'common.actions': 'পদক্ষেপ',
    'common.bdt': 'টাকা',
    'common.loading': 'লোড হচ্ছে...',
    'common.confirm': 'নিশ্চিত করুন',
    'common.back': 'ফিরে যান',
    'common.print': 'প্রিন্ট',
    'common.download': 'ডাউনলোড',
    'common.close': 'বন্ধ করুন',
    'common.phone': 'ফোন নম্বর',
    'common.name': 'নাম',
    'common.email': 'ইমেইল',
    'common.address': 'ঠিকানা',
    'common.area': 'এলাকা',
    'common.package': 'প্যাকেজ',
    'common.date': 'তারিখ',
    'common.amount': 'পরিমাণ',
    'common.total': 'মোট',
    'common.month': 'মাস',
    'common.receipt': 'রশিদ',
    'common.notes': 'মন্তব্য / শর্তাবলী',

    // Settings Page
    'settings.title': 'কোম্পানি সেটিংস ও প্রোফাইল',
    'settings.subtitle': 'লোগো, কোম্পানির নাম, সাপোর্ট নম্বর, বিলিং প্রিফিক্স ও ভাষা কনফিগারেশন',
    'settings.languageTitle': 'সিস্টেমের ভাষা পরিবর্তন (System Language)',
    'settings.languageDesc': 'সিস্টেমের ডিফল্ট ভাষা বাংলা। আপনি চাইলে এটি ইংরেজিতে পরিবর্তন করতে পারেন। নির্বাচিত ভাষাটি সমগ্র সিস্টেমে কার্যকরী হবে।',
    'settings.bengali': 'বাংলা (ডিফল্ট)',
    'settings.english': 'English (ইংরেজি)',
    'settings.bengaliDesc': 'সম্পূর্ণ সিস্টেম বাংলায় প্রদর্শিত হবে',
    'settings.englishDesc': 'Display the complete system in English',
    'settings.logoTitle': 'কোম্পানির লোগো (Company Logo)',
    'settings.logoDesc': 'এখানে আপলোড করা লোগো টপ বারে বড় আকারে প্রদর্শিত হবে।',
    'settings.uploadLogo': 'লোগো ফাইল নির্বাচন করুন',
    'settings.uploadingLogo': 'লোগো আপলোড হচ্ছে...',
    'settings.removeLogo': 'লোগো মুছুন',
    'settings.companyInfoTitle': 'কোম্পানির সাধারণ তথ্য ও সেটিংস সম্পাদনা',
    'settings.companyInfoDesc': 'এখানে পরিবর্তন করা তথ্যসমূহ গ্রাহকদের বিল রশিদে ও সিস্টেমে প্রদর্শিত হবে',
    'settings.companyName': 'কোম্পানির নাম (Company Name)',
    'settings.ownerName': 'মালিক / পরিচালকের নাম (Owner / Director)',
    'settings.supportPhone': 'সাপোর্ট ফোন নম্বর (রশিদে প্রিন্ট হবে)',
    'settings.companyEmail': 'অফিসিয়াল ইমেইল (Company Email)',
    'settings.prefix': 'গ্রাহক আইডি প্রিফিক্স (Prefix)',
    'settings.address': 'অফিস / ক্যাবল নেটওয়ার্কের ঠিকানা (রশিদে প্রিন্ট হবে)',
    'settings.receiptNotice': 'বিল রশিদের ফুটারে বিশেষ নোটিশ / শর্তাবলী (Receipt Notice)',
    'settings.saveBtn': 'কোম্পানি সেটিংস সেভ করুন (Save Changes)',
    'settings.savedSuccess': 'কোম্পানি সেটিংস ও ভাষা সফলভাবে সংরক্ষিত হয়েছে!',

    // Collector Panel
    'collector.welcomeRole': 'ফিল্ড কালেকশন এজেন্ট',
    'collector.assignedAreas': 'আপনার নির্ধারিত এলাকাসমূহ:',
    'collector.todayCollection': 'আজকের আদায়',
    'collector.receiptsCount': 'টি রসিদ কাটা হয়েছে',
    'collector.thisMonthCollection': 'এই মাসের আদায়',
    'collector.assignedCustomers': 'নির্ধারিত গ্রাহক সংখ্যা',
    'collector.assignedDue': 'আমার এলাকার বকেয়া',
    'collector.recentPayments': 'আজকের সর্বশেষ আদায়সমূহ',
    'collector.allCustomers': 'সকল গ্রাহক',
    'collector.dueCustomers': 'বকেয়া গ্রাহক',
    'collector.paidCustomers': 'পরিশোধিত (০ বকেয়া)',
    'collector.closedCustomers': 'বন্ধ গ্রাহক',
    'collector.collectBill': 'বিল আদায় করুন',
    'collector.paymentHistory': 'পেমেন্ট ইতিহাস',
    'collector.searchPlaceholder': 'নাম, মোবাইল নম্বর বা আইডি দিয়ে খুঁজুন...',
    'collector.closedBadge': 'সংযোগ বন্ধ',
    'collector.activeBadge': 'সক্রিয়',
    'collector.closedCustomerAlert': 'এই গ্রাহকের সংযোগ বন্ধ আছে। সংযোগ বন্ধ গ্রাহকের বিল আদায় করা যাবে না। এডমিনের সাথে যোগাযোগ করুন।',

    // Dashboard
    'dash.welcome': 'ড্যাশবোর্ড ও প্ল্যাটফর্ম ওভারভিউ',
    'dash.todayCollection': 'আজকের কালেকশন',
    'dash.thisMonthCollection': 'এই মাসের কালেকশন',
    'dash.totalCustomers': 'মোট নিবন্ধিত গ্রাহক',
    'dash.activeLines': 'সক্রিয় গ্রাহক',
    'dash.freeLines': 'ফ্রি গ্রাহক',
    'dash.closedLines': 'সংযোগ বন্ধ',
    'dash.totalDue': 'সর্বমোট বকেয়া',
    'dash.totalCollectors': 'মোট কালেক্টর',
    'dash.totalAreas': 'মোট এলাকা',
    'dash.monthlyBilling': 'এই মাসের মোট বিল ধার্য',
    'dash.collectorPerf': 'কালেক্টরদের পারফরম্যান্স',
    'dash.recentCollections': 'সাম্প্রতিক কালেকশন ও রসিদ',

    // Payment Modal
    'payModal.title': 'গ্রাহক বিল কালেকশন',
    'payModal.customer': 'গ্রাহক:',
    'payModal.prevDue': 'পূর্বের বকেয়া:',
    'payModal.enterAmount': 'আদায়কৃত টাকার পরিমাণ (BDT) *',
    'payModal.method': 'পেমেন্ট মেথড *',
    'payModal.cash': 'ক্যাশ (নগদ)',
    'payModal.bkash': 'বিকাশ (bKash)',
    'payModal.nagad': 'নগদ (Nagad)',
    'payModal.bank': 'ব্যাংক ট্রান্সফার',
    'payModal.collectBtn': 'বিল জমা করুন ও রসিদ তৈরি করুন',
    'payModal.excessWarning': 'আপনি বকেয়ার চেয়ে বেশি টাকা লিখেছেন!',
    'payModal.closedError': 'সংযোগ বন্ধ থাকা গ্রাহকের বিল নেওয়া যাবে না।'
  },

  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.customers': 'Customer List',
    'nav.customerManagement': 'Customer Management',
    'nav.dues': 'Due List',
    'nav.dueManagement': 'Due Management',
    'nav.collections': 'Collection History',
    'nav.billing': 'Monthly Billing',
    'nav.areas': 'Area Management',
    'nav.collectors': 'Collector Management',
    'nav.packages': 'Package Management',
    'nav.reports': 'Reports (12 Types)',
    'nav.import': 'Bulk Customer Import',
    'nav.settings': 'Company Settings',
    'nav.more': 'More',
    'nav.overview': 'Overview',
    'nav.collectorDashboard': 'Collector Dashboard',
    'nav.myCustomers': 'My Area Customers',
    'nav.myCollections': 'My Collections',
    'nav.myAccount': 'My Account & Bills',
    'nav.logout': 'Logout',
    'nav.superadminOverview': 'Overview',
    'nav.superadminCompanies': 'Companies',
    'nav.superadminSettings': 'Login Page & Logo Settings',

    // Roles & Badges
    'role.superAdmin': 'Super Admin',
    'role.companyAdmin': 'Company Admin',
    'role.collector': 'Bill Collector',
    'role.customer': 'Customer',

    // Header
    'header.support': 'Support:',
    'header.superAdminMode': 'Super Admin Auto-Login Mode: You are currently browsing',
    'header.returnToSuperAdmin': 'Return to Super Admin ➔',

    // Common
    'common.save': 'Save',
    'common.saveChanges': 'Save Changes',
    'common.saving': 'Saving...',
    'common.saved': 'Saved',
    'common.cancel': 'Cancel',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.search': 'Search...',
    'common.filter': 'Filter',
    'common.all': 'All',
    'common.active': 'Active',
    'common.inactive': 'Inactive',
    'common.closed': 'Closed',
    'common.free': 'Free',
    'common.paid': 'Paid',
    'common.due': 'Due',
    'common.status': 'Status',
    'common.action': 'Action',
    'common.actions': 'Actions',
    'common.bdt': 'BDT',
    'common.loading': 'Loading...',
    'common.confirm': 'Confirm',
    'common.back': 'Back',
    'common.print': 'Print',
    'common.download': 'Download',
    'common.close': 'Close',
    'common.phone': 'Phone Number',
    'common.name': 'Name',
    'common.email': 'Email',
    'common.address': 'Address',
    'common.area': 'Area',
    'common.package': 'Package',
    'common.date': 'Date',
    'common.amount': 'Amount',
    'common.total': 'Total',
    'common.month': 'Month',
    'common.receipt': 'Receipt',
    'common.notes': 'Notes / Terms',

    // Settings Page
    'settings.title': 'Company Settings & Profile',
    'settings.subtitle': 'Configure logo, company name, support phone, billing prefix, and system language',
    'settings.languageTitle': 'System Language',
    'settings.languageDesc': 'Default system language is Bengali. You can switch to English. The selected language will be applied across the entire system.',
    'settings.bengali': 'বাংলা (Bengali - Default)',
    'settings.english': 'English',
    'settings.bengaliDesc': 'System will display in Bengali',
    'settings.englishDesc': 'Display the complete system in English',
    'settings.logoTitle': 'Company Logo',
    'settings.logoDesc': 'Uploaded logo will be prominently displayed in the top navbar.',
    'settings.uploadLogo': 'Select Logo File',
    'settings.uploadingLogo': 'Uploading Logo...',
    'settings.removeLogo': 'Remove Logo',
    'settings.companyInfoTitle': 'Company General Information & Settings',
    'settings.companyInfoDesc': 'Changes made here will appear on customer billing receipts and system reports',
    'settings.companyName': 'Company Name',
    'settings.ownerName': 'Owner / Director Name',
    'settings.supportPhone': 'Support Phone Number (Prints on receipts)',
    'settings.companyEmail': 'Company Email',
    'settings.prefix': 'Customer ID Prefix',
    'settings.address': 'Office / Cable Network Address (Prints on receipts)',
    'settings.receiptNotice': 'Receipt Footer Notice / Terms (Receipt Notice)',
    'settings.saveBtn': 'Save Company Settings',
    'settings.savedSuccess': 'Company settings and language saved successfully!',

    // Collector Panel
    'collector.welcomeRole': 'Field Collection Agent',
    'collector.assignedAreas': 'Your Assigned Areas:',
    'collector.todayCollection': "Today's Collection",
    'collector.receiptsCount': 'receipts issued today',
    'collector.thisMonthCollection': "This Month's Collection",
    'collector.assignedCustomers': 'Assigned Customers',
    'collector.assignedDue': 'Assigned Area Due',
    'collector.recentPayments': "Today's Latest Collections",
    'collector.allCustomers': 'All Customers',
    'collector.dueCustomers': 'Due Customers',
    'collector.paidCustomers': 'Paid (0 Due)',
    'collector.closedCustomers': 'Closed Customers',
    'collector.collectBill': 'Collect Bill',
    'collector.paymentHistory': 'Payment History',
    'collector.searchPlaceholder': 'Search by name, phone or ID...',
    'collector.closedBadge': 'Line Closed',
    'collector.activeBadge': 'Active',
    'collector.closedCustomerAlert': 'This customer line is closed. Cannot collect bill for closed customers. Please contact admin.',

    // Dashboard
    'dash.welcome': 'Dashboard & Platform Overview',
    'dash.todayCollection': "Today's Collection",
    'dash.thisMonthCollection': "This Month's Collection",
    'dash.totalCustomers': 'Total Customers',
    'dash.activeLines': 'Active Customers',
    'dash.freeLines': 'Free Customers',
    'dash.closedLines': 'Closed Customers',
    'dash.totalDue': 'Total Outstanding Due',
    'dash.totalCollectors': 'Total Collectors',
    'dash.totalAreas': 'Total Areas',
    'dash.monthlyBilling': "This Month's Total Billing",
    'dash.collectorPerf': 'Collector Performance',
    'dash.recentCollections': 'Recent Collections & Receipts',

    // Payment Modal
    'payModal.title': 'Customer Bill Collection',
    'payModal.customer': 'Customer:',
    'payModal.prevDue': 'Previous Due:',
    'payModal.enterAmount': 'Collected Amount (BDT) *',
    'payModal.method': 'Payment Method *',
    'payModal.cash': 'Cash',
    'payModal.bkash': 'bKash',
    'payModal.nagad': 'Nagad',
    'payModal.bank': 'Bank Transfer',
    'payModal.collectBtn': 'Collect Bill & Issue Receipt',
    'payModal.excessWarning': 'You entered more than the outstanding due amount!',
    'payModal.closedError': 'Cannot collect bill from closed customers.'
  }
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const { company } = useAuth();
  
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('dish_app_language') || company?.language || 'bn';
  });

  // Keep language in sync with company settings if user hasn't explicitly set localStorage
  useEffect(() => {
    if (company && company.language) {
      const stored = localStorage.getItem('dish_app_language');
      if (!stored && (company.language === 'en' || company.language === 'bn')) {
        setLanguageState(company.language);
      }
    }
  }, [company]);

  const changeLanguage = (newLang) => {
    const valid = (newLang === 'en') ? 'en' : 'bn';
    setLanguageState(valid);
    localStorage.setItem('dish_app_language', valid);
  };

  const t = (key, fallback = '') => {
    if (!key) return '';
    const text = translations[language]?.[key] || translations['bn']?.[key];
    return text !== undefined ? text : (fallback || key);
  };

  const formatStatus = (st) => {
    if (!st) return '';
    const norm = String(st).toLowerCase();
    if (language === 'bn') {
      if (norm === 'active') return 'সক্রিয়';
      if (norm === 'closed') return 'সংযোগ বন্ধ';
      if (norm === 'free') return 'ফ্রি';
      return st;
    }
    if (norm === 'active') return 'Active';
    if (norm === 'closed') return 'Closed';
    if (norm === 'free') return 'Free';
    return st;
  };

  const formatCurrency = (val) => {
    const num = Number(val) || 0;
    return language === 'bn' ? `${num} টাকা` : `${num} BDT`;
  };

  return (
    <LanguageContext.Provider value={{ 
      language, 
      changeLanguage, 
      setLanguage: changeLanguage, 
      t, 
      formatStatus,
      formatCurrency,
      isBn: language === 'bn', 
      isEn: language === 'en' 
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    // Fallback if accessed outside provider
    return {
      language: 'bn',
      changeLanguage: () => {},
      setLanguage: () => {},
      t: (key, fallback = '') => translations['bn']?.[key] || fallback || key,
      formatStatus: (st) => st === 'Active' ? 'সক্রিয়' : st === 'Closed' ? 'সংযোগ বন্ধ' : st === 'Free' ? 'ফ্রি' : st,
      formatCurrency: (val) => `${val || 0} টাকা`,
      isBn: true,
      isEn: false
    };
  }
  return context;
}
