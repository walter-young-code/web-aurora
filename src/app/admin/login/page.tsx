'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { signIn } from '@/lib/auth-client';

const inputCls =
  'w-full rounded-md border border-line bg-bg-elevated px-3 py-2 text-text-primary outline-none transition-colors focus:border-accent';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error: err } = await signIn.email({ email, password });
    if (err) {
      setError(err.message || '账号或密码错误');
      setLoading(false);
      return;
    }
    router.push('/admin/works');
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-96 rounded-lg border border-line bg-bg-elevated p-6"
      >
        <h1 className="mb-1 font-display text-2xl text-text-primary">Aurora 管理后台</h1>
        <p className="mb-6 text-sm text-text-secondary">登录后即可管理内容</p>

        <label className="mb-1 block text-sm text-text-secondary" htmlFor="email">
          邮箱
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          className={inputCls}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label className="mb-1 mt-4 block text-sm text-text-secondary" htmlFor="password">
          密码
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          className={inputCls}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-md bg-accent px-4 py-2 font-medium text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? '登录中…' : '登录'}
        </button>
      </form>
    </main>
  );
}
