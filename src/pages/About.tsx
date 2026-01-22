import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft, Cloud, Users, Target, Zap, Shield, Globe, Crown, Sparkles, Bell, Gamepad2 } from "lucide-react";
import { SEOHead } from "@/components/seo/seo-head";

export default function About() {
  const navigate = useNavigate();

  const features = [
    {
      icon: Target,
      title: "Hyperlocal Accuracy",
      description: "Multi-model ensemble forecasting from 7+ weather sources for maximum precision."
    },
    {
      icon: Zap,
      title: "Real-Time Updates",
      description: "Minute-by-minute precipitation data and instant weather alerts."
    },
    {
      icon: Users,
      title: "Community Predictions",
      description: "Join our community of weather enthusiasts and compete on the leaderboard."
    },
    {
      icon: Shield,
      title: "Privacy First",
      description: "Your data is protected with enterprise-grade security and transparent policies."
    },
    {
      icon: Globe,
      title: "Global Coverage",
      description: "Accurate forecasts for locations worldwide with local weather station data."
    }
  ];

  const premiumFeatures = [
    {
      icon: Sparkles,
      title: "AI-Powered Insights",
      description: "Enhanced weather data processed by AI for better accuracy and personalized recommendations."
    },
    {
      icon: Bell,
      title: "Smart Notifications",
      description: "Daily weather briefings and severe weather alerts delivered to your device."
    },
    {
      icon: Crown,
      title: "Ad-Free Experience",
      description: "Enjoy Rainz without any advertisements interrupting your weather experience."
    }
  ];

  const faqs = [
    {
      question: "How accurate are Rainz Weather forecasts?",
      answer: "Rainz Weather uses a multi-model ensemble approach, aggregating predictions from 7+ weather models including ECMWF, GFS, and Met.no. This method significantly improves accuracy by identifying model agreement and calculating confidence scores."
    },
    {
      question: "How do weather predictions work?",
      answer: "You can submit one prediction per day for tomorrow's weather, including high/low temperatures and conditions. Once verified against actual weather data, you earn points based on accuracy. Correct predictions earn up to 300 points, while maintaining daily streaks earns bonus points. This feature is free for all logged-in users!"
    },
    {
      question: "What is Rainz+?",
      answer: "Rainz+ is our premium subscription that unlocks advanced features including AI-enhanced weather data, push notifications, the AI Weather Companion, ad-free experience, and extensive display customization options. Weather predictions, battles, and leaderboards are free for everyone!"
    },
    {
      question: "Why do I see ads?",
      answer: "Free users may see advertisements to help support the continued development of Rainz Weather. Rainz+ subscribers enjoy a completely ad-free experience. We carefully select ad partners to ensure a non-intrusive experience."
    },
    {
      question: "What is the leaderboard?",
      answer: "The leaderboard ranks users based on their prediction accuracy and streak maintenance. Top predictors are displayed publicly, and Rainz+ subscribers get a special crown badge. The leaderboard is free for all users!"
    },
    {
      question: "How does the snow/pollen index work?",
      answer: "During winter months (November 20 - February), the app displays a snow index with snow-related metrics. Outside this period, a pollen index shows allergen levels to help those with sensitivities plan their day."
    },
    {
      question: "Can I save multiple locations?",
      answer: "Yes! Logged-in users can save multiple locations and quickly switch between them using the mobile navigation bar. Rainz+ subscribers have unlimited saved locations."
    },
    {
      question: "How do I install Rainz as an app?",
      answer: "Rainz Weather is a Progressive Web App (PWA). On iOS, tap the Share button and select 'Add to Home Screen'. On Android, tap the menu and select 'Install app' or 'Add to Home Screen'. Installing the PWA enables push notifications for Rainz+ subscribers."
    },
    {
      question: "What data do you collect?",
      answer: "We collect location data to provide accurate forecasts, account data if you sign up, and anonymized analytics to improve the service. Free users may have data collected by advertising partners. Rainz+ subscribers are not tracked by advertising networks. See our Privacy Policy for complete details."
    },
    {
      question: "How do weather alerts work?",
      answer: "Weather alerts are filtered to your current location only. Rainz+ subscribers receive push notifications for severe weather, winter conditions, and other important updates based on their notification preferences."
    },
    {
      question: "How can I cancel my Rainz+ subscription?",
      answer: "You can manage or cancel your subscription at any time through the 'Manage Subscription' button in Settings. This will take you to the Stripe customer portal where you can update your payment method or cancel."
    },
    {
      question: "How can I provide feedback?",
      answer: "We love hearing from users! Use the feedback option in settings to share suggestions, report issues, or let us know what features you'd like to see."
    }
  ];

  return (
    <>
      <SEOHead 
        title="About Rainz Weather - AI-Powered Weather Forecasts"
        description="Learn about Rainz Weather, the free AI-powered weather app with hyper-local forecasts, pollen tracking, gamified predictions, and premium features."
        keywords="About Rainz, Rainz Weather features, AI weather app, weather predictions, pollen tracker"
      />
      <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Cloud className="w-12 h-12 text-primary" />
            <h1 className="text-4xl font-bold text-foreground">Rainz Weather</h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            The most accurate hyperlocal weather app, powered by multi-model ensemble forecasting and a passionate community of weather enthusiasts.
          </p>
        </div>

        {/* Mission Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Our Mission</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-4">
            <p>
              At Rainz Weather, we believe everyone deserves access to accurate, hyperlocal weather information. 
              Traditional weather apps rely on a single data source, but we aggregate predictions from multiple 
              world-class meteorological models to deliver forecasts you can truly rely on.
            </p>
            <p>
              Our unique community prediction feature turns weather forecasting into an engaging experience. 
              Make your own predictions, compete with others, and see how your weather intuition stacks up 
              against the models.
            </p>
          </CardContent>
        </Card>

        {/* Features Grid */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-6 text-center">Why Choose Rainz?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature, index) => (
              <Card key={index} className="text-center">
                <CardContent className="pt-6">
                  <feature.icon className="w-10 h-10 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Rainz+ Section */}
        <Card className="mb-12 border-amber-500/50 bg-gradient-to-br from-amber-500/10 to-orange-500/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-6 h-6 text-amber-500" />
              Rainz+ Premium
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground">
              Unlock the full potential of Rainz Weather with our premium subscription. Get AI-powered insights, 
              ad-free experience, push notifications, and access to all premium features.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {premiumFeatures.map((feature, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-background/50">
                  <feature.icon className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-foreground text-sm">{feature.title}</h4>
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-4 border-t border-border/50">
              <h4 className="font-semibold text-foreground mb-2">All Rainz+ Features Include:</h4>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> AI-enhanced weather data
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Push notifications
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> AI Weather Companion
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Ad-free experience
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Advanced display customization
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Premium leaderboard badge
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Cloud-synced settings
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Extended 14-day forecasts
                </li>
              </ul>
              <p className="text-xs text-muted-foreground mt-3">
                <strong>Free for everyone:</strong> Weather predictions, prediction battles, and leaderboards!
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Advertising Transparency */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle>About Advertising</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-4">
            <p>
              To keep Rainz Weather free for everyone, we display advertisements to free users. We're committed to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Showing non-intrusive ads that don't interrupt your weather experience</li>
              <li>Partnering with reputable advertising networks</li>
              <li>Giving you control over your data through cookie preferences</li>
              <li>Offering an ad-free experience through Rainz+ subscription</li>
            </ul>
            <p>
              Your privacy matters to us. You can manage your advertising preferences in our cookie consent settings, 
              and Rainz+ subscribers are never tracked by advertising networks within our app.
            </p>
          </CardContent>
        </Card>

        {/* FAQ Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-center">Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Contact Section */}
        <div className="mt-8 text-center text-muted-foreground">
          <p>
            Have more questions? Check out our{" "}
            <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/privacy")}>
              Privacy Policy
            </Button>{" "}
            or{" "}
            <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/terms")}>
              Terms of Service
            </Button>
            .
          </p>
        </div>
      </div>
    </div>
    </>
  );
}