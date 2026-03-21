import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CheckCircle, ChevronRight, ChevronLeft } from "lucide-react";
import * as amplitude from "@amplitude/unified";
import { motion, AnimatePresence } from "framer-motion";

interface SignupSurveyProps {
  onComplete: () => void;
  userId?: string;
}

const SURVEY_STEPS = [
  {
    id: "referral_source",
    question: "Where did you hear about Rainz?",
    options: [
      { value: "social_media", label: "Social Media (TikTok, Instagram, X)" },
      { value: "friend", label: "Friend or Family" },
      { value: "search", label: "Google / Search Engine" },
      { value: "app_store", label: "App Store / Play Store" },
      { value: "news", label: "News / Blog Article" },
      { value: "other", label: "Other" },
    ],
  },
  {
    id: "interest",
    question: "What interests you most about Rainz?",
    options: [
      { value: "accurate_weather", label: "Accurate weather forecasts" },
      { value: "predictions_games", label: "Weather predictions & games" },
      { value: "alerts", label: "Severe weather alerts" },
      { value: "ai_insights", label: "AI weather insights" },
      { value: "community", label: "Community & leaderboards" },
      { value: "pollen_allergy", label: "Pollen & allergy tracking" },
    ],
  },
  {
    id: "weather_frequency",
    question: "How often do you check the weather?",
    options: [
      { value: "multiple_daily", label: "Multiple times a day" },
      { value: "daily", label: "Once a day" },
      { value: "few_weekly", label: "A few times a week" },
      { value: "weekly", label: "About once a week" },
      { value: "rarely", label: "Rarely" },
    ],
  },
  {
    id: "age_range",
    question: "What's your age range?",
    options: [
      { value: "under_18", label: "Under 18" },
      { value: "18_24", label: "18–24" },
      { value: "25_34", label: "25–34" },
      { value: "35_44", label: "35–44" },
      { value: "45_plus", label: "45+" },
      { value: "prefer_not", label: "Prefer not to say" },
    ],
  },
];

export function SignupSurvey({ onComplete, userId }: SignupSurveyProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const current = SURVEY_STEPS[step];
  const isLast = step === SURVEY_STEPS.length - 1;

  const handleNext = () => {
    if (!answers[current.id]) return;

    // Track each answer individually
    try {
      amplitude.track("signup_survey_answer", {
        question_id: current.id,
        question: current.question,
        answer: answers[current.id],
        step: step + 1,
        user_id: userId || null,
      });
    } catch {}

    if (isLast) {
      // Track survey completion with all answers
      try {
        amplitude.track("signup_survey_completed", {
          ...answers,
          user_id: userId || null,
        });

        // Set user properties for segmentation
        const identify = new amplitude.Identify();
        identify.set("referral_source", answers.referral_source || "unknown");
        identify.set("primary_interest", answers.interest || "unknown");
        identify.set("weather_check_frequency", answers.weather_frequency || "unknown");
        identify.set("age_range", answers.age_range || "unknown");
        amplitude.identify(identify);
      } catch {}

      onComplete();
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleSkip = () => {
    try {
      amplitude.track("signup_survey_skipped", { skipped_at_step: step + 1, user_id: userId || null });
    } catch {}
    onComplete();
  };

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center gap-1.5">
        {SURVEY_STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= step ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Step {step + 1} of {SURVEY_STEPS.length} • Quick survey
      </p>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <h3 className="text-lg font-semibold text-foreground mb-4">{current.question}</h3>

          <RadioGroup
            value={answers[current.id] || ""}
            onValueChange={(val) => setAnswers((prev) => ({ ...prev, [current.id]: val }))}
            className="space-y-2"
          >
            {current.options.map((opt) => (
              <label
                key={opt.value}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  answers[current.id] === opt.value
                    ? "border-primary bg-primary/5"
                    : "border-border/50 hover:border-border"
                }`}
              >
                <RadioGroupItem value={opt.value} id={opt.value} />
                <span className="text-sm text-foreground">{opt.label}</span>
                {answers[current.id] === opt.value && (
                  <CheckCircle className="w-4 h-4 text-primary ml-auto" />
                )}
              </label>
            ))}
          </RadioGroup>
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center gap-3 pt-2">
        {step > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setStep((s) => s - 1)}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        )}
        <div className="flex-1" />
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={handleSkip}>
          Skip survey
        </Button>
        <Button size="sm" onClick={handleNext} disabled={!answers[current.id]}>
          {isLast ? "Finish" : "Next"} <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
