'use client';

import { useState } from 'react';
import { Target, TrendingUp, Mail, Monitor, FileText, BarChart2 } from 'lucide-react';
import { CardHoverLift } from '@/components/hover-lift';

interface ServiceBullet {
  text: string;
}

interface Service {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: 'teal' | 'coral';
  title: string;
  description: string;
  bullets: ServiceBullet[];
  modalDesc: string;
  wide?: boolean;
}

interface ServicesProps {
  sectionLabel?: string;
  headline?: string;
  subtext?: string;
  services?: Service[];
}

const defaultServices: Service[] = [
  {
    id: 'lead-gen',
    icon: Target,
    iconColor: 'teal',
    title: 'Lead Generation',
    description: 'We craft custom, highly targeted Google & Facebook campaigns directed specifically at local dog, cat, and exotic pet owners. Instantly fetch high-intent customers when they actively need grooming, veterinary, or training sessions.',
    modalDesc: 'Highly optimized ad campaigns targeted directly to pet parents in your specific zip codes.',
    bullets: [
      { text: 'Meta Ads (Facebook & Instagram) crafted with cute, high-converting pet creatives.' },
      { text: 'Google Local Service Ads (LSA) to display premium booking options right at the top of google searches.' },
      { text: 'Advanced geotargeting filtering out non-pet owners to save advertising budgets.' },
      { text: 'Conversion tracking linked straight to call/booking confirmations.' },
    ],
  },
  {
    id: 'crm-integration',
    icon: Monitor,
    iconColor: 'coral',
    title: 'CRM Integration',
    description: 'Streamline your front-desk operations. We integrate industry-standard software (Gingr, Kennel Connection, HubSpot, Salesforce) with your website so bookings, pet vaccination record collection, and payment workflows sync smoothly.',
    modalDesc: 'Hook up your website booking pipeline to the industry-leading pet management platforms.',
    bullets: [
      { text: 'Seamless integrations with Gingr, Kennel Connection, HubSpot, Salesforce, etc.' },
      { text: 'Automated collection of immunization details, waiver signatures, and dog details on signup.' },
      { text: 'Secure pre-authorized credit card billing to dramatically reduce last-minute cancellations.' },
      { text: 'Automated SMS notifications regarding drop-off and pickup times.' },
    ],
  },
  {
    id: 'seo',
    icon: TrendingUp,
    iconColor: 'teal',
    title: 'SEO Optimization',
    description: 'Dominate your local search results. We rank your brand #1 for critical local search phrases (e.g., "best vet near me", "dog groomer weekend hours"). Drive continuous, free organic traffic directly to your website.',
    modalDesc: 'Secure local map packs and top rank positions for long-term organic traffic.',
    bullets: [
      { text: 'Google Business Profile (GBP) complete layout and review management blueprint.' },
      { text: 'On-page schemas designed specifically for Veterinarians and Local Pet Grooming services.' },
      { text: 'Citation building on major pet directories (Yelp, BringFido, VetRating, etc.).' },
      { text: 'Strategic content focused around keyword searches like "groomer open sundays" or "vaccine clinic prices".' },
    ],
  },
  {
    id: 'web-design',
    icon: FileText,
    iconColor: 'coral',
    title: 'Website Design',
    description: 'We build blisteringly fast, breathtakingly beautiful, mobile-responsive websites tailored for pet brands. Our web experiences are heavily optimized for conversions, ensuring pet owners take immediate action to call or book.',
    modalDesc: 'Gorgeous, modern, responsive portals tailored for high-volume conversion.',
    bullets: [
      { text: 'Fast loading times across mobile phones and desktop displays.' },
      { text: 'UI design created specifically to address pet parent anxiety (social proof, safety assurances).' },
      { text: 'Interactive widgets like booking calendars, digital pet portals, and price calculator sheets.' },
      { text: 'Full accessibility compliance (WCAG) and secure SSL hosting setups.' },
    ],
  },
  {
    id: 'email',
    icon: Mail,
    iconColor: 'teal',
    title: 'Email Outreach',
    description: 'Nurture existing clients and reactivate dormant ones with automated email sequences. Build loyalty with custom pet birthday club incentives, vaccination and booster reminders, and tailored seasonal promotions.',
    modalDesc: 'Build continuous lifetime value with automated newsletters and trigger alerts.',
    bullets: [
      { text: 'Strategic email triggers for rabies and bordetella booster renewals.' },
      { text: 'Automated "Pet Birthday Clubs" driving booking spikes during slower seasons.' },
      { text: "Win-back campaigns targeting clients who haven't booked in over 90 days." },
      { text: 'Segmented newsletters containing professional pet care tips, and exclusive boutique discount codes.' },
    ],
  },
  {
    id: 'content',
    icon: FileText,
    iconColor: 'coral',
    title: 'Content Strategy',
    description: 'We script, design, and manage viral pet social media campaigns and highly readable educational articles. Cultivate a dedicated local pet community that loves, shares, and continuously promotes your brand online.',
    modalDesc: 'Establish local community trust with incredible blog and social media assets.',
    bullets: [
      { text: 'TikTok and Instagram Reels ideation and video scripting for staff members.' },
      { text: 'Highly readable blog content explaining complex veterinary or training subjects simply.' },
      { text: 'Printable local grooming guides, pet nutrition checklists, or holiday hazard infographics.' },
      { text: 'Monthly content calendars tailored for seasonal pet alerts (heatwaves, fleas, fireworks).' },
    ],
  },
  {
    id: 'analytics',
    icon: BarChart2,
    iconColor: 'teal',
    title: 'Analytics & Dashboard Tracking',
    description: 'Stop guessing. We construct clear, easy-to-read client acquisition dashboards showing your exact cost-per-booking, lifetime values, conversion rates, and exact marketing return on investment (ROI). Watch your marketing dollars work.',
    modalDesc: 'Trace every single marketing dollar spent back to a literal dog or cat booking.',
    wide: true,
    bullets: [
      { text: 'Custom web-based dashboard showing live phone calls, clicks, and reservation inputs.' },
      { text: 'Customer Acquisition Cost (CAC) breakdowns per booking channel.' },
      { text: 'Estimated Client Lifetime Value (LTV) trackers to measure total campaign gains.' },
      { text: 'Plain-english monthly briefings explaining exactly what generated the highest return.' },
    ],
  },
];

