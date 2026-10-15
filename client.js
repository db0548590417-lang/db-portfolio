const button = document.querySelector('#project-folder');
const status = document.querySelector('#project-status');

const parameters = new URLSearchParams(window.location.search);
const folder = parameters.get('folder');
const resourceKey = parameters.get('resourcekey');

if (!folder || !/^[A-Za-z0-9_-]{10,200}$/.test(folder)) {
    button.hidden = true;

    status.textContent =
        'הקישור לפרויקט חסר או אינו תקין. ' +
        'פתחו את הקישור המלא שקיבלתם במייל.';
} else {
    const destination = new URL(
        'https://drive.google.com/drive/folders/' + folder
    );

    if (
        resourceKey &&
        /^[A-Za-z0-9_-]{1,200}$/.test(resourceKey)
    ) {
        destination.searchParams.set('resourcekey', resourceKey);
    }

    button.href = destination.href;
    button.hidden = false;

    status.textContent =
        'הגישה לקבצים מוגבלת למי שקיבל הרשאה בגוגל דרייב.';
}
