import { CheckCircle, ExternalLink, FileText, BarChart3, ClipboardCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export interface ThankYouArticle {
  url: string;
  source: string;
  title: string;
  summary: string;
  icon: LucideIcon;
}

export const THANK_YOU_ARTICLES: ThankYouArticle[] = [
  {
    url: 'https://www.mortech.com/hs-fs/hub/25649/file-13535879-pdf/docs/mit_study.pdf',
    source: 'MIT Lead Response Study (PDF)',
    title: 'The Lead Response Management Study',
    summary:
      'The classic MIT research showing how quickly the odds of reaching and qualifying a lead fall off in the first minutes after they reach out.',
    icon: FileText,
  },
  {
    url: 'https://ainora.lt/blog/lead-response-time-statistics-every-study-2026',
    source: 'Ainora',
    title: 'Lead Response Time Statistics: Every Study (2026)',
    summary:
      'A roundup of the major lead response time studies and what they mean for how fast a business should follow up.',
    icon: BarChart3,
  },
  {
    url: 'https://recapio.com/digest/how-to-build-a-confirmation-page-that-makes-people-show-up-ready-to-buy-by-jeremy-haynes',
    source: 'Recapio · Jeremy Haynes',
    title: 'Confirmation Pages That Make People Show Up Ready to Buy',
    summary:
      'Why the page after the form matters, and how to use it to turn a new inquiry into a booked, prepared prospect.',
    icon: ClipboardCheck,
  },
];

export const CAL_BOOKING_URL = 'https://cal.com/happy-tails-paw-care/leads?overlayCalendar=true';

export function ContactThankYou() {
  return (
    <div className="flex flex-col gap-6 py-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <CheckCircle className="w-7 h-7 text-primary" />
        </div>
        <h3 className="text-xl font-semibold text-white">Thank you!</h3>
        <p className="text-sm text-zinc-300 max-w-sm">
          We&apos;ll be in touch shortly. While you wait, here&apos;s why speed-to-lead matters.
        </p>
      </div>

      <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]" style={{ textShadow: 'none' }}>
        {THANK_YOU_ARTICLES.map(({ url, source, title, summary, icon: Icon }) => (
          <Card
            key={url}
            role="article"
            className="relative flex flex-col bg-background/80 backdrop-blur-sm transition-colors hover:border-primary focus-within:border-primary"
          >
            <CardHeader className="p-4 pb-2 space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Icon className="w-4 h-4 text-primary shrink-0" />
                <span className="truncate">{source}</span>
              </div>
              <CardTitle className="text-base leading-snug">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="after:absolute after:inset-0 focus:outline-none"
                >
                  {title}
                </a>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 flex flex-col gap-3 flex-1">
              <CardDescription>{summary}</CardDescription>
              <span className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-primary">
                Read <ExternalLink className="w-3 h-3" />
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <h4 className="text-lg font-semibold text-white text-center">Book your strategy call</h4>
        <iframe
          src={CAL_BOOKING_URL}
          title="Book a call with Happy Tails Paw Care"
          className="w-full h-[700px] rounded-lg border border-zinc-200 dark:border-zinc-800 bg-background"
          loading="lazy"
        />
      </div>
    </div>
  );
}
