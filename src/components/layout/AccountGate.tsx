import React, { createContext, useContext, useEffect, useState } from 'react';
import logo from '../../dekel-ai-logo.svg';
import { setStorageUser } from '../../data/accountStorage';

type User = { id: string; email: string; username: string; provider: string };
const AccountContext = createContext<User | null>(null);
export const useAccount = () => useContext(AccountContext);

export function AccountGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [registrationEnabled, setRegistrationEnabled] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [recovering,setRecovering] = useState(false);
  const [recoveryCode,setRecoveryCode] = useState('');
  const [recoveryMessage,setRecoveryMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const acceptUser = (value: User) => { setStorageUser(value.id); setUser(value); };
  useEffect(() => {
    fetch('/api/auth/session', { signal: AbortSignal.timeout(20000) }).then(async response => {
      if (!response.ok) throw new Error('לא ניתן לבדוק את החיבור. נסה לרענן את העמוד.');
      const session = await response.json();
      setRegistrationEnabled(session.registrationEnabled);
      if (session.user) acceptUser(session.user);
    }).catch(error => setError(error.message)).finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (!user) return;
    const previous = window.fetch.bind(window);
    const checkAccount = async () => {
      try { const response = await previous('/api/auth/session'); if (response.ok && (await response.json()).user?.id !== user.id) location.reload(); }
      catch { /* Keep the workspace on a temporary network failure. */ }
    };
    window.addEventListener('focus', checkAccount);
    window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.href);
      if (url.origin !== location.origin || !url.pathname.startsWith('/api/')) return previous(input, init);
      const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
      headers.set('x-dekel-user-id', user.id);
      const response = await previous(input, { ...init, headers });
      if (response.status === 401 || response.status === 409) void checkAccount();
      return response;
    }) as typeof fetch;
    return () => { window.fetch = previous; window.removeEventListener('focus', checkAccount); };
  }, [user?.id]);
  function changeMode(next: typeof mode) { setMode(next); setError(''); setPassword(''); setConfirmPassword(''); }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError('');
    const fields=new FormData(event.currentTarget as HTMLFormElement);
    const submittedUsername=String(fields.get('username')||'');
    const submittedPassword=String(fields.get('password')||'');
    if (mode === 'register' && submittedPassword !== String(fields.get('confirm-password')||'')) { setError('הסיסמאות אינן זהות'); return; }
    setBusy(true);
    try {
      const response = await fetch('/api/auth/' + mode, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username:submittedUsername, password:submittedPassword }) });
      const result = await response.json().catch(() => ({ error: response.status === 429 ? 'יותר מדי ניסיונות כניסה. המתן דקה ונסה שוב.' : 'לא ניתן להתחבר כרגע. נסה שוב בעוד רגע.' }));
      if (!response.ok) throw new Error(result.error || 'לא ניתן להשלים את הפעולה');
      // Use the browser password manager; never persist passwords in app storage.
      try { const Credential=(window as any).PasswordCredential;if(Credential&&navigator.credentials?.store)void navigator.credentials.store(new Credential({id:submittedUsername,password:submittedPassword})).catch(()=>{}); }catch{/* Browser preferences control whether saving is available. */}
      setPassword(''); setConfirmPassword(''); acceptUser(result.user);
    } catch (error: any) { setError(error.message); }
    finally { setBusy(false); }
  }
  async function recover(event: React.FormEvent) {
    event.preventDefault();setBusy(true);setError('');
    try {const r=await fetch('/api/auth/recover',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,recoveryCode,newPassword:password})});const data=await r.json();if(!r.ok)throw Error(data.error);setRecovering(false);setPassword('');setRecoveryCode('');setRecoveryMessage('הסיסמה עודכנה. התחבר עם הסיסמה החדשה וצור קוד שחזור חדש בהגדרות.');}
    catch(e:any){setError(e.message||'השחזור נכשל');}finally{setBusy(false);}
  }
  if (!loading && user?.username) return <AccountContext.Provider value={user}>{children}</AccountContext.Provider>;
  return <main dir="rtl" className="dekel-account min-h-screen bg-[#183036] text-[#F7F8F3] font-['Heebo',sans-serif] flex items-center justify-center p-5 relative overflow-hidden">
    <div aria-hidden="true" className="pointer-events-none absolute -top-44 -right-44 h-[520px] w-[520px] rounded-full border border-[#43D6CB]/20" />
    <div aria-hidden="true" className="pointer-events-none absolute -bottom-64 -left-44 h-[620px] w-[620px] rounded-full bg-[#43D6CB]/5" />
    <section className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-[#43D6CB]/20 bg-[#103F46] shadow-2xl md:grid-cols-2">
      <div className="flex flex-col justify-between bg-[#43D6CB] p-8 text-[#183036] md:p-12">
        <div className="mb-10 flex h-20 w-52 items-center justify-center rounded-2xl bg-[#183036] px-5 py-3"><img src={logo} alt="דקל AI" className="h-full w-full object-contain" /></div>
        <div><p className="mb-4 text-xs font-bold tracking-[0.18em]">המרחב שלך ליצור</p><h1 className="text-3xl font-extrabold leading-[1.3] md:text-4xl">כל רעיון טוב<br />מתחיל כאן.</h1><p className="mt-6 max-w-sm text-sm leading-7">השראה, קריאייטיב וכלי עיצוב — בסטודיו אחד שמדבר בשפה שלך.</p></div>
        <p className="mt-10 text-xs">דקל AI · סטודיו למעצבים</p>
      </div>
      <div className="flex flex-col justify-center p-8 md:p-12">
        {loading ? <p role="status">טוען את הסטודיו שלך…</p> : <>
          <p className="mb-2 text-sm text-[#43D6CB]">ברוכים הבאים לסטודיו</p>
          <h2 className="mb-3 text-2xl font-bold">{mode === 'register' ? 'יוצרים חשבון חדש' : 'המקום שלך לקריאייטיב'}</h2>
          <p className="mb-6 text-sm leading-7 text-zinc-300">{mode === 'register' ? 'בוחרים שם משתמש וסיסמה ומתחילים ליצור.' : 'התחבר לחשבון שלך והמשך מהמקום שבו עצרת.'}</p>
          <div className="mb-6 flex gap-2 rounded-xl bg-[#183036] p-1" aria-label="בחירת כניסה או הרשמה">
            <button onClick={() => changeMode('login')} className={`flex-1 rounded-lg p-2 text-sm ${mode === 'login' ? 'bg-[#43D6CB] font-bold text-[#183036]' : 'text-zinc-300'}`}>כניסה</button>
            <button onClick={() => changeMode('register')} className={`flex-1 rounded-lg p-2 text-sm ${mode === 'register' ? 'bg-[#43D6CB] font-bold text-[#183036]' : 'text-zinc-300'}`}>הרשמה</button>
          </div>
          {!registrationEnabled && mode === 'register' && <p role="status" className="mb-4 rounded-lg border border-[#43D6CB]/25 p-3 text-sm leading-7 text-zinc-300">ההרשמה אינה זמינה כרגע. נסה שוב בעוד רגע.</p>}
          {recovering ? <form onSubmit={recover} className="space-y-4"><p className="text-sm text-zinc-200">הזן את קוד החירום ששמרת בהגדרות החשבון. הקוד חד־פעמי והחלפת הסיסמה תנתק מפגשים קודמים.</p><label className="block">שם משתמש<input required value={username} onChange={e=>setUsername(e.target.value)} autoComplete="username" className="mt-1 w-full rounded-lg bg-[#183036] p-3"/></label><label className="block">קוד שחזור<input required value={recoveryCode} onChange={e=>setRecoveryCode(e.target.value)} autoComplete="off" className="mt-1 w-full rounded-lg bg-[#183036] p-3"/></label><label className="block">סיסמה חדשה<input required type="password" minLength={8} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password" className="mt-1 w-full rounded-lg bg-[#183036] p-3"/></label><button disabled={busy} className="rounded-lg bg-[#43D6CB] p-3 font-bold text-[#183036]">החלף סיסמה</button><button type="button" onClick={()=>setRecovering(false)} className="mr-3 underline">חזרה לכניסה</button></form> : <form key={mode} method="post" autoComplete="on" onSubmit={submit} className="space-y-4">
            <div><label htmlFor="account-username" className="mb-2 block text-sm">שם משתמש</label><input id="account-username" name="username" autoCapitalize="none" spellCheck={false} autoComplete="username" minLength={3} maxLength={32} required value={username} onChange={event => setUsername(event.target.value)} className="w-full rounded-xl border border-white/20 bg-[#183036] p-3 outline-none focus:border-[#43D6CB]" /></div>
            <div><label htmlFor="account-password" className="mb-2 block text-sm">סיסמה</label><input id="account-password" name="password" type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} minLength={mode === 'register' ? 8 : 1} maxLength={128} required value={password} onChange={event => setPassword(event.target.value)} className="w-full rounded-xl border border-white/20 bg-[#183036] p-3 outline-none focus:border-[#43D6CB]" /></div>
            {mode === 'register' && <div><label htmlFor="account-confirm" className="mb-2 block text-sm">אימות סיסמה</label><input id="account-confirm" name="confirm-password" type="password" autoComplete="new-password" minLength={mode === 'register' ? 8 : 1} maxLength={128} required value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} className="w-full rounded-xl border border-white/20 bg-[#183036] p-3 outline-none focus:border-[#43D6CB]" /><p className="mt-2 text-xs text-zinc-400">לפחות 8 תווים. שם המשתמש יכול לכלול אותיות בעברית או באנגלית, מספרים, נקודה, קו וקו תחתון.</p></div>}
            <button disabled={busy || (!registrationEnabled && mode === 'register')} className="w-full rounded-xl bg-[#43D6CB] p-3 font-bold text-[#183036] disabled:opacity-50">{busy ? 'רק רגע…' : mode === 'register' ? 'יצירת חשבון' : 'כניסה לסטודיו'}</button>
          </form>}
          {!recovering && mode === 'login' && <button type="button" onClick={()=>{setRecovering(true);setPassword('');setError('');}} className="mt-4 text-sm text-[#43D6CB] underline">שכחתי סיסמה — יש לי קוד שחזור</button>}
          {recoveryMessage && <p role="status" className="mt-3 text-sm text-[#43D6CB]">{recoveryMessage}</p>}
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
  return <div className="flex items-center gap-2 border-r border-white/10 pr-3 text-sm"><span className="hidden max-w-28 truncate md:block">{user.provider === 'owner' ? 'החשבון שלי' : user.username}</span><button disabled={busy} onClick={logout} className="rounded-lg border border-white/15 px-2 py-1.5 text-zinc-300 hover:text-white disabled:opacity-50">{busy ? 'יוצא…' : 'יציאה'}</button></div>;
}

