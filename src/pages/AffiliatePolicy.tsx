import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export default function AffiliatePolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Affiliate Policy</h1>
            <p className="text-muted-foreground">Last updated: December 22, 2024</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>1. Overview</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              <p>
                The Rejn Weather Affiliate Program allows businesses and individuals to display contextual 
                advertising within the Rejn Weather application. This policy outlines the terms, conditions, 
                and guidelines for participation in our affiliate program.
              </p>
              <p>
                By applying to become a Rejn affiliate, you agree to comply with all terms outlined in this 
                policy, our Terms of Service, and applicable laws and regulations.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Eligibility Requirements</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              <p>To participate in the Rejn Affiliate Program, you must:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Be at least 18 years of age or the legal age in your jurisdiction</li>
                <li>Have a valid Rejn account in good standing</li>
                <li>Own or have authorization to promote the website/business you submit</li>
                <li>Have a legitimate business or service to promote</li>
                <li>Agree to comply with all applicable advertising laws and regulations</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. Prohibited Content</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              <p>The following types of content are strictly prohibited from our affiliate program:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Adult, sexually explicit, or pornographic content</li>
                <li>Gambling or betting services (where prohibited by law)</li>
                <li>Illegal products, services, or activities</li>
                <li>Weapons, ammunition, or explosives</li>
                <li>Tobacco, vaping, or cannabis products</li>
                <li>Pharmaceutical products without proper licensing</li>
                <li>Hate speech, discrimination, or content promoting violence</li>
                <li>Misleading, fraudulent, or deceptive content</li>
                <li>Malware, phishing, or other malicious content</li>
                <li>Content that infringes on intellectual property rights</li>
                <li>Cryptocurrency or financial products without proper disclosure</li>
                <li>Any content that violates Stripe's prohibited business list</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>4. Subscription and Payment</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              <p>
                <strong>Pricing:</strong> The Rejn Affiliate Program is billed at €10 per month. This fee 
                covers the display of your affiliate link when your selected weather condition is active 
                for users in the Rejn Weather app.
              </p>
              <p>
                <strong>Billing Cycle:</strong> Subscriptions are billed monthly on the anniversary of your 
                initial payment date. Payment is processed automatically via Stripe.
              </p>
              <p>
                <strong>Cancellation:</strong> You may cancel your affiliate subscription at any time through 
                the Stripe customer portal. Your link will remain active until the end of your current billing 
                period, after which it will be removed from the app.
              </p>
              <p>
                <strong>Refunds:</strong> We do not offer refunds for partial months. If your application is 
                rejected during the review period, your subscription will be cancelled and you will receive 
                a full refund.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>5. Application Review Process</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              <p>
                All affiliate applications are subject to manual review before activation. The review process 
                typically takes 24-48 hours and includes:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Verification of business legitimacy</li>
                <li>Review of website content for policy compliance</li>
                <li>Assessment of relevance to our user base</li>
                <li>Verification of HTTPS security on the destination URL</li>
              </ul>
              <p>
                We reserve the right to reject any application that does not meet our quality standards or 
                policy requirements. If your application is rejected, you will be notified via email and 
                your payment will be refunded in full.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>6. Weather Condition Display</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              <p>
                Your affiliate link will be displayed to Rejn users based on the weather condition you 
                selected during application:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Rain:</strong> Your link appears when precipitation is detected</li>
                <li><strong>Snow:</strong> Your link appears during snowfall conditions</li>
                <li><strong>Wind:</strong> Your link appears when wind speeds exceed moderate levels</li>
                <li><strong>Storm:</strong> Your link appears during thunderstorm conditions</li>
                <li><strong>All Conditions:</strong> Your link may appear regardless of weather</li>
              </ul>
              <p>
                Display frequency and positioning are determined by our algorithm and may vary based on 
                the number of active affiliates and user traffic patterns. We do not guarantee a specific 
                number of impressions or clicks.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>7. Modifications and Termination</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              <p>
                <strong>By Rejn:</strong> We reserve the right to suspend or terminate any affiliate 
                account at any time if we determine that the affiliate has violated this policy, our 
                Terms of Service, or applicable laws. We may also modify this policy at any time with 
                notice to active affiliates.
              </p>
              <p>
                <strong>By You:</strong> You may cancel your affiliate subscription at any time. Your 
                link will remain active until the end of your current billing period.
              </p>
              <p>
                <strong>Effect of Termination:</strong> Upon termination, your affiliate link will be 
                removed from the Rejn app, and you will no longer be charged. Any outstanding balances 
                owed to Rejn must be settled prior to account closure.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>8. Liability and Disclaimers</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              <p>
                <strong>No Performance Guarantees:</strong> We do not guarantee any specific number of 
                impressions, clicks, or conversions from your affiliate link. Performance depends on 
                various factors including weather patterns, user traffic, and competition.
              </p>
              <p>
                <strong>Indemnification:</strong> You agree to indemnify and hold harmless Rejn Weather, 
                its officers, directors, employees, and affiliates from any claims, damages, or expenses 
                arising from your use of the affiliate program or your promoted content.
              </p>
              <p>
                <strong>Limitation of Liability:</strong> Our total liability to you for any claims 
                arising from the affiliate program shall not exceed the total fees you have paid to us 
                in the preceding 12 months.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>9. Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              <p>
                If you have questions about this Affiliate Policy or the Rejn Affiliate Program, 
                please contact us through the feedback form in the Rejn app settings or visit our 
                About page for more information.
              </p>
            </CardContent>
          </Card>
        </div>

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
  );
}
