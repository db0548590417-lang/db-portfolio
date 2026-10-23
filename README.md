# דקל AI — INSPIRA STUDIO

סטודיו לעיצוב וקריאייטיב: ממשק React ושרת Cloudflare Worker.

## מצב הפרויקט

הקוד מחליף את הפרויקט הישן במאגר זה. הגרסה הישנה נשמרת בענף backup-before-dekel-ai-2026-10-23.
העלאת הקוד ל-GitHub אינה מפרסמת את השרת. גרסה זו דורשת אחסון שמריץ Worker, חיבור R2 בשם BUCKET והתחברות דרך Sites.
זהות האתר הקיים שמורה ב-.openai/hosting.json. הפרסום שלו טרם הושלם.

## הפעלה ובדיקה מקומית

דרוש Node.js 22 ומעלה.

```sh
npm install
npm run build
node verify-web.mjs
node preview-web.mjs
```

פתח http://127.0.0.1:3001. החלון להגדרת Gemini נפתח אוטומטית כשאין מפתח שמור.
המפתח נבדק מול Google ונשמר בשרת. אין לשים אותו בקוד, ב-GitHub או בצ'אט.
בתצוגה המקומית ההגדרות נשמרות בתיקייה .local-data, המוחרגת מ-Git.

## אחסון

הבנייה מפיקה dist/server/index.js ו-dist/server/wrangler.json עם nodejs_compat ואחסון R2 בשם BUCKET.
השרת דורש זהות משתמש מאומתת שהאחסון מספק. אין לפרסם אותו ללא שכבת ההתחברות.
GitHub Pages לבדו אינו תומך בשרת זה.

הפרויקטים עצמם נשמרים בדפדפן. להעברה בין מחשבים השתמש בייצוא וייבוא דרך הגדרות התוכנה.
בדיקות השרת מכסות הגדרת מפתח, הפרדה בין משתמשים, הרשאות וניתוב. הן אינן בדיקה מלאה של כל תרחישי הממשק.

## פרסום ב-Render

קובץ render.yaml מגדיר Web Service מסוג Node בתוכנית free, ללא דיסק בתשלום.
הבנייה היא npm install --include=dev && npm run build; ההפעלה היא npm start.

בעת יצירת ה-Blueprint יש להזין APP_ACCESS_PASSWORD: סיסמה אישית של לפחות 12 תווים.
Render מייצר את APP_SESSION_SECRET אוטומטית. אין להכניס את הסיסמה לקוד או לצ'אט.
בפתיחת האתר השתמש בשם המשתמש dekel ובסיסמה שקבעת.

מפתח Gemini נשמר בעוגייה מוצפנת AES-256-GCM, מסוג HttpOnly, Secure, SameSite=Strict, למשך 30 יום.
נדרש להזין את המפתח בכל דפדפן בנפרד. מחיקת העוגיות או שינוי סוד ההצפנה מחייבים הזנה מחדש.
נתוני הפרויקטים נשארים בדפדפן ואינדקס הלמידה של השרת נמצא במטמון זמני. אין כאן סנכרון בין מחשבים.
הקישור לפרסום: https://render.com/deploy?repo=https://github.com/db0548590417-lang/db-portfolio

בדיקות נוספות: node verify-render.mjs
