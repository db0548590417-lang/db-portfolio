import React, { createContext, useContext, useEffect, useState } from 'react';
import logo from '../../dekel-ai-logo.svg';
import { setStorageUser } from '../../data/accountStorage';

type User = { id: string; email: string; googleName?: string; username: string; provider: string };
const AccountContext = createContext<User | null>(null);
export const useAccount = () => useContext(AccountContext);

export function AccountGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [ownerEnabled, setOwnerEnabled] = useState(false);
  const [ownerForm, setOwnerForm] = useState(false);
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const acceptUser = (value: User) => { setStorageUser(value.id); setUser(value); };
  useEffect(() => {
    fetch('/api/auth/session').then(async response => {
      if (!response.ok) throw new Error('לא ניתן לבדוק את החיבור. נסה שוב בעוד רגע.');
      const session = await response.json();
      setGoogleEnabled(session.googleEnabled); setOwnerEnabled(session.ownerLoginEnabled);
      if (session.user) { acceptUser(session.user); setUsername(session.user.username || session.user.googleName || ''); }
      const params = new URLSearchParams(location.search);
      if (params.has('auth_error')) {
        setError(params.get('auth_error') === 'not_configured' ? 'חיבור Google עדיין אינו מוגדר.' : 'ההתחברות לא הושלמה. נסה שוב עם Google.');
        history.replaceState({}, '', location.pathname);
      }
    }).catch(error => setError(error.message)).finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (!user) return;
    const previous = window.fetch.bind(window);
    const checkAccount = async () => {
      try {
        const response = await previous('/api/auth/session');
        if (response.ok && (await response.json()).user?.id !== user.id) location.reload();
      } catch { /* Keep the workspace on a temporary network failure. */ }
    };
    window.addEventListener('focus', checkAccount);
    window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.href);
      if (url.origin !== location.origin || !url.pathname.startsWith('/api/')) return previous(input, init);
      const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
      headers.set('x-dekel-user-id', user.id);
      const response = await previous(input, { ...init, headers });
      if (response.status === 401 || response.status === 409) location.reload();
      return response;
    }) as typeof fetch;
    return () => { window.fetch = previous; window.removeEventListener('focus', checkAccount); };
  }, [user?.id]);
  async function submit(event: React.FormEvent, path: string, body: unknown) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'לא ניתן להשלים את הפעולה');
      setPassword(''); acceptUser(result.user);
    } catch (error: any) { setError(error.message); }
    finally { setBusy(false); }
  }
  if (!loading && user?.username) return <AccountContext.Provider value={user}>{children}</AccountContext.Provider>;
  return <main dir="rtl" className="min-h-screen bg-[#183036] text-[#F7F8F3] font-['Heebo',sans-serif] flex items-center justify-center p-5 relative overflow-hidden">
    <div aria-hidden="true" className="pointer-events-none absolute -top-44 -right-44 h-[520px] w-[520px] rounded-full border border-[#43D6CB]/20" />
    <div aria-hidden="true" className="pointer-events-none absolute -bottom-64 -left-44 h-[620px] w-[620px] rounded-full bg-[#43D6CB]/5" />
    <section className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-[#43D6CB]/20 bg-[#103F46] shadow-2xl md:grid-cols-2">
      <div className="flex flex-col justify-between bg-[#43D6CB] p-8 text-[#183036] md:p-12">
        <img src={logo} alt="דקל AI" className="mb-10 h-16 w-40 object-contain object-right" />
        <div><p className="mb-4 text-xs font-bold tracking-[0.18em]">המרחב שלך ליצור</p><h1 className="text-4xl font-extrabold leading-[1.3] md:text-5xl">כל רעיון טוב<br />מתחיל כאן.</h1><p className="mt-6 max-w-sm text-sm leading-7">השראה, קריאייטיב וכלי עיצוב — בסטודיו אחד שמדבר בשפה שלך.</p></div>
        <p className="mt-10 text-xs">דקל AI · סטודיו למעצבים</p>
      </div>
      <div className="flex flex-col justify-center p-8 md:p-12">
        {loading ? <p role="status">טוען את הסטודיו שלך…</p> : user ? <>
          <p className="mb-2 text-sm text-[#43D6CB]">נעים להכיר, {user.googleName || user.email}</p>
          <h2 className="mb-3 text-2xl font-bold">איך נקרא לך בסטודיו?</h2>
          <p className="mb-6 text-sm leading-7 text-zinc-300">בחר שם משתמש שיוצג בחשבון שלך.</p>
          <form onSubmit={event => submit(event, '/api/auth/profile', { username })} className="space-y-4">
            <label className="block text-sm" htmlFor="account-name">שם משתמש</label>
            <input id="account-name" autoComplete="nickname" minLength={2} maxLength={32} required value={username} onChange={event => setUsername(event.target.value)} className="w-full rounded-xl border border-white/20 bg-[#183036] p-3 outline-none focus:border-[#43D6CB]" />
            <button disabled={busy} className="w-full rounded-xl bg-[#43D6CB] p-3 font-bold text-[#183036] disabled:opacity-50">{busy ? 'שומר…' : 'נכנסים לסטודיו'}</button>
          </form>
        </> : <>
          <p className="mb-2 text-sm text-[#43D6CB]">ברוכים הבאים לסטודיו</p>
          <h2 className="mb-3 text-3xl font-bold">המקום שלך לקריאייטיב</h2>
          <p className="mb-8 text-sm leading-7 text-zinc-300">נכנסים עם Google, בוחרים שם משתמש ומתחילים ליצור. הכניסה הראשונה יוצרת חשבון.</p>
          {googleEnabled ? <a href="/auth/google" target="_top" className="flex items-center justify-center gap-3 rounded-xl bg-white p-3.5 font-bold text-[#183036]"><svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.7-.4-4H24v7.6h11c-.5 2.5-1.9 4.6-4.1 6v5h6.6c3.9-3.6 6.1-8.6 6.1-14.6Z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5c-1.8 1.2-4.1 1.9-6.9 1.9-5.3 0-9.8-3.6-11.4-8.4H5.8v5.2C9.2 39.4 16.1 44 24 44Z"/><path fill="#FBBC05" d="M12.6 27.6a12 12 0 0 1 0-7.2v-5.2H5.8a20 20 0 0 0 0 17.6l6.8-5.2Z"/><path fill="#EA4335" d="M24 12c3 0 5.6 1 7.7 3l5.8-5.8A19.3 19.3 0 0 0 24 4C16.1 4 9.2 8.6 5.8 15.2l6.8 5.2C14.2 15.6 18.7 12 24 12Z"/></svg>המשך עם Google</a>
          : <div className="rounded-xl border border-[#43D6CB]/25 bg-[#183036] p-4 text-sm leading-7 text-zinc-200">ההרשמה עם Google תיפתח אחרי שבעל האתר ישלים את הגדרת החיבור.</div>}
          {ownerEnabled && <div className="mt-5"><button onClick={() => setOwnerForm(!ownerForm)} className="text-xs text-[#43D6CB] underline">כניסת בעל הסטודיו</button>{ownerForm && <form onSubmit={event => submit(event, '/api/auth/owner', { password })} className="mt-4 space-y-3"><label htmlFor="owner-password" className="block text-sm">סיסמת הסטודיו הקיימת</label><input id="owner-password" type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} className="w-full rounded-xl border border-white/20 bg-[#183036] p-3" /><button disabled={busy} className="w-full rounded-xl bg-[#43D6CB] p-3 font-bold text-[#183036] disabled:opacity-50">{busy ? 'מתחבר…' : 'כניסה לסטודיו'}</button></form>}</div>}
          <p className="mt-7 text-xs leading-6 text-zinc-400">כל משתמש מחבר מפתח Gemini משלו. הפרויקטים נשמרים בדפדפן בנפרד לכל חשבון; אין כרגע סנכרון בין מחשבים.</p>
        </>}
        {error && <p role="alert" className="mt-5 text-sm text-red-300">{error}</p>}
      </div>
    </section>
  </main>;
}

export function AccountButton() {
  const user = useAccount();
  const [busy, setBusy] = useState(false);
  if (!user) return null;
  async function logout() {
    setBusy(true);
    try { const response = await fetch('/api/auth/logout', { method: 'POST' }); if (response.ok) location.assign('/'); else setBusy(false); }
    catch { setBusy(false); }
  }
  return <div className="flex items-center gap-2 border-r border-white/10 pr-3 text-xs"><span className="hidden max-w-28 truncate md:block">{user.username}</span><button disabled={busy} onClick={logout} className="rounded-lg border border-white/15 px-2 py-1.5 text-zinc-300 hover:text-white disabled:opacity-50">{busy ? 'יוצא…' : 'יציאה'}</button></div>;
}
