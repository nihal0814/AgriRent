import React, { useState } from 'react';
import { 
  ArrowRight, 
  Tractor,
  User,
  Building2
} from 'lucide-react';
import { useI18n } from '../i18n/LanguageContext';
import { AuthUser, Page } from '../types';

interface SignupPageProps {
  onNavigate: (page: Page) => void;
  onSignupSuccess: (user: AuthUser) => void;
}

export const SignupPage: React.FC<SignupPageProps> = ({ onNavigate, onSignupSuccess }) => {
  const { t } = useI18n();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handlePhoneChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '').slice(0, 10);
    setPhone(digitsOnly);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName,
          phone,
          email: email.trim() || undefined,
          password,
        }),
      });

      const data = (await response.json()) as { user?: AuthUser; error?: string };
      if (!response.ok || !data.user) {
        setErrorMessage(data.error ?? t('Unable to create account. Please try again.'));
        return;
      }

      onSignupSuccess(data.user);
    } catch {
      setErrorMessage(t('Network error. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-100 bg-background flex flex-col md:flex-row overflow-hidden">
      {/* Left Side - Visual */}
      <section className="hidden md:flex md:w-1/2 bg-primary relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 opacity-40">
          <img 
            className="w-full h-full object-cover" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDVS3h9m-aIMfv1UyC4C87INpvtg2GdH61vS0wYDiBxDS9pbAslIYlgKWsTNXe9fAKHQZVdmHeJZoigAYfzJK4d8h_oLgPjzYTzmGeoUVSzHVWcdkoFNDBBzENXWr5V7h6jLEMCu-CKV48x0VDvDqwR22qeGyVL3gwR7bP_63NO3JJdVK8YjIiEr2-RKXQ-gZDQy8eg91KcPTqBWsZOFpCRcAbqRa-5u4TPPrC1L6Yu2rLRNz_uWMNgm5TdiEMfk6I-WLUoGH5aV-o" 
            alt="Farm" 
          />
        </div>
        <div className="relative z-10 text-white max-w-lg">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-secondary-container rounded-2xl flex items-center justify-center text-on-secondary-container shadow-xl">
              <Tractor size={28} />
            </div>
            <span className="text-3xl font-black font-headline tracking-tighter">The Modern Agrarian</span>
          </div>
          <h2 className="text-5xl font-black font-headline leading-tight mb-6">{t('Grow your operation with shared power.')}</h2>
          <p className="text-xl opacity-80 leading-relaxed">{t('Join 12,000+ verified farmers optimizing their fleets and reducing capital costs.')}</p>
        </div>
      </section>

      {/* Right Side - Form */}
      <section className="flex-1 flex flex-col justify-center p-8 md:p-24 bg-white overflow-y-auto no-scrollbar">
        <div className="max-w-md w-full mx-auto py-12">
          <header className="mb-12">
            <h1 className="text-4xl font-black text-primary tracking-tight mb-2">{t('Create FarmID')}</h1>
            <p className="text-on-surface-variant font-medium">{t('Select your account type and register with a 10-digit phone number.')}</p>
          </header>

          <div className="grid grid-cols-2 gap-4 mb-10">
            <button className="p-6 rounded-2xl border-2 border-primary bg-surface-container-low flex flex-col items-center gap-3 transition-all">
              <User size={24} className="text-primary" />
              <span className="font-bold text-sm">{t('Renter')}</span>
            </button>
            <button className="p-6 rounded-2xl border-2 border-outline-variant hover:border-primary transition-all flex flex-col items-center gap-3">
              <Building2 size={24} className="text-outline" />
              <span className="font-bold text-sm">{t('Lister')}</span>
            </button>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-outline">{t('Full Name')}</label>
              <input
                className="w-full h-14 px-4 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary/10 shadow-inner"
                placeholder="John Miller"
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-outline">{t('Phone Number')}</label>
              <input
                className="w-full h-14 px-4 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary/10 shadow-inner"
                placeholder="9876543210"
                type="tel"
                value={phone}
                onChange={(event) => handlePhoneChange(event.target.value)}
                inputMode="numeric"
                pattern="[0-9]{10}"
                minLength={10}
                maxLength={10}
                title={t('Phone number must be exactly 10 digits')}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-outline">{t('Email Address (Optional)')}</label>
              <input
                className="w-full h-14 px-4 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary/10 shadow-inner"
                placeholder="name@farm.com"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-outline">{t('Password')}</label>
              <input
                className="w-full h-14 px-4 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary/10 shadow-inner"
                placeholder="••••••••"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
              />
            </div>

            {errorMessage && (
              <p className="text-sm font-medium text-red-600">{errorMessage}</p>
            )}

            <button
              className="w-full h-14 bg-primary text-white font-black rounded-2xl shadow-xl hover:shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-sm disabled:opacity-70 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? t('Creating...') : t('Create Account')}
              <ArrowRight size={18} />
            </button>
          </form>

          <div className="mt-12 pt-8 border-t border-outline-variant/20">
            <p className="text-center text-sm text-on-surface-variant">
              {t('Already have an account?')} 
              <button onClick={() => onNavigate('login')} className="ml-2 font-bold text-primary hover:underline">{t('Sign In')}</button>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
