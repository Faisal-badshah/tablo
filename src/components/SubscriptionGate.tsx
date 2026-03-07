import { useAuth, SubscriptionStatus } from '@/hooks/useAuth';
import { AlertTriangle, Lock, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';

const SubscriptionGate = ({ children }: { children: React.ReactNode }) => {
  const { subscriptionStatus, trialEndDate, role, signOut } = useAuth();

  // Super admins always pass through
  if (role === 'super_admin') return <>{children}</>;

  // Active or valid trial — allow access
  if (subscriptionStatus === 'active' || subscriptionStatus === 'trial') {
    return <>{children}</>;
  }

  if (subscriptionStatus === 'suspended') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full border-destructive/50">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl text-destructive">Account Suspended</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Your restaurant account has been suspended. Please contact support to resolve this issue.
            </p>
            <a
              href="https://wa.me/919876543210?text=My%20restaurant%20account%20is%20suspended"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block"
            >
              <Button variant="default" className="w-full">Contact Support via WhatsApp</Button>
            </a>
            <Button variant="outline" className="w-full" onClick={signOut}>
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (subscriptionStatus === 'trial_expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full border-yellow-500/50">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
            <CardTitle className="text-2xl">Trial Expired</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Your free trial ended{' '}
              {trialEndDate ? formatDistanceToNow(trialEndDate, { addSuffix: true }) : ''}.
              Subscribe to continue using the platform.
            </p>
            <div className="bg-muted rounded-lg p-4">
              <p className="text-lg font-bold">₹499/month</p>
              <p className="text-sm text-muted-foreground">Unlimited orders, all features included</p>
            </div>
            <a
              href="https://wa.me/919876543210?text=I%20want%20to%20subscribe%20to%20the%20QR%20ordering%20platform"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block w-full"
            >
              <Button variant="default" className="w-full">Subscribe Now via WhatsApp</Button>
            </a>
            <Button variant="outline" className="w-full" onClick={signOut}>
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fallback — unknown status
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-muted-foreground" />
          </div>
          <CardTitle>Access Unavailable</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">Unable to verify your subscription status. Please try again later.</p>
          <Button variant="outline" className="w-full" onClick={signOut}>
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionGate;