import React, { useEffect, useState } from 'react';

export function GeminiSetup() {
  const [open, setOpen] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [checking, setChecking] = useState(true);
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/settings/gemini').then(async response => {
      if (!response.ok) throw new Error('לא ניתן לבדוק את הגדרת המפתח כרגע. נסה לרענן את העמוד.');
      const result = await response.json();
      setConfigured(result.configured);
      if (!result.configured) setOpen(true);
    }).catch(error => { setError(error.message); setOpen(true); }).finally(() => setChecking(false));
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/settings/gemini', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'שמירת המפתח נכשלה');
      setKey(''); setConfigured(true);
      setMessage('המפתח אומת ונשמר. אפשר להתחיל לעבוד.');
    } catch (error: any) { setError(error.message || 'אירעה שגיאת חיבור'); }
    finally { setBusy(false); }
  }

  return <>
    <button onClick={() => { setOpen(true); setMessage(''); }} className="fixed bottom-3 left-3 z-[60] rounded-xl border border-[#43D6CB]/40 bg-[#103F46] px-4 py-2 text-xs text-white shadow-lg">
      {checking ? 'בודק חיבור…' : configured ? '✓ מפתח Gemini' : 'הגדרת מפתח Gemini'}
    </button>
    {open && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" dir="rtl">
      <section role="dialog" aria-modal="true" aria-labelledby="gemini-title" className="w-full max-w-lg rounded-2xl border border-[#43D6CB]/30 bg-[#103F46] p-7 text-right text-white shadow-2xl">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 id="gemini-title" className="text-xl font-bold">חיבור Gemini לסטודיו שלך</h2>
          <button aria-label="סגירה" onClick={() => { setOpen(false); setKey(''); }} className="rounded-lg px-3 py-1 text-xl hover:bg-white/10">×</button>
        </div>
        <p className="mb-5 text-sm leading-7 text-zinc-200">כדי להפעיל את כלי הבינה המלאכותית, הזן מפתח Gemini אישי. המפתח נשמר בצד השרת עבור החשבון שלך ואינו מוצג באתר.</p>
        {configured && <p className="mb-4 rounded-lg bg-emerald-900/40 p-3 text-sm text-emerald-200">כבר קיים מפתח שמור. אפשר להחליף אותו כאן.</p>}
        <form onSubmit={save}>
          <label htmlFor="gemini-key" className="mb-2 block text-sm font-bold">מפתח Gemini API</label>
          <input id="gemini-key" type="password" value={key} onChange={event => setKey(event.target.value)} autoComplete="off" spellCheck={false} dir="ltr" placeholder="AIza…" required minLength={20} maxLength={200} className="mb-4 w-full rounded-xl border border-zinc-600 bg-[#183036] p-3 text-white outline-none focus:border-[#43D6CB]" />
          {error && <p role="alert" className="mb-4 text-sm text-red-300">{error}</p>}
          {message && <p role="status" className="mb-4 text-sm text-emerald-200">{message}</p>}
          <button disabled={busy || !key.trim()} type="submit" className="w-full rounded-xl bg-[#43D6CB] py-3 font-bold text-[#103F46] disabled:opacity-50">{busy ? 'מאמת ושומר…' : 'אימות ושמירת מפתח'}</button>
        </form>
        <div className="mt-5 flex flex-wrap justify-between gap-3 text-xs">
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-[#43D6CB] underline">יצירת מפתח ב-Google AI Studio</a>
          <button onClick={() => { setOpen(false); setKey(''); }} className="text-zinc-300 underline">{configured ? 'חזרה לסטודיו' : 'המשך לכלים המקומיים'}</button>
        </div>
        <p className="mt-5 text-xs leading-6 text-zinc-400">הפרויקטים והקבצים נשמרים בדפדפן במחשב הנוכחי. להעברה למחשב אחר השתמש בגיבוי וייבוא שבהגדרות. השימוש ב-Gemini כפוף למכסה ולחיוב בחשבון Google שלך.</p>
      </section>
    </div>}
  </>;
}
