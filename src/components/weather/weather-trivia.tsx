import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/language-context';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle } from 'lucide-react';

interface TriviaQuestion {
  question: string;
  options: string[];
  correct: number;
  fact: string;
}

const TRIVIA_BANK: TriviaQuestion[] = [
  { question: "What's the hottest temperature ever recorded on Earth?", options: ["134°F (56.7°C)", "140°F (60°C)", "128°F (53.3°C)", "145°F (62.8°C)"], correct: 0, fact: "Recorded in Death Valley, California on July 10, 1913." },
  { question: "What does a barometer measure?", options: ["Wind speed", "Air pressure", "Humidity", "Temperature"], correct: 1, fact: "Barometers measure atmospheric pressure — falling pressure often means storms!" },
  { question: "What type of cloud produces thunderstorms?", options: ["Cirrus", "Stratus", "Cumulonimbus", "Altocumulus"], correct: 2, fact: "Cumulonimbus clouds can tower up to 60,000 feet!" },
  { question: "What is the Beaufort Scale used for?", options: ["Temperature", "Rainfall", "Wind speed", "UV radiation"], correct: 2, fact: "Created by Sir Francis Beaufort in 1805, it ranges from 0 (calm) to 12 (hurricane)." },
  { question: "How fast can a hurricane's winds reach?", options: ["75 mph", "157+ mph", "200+ mph", "All of the above"], correct: 3, fact: "Category 5 hurricanes have winds over 157 mph, with some gusts exceeding 200 mph!" },
  { question: "What causes a rainbow?", options: ["Magic", "Light refraction in water", "Reflections from the moon", "Colored clouds"], correct: 1, fact: "Sunlight refracts through water droplets, splitting into a spectrum of colors." },
  { question: "What is the coldest temperature ever recorded?", options: ["-128.6°F (-89.2°C)", "-100°F (-73.3°C)", "-144°F (-97.8°C)", "-110°F (-78.9°C)"], correct: 0, fact: "Recorded at Vostok Station, Antarctica on July 21, 1983." },
  { question: "What does 'dew point' measure?", options: ["Temperature of dew", "Moisture in the air", "Rainfall amount", "Cloud height"], correct: 1, fact: "The dew point tells you how muggy it feels — above 65°F and it's sticky!" },
  { question: "How many snowflakes fall per second during a storm?", options: ["Hundreds", "Thousands", "Millions", "Billions"], correct: 2, fact: "An average snowstorm drops about 39 million snowflakes per second!" },
  { question: "What percentage of Earth is struck by lightning daily?", options: ["100 times", "8 million times", "1,000 times", "50,000 times"], correct: 1, fact: "Earth gets struck by lightning about 8 million times every day!" },
  { question: "Which planet has the fastest winds?", options: ["Jupiter", "Saturn", "Neptune", "Mars"], correct: 2, fact: "Neptune's winds can reach up to 1,200 mph!" },
  { question: "What is a 'haboob'?", options: ["A type of cloud", "A sandstorm", "An ocean current", "A cold front"], correct: 1, fact: "Haboobs are intense dust storms common in desert regions." },
  { question: "How much does a cloud weigh?", options: ["Nothing", "1 ton", "500,000 tons", "1.1 million pounds"], correct: 3, fact: "An average cumulus cloud weighs about 1.1 million pounds!" },
  { question: "What is 'petrichor'?", options: ["A type of wind", "The smell after rain", "A cloud type", "A weather tool"], correct: 1, fact: "Petrichor comes from plant oils released during rain hitting dry soil." },
  { question: "Which country gets the most tornadoes?", options: ["Brazil", "Bangladesh", "USA", "Australia"], correct: 2, fact: "The US averages about 1,200 tornadoes per year." },
  { question: "What's the wettest place on Earth?", options: ["Amazon Rainforest", "Mawsynram, India", "Mount Waialeale, Hawaii", "Quibdó, Colombia"], correct: 1, fact: "Mawsynram receives about 467 inches of rain annually!" },
  { question: "What does the F in F5 tornado stand for?", options: ["Fatal", "Fujita", "Force", "Frequency"], correct: 1, fact: "The Fujita Scale was created by Dr. Tetsuya Theodore Fujita in 1971." },
  { question: "What color is hail usually?", options: ["White", "Clear/translucent", "Gray", "All of these"], correct: 3, fact: "Hail can be white, clear, or gray depending on how it forms in the cloud." },
  { question: "What weather phenomenon is called 'St. Elmo's Fire'?", options: ["Ball lightning", "Electrical glow on objects", "Fire tornado", "Sun dogs"], correct: 1, fact: "It's a luminous plasma caused by electrical discharge — sailors named it after their patron saint!" },
  { question: "How tall can a tornado get?", options: ["500 feet", "1 mile", "5 miles", "10 miles"], correct: 1, fact: "Most tornadoes are about 250 feet wide and rarely exceed 1 mile tall." },
];

function getDailyQuestion(date: string): TriviaQuestion {
  let hash = 0;
  for (let i = 0; i < date.length; i++) {
    hash = ((hash << 5) - hash) + date.charCodeAt(i);
    hash |= 0;
  }
  return TRIVIA_BANK[Math.abs(hash) % TRIVIA_BANK.length];
}

export function WeatherTrivia() {
  const { t } = useLanguage();
  const today = new Date().toISOString().slice(0, 10);
  const question = useMemo(() => getDailyQuestion(today), [today]);

  const [selected, setSelected] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem(`rainz-trivia-${today}`);
      return saved !== null ? parseInt(saved) : null;
    } catch { return null; }
  });

  const answered = selected !== null;
  const isCorrect = selected === question.correct;

  const handleSelect = (i: number) => {
    if (answered) return;
    setSelected(i);
    localStorage.setItem(`rainz-trivia-${today}`, String(i));
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 px-4 pt-4">
        <CardTitle className="text-base flex items-center gap-2">
          <span className="text-lg">🧠</span>
          {t('trivia.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <p className="text-sm font-medium text-foreground mb-3">{question.question}</p>
        <div className="space-y-2">
          {question.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              disabled={answered}
              className={cn(
                "w-full text-left text-sm p-2.5 rounded-xl border transition-all flex items-center gap-2",
                !answered && "hover:border-primary/40 hover:bg-primary/5 bg-muted/20 border-border/30",
                answered && i === question.correct && "bg-green-500/15 border-green-500/40 text-green-700 dark:text-green-400",
                answered && i === selected && i !== question.correct && "bg-red-500/15 border-red-500/40 text-red-700 dark:text-red-400",
                answered && i !== question.correct && i !== selected && "opacity-50 bg-muted/10 border-border/20"
              )}
            >
              {answered && i === question.correct && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
              {answered && i === selected && i !== question.correct && <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
              <span>{opt}</span>
            </button>
          ))}
        </div>
        {answered && (
          <div className={cn(
            "mt-3 p-3 rounded-xl text-xs",
            isCorrect ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-orange-500/10 text-orange-700 dark:text-orange-400"
          )}>
            <p className="font-semibold mb-1">{isCorrect ? `✅ ${t('trivia.correct')}` : `❌ ${t('trivia.wrong')}`}</p>
            <p>{question.fact}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
