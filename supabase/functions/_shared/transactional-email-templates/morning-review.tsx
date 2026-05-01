/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
  Row,
  Column,
  Button,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Rainz'

interface MorningReviewProps {
  name?: string
  language?: string
  locationName?: string
  temperature?: string
  high?: string
  low?: string
  condition?: string
  summary?: string
  tip?: string
  unit?: string
  date?: string
  appUrl?: string
}

// Localized strings — Scandinavian focus + EN fallback.
const STRINGS: Record<string, Record<string, string>> = {
  en: {
    preview: 'Your morning weather review',
    greeting: 'Good morning',
    today: "Today's forecast",
    tip: 'Tip',
    cta: 'Open Rainz',
    footer: 'Have a great day!',
    high: 'High',
    low: 'Low',
  },
  no: {
    preview: 'Din morgenvær-rapport',
    greeting: 'God morgen',
    today: 'Dagens værmelding',
    tip: 'Tips',
    cta: 'Åpne Rainz',
    footer: 'Ha en flott dag!',
    high: 'Høy',
    low: 'Lav',
  },
  sv: {
    preview: 'Din morgon-väderrapport',
    greeting: 'God morgon',
    today: 'Dagens väderprognos',
    tip: 'Tips',
    cta: 'Öppna Rainz',
    footer: 'Ha en fin dag!',
    high: 'Hög',
    low: 'Låg',
  },
  da: {
    preview: 'Din morgenvejrrapport',
    greeting: 'Godmorgen',
    today: 'Dagens vejrudsigt',
    tip: 'Tip',
    cta: 'Åbn Rainz',
    footer: 'Hav en dejlig dag!',
    high: 'Høj',
    low: 'Lav',
  },
  de: {
    preview: 'Dein Morgen-Wetterbericht',
    greeting: 'Guten Morgen',
    today: 'Heutige Wettervorhersage',
    tip: 'Tipp',
    cta: 'Rainz öffnen',
    footer: 'Schönen Tag!',
    high: 'Höchst',
    low: 'Tiefst',
  },
  fr: {
    preview: 'Votre revue météo du matin',
    greeting: 'Bonjour',
    today: "Prévisions d'aujourd'hui",
    tip: 'Conseil',
    cta: 'Ouvrir Rainz',
    footer: 'Bonne journée !',
    high: 'Max',
    low: 'Min',
  },
  es: {
    preview: 'Tu resumen del clima matutino',
    greeting: 'Buenos días',
    today: 'Pronóstico de hoy',
    tip: 'Consejo',
    cta: 'Abrir Rainz',
    footer: '¡Que tengas un gran día!',
    high: 'Máx',
    low: 'Mín',
  },
}

const t = (lang: string, key: string) =>
  STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key

