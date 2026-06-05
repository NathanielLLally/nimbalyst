'use client';

import { useState } from 'react';
import type { RegisteredComponent } from '@builder.io/sdk-react-native';

interface ROICalculatorProps {
  sectionLabel?: string;
  headline?: string;
  subtext?: string;
  infoBoxText?: string;
  infoBoxSubtext?: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export function ROICalculator({
  sectionLabel = 'Grow-O-Meter',
  headline = 'Estimate Your Pet Business Growth 📈',
  subtext = 'Input your current client numbers and average appointment cost, then slide your target growth to watch how Happy Tails Paw Care can amplify your monthly and annual revenue!',
  infoBoxText = 'Wait, where does this revenue come from?',
  infoBoxSubtext = 'By optimizing your local SEO, capturing lost site traffic, and deploying highly targeted local social ads, we reliably scale bookings by 15% to 50%+ within the first 90 days.',
  ctaLabel = 'Lock in This Growth Model! 🦴',
  ctaHref = '#contact',
}: ROICalculatorProps) {
  const [avgTicket, setAvgTicket] = useState(75);
  const [currentClients, setCurrentClients] = useState(200);
  const [growthPercent, setGrowthPercent] = useState(25);

  const newClients = Math.round(currentClients * (growthPercent / 100));
  const extraMonthly = newClients * avgTicket;
  const extraAnnual = extraMonthly * 12;

  const wagText = (() => {
    if (extraAnnual > 150000)
      return `🦴 Equivalent to ${Math.round(extraAnnual / 150).toLocaleString()} luxury grooming tables!`;
    if (extraAnnual > 60000)
      return `🐱 Equivalent to ${Math.round(extraAnnual / 1200).toLocaleString()} cat climbing castles!`;
    return `🐾 ${Math.round(extraAnnual / 1.2).toLocaleString()} squeaky toys!`;
  })();

  return (
    <section className="py-20 lg:py-28" id="calculator">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 space-y-6">
            <span className="text-sm font-bold uppercase tracking-wider text-coral-500 font-display">
              {sectionLabel}
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 font-display leading-[1.2]">
              {headline}
            </h2>
            <p className="text-gray-600">{subtext}</p>
            <div className="p-6 bg-coral-50 rounded-2xl border border-coral-100 flex items-start gap-4">
              <span className="text-3xl">🦴</span>
              <div>
                <p className="font-display font-bold text-gray-900 text-base">{infoBoxText}</p>
                <p className="text-xs text-gray-600 leading-relaxed mt-1">{infoBoxSubtext}</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-white p-8 sm:p-10 rounded-3xl shadow-xl border border-gray-100 relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-teal-50 rounded-full" />

            <div className="relative space-y-8">
              <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 font-display">
                  <i className="fa-solid fa-calculator text-teal-500 mr-2" /> Tail-Wag-o-Meter
                </h3>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest bg-gray-100 px-3 py-1 rounded-full">
                  Live Estimator
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm font-semibold">
                  <label className="text-gray-700 flex items-center gap-1.5">
                    <i className="fa-solid fa-hand-holding-dollar text-gray-400" /> Avg. Appointment / Service Ticket
                  </label>
                  <span className="text-teal-600 font-extrabold text-lg">${avgTicket}</span>
                </div>
                <input
                  type="range"
                  min={25} max={250} step={5} value={avgTicket}
                  onChange={(e) => setAvgTicket(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-500"
                />
                <div className="flex justify-between text-[10px] text-gray-400 font-medium">
                  <span>$25 (Wash/Nails)</span>
                  <span>$125 (Full Grooming)</span>
                  <span>$250 (Vet/Surgery)</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm font-semibold">
                  <label className="text-gray-700 flex items-center gap-1.5">
                    <i className="fa-solid fa-users text-gray-400" /> Current Monthly Active Clients
                  </label>
                  <span className="text-teal-600 font-extrabold text-lg">{currentClients}</span>
                </div>
                <input
                  type="range"
                  min={30} max={1000} step={10} value={currentClients}
                  onChange={(e) => setCurrentClients(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-500"
                />
                <div className="flex justify-between text-[10px] text-gray-400 font-medium">
                  <span>30 (Boutique)</span>
                  <span>500 (Groomer/Resort)</span>
                  <span>1,000+ (Large Vet)</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm font-semibold">
                  <label className="text-gray-700 flex items-center gap-1.5">
                    <i className="fa-solid fa-arrow-trend-up text-coral-500" /> Target Growth with Happy Tails
                  </label>
                  <span className="text-coral-500 font-extrabold text-lg">+{growthPercent}%</span>
                </div>
                <input
                  type="range"
                  min={5} max={100} step={5} value={growthPercent}
                  onChange={(e) => setGrowthPercent(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-coral-500"
                />
                <div className="flex justify-between text-[10px] text-gray-400 font-medium">
                  <span>+5% (Steady)</span>
                  <span>+25% (Average)</span>
                  <span>+100% (Maximum Launch)</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                <div className="bg-teal-50 border border-teal-100 p-5 rounded-2xl flex flex-col justify-center">
                  <span className="text-xs font-bold text-teal-700 uppercase tracking-wider font-display mb-1">
                    New Extra Monthly Revenue
                  </span>
                  <span className="text-3xl font-black text-teal-700 font-display">
                    ${extraMonthly.toLocaleString()}
                  </span>
                  <span className="text-xs text-teal-600 font-semibold mt-1">
                    +{newClients} new bookings / mo
                  </span>
                </div>

                <div className="bg-coral-50 border border-coral-100 p-5 rounded-2xl flex flex-col justify-center relative overflow-hidden">
                  <div className="absolute -bottom-4 -right-4 text-coral-200/50 text-7xl font-black rotate-12">
                    <i className="fa-solid fa-gift" />
                  </div>
                  <span className="text-xs font-bold text-coral-700 uppercase tracking-wider font-display mb-1 relative z-10">
                    Extra Annualized Growth
                  </span>
                  <span className="text-3xl font-black text-coral-700 font-display relative z-10">
                    ${extraAnnual.toLocaleString()}
                  </span>
                  <span className="text-xs text-coral-600 font-semibold mt-1 relative z-10">{wagText}</span>
                </div>
              </div>

              <div className="text-center pt-2">
                <a
                  href={ctaHref}
                  className="inline-flex items-center justify-center w-full py-4 rounded-xl text-base font-extrabold text-white bg-teal-500 hover:bg-teal-700 active:scale-95 transition-all shadow-md shadow-teal-500/25"
                >
                  {ctaLabel}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export const roiCalculatorConfig: RegisteredComponent = {
  component: ROICalculator,
  name: 'ROI Calculator',
  inputs: [
    { name: 'sectionLabel', type: 'string', defaultValue: 'Grow-O-Meter' },
    { name: 'headline', type: 'string', defaultValue: 'Estimate Your Pet Business Growth 📈' },
    { name: 'subtext', type: 'longText', defaultValue: 'Input your current client numbers and average appointment cost.' },
    { name: 'infoBoxText', type: 'string', defaultValue: 'Wait, where does this revenue come from?' },
    { name: 'infoBoxSubtext', type: 'longText', defaultValue: 'By optimizing your local SEO, capturing lost site traffic, and deploying highly targeted local social ads, we reliably scale bookings by 15% to 50%+ within the first 90 days.' },
    { name: 'ctaLabel', type: 'string', defaultValue: 'Lock in This Growth Model! 🦴' },
    { name: 'ctaHref', type: 'string', defaultValue: '#contact' },
  ],
};
