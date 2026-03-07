import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { UtensilsCrossed, QrCode, ChefHat, Receipt, Users, ArrowRight, Check, MessageCircle } from 'lucide-react';

const features = [
  { icon: QrCode, title: 'QR Ordering', desc: 'Customers scan a QR code at their table and order instantly from their phone.' },
  { icon: ChefHat, title: 'Kitchen Realtime', desc: 'Orders appear instantly on the kitchen dashboard with sound alerts.' },
  { icon: Receipt, title: 'Billing Dashboard', desc: 'Process bills, print receipts, and track payments in one place.' },
  { icon: Users, title: 'Staff Management', desc: 'Create kitchen and billing staff accounts. Full role-based access control.' },
];

const steps = [
  { num: '1', title: 'Sign Up & Add Menu', desc: 'Create your restaurant, add your menu items and table layout in minutes.' },
  { num: '2', title: 'Print QR Codes', desc: 'Generate unique QR codes for each table. Place them on tables for customers.' },
  { num: '3', title: 'Start Receiving Orders', desc: 'Customers scan, order, and your kitchen gets notified in real-time.' },
];

const pricingFeatures = [
  'Unlimited orders',
  'Unlimited menu items',
  'Unlimited tables',
  'Kitchen & billing dashboards',
  'Staff management',
  'Real-time order tracking',
  'Print-ready bills',
  'QR code generator',
];

const LandingPage = () => (
  <div className="min-h-screen bg-background">
    {/* Navigation */}
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
            <UtensilsCrossed className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-xl text-foreground">QuickBite</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link to="/staff/login">
            <Button variant="ghost" size="sm">Staff Login</Button>
          </Link>
          <Link to="/signup">
            <Button size="sm">Start Free Trial</Button>
          </Link>
        </div>
      </div>
    </nav>

    {/* Hero */}
    <section className="py-16 sm:py-24 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
          <span>🚀</span> 30-day free trial — no credit card required
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground leading-tight">
          QR Ordering System<br />for Restaurants
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto">
          Reduce waiter workload. Faster service. Happy customers.
          Start your free trial today.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link to="/signup">
            <Button size="lg" className="text-base px-8 h-12 w-full sm:w-auto">
              Start Free Trial <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <Link to="/staff/login">
            <Button variant="outline" size="lg" className="text-base px-8 h-12 w-full sm:w-auto">
              Staff Login
            </Button>
          </Link>
        </div>
      </div>
    </section>

    {/* Features */}
    <section className="py-16 px-4 sm:px-6 bg-muted/40">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-3 text-foreground">Everything You Need</h2>
        <p className="text-center text-muted-foreground mb-12 max-w-lg mx-auto">
          A complete restaurant ordering solution — from customer ordering to kitchen operations to billing.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <Card key={f.title} className="border-0 shadow-sm bg-card">
              <CardContent className="p-6 text-center space-y-3">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto">
                  <f.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>

    {/* How It Works */}
    <section className="py-16 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-3 text-foreground">How It Works</h2>
        <p className="text-center text-muted-foreground mb-12">Get started in 3 simple steps</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((s) => (
            <div key={s.num} className="text-center space-y-3">
              <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mx-auto text-primary-foreground text-xl font-bold">
                {s.num}
              </div>
              <h3 className="font-semibold text-lg text-foreground">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Pricing */}
    <section className="py-16 px-4 sm:px-6 bg-muted/40">
      <div className="max-w-md mx-auto">
        <h2 className="text-3xl font-bold text-center mb-3 text-foreground">Simple Pricing</h2>
        <p className="text-center text-muted-foreground mb-8">One plan. Everything included.</p>
        <Card className="border-2 border-primary/20 shadow-lg">
          <CardContent className="p-8 text-center space-y-6">
            <div>
              <span className="text-5xl font-bold text-foreground">₹499</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <p className="text-primary font-medium">30-day free trial included</p>
            <div className="text-left space-y-3">
              {pricingFeatures.map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-foreground">{f}</span>
                </div>
              ))}
            </div>
            <Link to="/signup">
              <Button className="w-full h-12 text-base" size="lg">
                Start Free Trial <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </section>

    {/* Contact */}
    <section className="py-16 px-4 sm:px-6">
      <div className="max-w-md mx-auto text-center space-y-4">
        <h2 className="text-3xl font-bold text-foreground">Need Help?</h2>
        <p className="text-muted-foreground">
          Reach out to us on WhatsApp for quick support and onboarding assistance.
        </p>
        <a
          href="https://wa.me/919999999999?text=Hi%2C%20I%27m%20interested%20in%20QuickBite%20QR%20ordering%20system"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="outline" size="lg" className="h-12 text-base">
            <MessageCircle className="w-5 h-5 mr-2" /> Chat on WhatsApp
          </Button>
        </a>
      </div>
    </section>

    {/* Footer */}
    <footer className="border-t py-8 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <UtensilsCrossed className="w-4 h-4 text-primary" />
          <span className="font-medium text-foreground">QuickBite</span>
        </div>
        <p>© {new Date().getFullYear()} QuickBite. All rights reserved.</p>
      </div>
    </footer>
  </div>
);

export default LandingPage;
