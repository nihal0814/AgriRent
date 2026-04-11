import React, { useEffect, useState } from 'react';
import { 
  User, 
  Shield, 
  Bell, 
  CreditCard, 
  Camera,
  CheckCircle2,
  LogOut
} from 'lucide-react';
import { useI18n } from '../i18n/LanguageContext';
import { AuthUser, Page } from '../types';

interface SettingsPageProps {
  onNavigate: (page: Page) => void;
  user: AuthUser | null;
  onProfileUpdated: (user: AuthUser) => void;
  onLogout: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  onNavigate,
  user,
  onProfileUpdated,
  onLogout,
}) => {
  const { t } = useI18n();
  const [operationName, setOperationName] = useState('');
  const [fullName, setFullName] = useState('');
  const [farmAddress, setFarmAddress] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (!user) {
      return;
    }

    setOperationName(user.operationName ?? '');
    setFullName(user.fullName);
    setFarmAddress(user.farmAddress ?? '');
  }, [user]);

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!user) {
      setErrorMessage(t('Please sign in again to update profile details.'));
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName,
          operationName: operationName.trim() || null,
          farmAddress: farmAddress.trim() || null,
        }),
      });

      const data = (await response.json()) as { user?: AuthUser; error?: string };
      if (!response.ok || !data.user) {
        setErrorMessage(data.error ?? t('Unable to update profile right now.'));
        return;
      }

      onProfileUpdated(data.user);
      setSuccessMessage(t('Profile saved successfully.'));
    } catch {
      setErrorMessage(t('Network error while saving profile.'));
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto bg-white border border-outline-variant/10 rounded-3xl p-8">
        <h1 className="text-3xl font-black text-primary mb-2">{t('Profile Settings')}</h1>
        <p className="text-on-surface-variant mb-6">{t('Please sign in to view your profile details.')}</p>
        <button
          onClick={() => onNavigate('login')}
          className="px-6 py-3 bg-primary text-white rounded-xl font-bold"
        >
          {t('Go To Login')}
        </button>
      </div>
    );
  }

  const displayName = user.operationName || user.fullName;

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <header>
        <h1 className="text-5xl font-black text-primary tracking-tight mb-2">{t('Profile Settings')}</h1>
        <p className="text-on-surface-variant font-medium">{t('Manage your farm identity, security, and payment methods.')}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Sidebar Nav */}
        <nav className="md:col-span-4 space-y-2">
          {[
            { id: 'identity', label: t('Farm Identity'), icon: User, active: true },
            { id: 'security', label: t('Security'), icon: Shield },
            { id: 'notifications', label: t('Notifications'), icon: Bell },
            { id: 'payments', label: t('Payments'), icon: CreditCard },
          ].map((item) => (
            <button 
              key={item.id}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                item.active ? 'bg-primary text-white shadow-lg' : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
          <div className="pt-4 mt-4 border-t border-outline-variant/10">
            <button 
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-secondary hover:bg-secondary/10 transition-all"
            >
              <LogOut size={18} />
              {t('Logout')}
            </button>
          </div>
        </nav>

        {/* Content Area */}
        <section className="md:col-span-8 bg-white p-8 rounded-3xl border border-outline-variant/10 shadow-sm">
          <div className="flex items-center gap-6 mb-10">
            <div className="relative group">
              <div className="w-24 h-24 rounded-3xl overflow-hidden border-4 border-surface-container-highest">
                <img className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA9RtlpDc0jDW_q47yvlmmIMCw89kKAVxdtFCC_6l3O5r7R6UbMW8qN9Tuw2plbIBPKOiwpWf9hFdqtsi9i3tejBgOs3GyKmV7M2nx3F2wVdPMo629d-jrn4M-FOMBDwMCG4Y1xn7rmalf6Rtvud-FUxLdwPK_8LI1zkk_Stn3MbPUbG_xrxlz4mgt-6sqGsnOSOFisMnhpk6TT1TFgpB_6YZSXjjT7RCgpKV7DqSRqV3iYFVhAdWWgMatci3Enkpha8aqCIU5DAd8" alt="Profile" />
              </div>
              <button className="absolute -bottom-2 -right-2 p-2 bg-secondary text-on-secondary rounded-xl shadow-lg hover:scale-110 transition-all">
                <Camera size={16} />
              </button>
            </div>
            <div>
              <h3 className="text-2xl font-black text-on-surface">{displayName}</h3>
              <p className="text-on-surface-variant flex items-center gap-1">
                <CheckCircle2 size={14} className="text-primary" />
                {t('Verified Agrarian Member')}
              </p>
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleSave}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-outline">{t('Operation Name')}</label>
                <input
                  className="w-full p-4 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/10"
                  value={operationName}
                  onChange={(event) => setOperationName(event.target.value)}
                  type="text"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-outline">{t('Primary Contact')}</label>
                <input
                  className="w-full p-4 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/10"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  type="text"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-outline">{t('Phone Number')}</label>
                <input
                  className="w-full p-4 bg-surface-container-low border-none rounded-xl"
                  value={user.phone}
                  type="text"
                  disabled
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-outline">{t('Email Address')}</label>
                <input
                  className="w-full p-4 bg-surface-container-low border-none rounded-xl"
                  value={user.email ?? ''}
                  placeholder={t('Not provided')}
                  type="text"
                  disabled
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-outline">{t('Farm Address')}</label>
                <input
                  className="w-full p-4 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/10"
                  value={farmAddress}
                  onChange={(event) => setFarmAddress(event.target.value)}
                  type="text"
                />
              </div>
            </div>

            {errorMessage && <p className="text-sm font-medium text-red-600">{errorMessage}</p>}
            {successMessage && <p className="text-sm font-medium text-primary">{successMessage}</p>}

            <div className="pt-6 border-t border-outline-variant/10 flex justify-end">
              <button
                className="px-8 py-3 bg-primary text-white font-bold rounded-xl shadow-md hover:shadow-lg active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                type="submit"
                disabled={isSaving}
              >
                {isSaving ? t('Saving...') : t('Save Changes')}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};
