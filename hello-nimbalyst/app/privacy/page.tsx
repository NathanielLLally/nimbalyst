import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy | Happy Tails Paw Care',
  description: 'Privacy policy for Happy Tails Paw Care marketing services',
};

export default function PrivacyPage() {
  return (
    <>
      {/* Header padding for fixed navbar */}
      <div className="h-[85px]" />

      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-3xl px-4 md:px-6 py-16">
          {/* Back button */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          {/* Content */}
          <article className="prose prose-invert max-w-none">
            <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-8">
              Privacy Policy
            </h1>

            <p className="text-muted-foreground mb-8">
              Last updated: June 5, 2024
            </p>

            <section className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">1. Introduction</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Happy Tails Paw Care ("we," "us," "our," or "Company") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">2. Information We Collect</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  We may collect information about you in a variety of ways. The information we may collect on the site includes:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Personal Information: name, email address, phone number, company name, and website</li>
                  <li>Business Information: type of pet business, main challenges, and service interests</li>
                  <li>Automatically Collected Information: browser type, IP address, and pages visited</li>
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">3. Use of Your Information</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the site to:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Contact you regarding your inquiry or service request</li>
                  <li>Generate analytics to improve our website and services</li>
                  <li>Provide you with marketing communications about services that may be of interest</li>
                  <li>Deliver targeted advertising and promotional materials</li>
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">4. Disclosure of Your Information</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  We may share your information with:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Our team members who need to know the information to provide services to you</li>
                  <li>Third-party service providers that assist us in operating our website and conducting our business</li>
                  <li>Legal authorities when required by law or to protect our rights</li>
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">5. Security of Your Information</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We use administrative, technical, and physical security measures to protect your personal information. However, perfect security does not exist on the Internet.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">6. Contact Us</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  If you have questions or comments about this Privacy Policy, please contact us at:
                </p>
                <div className="bg-card/50 border border-border/40 rounded-lg p-4 text-muted-foreground">
                  <p className="font-semibold text-foreground mb-2">Happy Tails Paw Care</p>
                  <p>Email: info@happytailspawcare.com</p>
                  <p>Phone: (646) 846-8087</p>
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">7. Changes to This Privacy Policy</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We may update this privacy policy from time to time in order to reflect changes to our practices or other operational, legal or regulatory reasons. We will notify you of any changes by updating the "Last updated" date of this Privacy Policy.
                </p>
              </div>
            </section>
          </article>
        </div>
      </main>
    </>
  );
}
