'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Lock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function LoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get('next') || '/dashboard';

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || data.message || 'فشل تسجيل الدخول');
        return;
      }
      router.push(next);
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">تسجيل الدخول</CardTitle>
        <CardDescription>أدخل اسم المستخدم/البريد وكلمة المرور للوصول إلى لوحة التحكم</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <User className="size-3.5" /> اسم المستخدم أو البريد
            </Label>
            <Input
              type="text"
              dir="ltr"
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              autoFocus
              disabled={loading}
              placeholder="NMDDER أو owner@njader.dev"
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Lock className="size-3.5" /> كلمة المرور
            </Label>
            <Input
              type="password"
              dir="ltr"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" className="w-full gap-1.5" disabled={loading || !identifier || !password}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
            دخول
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            ليس لديك حساب؟{' '}
            <Link href="/signup" className="text-primary underline">أنشئ حساباً</Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
