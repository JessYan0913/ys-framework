'use client';

import { Button } from '@/components/ui/button';
import { ReactNode } from 'react';

interface OAuthButtonProps {
  provider: string;
  icon: ReactNode;
  label: string;
}

export function OAuthButton({ provider, icon, label }: OAuthButtonProps) {
  const handleLogin = async () => {
    try {
      // Fetch the auth URL from the proxy (which proxies to backend)
      const response = await fetch(`/api/proxy/auth/${provider}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get auth URL: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.url) {
        // Redirect to the provider's auth page
        window.location.href = data.url;
      } else {
        console.error('No URL returned from auth endpoint');
      }
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  return (
    <Button variant="outline" className="w-full" onClick={handleLogin} type="button">
      {icon}
      <span className="ml-2">{label}</span>
    </Button>
  );
}
