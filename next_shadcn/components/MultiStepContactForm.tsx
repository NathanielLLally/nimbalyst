'use client';

import Image from 'next/image';
import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContactThankYou } from '@/components/ContactThankYou';
import { sanitizeE164Input, isPlausibleE164 } from '@/lib/phone-input';

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
  timezone?: string;
  submittedAt?: string;
}

// Field to focus when a page is entered via Next (button, or Enter in the page's last field).
const firstFieldByStep = ['fullName', 'company', 'message'];

const steps = [
  { title: 'About You', description: 'Tell us about yourself' },
  { title: 'Your Business', description: 'What do you need help with?' },
  { title: 'Message', description: 'Share your goals' },
];

// Rich email-validation error: which half of the address is at fault drives
// both the coloring (bad half red, good half blue) and the detail message.
interface EmailValidationError {
  email: string;
  mode: 'domain' | 'username';
  detail: string;
}

// Reject if a promise hasn't settled within `ms`. Without this a hung
// grecaptcha.execute() leaves the submit button stuck on "Submitting…" forever,
// since nothing after the await (including the finally reset) ever runs.
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out, please try again`)), ms);
    p.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
}

export function MultiStepContactForm() {
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  const recaptchaWidgetId = useRef<number | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  const renderBadge = useCallback(() => {
    const grecaptcha = (window as any).grecaptcha;
    if (!grecaptcha?.render || !recaptchaContainerRef.current) return;
    // Guard against double-render (React strict mode / re-loads).
    if (recaptchaWidgetId.current !== null || recaptchaContainerRef.current.childElementCount > 0) return;
    recaptchaWidgetId.current = grecaptcha.render(recaptchaContainerRef.current, {
      sitekey: siteKey,
      size: 'invisible',
      badge: 'inline',
    });
  }, [siteKey]);

  // Callback ref: fires when the container DOM node attaches to the tree.
  // This ensures renderBadge runs AFTER the animated form has mounted,
  // not during the exit animation of the previous step.
  const handleContainerRef = useCallback((node: HTMLDivElement | null) => {
    recaptchaContainerRef.current = node;
    if (node) {
      // Container is now mounted; render the badge
      (window as any).grecaptcha?.ready?.(renderBadge);
    }
  }, [renderBadge]);

  // Load the reCAPTCHA script
  useEffect(() => {
    // Explicit rendering lets us place the v3 badge inside the form instead of
    // Google's default floating bottom-right badge.
    const existing = document.getElementById('recaptcha-script') as HTMLScriptElement | null;
    if (existing) {
      // Script already loaded; if we're on step 2, render now
      (window as any).grecaptcha?.ready?.(renderBadge);
      return;
    }

    const script = document.createElement('script');
    script.id = 'recaptcha-script';
    script.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.onload = () => (window as any).grecaptcha?.ready?.(renderBadge);
    document.head.appendChild(script);
  }, [renderBadge]);

  const [currentStep, setCurrentStep] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  // Set by handleNext so the page-change effect focuses the new page's first field.
  // Not set on initial render, Previous, or the invalid-email bounce, so focus isn't stolen.
  const focusFirstFieldOnStepChange = useRef(false);

  useEffect(() => {
    if (!focusFirstFieldOnStepChange.current) return;
    focusFirstFieldOnStepChange.current = false;
    const field = formRef.current?.elements.namedItem(firstFieldByStep[currentStep]);
    if (field instanceof HTMLElement) field.focus();
  }, [currentStep]);

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
    timezone: '',
    submittedAt: '',
  });

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      submittedAt: new Date().toISOString(),
    }));
  }, []);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<EmailValidationError | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const submitting = useRef(false);
  // Bumped on every submit and on any email/phone edit. A submit only applies
  // its result if its captured seq still matches, so a slow in-flight request
  // (mxCheck + Twilio can take seconds) can't clobber the form after the user
  // has already edited the field it was validating.
  const submitSeq = useRef(0);

  // Abandon any in-flight submit and clear the stuck "Submitting…" button so
  // correcting the field immediately re-enables the form.
  const cancelPendingSubmit = () => {
    submitSeq.current++;
    submitting.current = false;
    setLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as any;
    if (type === 'checkbox') {
      setFormData((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    if (name === 'email') {
      setError(null);
      setEmailError(null);
      cancelPendingSubmit();
    }
    if (name === 'phone') {
      setError(null);
      setPhoneError(null);
      cancelPendingSubmit();
    }
  };

  // Phone field: keep the value in E.164 form (+ and digits only) as the user types.
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const phone = sanitizeE164Input(e.target.value);
    setFormData((prev) => ({ ...prev, phone }));
    setError(null);
    setPhoneError(null);
    cancelPendingSubmit();
  };

  // Check if current step is complete
  const isStepComplete = () => {
    switch (currentStep) {
      case 0:
        return formData.fullName && formData.email && isPlausibleE164(formData.phone);
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
      focusFirstFieldOnStepChange.current = true;
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Enter in a single-line field should move to the next field, or advance to
  // the next step if it's the last field — never submit the whole form early.
  const handleFieldKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const formEl = e.currentTarget.form;
    if (!formEl) return;
    // Only the current step's fields are in the DOM (steps render conditionally).
    const fields = Array.from(
      formEl.querySelectorAll<HTMLElement>('input, select, textarea')
    ).filter((el) => !(el as HTMLInputElement).disabled && el.offsetParent !== null);
    const next = fields[fields.indexOf(e.currentTarget) + 1];
    if (next) {
      next.focus();
    } else {
      handleNext();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStepComplete() || submitting.current) return;
    submitting.current = true;
    const seq = ++submitSeq.current;
    // True once the user has edited email/phone (or started another submit)
    // while this request was in flight — in which case we drop its result.
    const isStale = () => seq !== submitSeq.current;

    setLoading(true);
    setError(null);
    setEmailError(null);
    setPhoneError(null);

    try {
      const isProduction = process.env.NODE_ENV === 'production';
      console.log(`📝 Submitting form${isProduction ? ' (contact tracker disabled in production)' : ''}...`);

      const grecaptcha = (window as any).grecaptcha;
      if (recaptchaWidgetId.current === null) {
        throw new Error('reCAPTCHA is still loading, please try again');
      }
      const token = await withTimeout(
        grecaptcha.execute(recaptchaWidgetId.current, { action: 'submit' }),
        15000,
        'reCAPTCHA'
      );
      console.log('🔐 reCAPTCHA token obtained');

      // Bound the request too: AbortSignal.timeout guarantees the fetch settles
      // (rejects) even if the server stalls, so the button can never hang.
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, recaptchaToken: token }),
        signal: AbortSignal.timeout(45000),
      });

      // User edited the field while this was in flight — ignore the result.
      if (isStale()) return;

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        if (isStale()) return;
        // Email and/or phone can both fail in one response — surface whichever
        // are present so the user can fix them together.
        if (body.emailValidation || body.phoneValidation) {
          if (body.emailValidation) {
            const { email, mxError, mxServer } = body.emailValidation;
            // "no mx record for hostname ..." means the domain itself is bad;
            // anything else is a rejected mailbox at a valid domain.
            const isDomainError = typeof mxError === 'string' && mxError.startsWith('no mx record for hostname');
            setEmailError({
              email,
              mode: isDomainError ? 'domain' : 'username',
              detail: isDomainError
                ? 'wrong domain name'
                : `unknown username says ${mxServer ?? 'mail server'}`,
            });
          }
          if (body.phoneValidation) {
            // Show "Invalid Phone Number" plus whatever the Twilio lookup returned.
            const pv = body.phoneValidation;
            const twilioOutput = pv.twilio !== undefined ? JSON.stringify(pv.twilio, null, 2) : pv.detail;
            setPhoneError(twilioOutput ? String(twilioOutput) : null);
          }
          // Both fields live on step 0 — send the user back so they can fix them.
          setCurrentStep(0);
          return;
        }
        throw new Error(body.error || 'Failed to submit form');
      }

      console.log('✅ Form submitted successfully');
      // Stay on the thank-you view (articles + booking calendar) — no auto-reset.
      setSubmitted(true);
    } catch (err) {
      if (isStale()) return;
      // AbortSignal.timeout rejects with a TimeoutError/AbortError DOMException.
      const isTimeout = err instanceof DOMException && (err.name === 'TimeoutError' || err.name === 'AbortError');
      const errorMessage = isTimeout
        ? 'Submission timed out, please try again'
        : err instanceof Error
          ? err.message
          : 'An error occurred';
      console.error('❌ Form submission error:', errorMessage);
      setError(errorMessage);
    } finally {
      // Unconditionally clear the submit state once the request settles. This
      // is what guarantees the button reverts from "Submitting…" — it must run
      // on every path (success, handled error, thrown error, or early return).
      setLoading(false);
      submitting.current = false;
    }
  };

  return (
    <div className="form-container relative rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-background p-6 sm:p-8 flex flex-col gap-8 overflow-hidden">
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
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="flex flex-col gap-6"
          >
            {/* Step header */}
            <div>
              <h3 className="neon-text text-lg font-semibold text-white mb-1">
                {steps[currentStep].title}
              </h3>
              <p className="text-sm text-white">
                {steps[currentStep].description}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 text-center">
                Your timezone: {formData.timezone || 'Detecting...'}
              </p>
            </div>

            {/* Spacer between the timezone line and the first field (first page only) */}
            {currentStep === 0 && <div aria-hidden="true" className="h-4" />}

            {/* Step 1: Personal Info */}
            {currentStep === 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2 sm:col-span-1">
                  <label className="neon-text text-xs font-semibold tracking-widest uppercase text-white">
                    <span className="neon-icon">👤</span> Name
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    autoComplete="name"
                    placeholder="John Smith"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    onKeyDown={handleFieldKeyDown}
                    required
                    className="w-full bg-[#00000066] border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-base sm:text-sm text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all duration-200"
                  />
                </div>
                <div className="flex flex-col gap-2 sm:col-span-1">
                  <label className="neon-text text-xs font-semibold tracking-widest uppercase text-white">
                    <span className="neon-icon neon-icon--glow">📞</span> Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    autoComplete="tel"
                    inputMode="tel"
                    placeholder="+12125550123"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    onKeyDown={handleFieldKeyDown}
                    required
                    className="w-full bg-[#00000066] border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-base sm:text-sm text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all duration-200"
                  />
                </div>
                <div className="flex flex-col gap-2 sm:col-span-2">
                  <label className="neon-text text-xs font-semibold tracking-widest uppercase text-white">
                    <span className="neon-icon">✉️</span> Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    onKeyDown={handleFieldKeyDown}
                    required
                    className="w-full bg-[#00000066] border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-base sm:text-sm text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all duration-200"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Business Info */}
            {currentStep === 1 && (
              <div className="grid grid-cols-1 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="neon-text text-xs font-semibold tracking-widest uppercase text-white">
                    Company Name
                  </label>
                  <input
                    type="text"
                    name="company"
                    autoComplete="organization"
                    placeholder="Your Pet Business"
                    value={formData.company}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-[#00000066] border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-base sm:text-sm text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all duration-200"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="neon-text text-xs font-semibold tracking-widest uppercase text-white">
                    Website
                  </label>
                  <input
                    type="url"
                    name="website"
                    autoComplete="url"
                    placeholder="https://example.com"
                    value={formData.website}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-[#00000066] border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-base sm:text-sm text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all duration-200"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="neon-text text-xs font-semibold tracking-widest uppercase text-white">
                    Business Type
                  </label>
                  <select
                    name="businessType"
                    value={formData.businessType}
                    onChange={handleInputChange}
                    onKeyDown={handleFieldKeyDown}
                    required
                    className="w-full bg-[#00000066] border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-base sm:text-sm text-zinc-100 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all duration-200"
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
                  <label className="neon-text text-xs font-semibold tracking-widest uppercase text-white">
                    Main Challenge
                  </label>
                  <select
                    name="challenge"
                    value={formData.challenge}
                    onChange={handleInputChange}
                    onKeyDown={handleFieldKeyDown}
                    required
                    className="w-full bg-[#00000066] border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-base sm:text-sm text-zinc-100 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all duration-200"
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
                  <label className="neon-text text-xs font-semibold tracking-widest uppercase text-white">
                    What are your current challenges?
                  </label>
                  <textarea
                    name="message"
                    placeholder="We could use more clients"
                    rows={5}
                    value={formData.message}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-[#00000066] border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-base sm:text-sm text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 resize-none transition-all duration-200"
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
                    className="w-8 h-8 shrink-0 cursor-pointer rounded border-zinc-300 text-primary focus:ring-primary/20"
                  />
                  <label htmlFor="receiveMessages" className="text-xs text-white cursor-pointer">
                    Check this box to receive messages from our sales team. Message frequency varies, and data rates may apply.
                  </label>
                </div>
              </div>
            )}

            {/* reCAPTCHA v3 inline badge. Mounted once at form scope and only
                hidden (display:none) off the last step — never unmounted — so
                the rendered widget's DOM node survives step navigation and its
                widget id stays valid for grecaptcha.execute() at submit time. */}
            <div className={`flex justify-center pt-4 ${currentStep === 2 ? '' : 'hidden'}`}>
              <div ref={handleContainerRef} />
            </div>

            {/* Error messages — styled like the rose "Get Started" label
                (rose text on a translucent rose pill with a rounded border).
                Email and phone can both show at once. */}
            {emailError && (() => {
              const atIdx = emailError.email.lastIndexOf('@');
              const local = emailError.email.slice(0, atIdx);
              const domain = emailError.email.slice(atIdx + 1);
              return (
                <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-500">
                  Invalid Email: <span className="text-white">&quot;</span>
                  {emailError.mode === 'domain' ? (
                    <>
                      <span className="text-blue-500">{local}</span>
                      <span className="text-white">@</span>
                      <span className="text-black underline decoration-black [text-shadow:1px_1px_3px_rgb(239_68_68)]">{domain}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-black underline decoration-black [text-shadow:1px_1px_3px_rgb(239_68_68)]">{local}</span>
                      <span className="text-white">@</span>
                      <span className="text-blue-500">{domain}</span>
                    </>
                  )}
                  <span className="text-white">&quot;</span>, {emailError.detail}
                </p>
              );
            })()}
            {phoneError && (
              <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-500">
                <p>Invalid Phone Number</p>
                <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-xs font-normal">{phoneError}</pre>
              </div>
            )}
            {!emailError && !phoneError && error && (
              <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-500">{error}</p>
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
                // Distinct keys force separate <button> elements. Without them React
                // reuses the clicked Next button and flips it to type="submit" before
                // the browser runs the click's default action, which then submits
                // the form (visible after an invalid-email bounce, when page 3 is
                // already filled in).
                <Button
                  key="next"
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
                  key="submit"
                  type="submit"
                  disabled={!isStepComplete() || loading}
                  className="gap-2 ml-auto"
                >
                  {loading ? 'Submitting…' : 'Submit'}
                  <Mail className="w-4 h-4" />
                </Button>
              )}
            </div>
          </form>
        ) : (
          <ContactThankYou />
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
