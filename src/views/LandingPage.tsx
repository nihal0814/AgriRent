import React, { useEffect, useMemo, useState } from 'react';
import { Search, ArrowRight, Star, MapPin } from 'lucide-react';
import { useI18n } from '../i18n/LanguageContext';
import { formatINR } from '../lib/currency';
import { Page } from '../types';

interface LandingPageProps {
  onNavigate: (page: Page) => void;
  onOpenEquipmentDetails: (equipmentId: string) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onSearchSubmit: () => void;
}

type ApiEquipment = {
  id: string;
  name: string;
  category: string;
  location: string;
  dailyRate: number;
  brandModel?: string;
  status?: 'available' | 'in-use' | 'maintenance';
  imageUrl?: string | null;
  specs?: {
    horsepower?: string | null;
    fuelType?: string | null;
    transmission?: string | null;
    weight?: string | null;
  } | null;
};

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=1200&q=80';

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigate,
  onOpenEquipmentDetails,
  searchQuery,
  onSearchQueryChange,
  onSearchSubmit,
}) => {
  const { t } = useI18n();
  const [liveEquipment, setLiveEquipment] = useState<ApiEquipment[]>([]);
  const [isLoadingEquipment, setIsLoadingEquipment] = useState(true);

  useEffect(() => {
    const loadLiveEquipment = async () => {
      try {
        const response = await fetch('/api/equipment');
        if (!response.ok) {
          setLiveEquipment([]);
          return;
        }

        const data = (await response.json()) as { equipment?: ApiEquipment[] };
        setLiveEquipment(data.equipment ?? []);
      } catch {
        setLiveEquipment([]);
      } finally {
        setIsLoadingEquipment(false);
      }
    };

    void loadLiveEquipment();
  }, []);

  const categories = [
    { id: 'tractors', name: t('Tractors'), icon: '🚜' },
    { id: 'harvesters', name: t('Harvesters'), icon: '🌾' },
    { id: 'plows', name: t('Plows'), icon: '🛠️' },
    { id: 'tillers', name: t('Tillers'), icon: '⚙️' },
    { id: 'irrigation', name: t('Irrigation'), icon: '💧' },
  ];

  const marketplaceEquipment = useMemo(() => {
    return liveEquipment.map((item) => ({
      id: item.id,
      title: item.name,
      category: item.category || 'Tractors',
      brandModel: item.brandModel || item.name,
      dailyRate: item.dailyRate ?? 0,
      image: item.imageUrl || FALLBACK_IMAGE,
      status: item.status ?? 'available',
      location: item.location || 'Unknown',
      rating: 4.8,
      reviewsCount: 0,
    }));
  }, [liveEquipment]);

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredEquipment = normalizedSearch
    ? marketplaceEquipment.filter((item) => {
        const searchableText = [item.title, item.brandModel, item.category, item.location]
          .join(' ')
          .toLowerCase();

        return searchableText.includes(normalizedSearch);
      })
    : marketplaceEquipment;

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearchSubmit();
  };

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-primary-container text-white min-h-[400px] flex items-center">
        <div className="absolute inset-0 z-0 opacity-40">
          <img 
            className="w-full h-full object-cover" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCtMlXyiJyVCdLfZjcutg0wv8c-FSBJFq8NXgH7SkgJ_8YYkeCdBlsJ8P7eqAIH2CEkH_TdzMySBwyvkmrTM15ekMpQ3b7vPu5bdtiDXFw4ABdz0sSDTEJUZr-sLutP_yQjRfYDGj0xOXwyvaKBDTUkrqQ8y-i8oYU_N8b8ke7HwgBOpOUinhAYeym1KBx-YiqlVfvEWqnC9q1wGKuqIXy9Wz9Ll0WzbZiGSwX-fANT2s1Y9tOYnKaDpetk89bb-2yhrkmvOYom86I" 
            alt="Farm background" 
          />
        </div>
        <div className="relative z-10 p-8 md:p-16 w-full flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-6xl font-black font-headline leading-tight mb-6">
              {t('Power the Season.')} <br/><span className="text-secondary-container">{t('Rent the Best.')}</span>
            </h1>
            <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 bg-white/90 backdrop-blur-md rounded-xl p-1 flex items-center shadow-lg">
                <Search size={20} className="mx-3 text-primary" />
                <input 
                  className="w-full bg-transparent border-none focus:ring-0 text-primary py-3 font-medium" 
                  placeholder={t('Search equipment...')}
                  value={searchQuery}
                  onChange={(event) => onSearchQueryChange(event.target.value)}
                  type="text" 
                />
              </div>
              <button type="submit" className="bg-secondary-container text-on-secondary-container px-8 py-4 rounded-xl font-bold font-headline uppercase tracking-wider flex items-center justify-center gap-2 hover:brightness-110 transition-all active:scale-95 shadow-lg">
                {t('Search')} <ArrowRight size={20} />
              </button>
            </form>
          </div>
          
          <div className="w-full md:w-80 bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-2xl shadow-2xl">
            <h3 className="font-headline text-xl font-bold mb-2">{t('Passive Farm Income')}</h3>
            <p className="text-sm opacity-90 mb-6">{t('List your idle equipment and earn up to ₹4,500/month in rental fees.')}</p>
            <button 
              onClick={() => onNavigate('signup')}
              className="w-full bg-white text-primary font-bold py-3 rounded-xl hover:bg-surface-container transition-colors shadow-md"
            >
              {t('Become a Lister')}
            </button>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section>
        <div className="flex items-center gap-4 overflow-x-auto pb-4 no-scrollbar">
          {categories.map((cat) => (
            <button 
              key={cat.id}
              className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold whitespace-nowrap transition-all ${
                cat.id === 'tractors' ? 'bg-primary text-white shadow-md' : 'bg-surface-container-highest text-on-surface hover:bg-surface-container-high'
              }`}
            >
              <span>{cat.icon}</span> {cat.name}
            </button>
          ))}
        </div>
      </section>

      {/* Equipment Grid */}
      <section>
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-black font-headline text-primary tracking-tight">{t('Available Equipment')}</h2>
            <p className="text-on-surface-variant mt-1">
              {normalizedSearch
                ? t('Showing {count} results for "{query}"', { count: filteredEquipment.length, query: searchQuery.trim() })
                : t('Showing {count} live listings', { count: marketplaceEquipment.length })}
            </p>
          </div>
          <button className="flex items-center gap-2 text-primary font-bold hover:underline">
            {t('View Map')} <MapPin size={18} />
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {isLoadingEquipment && (
            <div className="col-span-full bg-surface-container-low border border-outline-variant/20 rounded-2xl p-8 text-center">
              <p className="text-on-surface-variant font-medium">{t('Loading listings...')}</p>
            </div>
          )}

          {!isLoadingEquipment && filteredEquipment.length === 0 && (
            <div className="col-span-full bg-surface-container-low border border-outline-variant/20 rounded-2xl p-8 text-center">
              <p className="text-on-surface-variant font-medium">
                {normalizedSearch ? t('No matching equipment found.') : t('No equipment listed yet. Be the first lister!')}
              </p>
            </div>
          )}

          {!isLoadingEquipment && filteredEquipment.map((item) => (
            <div 
              key={item.id}
              onClick={() => onOpenEquipmentDetails(item.id)}
              className="group bg-white rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer border border-outline-variant/10"
            >
              <div className="relative h-56 overflow-hidden">
                <img 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                  src={item.image} 
                  alt={item.title} 
                />
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-primary flex items-center gap-1 shadow-sm">
                  <Star size={12} fill="currentColor" /> {item.rating}
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-headline font-bold text-xl leading-tight mb-2">{item.title}</h3>
                <div className="flex items-center gap-2 text-on-surface-variant text-sm mb-4">
                  <MapPin size={14} /> {item.location}
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-surface-container">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest">{t('Daily Rate')}</span>
                    <span className="text-2xl font-black text-primary">{formatINR(item.dailyRate)}<span className="text-sm font-normal text-on-surface-variant">{t('/day')}</span></span>
                  </div>
                  <button className="bg-primary text-white px-4 py-2 rounded-xl font-bold active:scale-95 transition-transform shadow-md">
                    {t('Rent Now')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Terrain Explorer */}
      <section className="bg-surface-container p-8 rounded-3xl overflow-hidden relative">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-black font-headline text-primary mb-4 leading-tight">{t('Explore the Terrain')}</h2>
            <p className="text-lg text-on-surface-variant mb-8">{t('Visualize equipment location and plot availability in real-time. Optimize your route and save on delivery costs.')}</p>
            <div className="space-y-4">
              <div className="flex items-center gap-4 bg-white/50 p-4 rounded-2xl border border-outline-variant/10">
                <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container">
                  <ArrowRight size={20} />
                </div>
                <div>
                  <h4 className="font-bold">{t('Low-Cost Delivery')}</h4>
                  <p className="text-sm text-on-surface-variant">{t('Available for equipment within 15km')}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="relative h-96 bg-zinc-200 rounded-2xl shadow-inner border border-outline-variant/20 overflow-hidden">
            <img 
              className="w-full h-full object-cover grayscale opacity-60" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuATpqfdTyhD0DpbWnrtotpAHS8vhYrAGsOwcPj0c5jlxNu2ooK0-TA7Br7wUEJVGA0Tv9SUIl51Jgm5DWSKe6n_V_p17tDFPM90pBGrpqiYBhPPm_Rw_86GhVAuII269JWo9uisTvmxWFAI-G-PYVPpW725LUNI9vZtV24ZNYAy-z8S_tkbg6D1BhGrP4Wo2-r1uDdmw1FXLGOI8MAIRHtrBAEQdkC0-bgnhco-4CRK7vE5DfiCkrR83Asb6eLwXSzrvJtq3B5UG0E" 
              alt="Map" 
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                <div className="w-12 h-12 bg-primary rounded-full animate-pulse opacity-20"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <MapPin size={32} className="text-primary" fill="currentColor" />
                </div>
              </div>
            </div>
            <div className="absolute bottom-6 left-6 right-6 glass-effect p-4 rounded-2xl border border-white/40 shadow-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white">
                  <Tractor size={24} />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-tighter">{t('Nearby Equipment')}</p>
                  <p className="font-bold">{t('West Field Hub')}</p>
                </div>
              </div>
              <span className="text-primary font-bold">{t('12 Items')}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

const Tractor = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m10 11 11 .01"/>
    <path d="M11 15.3V11"/>
    <path d="M15 11v4.3"/>
    <path d="M11 18h4"/>
    <path d="M21 11v7.3"/>
    <path d="M21 18h-2"/>
    <circle cx="7" cy="15" r="5"/>
    <path d="M13 11V5h3"/>
  </svg>
);
