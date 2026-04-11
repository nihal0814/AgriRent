import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  CircleDollarSign,
  MapPin,
  Sun,
  Tractor,
} from 'lucide-react';

import { useI18n } from '../i18n/LanguageContext';
import { formatINR } from '../lib/currency';
import { Page } from '../types';

interface ListEquipmentFormProps {
  onNavigate: (page: Page) => void;
}

type ListingFormState = {
  name: string;
  category: string;
  brandModel: string;
  location: string;
  dailyRate: string;
  status: 'available' | 'in-use' | 'maintenance';
  imageUrl: string;
  horsepower: string;
  fuelType: string;
  transmission: string;
  weight: string;
  description: string;
};

const TOTAL_STEPS = 3;

const CATEGORY_OPTIONS = ['Tractors', 'Harvesters', 'Tillers', 'Plows', 'Irrigation'];

const DEFAULT_FORM: ListingFormState = {
  name: '',
  category: '',
  brandModel: '',
  location: '',
  dailyRate: '',
  status: 'available',
  imageUrl: '',
  horsepower: '',
  fuelType: '',
  transmission: '',
  weight: '',
  description: '',
};

export const ListEquipmentForm: React.FC<ListEquipmentFormProps> = ({ onNavigate }) => {
  const { t } = useI18n();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<ListingFormState>({ ...DEFAULT_FORM });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const stepTitles = [t('Basic Equipment Info'), t('Pricing & Location'), t('Photos & Specs')];
  const statusOptions: Array<{ value: ListingFormState['status']; label: string }> = [
    { value: 'available', label: t('Available') },
    { value: 'in-use', label: t('In Use') },
    { value: 'maintenance', label: t('Maintenance') },
  ];

  const previewRate = Number(form.dailyRate || '0');

  const updateField = <K extends keyof ListingFormState>(field: K, value: ListingFormState[K]) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const isValidUrl = (value: string) => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  };

  const validateStep = (currentStep: number): string | null => {
    if (currentStep === 1) {
      if (form.name.trim().length < 3) {
        return t('Please enter a valid equipment title.');
      }
      if (!form.category) {
        return t('Please select a category.');
      }
      return null;
    }

    if (currentStep === 2) {
      if (!form.location.trim()) {
        return t('Please provide a location.');
      }
      if (!form.dailyRate || Number(form.dailyRate) <= 0) {
        return t('Daily rate must be greater than zero.');
      }
      return null;
    }

    if (currentStep === 3) {
      if (form.imageUrl.trim() && !isValidUrl(form.imageUrl.trim())) {
        return t('Please enter a valid image URL.');
      }
      return null;
    }

    return null;
  };

  const goToNextStep = () => {
    const stepError = validateStep(step);
    if (stepError) {
      setErrorMessage(stepError);
      return;
    }

    setErrorMessage('');
    setStep((previous) => Math.min(previous + 1, TOTAL_STEPS));
  };

  const goToPreviousStep = () => {
    setErrorMessage('');
    setStep((previous) => Math.max(previous - 1, 1));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (step < TOTAL_STEPS) {
      goToNextStep();
      return;
    }

    const stepError = validateStep(step);
    if (stepError) {
      setErrorMessage(stepError);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/equipment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: form.name.trim(),
          category: form.category,
          location: form.location.trim(),
          dailyRate: Number(form.dailyRate),
          brandModel: form.brandModel.trim() || form.name.trim(),
          status: form.status,
          imageUrl: form.imageUrl.trim() || null,
          specs: {
            horsepower: form.horsepower.trim() || null,
            fuelType: form.fuelType.trim() || null,
            transmission: form.transmission.trim() || null,
            weight: form.weight.trim() || null,
          },
          description: form.description.trim() || null,
        }),
      });

      const data = (await response.json()) as { id?: string; error?: string };
      if (!response.ok) {
        setErrorMessage(data.error ?? t('Unable to publish listing right now.'));
        return;
      }

      setSuccessMessage(
        data.id
          ? t('Listing published successfully. ID: {id}', { id: data.id })
          : t('Listing published successfully.')
      );
      setForm({ ...DEFAULT_FORM });
      setStep(1);
    } catch {
      setErrorMessage(t('Network error. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-screen-xl mx-auto flex flex-col lg:flex-row gap-12 pb-32">
      <section className="flex-1">
        <header className="mb-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-secondary-container text-on-secondary-container text-[10px] font-bold rounded-full uppercase tracking-widest">
              {t('Step {current} of {total}', { current: step, total: TOTAL_STEPS })}
            </span>
          </div>

          <div className="flex items-center gap-3 mb-4">
            {stepTitles.map((label, index) => {
              const stepNumber = index + 1;
              const isActive = step === stepNumber;
              const isDone = step > stepNumber;

              return (
                <div key={label} className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-black ${isDone ? 'bg-secondary-container text-on-secondary-container' : isActive ? 'bg-primary text-white' : 'bg-surface-container-high text-on-surface-variant'}`}>
                    {isDone ? <CheckCircle2 size={14} /> : stepNumber}
                  </div>
                  <span className={`text-xs font-bold hidden md:inline ${isActive ? 'text-primary' : 'text-on-surface-variant'}`}>{label}</span>
                  {stepNumber < TOTAL_STEPS && <div className="hidden md:block h-[2px] w-6 bg-outline-variant/30" />}
                </div>
              );
            })}
          </div>

          <h1 className="text-4xl md:text-5xl font-black text-primary tracking-tight leading-tight">{stepTitles[step - 1]}</h1>
        </header>

        <form className="space-y-8" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {step === 1 && (
              <>
                <div className="md:col-span-2 space-y-2">
                  <label className="block text-sm font-bold text-on-surface">{t('Equipment Title')}</label>
                  <input
                    className="w-full h-14 px-4 bg-surface-container-high border-none rounded-2xl shadow-inner"
                    placeholder={t('e.g., 2022 John Deere 8R 410 Tractor')}
                    type="text"
                    value={form.name}
                    onChange={(event) => updateField('name', event.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-on-surface">{t('Category')}</label>
                  <select
                    className="w-full h-14 px-4 bg-surface-container-high border-none rounded-2xl shadow-inner appearance-none"
                    value={form.category}
                    onChange={(event) => updateField('category', event.target.value)}
                    required
                  >
                    <option value="">{t('Select Category')}</option>
                    {CATEGORY_OPTIONS.map((category) => (
                      <option key={category} value={category}>
                        {t(category)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-on-surface">{t('Brand / Model')}</label>
                  <input
                    className="w-full h-14 px-4 bg-surface-container-high border-none rounded-2xl shadow-inner"
                    placeholder={t('e.g., John Deere 5075E')}
                    type="text"
                    value={form.brandModel}
                    onChange={(event) => updateField('brandModel', event.target.value)}
                  />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-on-surface">{t('Daily Rate (INR)')}</label>
                  <div className="h-14 px-4 bg-surface-container-high rounded-2xl shadow-inner flex items-center gap-2">
                    <CircleDollarSign size={16} className="text-on-surface-variant" />
                    <input
                      className="bg-transparent border-none focus:ring-0 w-full"
                      placeholder="1200"
                      type="number"
                      min={1}
                      value={form.dailyRate}
                      onChange={(event) => updateField('dailyRate', event.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-on-surface">{t('Status')}</label>
                  <select
                    className="w-full h-14 px-4 bg-surface-container-high border-none rounded-2xl shadow-inner appearance-none"
                    value={form.status}
                    onChange={(event) => updateField('status', event.target.value as ListingFormState['status'])}
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="block text-sm font-bold text-on-surface">{t('Location')}</label>
                  <div className="h-14 px-4 bg-surface-container-high rounded-2xl shadow-inner flex items-center gap-2">
                    <MapPin size={16} className="text-on-surface-variant" />
                    <input
                      className="bg-transparent border-none focus:ring-0 w-full"
                      placeholder={t('e.g., Lancaster County, PA')}
                      type="text"
                      value={form.location}
                      onChange={(event) => updateField('location', event.target.value)}
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="md:col-span-2 space-y-2">
                  <label className="block text-sm font-bold text-on-surface">{t('Equipment Photos')}</label>
                  <input
                    className="w-full h-14 px-4 bg-surface-container-high border-none rounded-2xl shadow-inner"
                    placeholder={t('Paste image URL (optional)')}
                    type="url"
                    value={form.imageUrl}
                    onChange={(event) => updateField('imageUrl', event.target.value)}
                  />
                  <div className="w-full aspect-[21/9] rounded-3xl border-2 border-dashed border-outline-variant bg-surface-container-low flex flex-col items-center justify-center p-8 overflow-hidden">
                    {form.imageUrl.trim() ? (
                      <img src={form.imageUrl} alt={t('Equipment preview')} className="w-full h-full object-cover rounded-2xl" />
                    ) : (
                      <>
                        <Camera size={48} className="text-primary mb-4" />
                        <p className="text-on-surface font-bold text-lg">{t('Add an image URL for preview')}</p>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-on-surface">{t('Horsepower')}</label>
                  <input
                    className="w-full h-14 px-4 bg-surface-container-high border-none rounded-2xl shadow-inner"
                    placeholder={t('e.g., 114 HP')}
                    type="text"
                    value={form.horsepower}
                    onChange={(event) => updateField('horsepower', event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-on-surface">{t('Fuel Type')}</label>
                  <input
                    className="w-full h-14 px-4 bg-surface-container-high border-none rounded-2xl shadow-inner"
                    placeholder={t('e.g., Diesel')}
                    type="text"
                    value={form.fuelType}
                    onChange={(event) => updateField('fuelType', event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-on-surface">{t('Transmission')}</label>
                  <input
                    className="w-full h-14 px-4 bg-surface-container-high border-none rounded-2xl shadow-inner"
                    placeholder={t('e.g., 24 Speed')}
                    type="text"
                    value={form.transmission}
                    onChange={(event) => updateField('transmission', event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-on-surface">{t('Weight')}</label>
                  <input
                    className="w-full h-14 px-4 bg-surface-container-high border-none rounded-2xl shadow-inner"
                    placeholder={t('e.g., 8600 lbs')}
                    type="text"
                    value={form.weight}
                    onChange={(event) => updateField('weight', event.target.value)}
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="block text-sm font-bold text-on-surface">{t('Description')}</label>
                  <textarea
                    className="w-full min-h-32 p-4 bg-surface-container-high border-none rounded-2xl shadow-inner resize-none"
                    placeholder={t('Describe the condition, recent servicing, and ideal use cases.')}
                    value={form.description}
                    onChange={(event) => updateField('description', event.target.value)}
                  />
                </div>
              </>
            )}
          </div>

          {(errorMessage || successMessage) && (
            <div className={`rounded-2xl p-4 border flex items-start gap-3 ${errorMessage ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'}`}>
              {errorMessage ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
              <p className="text-sm font-semibold">{errorMessage || successMessage}</p>
            </div>
          )}

          <div className="pt-8 flex items-center justify-between border-t border-outline-variant/20">
            <button
              onClick={() => (step === 1 ? onNavigate('lister-dashboard') : goToPreviousStep())}
              className="flex items-center gap-2 text-outline font-bold"
              type="button"
              disabled={isSubmitting}
            >
              <ArrowLeft size={18} /> {t('Back')}
            </button>
            <button
              className="px-10 py-4 bg-primary text-white font-bold rounded-2xl flex items-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
              type="submit"
              disabled={isSubmitting}
            >
              {step < TOTAL_STEPS
                ? t('Continue')
                : isSubmitting
                ? t('Publishing...')
                : t('Publish Listing')}
              <ArrowRight size={18} />
            </button>
          </div>
        </form>
      </section>

      <aside className="lg:w-80 space-y-6">
        <div className="p-8 bg-surface-container-highest rounded-3xl border border-outline-variant/10">
          <h3 className="text-xl font-black text-primary mb-6">{t('Live Preview')}</h3>
          <div className="rounded-2xl overflow-hidden border border-outline-variant/10 bg-white">
            <div className="h-44 bg-surface-container-low">
              {form.imageUrl.trim() ? (
                <img src={form.imageUrl} alt={t('Equipment image preview')} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
                  <Tractor size={28} />
                </div>
              )}
            </div>
            <div className="p-4 space-y-2">
              <p className="font-bold text-primary leading-tight">{form.name || t('Your equipment title will appear here')}</p>
              <p className="text-xs text-on-surface-variant">{form.category ? t(form.category) : t('Category')}</p>
              <p className="text-sm text-on-surface-variant">{form.location || t('Location')}</p>
              <div className="pt-3 border-t border-outline-variant/10 flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant">{t('Daily Rate')}</span>
                <span className="font-black text-primary">{previewRate > 0 ? formatINR(previewRate) : '₹0'}</span>
              </div>
              <p className="text-xs font-semibold text-on-surface-variant">
                {t('Status')}: {statusOptions.find((option) => option.value === form.status)?.label}
              </p>
            </div>
          </div>
        </div>

        <div className="p-8 bg-surface-container-highest rounded-3xl">
          <h3 className="text-xl font-black text-primary mb-6">{t('Pro Listing Tips')}</h3>
          <ul className="space-y-6">
            <li className="flex gap-4">
              <Sun size={16} className="text-secondary" />
              <p className="text-sm font-bold">{t('Use bright, clear photos for faster bookings.')}</p>
            </li>
            <li className="flex gap-4">
              <MapPin size={16} className="text-secondary" />
              <p className="text-sm font-bold">{t('Keep location precise to build renter trust.')}</p>
            </li>
            <li className="flex gap-4">
              <CircleDollarSign size={16} className="text-secondary" />
              <p className="text-sm font-bold">{t('Competitive daily rates increase listing visibility.')}</p>
            </li>
          </ul>
        </div>
      </aside>
    </div>
  );
};