const MorningReviewEmail = ({
  name,
  language = 'en',
  locationName = '',
  temperature = '',
  high = '',
  low = '',
  condition = '',
  summary = '',
  tip = '',
  unit = '°C',
  date = '',
  appUrl = 'https://rainz.net',
}: MorningReviewProps) => {
  const lang = STRINGS[language] ? language : 'en'
  const greeting = name
    ? `${t(lang, 'greeting')}, ${name}!`
    : `${t(lang, 'greeting')}!`

  return (
    <Html lang={lang} dir="ltr">
      <Head />
      <Preview>{t(lang, 'preview')}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={brand}>{SITE_NAME}</Heading>
            {date && <Text style={dateText}>{date}</Text>}
          </Section>

          <Heading style={h1}>{greeting}</Heading>

          {locationName && (
            <Text style={locationText}>📍 {locationName}</Text>
          )}

          <Section style={weatherCard}>
            <Row>
              <Column style={tempCol}>
                <Text style={bigTemp}>
                  {temperature}
                  <span style={tempUnit}>{unit}</span>
                </Text>
                {condition && <Text style={conditionText}>{condition}</Text>}
              </Column>
              <Column style={hiloCol}>
                {high && (
                  <Text style={hiloText}>
                    ↑ {t(lang, 'high')}: <strong>{high}{unit}</strong>
                  </Text>
                )}
                {low && (
                  <Text style={hiloText}>
                    ↓ {t(lang, 'low')}: <strong>{low}{unit}</strong>
                  </Text>
                )}
              </Column>
            </Row>
          </Section>

          {summary && (
            <Section style={section}>
              <Heading as="h2" style={h2}>
                {t(lang, 'today')}
              </Heading>
              <Text style={text}>{summary}</Text>
            </Section>
          )}

          {tip && (
            <Section style={tipBox}>
              <Text style={tipLabel}>💡 {t(lang, 'tip')}</Text>
              <Text style={tipText}>{tip}</Text>
            </Section>
          )}

          <Section style={ctaWrap}>
            <Button href={appUrl} style={button}>
              {t(lang, 'cta')}
            </Button>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>{t(lang, 'footer')} — {SITE_NAME}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: MorningReviewEmail,
  subject: (data: Record<string, any>) => {
    const lang = data?.language && STRINGS[data.language] ? data.language : 'en'
    const loc = data?.locationName ? ` · ${data.locationName}` : ''
    const map: Record<string, string> = {
      en: `Your morning weather review${loc}`,
      no: `Din morgenvær-rapport${loc}`,
      sv: `Din morgon-väderrapport${loc}`,
      da: `Din morgenvejrrapport${loc}`,
      de: `Dein Morgen-Wetterbericht${loc}`,
      fr: `Votre revue météo du matin${loc}`,
      es: `Tu resumen del clima matutino${loc}`,
    }
    return map[lang] ?? map.en
  },
  displayName: 'Morning weather review',
  previewData: {
    name: 'Alex',
    language: 'en',
    locationName: 'Oslo',
    temperature: '7',
    high: '11',
    low: '3',
    condition: 'Partly cloudy',
    summary: 'A mild morning with light winds. Showers possible after lunch — keep a jacket handy.',
    tip: 'Bring a light umbrella for the afternoon.',
    unit: '°C',
    date: 'Friday, May 1',
    appUrl: 'https://rainz.net',
  },
} satisfies TemplateEntry

// ---------- styles ----------
const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    "'Lato', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
}
const container = { padding: '24px 28px', maxWidth: '560px' }
const header = { marginBottom: '24px' }
const brand = {
  fontSize: '20px',
  fontWeight: 700 as const,
  color: 'hsl(217, 91%, 60%)',
  margin: 0,
  letterSpacing: '-0.01em',
}
const dateText = {
  fontSize: '12px',
  color: '#71717a',
  margin: '4px 0 0',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
}
const h1 = {
  fontSize: '28px',
  fontWeight: 700 as const,
  color: '#0f172a',
  margin: '0 0 8px',
  lineHeight: 1.2,
}
const h2 = {
  fontSize: '15px',
  fontWeight: 600 as const,
  color: '#0f172a',
  margin: '0 0 8px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
}
const locationText = {
  fontSize: '14px',
  color: '#52525b',
  margin: '0 0 20px',
}
const weatherCard = {
  background: 'linear-gradient(135deg, hsl(217, 91%, 60%) 0%, hsl(210, 85%, 55%) 100%)',
  borderRadius: '20px',
  padding: '24px',
  margin: '0 0 24px',
}
const tempCol = { width: '55%', verticalAlign: 'middle' as const }
const hiloCol = { width: '45%', verticalAlign: 'middle' as const }
const bigTemp = {
  fontSize: '52px',
  fontWeight: 700 as const,
  color: '#ffffff',
  margin: 0,
  lineHeight: 1,
}
const tempUnit = { fontSize: '24px', fontWeight: 500 as const, opacity: 0.85 }
const conditionText = {
  fontSize: '15px',
  color: '#ffffff',
  opacity: 0.95,
  margin: '8px 0 0',
}
const hiloText = {
  fontSize: '14px',
  color: '#ffffff',
  opacity: 0.95,
  margin: '4px 0',
  textAlign: 'right' as const,
}
const section = { margin: '0 0 20px' }
const text = {
  fontSize: '15px',
  color: '#3f3f46',
  lineHeight: 1.6,
  margin: 0,
}
const tipBox = {
  backgroundColor: 'hsl(210, 100%, 97%)',
  borderRadius: '14px',
  padding: '14px 16px',
  margin: '0 0 24px',
  borderLeft: '3px solid hsl(217, 91%, 60%)',
}
const tipLabel = {
  fontSize: '12px',
  color: 'hsl(217, 91%, 45%)',
  fontWeight: 600 as const,
  margin: '0 0 4px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
}
const tipText = {
  fontSize: '14px',
  color: '#0f172a',
  margin: 0,
  lineHeight: 1.5,
}
const ctaWrap = { textAlign: 'center' as const, margin: '0 0 28px' }
const button = {
  backgroundColor: 'hsl(217, 91%, 60%)',
  color: '#ffffff',
  padding: '12px 28px',
  borderRadius: '20px',
  fontSize: '15px',
  fontWeight: 600 as const,
  textDecoration: 'none',
  display: 'inline-block',
}
const hr = { borderColor: '#e4e4e7', margin: '24px 0 12px' }
const footer = { fontSize: '12px', color: '#a1a1aa', margin: 0, textAlign: 'center' as const }
