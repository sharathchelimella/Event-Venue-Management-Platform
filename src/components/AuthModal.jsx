import React from 'react';
import { LoginPage } from './LoginPage.jsx';

export const AuthModal = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
      <LoginPage
        onSuccess={onSuccess}
        onClose={onClose}
        isModal={true}
        initialMode="login"
      />
    </div>
  );
};
