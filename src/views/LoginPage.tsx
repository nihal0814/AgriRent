import React, { useState } from 'react';
import { 
  ArrowRight, 
  ShieldCheck,
  Tractor
} from 'lucide-react';
import { useI18n } from '../i18n/LanguageContext';
import { AuthUser, Page } from '../types';

interface LoginPageProps {
  onNavigate: (page: Page) => void;
  onLoginSuccess: (user: AuthUser) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate, onLoginSuccess }) => {
  const { t } = useI18n();
  const [phone, setPhone] = useState('');
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
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, password }),
      });

      const data = (await response.json()) as { user?: AuthUser; error?: string };
      if (!response.ok || !data.user) {
        setErrorMessage(data.error ?? t('Unable to sign in right now.'));
        return;
      }

      onLoginSuccess(data.user);
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
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCtMlXyiJyVCdLfZjcutg0wv8c-FSBJFq8NXgH7SkgJ_8YYkeCdBlsJ8P7eqAIH2CEkH_TdzMySBwyvkmrTM15ekMpQ3b7vPu5bdtiDXFw4ABdz0sSDTEJUZr-sLutP_yQjRfYDGj0xOXwyvaKBDTUkrqQ8y-i8oYU_N8b8ke7HwgBOpOUinhAYeym1KBx-YiqlVfvEWqnC9q1wGKuqIXy9Wz9Ll0WzbZiGSwX-fANT2s1Y9tOYnKaDpetk89bb-2yhrkmvOYom86I" 
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
          <h2 className="text-5xl font-black font-headline leading-tight mb-6">{t('Equipping the next generation of farmers.')}</h2>
          <p className="text-xl opacity-80 leading-relaxed">{t('Join the most trusted network for premium agricultural equipment rentals.')}</p>
        </div>
        <div className="absolute bottom-12 left-12 flex items-center gap-4 text-white/60 text-sm font-medium">
          <ShieldCheck size={20} className="text-secondary-container" />
          {t('Verified Secure Platform')}
        </div>
      </section>

      {/* Right Side - Form */}
      <section className="flex-1 flex flex-col justify-center p-8 md:p-24 bg-white">
        <div className="max-w-md w-full mx-auto">
          <header className="mb-12">
            <h1 className="text-4xl font-black text-primary tracking-tight mb-2">{t('Welcome Back')}</h1>
            <p className="text-on-surface-variant font-medium">{t('Log in using your 10-digit phone number and password.')}</p>
          </header>

          <form className="space-y-6" onSubmit={handleSubmit}>
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
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase tracking-widest text-outline">{t('Password')}</label>
                <button type="button" className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline">{t('Forgot Password?')}</button>
              </div>
              <input
                className="w-full h-14 px-4 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary/10 shadow-inner"
                placeholder="••••••••"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
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
              {isSubmitting ? t('Signing In...') : t('Sign In')}
              <ArrowRight size={18} />
            </button>
          </form>

          <div className="mt-12 pt-8 border-t border-outline-variant/20">
            <p className="text-center text-sm text-on-surface-variant">
              {t("Don't have an account?")} 
              <button onClick={() => onNavigate('signup')} className="ml-2 font-bold text-primary hover:underline">{t('Create FarmID')}</button>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
