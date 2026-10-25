export function geminiError(status:number,result:any={}) {
  const reasons=(result?.error?.details||[]).map((item:any)=>String(item?.reason||''));
  if(reasons.includes('API_KEY_INVALID')||status===401)return{code:'INVALID_KEY',error:'Google לא זיהה את המפתח. העתק מפתח פעיל מ־Google AI Studio ונסה שוב.'};
  if(status===429)return{code:'QUOTA_EXCEEDED',error:'המפתח התקבל, אבל Google מגביל כרגע את השימוש או שלא נותרה מכסה למודל. בדוק את המכסה בחשבון Google AI Studio.'};
  if(status===403)return{code:'ACCESS_DENIED',error:'Google חסם את הגישה למפתח. בדוק שה־Gemini API מופעל ושהגבלות המפתח מאפשרות שימוש מהשרת. מפתח המוגבל לכתובת אתר בדפדפן אינו מתאים לחיבור הזה.'};
  if(status===404)return{code:'MODEL_UNAVAILABLE',error:'המודל השמור אינו זמין לחשבון. שמור מחדש את המפתח כדי לבחור מודל זמין.'};
  return{code:'GEMINI_UNAVAILABLE',error:'שירות Gemini לא השלים את הבקשה כרגע. נסה שוב בעוד רגע.'};
}
