import React, { useEffect, useState } from 'react';

export function GeminiSetup() {
  const [configured, setConfigured] = useState(false);
  const [checking, setChecking] = useState(true);
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    fetch('/api/settings/gemini').then(async response => {
      if (!response.ok) throw new Error('לא ניתן לבדוק את החיבור כרגע.');
      setConfigured((await response.json()).configured);
    }).catch(error => setError(error.message)).finally(() => setChecking(false));
  }, []);
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/settings/gemini', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey: key.trim() }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'החיבור נכשל. בדוק את המפתח ונסה שוב.');
      setKey(''); setConfigured(true); setMessage('החיבור נשמר');
    } catch (error: any) { setError(error.message || 'לא ניתן להתחבר כרגע.'); }
    finally { setBusy(false); }
  }
  return <section className="max-w-xl space-y-5">
    <div className="flex items-center justify-between gap-3"><h3 className="text-lg font-bold text-white">חיבור AI</h3><span role="status" className={`rounded-full px-3 py-1 text-sm ${configured ? 'bg-emerald-500/15 text-emerald-200' : 'bg-white/10 text-zinc-200'}`}>{checking ? 'בודק…' : configured ? 'מחובר' : 'לא מחובר'}</span></div>
    <form onSubmit={save} className="space-y-4">
      <label htmlFor="gemini-key" className="block text-sm font-medium text-zinc-200">מפתח Gemini אישי</label>
      <input id="gemini-key" type="password" value={key} onChange={event => setKey(event.target.value)} autoComplete="off" spellCheck={false} dir="ltr" placeholder={configured ? 'להחלפה, הזן מפתח חדש' : 'הדבק מפתח'} required minLength={20} maxLength={200} className="w-full rounded-xl border border-[#66858A] bg-[#183036] p-3 text-base text-white outline-none focus:border-[#43D6CB]" />
      {error && <p role="alert" className="text-sm leading-6 text-red-200">{error}</p>}{message && <p role="status" className="text-sm text-emerald-200">{message}</p>}
      <button disabled={busy || !key.trim()} type="submit" className="rounded-xl bg-[#43D6CB] px-6 py-3 text-sm font-bold text-[#183036] disabled:opacity-50">{busy ? 'מתחבר…' : 'שמור חיבור'}</button>
    </form>
    <details className="border-t border-white/15 pt-4 text-sm text-zinc-200"><summary className="cursor-pointer">עזרה בחיבור</summary><p className="mt-3 leading-7">אפשר ליצור מפתח אישי ב־<a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-[#43D6CB] underline">Google AI Studio</a>. השימוש מחויב לפי תנאי החשבון שלך ב־Google.</p></details>
  </section>;
}
