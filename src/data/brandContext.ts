import type { Project } from '../types';

export function buildBrandContext(project: Project): string {
  const b = project.brand;
  const palette = project.colorPalettes.find(p => p.id === b?.officialPaletteId);
  const entries: [string, string | undefined][] = [
    ['פרופיל העיצוב לפרויקט', ({hasidic_traditional:'מסורתי / מלכותי / חסידי',modern_luxury:'יוקרה בינלאומית',minimalist:'מינימליזם שוויצרי',bold_brutalist:'ברוטליסטי נועז'} as Record<string,string>)[project.creativeProfile || 'hasidic_traditional']],
    ['שם הפרויקט', project.name], ['הלקוח המזמין', project.clientName],
    ['לקוח הקצה', b?.endClient], ['המותג המפורסם', b?.brandName],
    ['תחום המותג', b?.industry], ['תיאור המותג', b?.brandDescription],
    ['ערכי המותג', b?.brandValues], ['טון ושפה', b?.brandVoice],
    ['קהל היעד של המותג', b?.audience], ['מגבלות מותג', b?.brandRestrictions],
    ['טיפוגרפיה מועדפת', b?.typography],
    ['צבעי מותג רשמיים', palette?.colors.join(', ')],
    ['מוצר/שירות בקמפיין', project.brief.productOrService],
    ['מטרה', project.brief.campaignObjective], ['מסר מרכזי', project.brief.primaryMessage],
    ['סגנון', project.brief.preferredVisualStyle], ['מגבלות בריף', project.brief.creativeRestrictions],
    ['קופירייטינג קיים ומאושר', project.creativeWorkspace?.approvedCopy],
    ['ויזואל קיים', project.creativeWorkspace?.visualDirection],
    ['הנחיות מעצב', project.creativeWorkspace?.notes],
    ['קופי נעול', project.creativeWorkspace?.lockedCopy ? 'כן, אסור לשנות' : undefined],
    ['ויזואל נעול', project.creativeWorkspace?.lockedVisual ? 'כן, אסור לשנות' : undefined],
  ];
  const inspirations = (project.savedInspirations || []).slice(0, 8).map((i,n) => `רפרנס ${n+1}: ${i.title || 'ללא שם'}; מקור: ${i.source || ''}; ${i.style || ''}; טכניקה/תיאור: ${i.technique || ''}; כתובת מקור: ${i.sourceUrl || ''}`).join('\n');
  const artwork = (project.designAssets || []).slice(-6).map(x => `${x.name} (גרסה ${x.version}, סוג ${x.kind})`).join('; ');
  if (artwork) entries.push(['עיצובים וגרסאות בפרויקט (מטא-דאטה בלבד, לא תוכן הפיקסלים)', artwork]);
  if (inspirations) entries.push(['השראות שנבחרו לפרויקט (רפרנסים להשראה בלבד, לא להעתקה; כותרות וקישורים אינם ניתוח של פיקסלי התמונה)', inspirations]);
  return entries.filter(([,v]) => !!v?.trim()).map(([k,v]) => `${k}: ${v}`).join('\n');
}
