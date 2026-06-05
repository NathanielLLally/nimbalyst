'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: 'How long does it take to see results?',
    answer: 'Most of our clients see meaningful results within 30-60 days. Lead generation campaigns typically show traction in the first month, while SEO and content strategies build momentum over 3-6 months. We provide detailed monthly reports so you can track progress every step of the way.',
  },
  {
    question: 'Do you work with all types of pet businesses?',
    answer: 'Yes! We specialize in grooming salons, veterinary clinics, dog training facilities, pet daycares, and exotic pet services. Whether you\'re a solo operation or multi-location business, we customize our approach to your specific market and goals.',
  },
  {
    question: 'What\'s included in your service packages?',
    answer: 'Each package is tailored to your needs, but typically includes strategy development, campaign setup, ongoing optimization, performance tracking, and monthly strategy calls. We also handle integrations with your existing software like Gingr, Kennel Connection, or HubSpot.',
  },
  {
    question: 'Can you guarantee more bookings?',
    answer: 'We can\'t guarantee specific booking numbers, but we guarantee effort and transparency. We track every marketing dollar and show you exactly which channels drive bookings. Most clients see 30-200% increases in qualified leads within their first year.',
  },
  {
    question: 'What if I already have a website?',
    answer: 'Perfect! We can audit your existing website, optimize it for conversions, and integrate it with your booking system and CRM. We don\'t always need to rebuild—sometimes strategic enhancements deliver the best ROI.',
  },
  {
    question: 'How do you measure success?',
    answer: 'We focus on metrics that matter: cost per booking, customer lifetime value, booking volume, and appointment no-show rates. Every month, you\'ll see a detailed dashboard showing your exact ROI and which strategies are working hardest.',
  },
  {
    question: 'Do you handle social media and content?',
    answer: 'Yes! Our Content Strategy service includes TikTok & Instagram Reels scripting, blog content creation, seasonal campaigns, and community engagement strategies. We create content that pet parents actually love to share.',
  },
  {
    question: 'What\'s the typical contract length?',
    answer: 'We typically recommend a 3-6 month initial engagement to build momentum and prove ROI. After that, many clients stay on retainer for ongoing optimization and new campaign launches. We\'re flexible and focus on delivering value at every stage.',
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-20 lg:py-28 bg-card/20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-4 mb-16">
          <Badge variant="outline" className="border-primary/40 text-primary px-4 py-1 text-xs tracking-widest uppercase font-mono">
            Questions?
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Got questions about our services? We've answered the most common ones below.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-background border border-border/40 rounded-xl overflow-hidden hover:border-border/60 transition-colors"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-accent/30 transition-colors text-left"
              >
                <span className="font-semibold text-foreground pr-4">{faq.question}</span>
                <ChevronDown
                  className={`w-5 h-5 text-primary flex-shrink-0 transition-transform duration-300 ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {openIndex === index && (
                <div className="border-t border-border/40 bg-accent/10 px-6 py-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-muted-foreground mb-4">Still have questions?</p>
          <a
            href="/#contact"
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm font-bold text-white bg-primary hover:bg-primary/90 transition-colors shadow-md"
          >
            Get in touch with our team
          </a>
        </div>
      </div>
    </section>
  );
}
