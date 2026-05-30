import React from 'react';
import Toast from '../components/Toast';
import AuthPage from './AuthPage';
import DashboardPage from './DashboardPage';
import { useAuth } from '../context/AuthContext';

const Pages = () => {
  const auth = useAuth();

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col items-stretch justify-start px-4 py-6 sm:py-8 bg-transparent overflow-x-hidden">
      {auth.userToken ? (
        <DashboardPage
          profile={auth.profile}
          setProfile={auth.setProfile}
          roles={auth.roles}
          token={auth.userToken}
          userId={auth.userId}
          email={auth.email}
          mfaEnabled={auth.mfaEnabled}
          isLoadingProfile={auth.isLoadingProfile}
          isSettingUpMfa={auth.isSettingUpMfa}
          setIsSettingUpMfa={auth.setIsSettingUpMfa}
          isDisablingMfa={auth.isDisablingMfa}
          setIsDisablingMfa={auth.setIsDisablingMfa}
          mfaSetupData={auth.mfaSetupData}
          mfaVerifyCode={auth.mfaVerifyCode}
          setMfaVerifyCode={auth.setMfaVerifyCode}
          handleLogout={auth.handleLogout}
          handleUpdateProfile={auth.handleUpdateProfile}
          handleSetupMfa={auth.handleSetupMfa}
          handleEnableMfaSubmit={auth.handleEnableMfaSubmit}
          handleDisableMfaSubmit={auth.handleDisableMfaSubmit}
          getInitials={auth.getInitials}
          getQrCodeSrc={auth.getQrCodeSrc}
        />
      ) : (
        <AuthPage
          email={auth.email}
          setEmail={auth.setEmail}
          password={auth.password}
          setPassword={auth.setPassword}
          confirmPassword={auth.confirmPassword}
          setConfirmPassword={auth.setConfirmPassword}
          otp={auth.otp}
          setOtp={auth.setOtp}
          isSignUp={auth.isSignUp}
          setIsSignUp={auth.setIsSignUp}
          isVerifying={auth.isVerifying}
          setIsVerifying={auth.setIsVerifying}
          isMfaVerifyingLogin={auth.isMfaVerifyingLogin}
          setIsMfaVerifyingLogin={auth.setIsMfaVerifyingLogin}
          mfaLoginCode={auth.mfaLoginCode}
          setMfaLoginCode={auth.setMfaLoginCode}
          isForgotPassword={auth.isForgotPassword}
          setIsForgotPassword={auth.setIsForgotPassword}
          isResetPassword={auth.isResetPassword}
          setIsResetPassword={auth.setIsResetPassword}
          newPassword={auth.newPassword}
          setNewPassword={auth.setNewPassword}
          confirmNewPassword={auth.confirmNewPassword}
          setConfirmNewPassword={auth.setConfirmNewPassword}
          alert={auth.alert}
          setAlert={auth.setAlert}
          oidcParams={auth.oidcParams}
          lockoutSeconds={auth.lockoutSeconds}
          formatLockoutTime={auth.formatLockoutTime}
          handleSubmit={auth.handleSubmit}
          handleMfaLoginSubmit={auth.handleMfaLoginSubmit}
          handleVerifyOTP={auth.handleVerifyOTP}
          handleResendOTP={auth.handleResendOTP}
          handleForgotPasswordSubmit={auth.handleForgotPassword}
          handleResetPasswordSubmit={auth.handleResetPassword}
        />
      )}

      {/* Toast Notification */}
      <Toast
        isOpen={auth.alert.isOpen && auth.alert.type !== 'error'}
        onClose={() => auth.setAlert({ ...auth.alert, isOpen: false })}
        message={auth.alert.message}
        type={auth.alert.type}
      />
    </div>
  );
};

export default Pages;
