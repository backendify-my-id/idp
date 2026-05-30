import React, { createContext, useState, useContext, useEffect } from 'react';

const LanguageContext = createContext();

const translations = {
  en: {
    common: {
      email: 'Email Address',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      newPassword: 'New Password',
      confirmNewPassword: 'Confirm New Password',
      logout: 'Log Out',
      save: 'Save Changes',
      cancel: 'Cancel',
      success: 'Success',
      error: 'Error',
      back: 'Back',
      close: 'Close',
      confirm: 'Confirm',
    },
    auth: {
      welcomeBack: 'Welcome Back',
      createAccount: 'Create Account',
      authorizeApp: 'Authorize App',
      twoFactorAuth: 'Two-Factor Auth',
      verifyEmail: 'Verify Your Email',
      forgotPassword: 'Forgot Password',
      resetPassword: 'Reset Password',
      signIn: 'Sign In',
      registerSignUp: 'Register & Sign Up',
      authorizeSignIn: 'Authorize & Sign In',
      signUpToGetStarted: 'Sign up to get started',
      signInToYourAccount: 'Sign in to your account',
      alreadyHaveAccount: 'Already have an account? Sign In',
      dontHaveAccount: "Don't have an account? Sign Up",
      unverifiedAccount: 'Unverified account? Verify email',
      forgotYourPassword: 'Forgot your password?',
      otpCode: '6-Digit OTP Code',
      verifyOtp: 'Verify OTP',
      resendCode: 'Resend Code',
      backToSignIn: 'Back to Sign In',
      backToLogin: 'Back to Login',
      sendResetCode: 'Send Reset Code',
      resetCodeOtp: 'Reset Code (OTP)',
      mfaCodeLabel: '6-Digit Authenticator Code',
      verifyAndSignIn: 'Verify & Sign In',
    },
    nav: {
      profile: 'My Profile',
      security: 'Security / MFA',
      clients: 'OIDC Clients',
      users: 'Identity Users',
      adminRoom: 'Admin Room',
    },
    profile: {
      title: 'My Profile Configuration',
      subtitle: 'Manage your public details, bio description, and avatar picture',
      fullName: 'Full Name',
      avatarUrl: 'Avatar Image URL',
      bio: 'Bio Biography',
      placeholderName: 'John Doe',
      placeholderAvatar: 'https://...',
      placeholderBio: 'Write a short bio...',
    },
    security: {
      title: 'Security Settings',
      subtitle: 'Manage multi-factor authentication (MFA) and account credentials',
      mfaStatus: 'MFA Status',
      mfaEnabledText: 'Two-Factor Authentication is currently active',
      mfaDisabledText: 'Two-Factor Authentication is currently inactive',
      mfaWarning: 'Highly recommended! Two-factor authentication adds an extra layer of protection to your profile registry.',
      enableMfaBtn: 'Enable 2FA Protection',
      disableMfaBtn: 'Disable 2FA Protection',
      mfaSetupTitle: 'Configure Authenticator Application',
      mfaSetupSteps: 'Scan the QR code below using your Google Authenticator or Microsoft Authenticator application, then enter the 6-digit code to activate.',
      mfaSetupSecret: 'Manual Configuration Key',
      verifyCodeLabel: '6-Digit Verification Code',
      verifyBtn: 'Verify & Enable 2FA',
      disableMfaConfirmTitle: 'Disable Two-Factor Authentication',
      disableMfaConfirmText: 'To disable MFA, please enter your current 6-digit authenticator code below for verification.',
      disableMfaSubmitBtn: 'Verify & Disable 2FA',
    },
    clients: {
      title: 'Registered OIDC Clients',
      subtitle: 'Manage OIDC/OAuth2 application registries, PKCE, and callback redirects',
      searchPlaceholder: 'Search by client name or ID...',
      createClientBtn: 'Register New OIDC Client',
      newClientFormTitle: 'Register New Application Client',
      clientNameLabel: 'Application Name',
      clientNamePlaceholder: 'My Super App',
      clientIdLabel: 'App Client ID (Unique String Identifier)',
      clientIdPlaceholder: 'super-app-client',
      clientSecretLabel: 'Client Secret Key',
      pkceLabel: 'PKCE (Proof Key for Code Exchange)',
      pkceDescription: 'Enforce PKCE authentication flow for public native or single-page applications.',
      redirectUrlsLabel: 'Authorized Redirect Callback URLs',
      addUrlBtn: 'Add Callback URL',
      saveClientBtn: 'Register OIDC Client',
      showSecretTitle: 'Client Secret Key Generated',
      showSecretWarning: 'IMPORTANT: Save this Client Secret now! For security reasons, you will not be able to retrieve or view it again after closing this window.',
      showSecretBtn: 'I Have Saved the Secret Key',
      pkceFilterAll: 'All Clients',
      pkceFilterPkce: 'PKCE Enforced',
      pkceFilterNoPkce: 'No PKCE',
      noClientsText: 'No registered OIDC client registries found.',
      confirmDeleteTitle: 'Remove Application Registry',
      confirmDeleteMessage: 'Are you sure you want to permanently delete OIDC client application {name}?',
    },
    users: {
      title: 'Identity Directory',
      subtitle: 'Audit, promote, demote, and ban/unban users inside the identity directory',
      searchPlaceholder: 'Search by name or email...',
      totalCountLabel: '{filtered} of {total} registered database users',
      filterAll: 'All Users',
      filterActive: 'Active',
      filterSuspended: 'Suspended',
      filterBanned: 'Banned',
      tableHeaderName: 'User Details',
      tableHeaderStatus: 'Status',
      tableHeaderRoles: 'Role Access',
      tableHeaderActions: 'Actions / Access Controls',
      statusActive: 'Active',
      statusSuspended: 'Suspended',
      statusBanned: 'Banned',
      roleAdmin: 'Administrator',
      roleIdpSupport: 'IDP Support',
      roleDeveloper: 'Developer',
      roleUser: 'Identity User',
      roleNone: 'No Role',
      actionPromote: 'Grant Admin',
      actionDemote: 'Revoke Admin',
      actionBan: 'Ban Account',
      actionUnban: 'Unban Account',
      actionSuspend: 'Suspend',
      actionActivate: 'Activate',
      noUsersText: 'No database users matching search criteria were found.',
      confirmRoleTitle: 'Modify Role Privileges',
      confirmRoleMessage: 'Are you sure you want to change the role of {email} to "{role}"?',
      confirmRoleRemoveMessage: 'Are you sure you want to remove the "{role}" role from {email}?',
      confirmStatusTitle: 'Modify Account Access Status',
      roleSelectLabel: 'Change Role',
      roleAddLabel: 'Add Role',
      roleRemoveLabel: 'Remove Role',
    }
  },
  id: {
    common: {
      email: 'Alamat Email',
      password: 'Kata Sandi',
      confirmPassword: 'Konfirmasi Kata Sandi',
      newPassword: 'Kata Sandi Baru',
      confirmNewPassword: 'Konfirmasi Kata Sandi Baru',
      logout: 'Keluar',
      save: 'Simpan Perubahan',
      cancel: 'Batal',
      success: 'Berhasil',
      error: 'Kesalahan',
      back: 'Kembali',
      close: 'Tutup',
      confirm: 'Konfirmasi',
    },
    auth: {
      welcomeBack: 'Selamat Datang Kembali',
      createAccount: 'Buat Akun',
      authorizeApp: 'Otorisasi Aplikasi',
      twoFactorAuth: 'Autentikasi Dua Faktor',
      verifyEmail: 'Verifikasi Email Anda',
      forgotPassword: 'Lupa Kata Sandi',
      resetPassword: 'Atur Ulang Kata Sandi',
      signIn: 'Masuk',
      registerSignUp: 'Daftar & Buat Akun',
      authorizeSignIn: 'Otorisasi & Masuk',
      signUpToGetStarted: 'Daftar untuk memulai',
      signInToYourAccount: 'Masuk ke akun Anda',
      alreadyHaveAccount: 'Sudah punya akun? Masuk',
      dontHaveAccount: 'Belum punya akun? Daftar',
      unverifiedAccount: 'Akun belum diverifikasi? Verifikasi email',
      forgotYourPassword: 'Lupa kata sandi Anda?',
      otpCode: '6-Digit Kode OTP',
      verifyOtp: 'Verifikasi OTP',
      resendCode: 'Kirim Ulang Kode',
      backToSignIn: 'Kembali ke Masuk',
      backToLogin: 'Kembali ke Login',
      sendResetCode: 'Kirim Kode Atur Ulang',
      resetCodeOtp: 'Kode Atur Ulang (OTP)',
      mfaCodeLabel: '6-Digit Kode Authenticator',
      verifyAndSignIn: 'Verifikasi & Masuk',
    },
    nav: {
      profile: 'Profil Saya',
      security: 'Keamanan / MFA',
      clients: 'Klien OIDC',
      users: 'Pengguna Identitas',
      adminRoom: 'Ruang Admin',
    },
    profile: {
      title: 'Konfigurasi Profil Saya',
      subtitle: 'Kelola informasi publik, biografi singkat, dan foto profil Anda',
      fullName: 'Nama Lengkap',
      avatarUrl: 'URL Foto Profil',
      bio: 'Biografi',
      placeholderName: 'John Doe',
      placeholderAvatar: 'https://...',
      placeholderBio: 'Tulis biografi singkat...',
    },
    security: {
      title: 'Pengaturan Keamanan',
      subtitle: 'Kelola autentikasi dua faktor (MFA) dan kredensial keamanan akun Anda',
      mfaStatus: 'Status MFA',
      mfaEnabledText: 'Autentikasi Dua Faktor saat ini aktif',
      mfaDisabledText: 'Autentikasi Dua Faktor saat ini tidak aktif',
      mfaWarning: 'Sangat disarankan! Autentikasi dua faktor menambahkan lapisan perlindungan ekstra ke akun identitas Anda.',
      enableMfaBtn: 'Aktifkan Perlindungan 2FA',
      disableMfaBtn: 'Nonaktifkan Perlindungan 2FA',
      mfaSetupTitle: 'Konfigurasi Aplikasi Authenticator',
      mfaSetupSteps: 'Pindai kode QR di bawah menggunakan aplikasi Google Authenticator atau Microsoft Authenticator Anda, lalu masukkan 6 digit kode untuk mengaktifkan.',
      mfaSetupSecret: 'Kunci Konfigurasi Manual',
      verifyCodeLabel: '6-Digit Kode Verifikasi',
      verifyBtn: 'Verifikasi & Aktifkan 2FA',
      disableMfaConfirmTitle: 'Nonaktifkan Autentikasi Dua Faktor',
      disableMfaConfirmText: 'Untuk menonaktifkan MFA, silakan masukkan 6 digit kode authenticator Anda saat ini untuk verifikasi.',
      disableMfaSubmitBtn: 'Verifikasi & Nonaktifkan 2FA',
    },
    clients: {
      title: 'Klien OIDC Terdaftar',
      subtitle: 'Kelola registrasi aplikasi OIDC/OAuth2, PKCE, dan pengalihan callback',
      searchPlaceholder: 'Cari berdasarkan nama klien atau ID...',
      createClientBtn: 'Daftarkan Klien OIDC Baru',
      newClientFormTitle: 'Daftarkan Klien Aplikasi Baru',
      clientNameLabel: 'Nama Aplikasi',
      clientNamePlaceholder: 'Aplikasi Keren Saya',
      clientIdLabel: 'ID Klien Aplikasi (Identifier Unik)',
      clientIdPlaceholder: 'client-aplikasi-saya',
      clientSecretLabel: 'Kunci Rahasia Klien (Client Secret)',
      pkceLabel: 'PKCE (Proof Key for Code Exchange)',
      pkceDescription: 'Wajibkan alur autentikasi PKCE untuk aplikasi native publik atau aplikasi satu halaman.',
      redirectUrlsLabel: 'URL Callback Pengalihan yang Diizinkan',
      addUrlBtn: 'Tambah URL Callback',
      saveClientBtn: 'Daftarkan Klien OIDC',
      showSecretTitle: 'Kunci Rahasia Klien Dibuat',
      showSecretWarning: 'PENTING: Simpan Kunci Rahasia Klien ini sekarang! Demi alasan keamanan, Anda tidak akan dapat melihat kunci ini lagi setelah menutup jendela ini.',
      showSecretBtn: 'Saya Sudah Menyimpan Kunci Rahasia',
      pkceFilterAll: 'Semua Klien',
      pkceFilterPkce: 'Wajib PKCE',
      pkceFilterNoPkce: 'Tanpa PKCE',
      noClientsText: 'Tidak ada registrasi klien OIDC ditemukan.',
      confirmDeleteTitle: 'Hapus Registrasi Aplikasi',
      confirmDeleteMessage: 'Apakah Anda yakin ingin menghapus aplikasi klien OIDC {name} secara permanen?',
    },
    users: {
      title: 'Direktori Identitas',
      subtitle: 'Audit, promosikan, turunkan jabatan, dan blokir/buka blokir pengguna di direktori identitas',
      searchPlaceholder: 'Cari berdasarkan nama atau email...',
      totalCountLabel: '{filtered} dari {total} pengguna terdaftar database',
      filterAll: 'Semua Pengguna',
      filterActive: 'Aktif',
      filterSuspended: 'Ditangguhkan',
      filterBanned: 'Diblokir',
      tableHeaderName: 'Detail Pengguna',
      tableHeaderStatus: 'Status',
      tableHeaderRoles: 'Akses Peran',
      tableHeaderActions: 'Tindakan / Kontrol Akses',
      statusActive: 'Aktif',
      statusSuspended: 'Ditangguhkan',
      statusBanned: 'Diblokir',
      roleAdmin: 'Administrator',
      roleIdpSupport: 'Dukungan IDP',
      roleDeveloper: 'Developer',
      roleUser: 'Pengguna Identitas',
      roleNone: 'Tanpa Peran',
      actionPromote: 'Berikan Admin',
      actionDemote: 'Cabut Admin',
      actionBan: 'Blokir Akun',
      actionUnban: 'Buka Blokir',
      actionSuspend: 'Tangguhkan',
      actionActivate: 'Aktifkan',
      noUsersText: 'Tidak ada pengguna database yang cocok dengan kriteria pencarian.',
      confirmRoleTitle: 'Ubah Hak Peran',
      confirmRoleMessage: 'Apakah Anda yakin ingin mengubah peran {email} menjadi "{role}"?',
      confirmRoleRemoveMessage: 'Apakah Anda yakin ingin menghapus peran "{role}" dari {email}?',
      confirmStatusTitle: 'Ubah Status Akses Akun',
      roleSelectLabel: 'Ubah Peran',
      roleAddLabel: 'Tambah Peran',
      roleRemoveLabel: 'Hapus Peran',
    }
  }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('idp_lang');
    if (saved === 'en' || saved === 'id') return saved;
    const browserLang = navigator.language || navigator.userLanguage;
    return browserLang.startsWith('id') ? 'id' : 'en';
  });

  useEffect(() => {
    localStorage.setItem('idp_lang', language);
  }, [language]);

  const toggleLanguage = () => {
    setLanguage(prev => (prev === 'en' ? 'id' : 'en'));
  };

  const t = (key, variables = {}) => {
    const keys = key.split('.');
    let value = translations[language];
    for (const k of keys) {
      value = value?.[k];
    }
    if (!value) {
      // Fallback to English
      value = translations['en'];
      for (const k of keys) {
        value = value?.[k];
      }
    }
    if (!value) return key;

    let str = value;
    Object.entries(variables).forEach(([k, v]) => {
      str = str.replace(new RegExp(`{${k}}`, 'g'), v);
    });
    return str;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
