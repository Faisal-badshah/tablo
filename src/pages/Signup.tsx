import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UtensilsCrossed, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const Signup = () => {
  const [form, setForm] = useState({
    restaurantName: '',
    ownerName: '',
    email: '',
    phone: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.restaurantName || !form.email || !form.password) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.functions.invoke('register-restaurant', {
      body: {
        restaurant_name: form.restaurantName,
        owner_name: form.ownerName,
        email: form.email,
        phone: form.phone,
        password: form.password,
      },
    });

    if (error || data?.error) {
      toast.error(data?.error || 'Registration failed. Please try again.');
      setLoading(false);
      return;
    }

    // Auto-login after registration
    const { error: loginError, redirect } = await signIn(form.email, form.password);
    setLoading(false);

    if (loginError) {
      toast.error('Account created but login failed. Please log in manually.');
      navigate('/staff/login');
    } else {
      toast.success('Restaurant created! Welcome aboard 🎉');
      navigate(redirect || '/owner');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="w-3 h-3" /> Back to home
          </Link>
          <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mx-auto">
            <UtensilsCrossed className="w-7 h-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Create Your Restaurant</CardTitle>
          <p className="text-muted-foreground text-sm">Start your free 30-day trial</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Restaurant Name *</Label>
              <Input
                value={form.restaurantName}
                onChange={update('restaurantName')}
                placeholder="The Spice House"
                required
              />
            </div>
            <div>
              <Label>Owner Name</Label>
              <Input
                value={form.ownerName}
                onChange={update('ownerName')}
                placeholder="Your full name"
              />
            </div>
            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={update('email')}
                placeholder="owner@restaurant.com"
                required
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                type="tel"
                value={form.phone}
                onChange={update('phone')}
                placeholder="+91 9876543210"
              />
            </div>
            <div>
              <Label>Password *</Label>
              <Input
                type="password"
                value={form.password}
                onChange={update('password')}
                placeholder="Min 6 characters"
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Start Free Trial'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/staff/login" className="text-primary hover:underline">
              Login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Signup;
