'use client';

import Image from 'next/image';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft, Mail, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FormData {
  fullName: string;
  email: string;
  phone: string;
  company: string;
  website: string;
  businessType: string;
  challenge: string;
  message: string;
  receiveMessages: boolean;
}

const steps = [
  { title: 'About You', description: 'Tell us about yourself' },
  { title: 'Your Business', description: 'What do you need help with?' },
  { title: 'Message', description: 'Share your goals' },
];

export function MultiStepContactForm() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    phone: '',
    company: '',
    website: '',
    businessType: '',
    challenge: '',
    message: '',
    receiveMessages: false,
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as any;
    if (type === 'checkbox') {
      setFormData((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Check if current step is complete
  const isStepComplete = () => {
    switch (currentStep) {
      case 0:
        return formData.fullName && formData.email && formData.phone;
      case 1:
        return formData.company && formData.website && formData.businessType && formData.challenge;
      case 2:
        return formData.message && formData.receiveMessages;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (isStepComplete() && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStepComplete()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to submit form');
      }

      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        resetForm();
        setLoading(false);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCurrentStep(0);
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      company: '',
      website: '',
      businessType: '',
      challenge: '',
      message: '',
      receiveMessages: false,
    });
  };

  return (
    <div className="relative rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 sm:p-8 flex flex-col gap-8 overflow-hidden">
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 opacity-60 pointer-events-none">
        <Image
          src="/dog_shake.png"
          alt="Dog shaking"
          fill
          className="object-contain"
        />
      </div>
      <div className="relative z-10 text-white" style={{ textShadow: '0 2px 0 rgba(0, 0, 0, 1)' }}>
      {/* Progress indicator */}
      <div className="flex gap-2">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              i <= currentStep ? 'bg-primary' : 'bg-zinc-200 dark:bg-zinc-800'
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {!submitted ? (
          <motion.form
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            onSubmit={handleSubmit}
            className="flex flex-col gap-6"
          >
            {/* Step header */}
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1">
                {steps[currentStep].title}
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {steps[currentStep].description}
              </p>
            </div>

            {/* Step 1: Personal Info */}
            {currentStep === 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2 sm:col-span-1">
                  <label className="text-xs font-semibold tracking-widest uppercase text-white">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    placeholder="John Smith"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all duration-200"
                  />
                </div>
                <div className="flex flex-col gap-2 sm:col-span-1">
                  <label className="text-xs font-semibold tracking-widest uppercase text-white">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all duration-200"
                  />
                </div>
                <div className="flex flex-col gap-2 sm:col-span-2">
                  <label className="text-xs font-semibold tracking-widest uppercase text-white">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    placeholder="(555) 123-4567"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all duration-200"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Business Info */}
            {currentStep === 1 && (
              <div className="grid grid-cols-1 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold tracking-widest uppercase text-white">
                    Company Name
                  </label>
                  <input
                    type="text"
                    name="company"
                    placeholder="Your Pet Business"
                    value={formData.company}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all duration-200"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold tracking-widest uppercase text-white">
                    Website
                  </label>
                  <input
                    type="url"
                    name="website"
                    placeholder="https://example.com"
                    value={formData.website}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all duration-200"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold tracking-widest uppercase text-white">
                    Business Type
                  </label>
                  <select
                    name="businessType"
                    value={formData.businessType}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-800 dark:text-zinc-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all duration-200"
                  >
                    <option value="">Select your business type</option>
                    <option value="grooming">Grooming Salon</option>
                    <option value="daycare">Pet Daycare</option>
                    <option value="veterinary">Veterinary Clinic</option>
                    <option value="training">Dog Training</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold tracking-widest uppercase text-white">
                    Main Challenge
                  </label>
                  <select
                    name="challenge"
                    value={formData.challenge}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-800 dark:text-zinc-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all duration-200"
                  >
                    <option value="">Select your main challenge</option>
                    <option value="leads">Getting more leads</option>
                    <option value="website">Need a website</option>
                    <option value="seo">Want to rank higher in search</option>
                    <option value="booking">Improve booking system</option>
                    <option value="all">Looking for a full solution</option>
                  </select>
                </div>
              </div>
            )}

            {/* Step 3: Message */}
            {currentStep === 2 && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold tracking-widest uppercase text-white">
                    Tell us more
                  </label>
                  <textarea
                    name="message"
                    placeholder="Share any additional details or goals you'd like to discuss..."
                    rows={5}
                    value={formData.message}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 resize-none transition-all duration-200"
                  />
                </div>

                {/* Checkbox */}
                <div className="flex items-start gap-3 pt-2">
                  <input
                    type="checkbox"
                    name="receiveMessages"
                    id="receiveMessages"
                    checked={formData.receiveMessages}
                    onChange={handleInputChange}
                    className="w-4 h-4 mt-1 cursor-pointer rounded border-zinc-300 text-primary focus:ring-primary/20"
                  />
                  <label htmlFor="receiveMessages" className="text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer">
                    Check this box to receive messages from our sales team. Message frequency varies, and data rates may apply.
                  </label>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                onClick={handlePrev}
                disabled={currentStep === 0}
                variant="outline"
                className="gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              {currentStep < steps.length - 1 ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={!isStepComplete()}
                  className="gap-2 ml-auto"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={!isStepComplete()}
                  className="gap-2 ml-auto"
                >
                  Submit
                  <Mail className="w-4 h-4" />
                </Button>
              )}
            </div>
          </motion.form>
        ) : (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center justify-center gap-4 py-12"
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-white">
              Thank you!
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center max-w-xs">
              We'll get back to you within 24 hours with a personalized strategy.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
