export type SourceMode = 'haredi' | 'international';

export const harediSources = [
  { name: 'הפסקת פרסומות', domain: 'hafsakat-ads.co.il' },
  { name: 'סגנון 7', domain: 'signon7.com' },
  { name: 'יהודה הלר', domain: 'yehudaheller.com' },
  { name: 'מרדכי בלום', domain: 'm-blum.co.il' },
  { name: 'פרוג', domain: 'prog.co.il' },
] as const;

const topics = [
  { re: /הרינג|דגים|דג|אוכל|מזון|מסעד|קידוש|קייטרינג|מאפ|קוגל/, he: ['פרסום מזון', 'מיתוג קולינרי', 'צילום מוצר'], en: 'premium food product advertising packaging design' },
  { re: /דינר|התרמה|מגבית|ישיב|כולל|תורה|מוסד|חסיד|בית מדרש/, he: ['דינר', 'קמפיין התרמה', 'עיצוב מוסדות תורה'], en: 'luxury gala charity event poster gold editorial typography' },
  { re: /אירוע|חתונ|הזמנ|שמחה|בר מצו|קידושא/, he: ['הזמנות', 'אירועים', 'מודעות פרינט'], en: 'elegant event invitation poster branding' },
  { re: /לוגו|מותג|מיתוג|זהות/, he: ['מיתוג', 'זהות חזותית', 'לוגואים'], en: 'graphic identity branding logo design presentation' },
  { re: /אריז|תווית|מדבק|קופס/, he: ['עיצוב אריזות', 'תוויות מוצר', 'מיתוג מוצרים'], en: 'luxury packaging label graphic design' },
  { re: /ספר|כריכ|חוברת|קטלוג|מגזין|בלנק/, he: ['עימוד', 'טיפוגרפיה', 'עיצוב לדפוס'], en: 'premium editorial book cover typography design' },
] as const;
const styles = [
  { re: /יוקר|פרימיום|מלכות|זהב|מהודר/, he: 'יוקרתי', en: 'luxury gold' },
  { re: /גשטאלט|הברק|יצירתי|משחק|חכם|קונספט/, he: 'קריאייטיב קונספטואלי', en: 'conceptual gestalt advertising' },
  { re: /צעיר|מודרני|חדשני|נועז/, he: 'עכשווי', en: 'modern bold' },
  { re: /מינימל|נקי|עדין/, he: 'מינימליסטי', en: 'minimalist clean' },
  { re: /עתיק|קלאסי|מסורתי|חסידי|וילנא/, he: 'מסורתי', en: 'classic ornamental' },
] as const;

export function interpretBrief(input: string, mode: SourceMode) {
  const normalized = input.trim().slice(0, 250);
  const matched = topics.filter(t => t.re.test(normalized));
  const matchedStyles = styles.filter(s => s.re.test(normalized));
  const hebrewTerms: string[] = [...new Set<string>([...matched.flatMap(t => t.he), ...matchedStyles.map(s => s.he)])];
  if (!hebrewTerms.length) hebrewTerms.push('עיצוב גרפי', 'קונספט פרסומי');
  const en = [...matched.map(t => t.en), ...matchedStyles.map(s => s.en)];
  const englishInput = /[a-zA-Z]{3}/.test(normalized) ? normalized.match(/[a-zA-Z][a-zA-Z\s-]{2,}/g)?.join(' ') : '';
  const englishSearch = [englishInput, ...en, 'graphic design'].filter(Boolean).join(' ').slice(0, 190);
  const hebrewSearch = [normalized, ...hebrewTerms.slice(0, 2)].join(' ').slice(0, 210);
  return {
    hebrewTerms,
    englishSearch,
    hebrewSearch,
    explanation: `זיהיתי ${hebrewTerms.join(' · ')}. ${mode === 'haredi' ? 'אחפש עבודות בהקשר הזה במקורות העיצוב החרדיים.' : 'אחפש רפרנסים בינלאומיים לפי מושגים עיצוביים קשורים.'}`,
  };
}
