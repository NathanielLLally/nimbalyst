import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service | Happy Tails Paw Care',
  description: 'Terms of Service for Happy Tails Paw Care, the owned brand of Grand St Group, LLC',
};

export default function TermsOfServicePage() {
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
              Terms of Service
            </h1>

            <p className="text-muted-foreground mb-8">
              Last updated: September 19, 2026
            </p>

            <section className="space-y-6 text-muted-foreground leading-relaxed [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_ul]:list-disc [&_ul]:list-inside [&_ul]:space-y-2 [&_ul]:ml-4">
              <p>
                These Terms of Service (the &ldquo;Terms&rdquo;) govern your access to and use of the
                websites, marketing services, and lead-generation services provided by
                Happy Tails Paw Care, an owned brand of Grand St Group, LLC
                (&ldquo;Happy Tails Paw Care,&rdquo; &ldquo;Company,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;). By accessing our
                website, requesting a proposal, signing an order or statement of work, or
                otherwise engaging our services, you (&ldquo;you,&rdquo; &ldquo;Client&rdquo;) agree to be bound by
                these Terms. If you do not agree, do not use our website or services.
              </p>

              <h2>1. Our Services</h2>
              <p>
                We are a marketing agency. We plan, create, and manage paid advertising
                campaigns (for example, on Google, Meta, and similar platforms), perform
                search and content marketing, and generate and deliver sales leads and related
                marketing services to our Clients (collectively, the &ldquo;Services&rdquo;). The specific
                Services, deliverables, fees, and any lead volumes or targets are described in
                the applicable order form, proposal, or statement of work agreed between you
                and us (an &ldquo;Order&rdquo;). If an Order conflicts with these Terms, the Order controls
                for that engagement.
              </p>

              <h2>2. Leads</h2>
              <p>
                A &ldquo;Lead&rdquo; is contact or inquiry information for a prospective customer delivered
                to you through the Services. You acknowledge and agree that:
              </p>
              <ul>
                <li>
                  Leads are prospective contacts only. We do not guarantee that any Lead will
                  respond, qualify, purchase, book, or convert, or that any particular revenue,
                  return on ad spend, or result will be achieved.
                </li>
                <li>
                  Unless your Order expressly states that Leads are exclusive, Leads may be
                  non-exclusive and generated through shared advertising.
                </li>
                <li>
                  You are solely responsible for contacting, qualifying, and following up with
                  Leads, and for doing so in compliance with all applicable laws (see Section 5).
                </li>
                <li>
                  Any lead credit, replacement, or dispute policy is as expressly described in
                  your Order. Absent such terms, Leads are delivered &ldquo;as is.&rdquo;
                </li>
              </ul>

              <h2>3. Advertising Platforms &amp; Third Parties</h2>
              <p>
                Our Services rely on third-party advertising and technology platforms that we
                do not own or control (for example, Google, Meta, and analytics or call-tracking
                providers). Your campaigns are subject to those platforms&rsquo; terms, policies, and
                approval decisions. We are not responsible for a platform&rsquo;s acts or omissions,
                including account suspensions, ad disapprovals, pricing or algorithm changes,
                outages, or changes in available data. Where we purchase advertising on your
                behalf, you authorize us to do so and to use the budgets specified in your Order.
              </p>

              <h2>4. Client Responsibilities</h2>
              <ul>
                <li>
                  Provide accurate business information, access, creative assets, and approvals
                  needed for us to perform the Services, and respond to requests in a timely
                  manner.
                </li>
                <li>
                  Ensure you hold all licenses, registrations, and insurance required to operate
                  your business and to serve the customers generated through the Services.
                </li>
                <li>
                  Honor any representations, offers, or claims made in advertising we run for you,
                  and ensure they are truthful and substantiated.
                </li>
                <li>
                  Maintain your own privacy policy and obtain any consents required to contact
                  and market to Leads.
                </li>
              </ul>

              <h2>5. Compliance with Laws</h2>
              <p>
                Each party will comply with all applicable laws and regulations. You are
                responsible for your use of Leads and your communications with them, including
                compliance with the Telephone Consumer Protection Act (TCPA), the CAN-SPAM Act,
                state calling, texting, and &ldquo;Do Not Call&rdquo; rules, and all applicable advertising,
                consumer-protection, and privacy laws. You will not use the Services or any Lead
                for any unlawful, deceptive, or harassing purpose.
              </p>

              <h2>6. Fees and Payment</h2>
              <p>
                You agree to pay the fees and advertising budgets set forth in your Order. Unless
                the Order states otherwise, fees are due within the time specified on the invoice,
                are non-refundable once the corresponding Services or advertising spend have been
                delivered, and are exclusive of applicable taxes. Late amounts may accrue interest
                at 1.5% per month (or the maximum allowed by law, if lower). We may suspend or stop
                Services, including pausing campaigns, if your account is past due.
              </p>

              <h2>7. Term and Termination</h2>
              <p>
                These Terms apply for as long as you use our website or Services and for the term
                stated in your Order. Either party may terminate an engagement as provided in the
                Order, or immediately on written notice if the other party materially breaches
                these Terms or the Order and fails to cure within 15 days. On termination, you
                remain responsible for fees and advertising spend incurred through the effective
                date of termination, and any provision intended to survive (including Sections
                5, 8&ndash;12) will survive.
              </p>

              <h2>8. Intellectual Property</h2>
              <p>
                We retain all rights in our methods, know-how, software, templates, reports, and
                any materials we create other than those deliverables identified in an Order as
                belonging to you upon full payment. You retain rights in the trademarks, logos,
                and content you provide to us, and you grant us a non-exclusive license to use
                them to perform the Services and, unless you object in writing, to identify you
                as a client in our portfolio and marketing materials.
              </p>

              <h2>9. No Guarantees; Disclaimer</h2>
              <p>
                THE WEBSITE AND SERVICES ARE PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE.&rdquo; TO THE FULLEST
                EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING
                WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
                NON-INFRINGEMENT. WE DO NOT WARRANT ANY SPECIFIC NUMBER, QUALITY, OR CONVERSION OF
                LEADS, ANY RANKING, IMPRESSION, CLICK, OR SALES RESULT, OR THAT THE SERVICES WILL BE
                UNINTERRUPTED OR ERROR-FREE. MARKETING RESULTS DEPEND ON MANY FACTORS OUTSIDE OUR
                CONTROL.
              </p>

              <h2>10. Limitation of Liability</h2>
              <p>
                TO THE FULLEST EXTENT PERMITTED BY LAW, NEITHER PARTY WILL BE LIABLE FOR ANY
                INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR LOST
                PROFITS, REVENUE, DATA, OR GOODWILL, ARISING OUT OF OR RELATED TO THESE TERMS OR
                THE SERVICES, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. OUR TOTAL
                AGGREGATE LIABILITY ARISING OUT OF OR RELATED TO THESE TERMS OR THE SERVICES WILL
                NOT EXCEED THE AMOUNTS YOU PAID TO US FOR THE SERVICES GIVING RISE TO THE CLAIM
                DURING THE THREE (3) MONTHS IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE
                CLAIM.
              </p>

              <h2>11. Indemnification</h2>
              <p>
                You will defend, indemnify, and hold harmless Happy Tails Paw Care and
                Grand St Group, LLC and their officers, members, employees, and agents from and
                against any claims, damages, liabilities, and expenses (including reasonable
                attorneys&rsquo; fees) arising out of or related to: (a) your business, products, or
                services; (b) your use of Leads or your communications with them; (c) advertising
                claims, offers, or content you provide or approve; or (d) your violation of these
                Terms or applicable law.
              </p>

              <h2>12. Confidentiality</h2>
              <p>
                Each party may receive non-public information of the other that is marked or
                reasonably understood to be confidential, including pricing, strategies, and
                customer data. The receiving party will use such information only to perform under
                these Terms and will protect it with reasonable care. This section does not apply
                to information that is or becomes public through no fault of the receiving party,
                was already known to it, or is independently developed or lawfully obtained from a
                third party.
              </p>

              <h2>13. Governing Law and Dispute Resolution</h2>
              <p>
                These Terms are governed by the laws of the State of New York, without regard to
                its conflict-of-laws rules. The parties will attempt in good faith to resolve any
                dispute informally first. Any dispute that cannot be resolved will be subject to
                the exclusive jurisdiction and venue of the state and federal courts located in
                New York County, New York, and each party consents to personal jurisdiction there
                and waives any objection to that venue. The prevailing party in any action to
                enforce these Terms is entitled to recover its reasonable attorneys&rsquo; fees and
                costs.
              </p>

              <h2>14. Changes to These Terms</h2>
              <p>
                We may update these Terms from time to time. When we do, we will revise the
                &ldquo;Last updated&rdquo; date above. Material changes may also be communicated through the
                website or by email. Your continued use of the website or Services after changes
                become effective constitutes acceptance of the updated Terms.
              </p>

              <h2>15. Miscellaneous</h2>
              <p>
                These Terms, together with any applicable Order, are the entire agreement between
                the parties regarding the Services and supersede any prior agreements on that
                subject. If any provision is held unenforceable, the remaining provisions remain
                in effect. Our failure to enforce any provision is not a waiver. You may not assign
                these Terms without our consent; we may assign them in connection with a merger,
                acquisition, or sale of assets. The parties are independent contractors.
              </p>

              <h2>16. Contact Us</h2>
              <p>If you have questions about these Terms, contact us at:</p>
              <div className="bg-card/50 border border-border/40 rounded-lg p-4 text-muted-foreground not-prose">
                <p className="font-semibold text-foreground mb-2">Grand St Group, LLC</p>
                <p>Happy Tails Paw Care (an owned brand of Grand St Group, LLC)</p>
                <p>Email: info@happytailspawcare.com</p>
                <p>Phone: (646) 846-8087</p>
              </div>
            </section>
          </article>
        </div>
      </main>
    </>
  );
}
