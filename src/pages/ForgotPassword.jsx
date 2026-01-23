import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import authService from '../services/authService';
import { Loader2, ArrowLeft, Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import Logo from '@/components/Logo';

/**
 * Forgot Password Page Component
 * Note: This feature is not yet implemented in the API
 * Allows users to request a password reset link via email
 */
const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const validateEmail = (email) => {
    return /\S+@\S+\.\S+/.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Note: This endpoint is not yet implemented in the API
      // See: /Users/shan/works/spado-api/API_DOCUMENTATION.md
      await authService.forgotPassword(email);
      
      setIsSubmitted(true);
      
      toast.success('Password reset link sent', {
        description: 'Please check your email for instructions to reset your password.',
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      
      // API endpoint not yet implemented
      if (error.response?.status === 404) {
        toast.warning('Feature Coming Soon', {
          description: 'Password reset is not yet available. Please contact support.',
        });
        setError('This feature is not yet available. Please contact support to reset your password.');
      } else {
        const errorMessage = 
          error.response?.data?.message || 
          error.response?.data?.error ||
          'Failed to send reset link. Please try again.';
        
        toast.error('Request Failed', {
          description: errorMessage,
        });
        
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    setEmail(e.target.value);
    if (error) {
      setError('');
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-100 px-4 py-8">
        <div className="w-full max-w-md">
          <Card className="shadow-xl">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-2xl font-bold">Check Your Email</CardTitle>
              <CardDescription className="text-base">
                We've sent a password reset link to:
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-primary-50 p-4 rounded-lg text-center">
                <p className="font-medium text-primary-700">{email}</p>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <p>Please check your email and click the link to reset your password.</p>
                <p>If you don't see the email, check your spam folder.</p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-3">
              <Button
                onClick={() => {
                  setIsSubmitted(false);
                  setEmail('');
                }}
                variant="outline"
                className="w-full"
              >
                Try another email
              </Button>
              <Link to="/login" className="w-full">
                <Button variant="ghost" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Sign In
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-100 px-4 py-8">
      <div className="w-full max-w-md">

        <div className="text-center mb-8 flex flex-col items-center">
          <Logo width={150} height={50} textColor="#0846c1" className="mb-2" />
          </div>
        <Card className="shadow-xl">
          <CardHeader className="space-y-1">
            <div className="mx-auto w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mb-4">
              <Mail className="h-6 w-6 text-primary-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-center">
              Forgot Password?
            </CardTitle>
            <CardDescription className="text-center">
              No worries! Enter your email and we'll send you reset instructions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={handleChange}
                  disabled={isLoading}
                  className={error ? 'border-red-500' : ''}
                  autoComplete="email"
                  autoFocus
                />
                {error && (
                  <p className="text-sm text-red-500">{error}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter>
            <p className="text-sm text-center text-gray-600 w-full">
              Remember your password?{' '}
              <Link
                to="/login"
                className="text-primary-600 hover:text-primary-700 hover:underline font-medium"
              >
                Sign In
              </Link>
            </p>
          </CardFooter>
        </Card>

        <p className="text-center text-sm text-gray-600 mt-6">
          © 2026 Spado Car Wash. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
