'use client';

import Image from 'next/image';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { ArrowRight, Mail, Phone, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SeparatorPro } from '@/components/ui/seperatorpro';
import GlobeWireframe from '@/components/ui/globe-wireframe';
import { MultiStepContactForm } from '@/components/MultiStepContactForm';

const smoothEase = [0.25, 0.1, 0.25, 1] as const;

const DEFAULT_CONTACT_LINKS = [
  { icon: Mail, label: 'contact@yoursaas.ai', href: 'mailto:contact@yoursaas.ai' },
  { icon: Phone, label: '+1 (800) 321 XX21', href: 'tel:+18003214321' },
  { icon: Headphones, label: 'support@yoursaas.ai', href: 'mailto:support@yoursaas.ai' },
];

interface ContactLink {
  icon: typeof Mail;
  label: string;
  href: string;
}

interface ContactWithGlobeProps {
  title?: string;
  subtitle?: string;
  description?: string;
  contactLinks?: ContactLink[];
  id?: string;
  className?: string;
}

export default function ContactWithGlobe({
  title = 'Contact us',
  subtitle = 'Contact',
  description = 'We are always looking for ways to improve our products and services. Contact us and let us know how we can help you.',
  contactLinks = DEFAULT_CONTACT_LINKS,
  id,
  className,
}: ContactWithGlobeProps) {
  return (
    <section
      id={id}
      className={cn(
        'relative w-full bg-zinc-50 dark:bg-zinc-950 overflow-hidden py-20',
        className,
      )}
    >
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">

        <div className="flex flex-col items-center text-center gap-4 mb-12">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: smoothEase }}
            className="inline-flex items-center px-4 py-1.5 rounded-full bg-rose-500/10 border border-rose-400/30"
          >
            <span className="text-sm text-rose-500 font-medium">{subtitle}</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: 0.15, ease: smoothEase }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-zinc-900 dark:text-white"
          >
            {title}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: 0.3, ease: smoothEase }}
            className="text-base text-zinc-500 dark:text-zinc-400 max-w-md"
          >
            {description}
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 max-w-5xl mx-auto items-start">

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.0, delay: 0.2, ease: smoothEase }}
            className="flex flex-col gap-6"
          >
            <div className="flex flex-col gap-1">
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-white">
               Ready to fill your schedule? 
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-xs">
        Connect with our team to discuss a custom marketing strategy designed specifically for your goals.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {contactLinks.map(({ icon: Icon, label, href }, i) => (
                <motion.a
                  key={label}
                  href={href}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.3 + i * 0.1, ease: smoothEase }}
                  className="group flex items-center gap-3 w-fit text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors duration-200"
                >
                  <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 group-hover:border-rose-300 dark:group-hover:border-rose-500/40 group-hover:bg-rose-50 dark:group-hover:bg-rose-500/10 flex items-center justify-center shrink-0 transition-all duration-200">
                    <Icon className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 group-hover:text-rose-500 dark:group-hover:text-rose-400 transition-colors duration-200" />
                  </div>
                  {label}
                </motion.a>
              ))}
            </div>

            <div className="relative overflow-hidden h-52">
              <GlobeWireframe
                className="w-full aspect-square max-w-full absolute top-0 left-0"
                variant="wireframesolid"
                autoRotate
                autoRotateSpeed={0.45}
                strokeWidth={0.6}
                graticuleOpacity={0.12}
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-zinc-50 dark:from-zinc-950 to-transparent" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.0, delay: 0.35, ease: smoothEase }}
          >
            <MultiStepContactForm />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
