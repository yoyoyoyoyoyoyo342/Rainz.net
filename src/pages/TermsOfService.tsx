import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileText } from "lucide-react";

export default function TermsOfService() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="flex items-center gap-3 mb-6">
          <FileText className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Terms of Service</h1>
            <p className="text-sm text-muted-foreground">Last updated: December 2025</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>1. Acceptance of Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              By accessing and using Rainz Weather ("the Service"), you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to these terms, please do not use the Service.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Weather Prediction Disclaimers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <h4 className="font-semibold">2.1 Accuracy Limitations</h4>
            <p>
              Weather predictions provided through this Service are estimates based on available data and algorithms. We make no guarantees, representations, or warranties regarding the accuracy, completeness, or reliability of any weather forecasts, predictions, or related information.
            </p>
            
            <h4 className="font-semibold">2.2 No Liability for Inaccurate Forecasts</h4>
            <p>
              You acknowledge that weather prediction is inherently uncertain and that forecasts may be incorrect. We shall not be held liable for any damages, losses, injuries, or consequences arising from reliance on weather predictions, including but not limited to:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Property damage due to unexpected weather conditions</li>
              <li>Personal injury or health issues related to weather events</li>
              <li>Financial losses from weather-dependent decisions</li>
              <li>Missed opportunities or scheduling conflicts</li>
            </ul>

            <h4 className="font-semibold">2.3 Third-Party Data Sources</h4>
            <p>
              Weather data is sourced from third-party APIs and services. We are not responsible for the accuracy, availability, or reliability of these external data sources.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. Free Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <h4 className="font-semibold">3.1 Features</h4>
            <p>
              Rainz is a completely free weather application. All features are available to all users at no cost, including:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>AI-powered weather insights and enhanced data processing</li>
              <li>Push notifications with personalized weather updates</li>
              <li>Weather games, predictions, and leaderboards</li>
              <li>AI Weather Companion chat assistant</li>
              <li>Prediction battles with other users</li>
              <li>Advanced customization options</li>
              <li>Extended 14-day forecasts</li>
              <li>Unlimited saved locations</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>4. User-Generated Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <h4 className="font-semibold">5.1 User Predictions and Reports</h4>
            <p>
              Users may submit weather predictions, reports, and observations. You acknowledge that:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>User-generated content may be inaccurate or misleading</li>
              <li>We do not verify or endorse user submissions</li>
              <li>You use user-generated content at your own risk</li>
              <li>We reserve the right to remove any content without notice</li>
            </ul>

            <h4 className="font-semibold">5.2 Content Ownership and License</h4>
            <p>
              By submitting content to the Service, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, and display your content in connection with operating the Service.
            </p>

            <h4 className="font-semibold">5.3 Prohibited Content</h4>
            <p>
              You agree not to submit content that is:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Intentionally false or misleading</li>
              <li>Offensive, defamatory, or harassing</li>
              <li>In violation of any laws or regulations</li>
              <li>Contains malware or harmful code</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>6. Limitation of Liability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="font-semibold">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Any indirect, incidental, special, consequential, or punitive damages</li>
              <li>Loss of profits, revenue, data, or use</li>
              <li>Service interruptions or unavailability</li>
              <li>Errors or inaccuracies in weather data or predictions</li>
              <li>Actions taken based on information provided by the Service</li>
            </ul>
            <p className="mt-4">
              Our total liability for any claims related to the Service shall not exceed the amount you paid to use the Service (if any) in the 12 months preceding the claim.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>7. Use at Your Own Risk</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              You expressly understand and agree that your use of the Service is at your sole risk. The Service is provided on an "AS IS" and "AS AVAILABLE" basis without warranties of any kind, either express or implied.
            </p>
            <p>
              For critical weather-dependent decisions, we strongly recommend consulting official meteorological services and emergency management agencies.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>8. Account Responsibilities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              If you create an account, you are responsible for:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Maintaining the confidentiality of your login credentials</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized use</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>9. Service Modifications and Termination</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              We reserve the right to:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Modify or discontinue the Service at any time without notice</li>
              <li>Change these Terms of Service at our discretion</li>
              <li>Terminate or suspend your account for violations of these terms</li>
              <li>Modify service features and pricing with 30 days notice</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>10. Indemnification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              You agree to indemnify and hold harmless the Service, its operators, and affiliates from any claims, damages, losses, or expenses arising from:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Your use of the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your user-generated content</li>
              <li>Your violation of any third-party rights</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>11. Governing Law</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              These Terms shall be governed by and construed in accordance with applicable local laws. Any disputes shall be resolved through binding arbitration or in the courts of competent jurisdiction.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>12. Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              For questions about these Terms of Service, please contact us through the feedback form in the application settings.
            </p>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground py-6">
          By continuing to use this Service, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
        </div>
      </div>
    </div>
  );
}