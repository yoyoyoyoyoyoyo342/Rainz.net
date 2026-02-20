import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft, Cloud, Users, Target, Zap, Shield, Globe } from "lucide-react";
import { SEOHead } from "@/components/seo/seo-head";
import { RainzImageCarousel } from "@/components/weather/rainz-image-carousel";

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
      question: "Is everything really free?",
      answer: "Yes! All features in Rainz Weather are completely free, including AI-enhanced weather data, push notifications, the AI Weather Companion, predictions, battles, and leaderboards. No paywalls, no premium tiers."
    },
    {
      question: "How is Rainz funded?",
      answer: "Rainz is a passion project maintained by weather enthusiasts. We keep it free for everyone through community support and tips."
    },
    {
      question: "What is the leaderboard?",
      answer: "The leaderboard ranks users based on their prediction accuracy and streak maintenance. Top predictors are displayed publicly. The leaderboard is free for all users!"
    },
    {
      question: "How does the snow/pollen index work?",
      answer: "During winter months (November 20 - February), the app displays a snow index with snow-related metrics. Outside this period, a pollen index shows allergen levels to help those with sensitivities plan their day."
    },
    {
      question: "Can I save multiple locations?",
      answer: "Yes! Logged-in users can save multiple locations and quickly switch between them using the mobile navigation bar."
    },
    {
      question: "How do I install Rainz as an app?",
      answer: "Rainz Weather is a Progressive Web App (PWA). On iOS, tap the Share button and select 'Add to Home Screen'. On Android, tap the menu and select 'Install app'. Installing the PWA enables push notifications."
    },
    {
      question: "What data do you collect?",
      answer: "We collect location data to provide accurate forecasts, account data if you sign up, and anonymized analytics to improve the service. See our Privacy Policy for complete details."
    },
    {
      question: "How do weather alerts work?",
      answer: "Weather alerts are filtered to your current location only. You can receive push notifications for severe weather, winter conditions, and other important updates based on your notification preferences."
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

        {/* Image Carousel */}
        <div className="mb-12">
          <RainzImageCarousel />
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