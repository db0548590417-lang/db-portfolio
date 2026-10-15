(() => {
    const form = document.querySelector('#client-link-form');
    const input = document.querySelector('#drive-folder-link');
    const area = document.querySelector('#generated-link-area');
    const output = document.querySelector('#generated-client-link');
    const copyButton = document.querySelector('#copy-client-link');
    const status = document.querySelector('#link-builder-status');

    input.addEventListener('input', () => {
        area.hidden = true;
        output.value = '';
        status.textContent = '';
    });

    form.addEventListener('submit', event => {
        event.preventDefault();
        area.hidden = true;
        output.value = '';
        status.textContent = '';

        try {
            let driveURL;

            try {
                driveURL = new URL(input.value.trim());
            } catch {
                throw Error('יש להדביק קישור תקין לתיקיית דרייב.');
            }

            if (
                driveURL.protocol !== 'https:' ||
                driveURL.hostname !== 'drive.google.com' ||
                driveURL.port ||
                driveURL.username ||
                driveURL.password
            ) {
                throw Error('יש להשתמש בקישור של Google Drive בלבד.');
            }

            const match = driveURL.pathname.match(
                /^\/drive\/(?:u\/\d+\/)?folders\/([A-Za-z0-9_-]+)\/?$/
            );

            let folder = match ? match[1] : null;

            if (
                !folder &&
                ['/open', '/folderview'].includes(driveURL.pathname)
            ) {
                folder = driveURL.searchParams.get('id');
            }

            if (!folder || !/^[A-Za-z0-9_-]{10,200}$/.test(folder)) {
                throw Error('לא נמצא מזהה תיקייה. העתק קישור דרך ״שיתוף״ בתיקיית דרייב.');
            }

            const clientURL = new URL(
                'https://db0548590417-lang.github.io/db-portfolio/client.html'
            );

            clientURL.searchParams.set('folder', folder);

            const resourceKey = driveURL.searchParams.get('resourcekey');

            if (resourceKey) {
                if (!/^[A-Za-z0-9_-]{1,200}$/.test(resourceKey)) {
                    throw Error('הקישור אינו תקין. העתק אותו מחדש מדרייב.');
                }

                clientURL.searchParams.set('resourcekey', resourceKey);
            }

            output.value = clientURL.href;
            area.hidden = false;

            status.textContent =
                'הקישור מוכן להעתקה. ודא שהתיקייה משותפת עם המייל של הלקוח.';

            output.focus();
            output.select();
        } catch (error) {
            status.textContent = error.message;
        }
    });

    copyButton.addEventListener('click', async () => {
        if (!output.value) return;

        try {
            await navigator.clipboard.writeText(output.value);
            status.textContent = 'הקישור הועתק! אפשר להדביק אותו במייל ללקוח.';
        } catch {
            output.focus();
            output.select();
            status.textContent =
                'ההעתקה האוטומטית לא זמינה. הקישור מסומן — לחץ Ctrl+C להעתקה.';
        }
    });
})();