export function Services({
  sectionLabel = 'Specialized Solutions',
  headline = 'Our Suite of Elite Pet Marketing Services',
  subtext = 'We deliver the exact core capabilities necessary to establish market dominance, optimize operations, and secure predictable client booking systems.',
  services = defaultServices,
}: ServicesProps) {
  const [modalService, setModalService] = useState<Service | null>(null);

  const openModal = (service: Service) => setModalService(service);
  const closeModal = () => setModalService(null);

  const colorClasses = {
    teal: {
      bg: 'bg-teal-50',
      text: 'text-teal-600',
      hover: 'group-hover:text-teal-600',
      btn: 'text-teal-600 hover:text-teal-800',
    },
    coral: {
      bg: 'bg-coral-50',
      text: 'text-coral-500',
      hover: 'group-hover:text-coral-500',
      btn: 'text-coral-500 hover:text-coral-700',
    },
  };

  return (
    <section className="py-20 lg:py-28 bg-card/20 border-y border-border/40" id="services">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
          <span className="text-sm font-bold uppercase tracking-wider text-primary font-display">
            {sectionLabel}
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground font-display">
            {headline}
          </h2>
          <p className="text-lg text-muted-foreground">{subtext}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service) => {
            const c = colorClasses[service.iconColor];
            if (service.wide) {
              return (
                <CardHoverLift
                  key={service.id}
                  className="bg-background p-8 rounded-2xl border border-border/40 hover:border-primary/40 transition-colors flex flex-col md:col-span-2 lg:col-span-3"
                >
                  <div className="flex flex-col md:flex-row gap-6 md:items-center">
                    <div className={`w-14 h-14 rounded-2xl ${c.bg} flex-shrink-0 flex items-center justify-center ${c.text} group-hover:scale-110 transition-transform`}>
                      <service.icon className="w-6 h-6" />
                    </div>
                    <div className="flex-grow">
                      <h3 className={`text-2xl font-bold text-foreground font-display mb-2 transition-colors ${c.hover}`}>
                        {service.title}
                      </h3>
                      <p className="text-muted-foreground text-sm leading-relaxed mb-4">{service.description}</p>
                    </div>
                    <div className="flex-shrink-0 self-end md:self-center">
                      <button
                        onClick={() => openModal(service)}
                        className="inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm font-bold text-white bg-primary hover:bg-primary/90 transition-colors shadow-md shadow-primary/10"
                      >
                        Explaining Analytics <i className="fa-solid fa-circle-info ml-2" />
                      </button>
                    </div>
                  </div>
                </CardHoverLift>
              );
            }
            return (
              <CardHoverLift
                key={service.id}
                className="bg-background p-8 rounded-2xl border border-border/40 hover:border-primary/40 transition-colors flex flex-col h-full"
              >
                <div className={`w-14 h-14 rounded-2xl ${c.bg} flex items-center justify-center ${c.text} mb-6 group-hover:scale-110 transition-transform`}>
                  <service.icon className="w-6 h-6" />
                </div>
                <h3 className={`text-2xl font-bold text-foreground font-display mb-3 transition-colors ${c.hover}`}>
                  {service.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-6 flex-grow">{service.description}</p>
                <button
                  onClick={() => openModal(service)}
                  className={`inline-flex items-center gap-1.5 text-sm font-extrabold ${c.btn} transition-colors`}
                >
                  Learn More <i className="fa-solid fa-arrow-right" />
                </button>
              </CardHoverLift>
            );
          })}
        </div>
      </div>

      {modalService && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div
            className="bg-background rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-border/40 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-card flex items-center justify-center text-muted-foreground hover:bg-card/80 transition-all"
              aria-label="Close Modal"
            >
              <i className="fa-solid fa-xmark" />
            </button>

            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                    colorClasses[modalService.iconColor].bg
                  } ${colorClasses[modalService.iconColor].text}`}
                >
                  <modalService.icon className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-display">
                    Service Focus
                  </span>
                  <h3 className="text-2xl font-black text-foreground font-display leading-tight">
                    {modalService.title}
                  </h3>
                </div>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">{modalService.modalDesc}</p>

              <div className="space-y-3 pt-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-display">
                  What&apos;s Included in the System:
                </p>
                <ul className="space-y-3">
                  {modalService.bullets.map((b, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center mt-0.5">
                        <i className="fa-solid fa-check text-xs" />
                      </span>
                      <span>{b.text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-4 border-t border-border/40">
                <a
                  href="#contact"
                  onClick={closeModal}
                  className="flex-grow inline-flex items-center justify-center w-full py-3 rounded-xl text-sm font-bold text-white bg-primary hover:bg-primary/90 transition-colors shadow-md"
                >
                  Get Started 🐾
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

