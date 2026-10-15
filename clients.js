const form = document.querySelector('#client-access');
const input = document.querySelector('#client-link');
const status = document.querySelector('#client-status');
const button = form.querySelector('button');

form.addEventListener('submit', event => {
    event.preventDefault();
    status.textContent = '';

    try {
        const url = new URL(input.value.trim());

        if (
            url.protocol !== 'https:' ||
            url.hostname !== 'drive.google.com' ||
            url.port ||
            url.username ||
            url.password
        ) {
            throw Error('יש להדביק קישור לתיקייה בגוגל דרייב.');
        }

        const folder = url.pathname.match(
            /^\/drive\/(?:u\/\d+\/)?folders\/([A-Za-z0-9_-]+)\/?$/
        );

        let folderId = folder ? folder[1] : null;

        if (
            !folderId &&
            ['/open', '/folderview'].includes(url.pathname)
        ) {
            folderId = url.searchParams.get('id');
        }

        if (!folderId || !/^[A-Za-z0-9_-]+$/.test(folderId)) {
            throw Error(
                'הקישור אינו קישור לתיקייה. השתמשו בקישור האישי שקיבלתם.'
            );
        }

        const destination = new URL(
            'https://drive.google.com/drive/folders/' + folderId
        );

        const resourceKey = url.searchParams.get('resourcekey');

        if (resourceKey && /^[A-Za-z0-9_-]+$/.test(resourceKey)) {
            destination.searchParams.set('resourcekey', resourceKey);
        }

        window.open(
            destination.href,
            '_blank',
            'noopener,noreferrer'
        );

        status.textContent =
            'בגוגל דרייב יש להתחבר עם המייל שקיבל הרשאה. ' +
            'אם לא נפתחה כרטיסייה, בדקו אם הדפדפן חסם חלונות קופצים.';
    } catch (error) {
        status.textContent =
            error.message === 'Invalid URL'
                ? 'יש להדביק קישור תקין לגוגל דרייב.'
                : error.message;

        input.focus();
    }
});

button.disabled = false;
