const status = document.querySelector('.status');
const form = document.querySelector('#project-form');
const submitButton = form.querySelector('[type=submit]');
const exportButton = document.querySelector('#export');
const importInput = document.querySelector('#import');

let projects = [];
let editing = null;
let draftImages = [];
let cover = null;
let dirty = false;
let busy = false;

const previews = document.createElement('div');
previews.className = 'project-album';
form.elements.image.closest('label').after(previews);

function message(text) {
    status.textContent = text;
}

function setBusy(value) {
    busy = value;
    submitButton.disabled = value;
    exportButton.disabled = value;
    importInput.disabled = value;
    form.elements.image.disabled = value;
}

function reset() {
    editing = null;
    draftImages = [];
    cover = null;
    form.reset();
    previews.replaceChildren();

    document.querySelector('#form-title').textContent = 'הוספת פרויקט';
    submitButton.textContent = 'שמירת הפרויקט בטיוטה';
    document.querySelector('#cancel-edit').hidden = true;

    const oldPreview = document.querySelector('#image-preview');
    if (oldPreview) oldPreview.hidden = true;
}

function renderPreviews() {
    previews.replaceChildren();

    draftImages.forEach((source, index) => {
        const card = document.createElement('div');

        const image = document.createElement('img');
        image.src = source;
        image.alt = `תמונה ${index + 1}`;
        image.style.width = '100%';
        image.style.height = '140px';
        image.style.objectFit = 'contain';

        const choose = document.createElement('button');
        choose.type = 'button';
        choose.className = 'secondary';
        choose.textContent = source === cover
            ? '✓ תמונת שער'
            : 'בחירה כתמונת שער';
        choose.setAttribute('aria-pressed', String(source === cover));

        choose.addEventListener('click', () => {
            if (busy) return;
            cover = source;
            dirty = true;
            renderPreviews();
        });

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'secondary';
        remove.textContent = 'הסרת תמונה';
        remove.setAttribute(
            'aria-label',
            `הסרת תמונה ${index + 1} מהפרויקט`
        );

        remove.addEventListener('click', () => {
            if (busy) return;

            draftImages.splice(index, 1);

            if (!draftImages.includes(cover)) {
                cover = draftImages[0] || null;
            }

            dirty = true;
            renderPreviews();
        });

        card.append(image, choose, remove);
        previews.append(card);
    });
}

function render() {
    const list = document.querySelector('#admin-projects');
    list.replaceChildren();

    if (!projects.length) {
        list.textContent = 'עדיין אין פרויקטים. הוסף את הפרויקט הראשון שלך.';
        return;
    }

    projects.forEach(project => {
        const row = document.createElement('article');
        row.className = 'admin-project';

        const image = document.createElement('img');
        image.src = project.image;
        image.alt = project.title;

        const title = document.createElement('h3');
        title.textContent =
            `${project.title} · ${project.images.length} תמונות`;

        const edit = document.createElement('button');
        edit.type = 'button';
        edit.className = 'secondary';
        edit.textContent = 'עריכה';

        edit.addEventListener('click', () => {
            if (busy) return;

            if (
                (draftImages.length || form.elements.title.value) &&
                !confirm('לעבור לעריכת הפרויקט? שינויים שלא נשמרו בטופס יאבדו.')
            ) {
                return;
            }

            reset();
            editing = project.id;
            draftImages = [...project.images];
            cover = project.image;

            form.elements.title.value = project.title;
            form.querySelectorAll('[name="categories"]').forEach(checkbox => {
    checkbox.checked = project.categories.includes(checkbox.value);
});
            form.elements.description.value = project.description;

            document.querySelector('#form-title').textContent =
                'עריכת פרויקט';

            document.querySelector('#cancel-edit').hidden = false;
            renderPreviews();
            form.elements.title.focus();
        });

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'secondary';
        remove.textContent = 'מחיקת פרויקט';

        remove.addEventListener('click', () => {
            if (busy) return;

            if (!confirm(`למחוק מהטיוטה את הפרויקט ״${project.title}״?`)) {
                return;
            }

            projects = projects.filter(item => item.id !== project.id);

            if (editing === project.id) reset();

            dirty = true;
            render();
            message('הפרויקט הוסר מהטיוטה. לפרסום השינוי, הורד והעלה את הקובץ לגיטהאב.');
        });

        row.append(image, title, edit, remove);
        list.append(row);
    });
}

async function imageData(file) {
    const formats = ['image/png', 'image/jpeg', 'image/webp'];

    if (file.size > 8000000 || !formats.includes(file.type)) {
        throw Error('כל תמונה חייבת להיות PNG, JPG או WebP, עד 8MB');
    }

    const bitmap = await createImageBitmap(file);

    try {
        if (bitmap.width * bitmap.height > 25000000) {
            throw Error('אחת התמונות גדולה מדי');
        }

        const canvas = document.createElement('canvas');

        const scale = Math.min(
            1,
            1600 / Math.max(bitmap.width, bitmap.height)
        );

        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));

        canvas.getContext('2d').drawImage(
            bitmap, 0, 0, canvas.width, canvas.height
        );

        return canvas.toDataURL('image/webp', 0.85);
    } finally {
        bitmap.close();
    }
}

form.elements.image.addEventListener('change', async () => {
    if (busy) return;

    const files = [...form.elements.image.files];
    if (!files.length) return;

    setBusy(true);
    message('מכין את התמונות…');

    try {
        if (draftImages.length + files.length > 30) {
            throw Error('אפשר להוסיף עד 30 תמונות לפרויקט');
        }

        const additions = [];

        for (const file of files) {
            additions.push(await imageData(file));
        }

        draftImages.push(...additions);
        cover = cover || draftImages[0];
        dirty = true;

        renderPreviews();
        message('התמונות נוספו לטופס. בחר תמונת שער ולחץ על שמירת הפרויקט בטיוטה.');
    } catch (error) {
        message(error.message || 'לא הצלחנו לקרוא את התמונות');
    } finally {
        form.elements.image.value = '';
        setBusy(false);
    }
});

form.addEventListener('input', () => {
    dirty = true;
});

form.addEventListener('submit', event => {
    event.preventDefault();
    if (busy) return;

    try {
        if (!draftImages.length) {
            throw Error('יש לבחור לפחות תמונה אחת לפרויקט');
        }

        const project = validateProjects([{
            id: editing || crypto.randomUUID(),
            title: form.elements.title.value,
           categories: [...form.querySelectorAll(
    '[name="categories"]:checked'
)].map(checkbox => checkbox.value),
            description: form.elements.description.value,
            image: cover,
            images: [...draftImages]
        }])[0];

        if (editing) {
            projects = projects.map(item =>
                item.id === editing ? project : item
            );
        } else {
            if (projects.length >= 100) {
                throw Error('אפשר להוסיף עד 100 פרויקטים');
            }

            projects.unshift(project);
        }

        dirty = true;
        reset();
        render();

        message('הפרויקט נשמר בטיוטה. הורד את קובץ הגלריה והעלה אותו לגיטהאב כדי לפרסם.');
    } catch (error) {
        message(error.message);
    }
});

document.querySelector('#cancel-edit').addEventListener('click', () => {
    if (busy) return;

    if (!confirm('לבטל את השינויים בטופס?')) return;

    reset();
});

exportButton.addEventListener('click', () => {
    if (busy) return;

    if (draftImages.length || form.elements.title.value.trim()) {
        message('יש בטופס פרויקט שעדיין לא נשמר. שמור אותו בטיוטה או בטל את העריכה לפני ההורדה.');
        return;
    }

    const blob = new Blob(
        [JSON.stringify(projects, null, 2) + '\n'],
        { type: 'application/json' }
    );

    if (blob.size > 20000000) {
        message('קובץ הגלריה גדול מדי. יש להקטין תמונות או להסיר תמונות — המקסימום הוא 20MB.');
        return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'projects.json';
    link.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);

    dirty = false;
    message('הקובץ הוכן להורדה. העלה את projects.json לגיטהאב כדי לפרסם את הפרויקטים.');
});

importInput.addEventListener('change', async event => {
    const file = event.target.files[0];
    if (!file || busy) return;

    if (dirty && !confirm('להחליף את הטיוטה הנוכחית בקובץ?')) {
        event.target.value = '';
        return;
    }

    setBusy(true);

    try {
        if (file.size > 20000000) throw Error('הקובץ גדול מדי');

        const imported = validateProjects(
            JSON.parse(await file.text())
        );

        projects = imported;
        dirty = true;
        reset();
        render();

        message('הפרויקטים נטענו לטיוטה. השינויים עדיין לא פורסמו.');
    } catch (error) {
        message(error.message);
    } finally {
        event.target.value = '';
        setBusy(false);
    }
});

window.addEventListener('beforeunload', event => {
    if (dirty) {
        event.preventDefault();
        event.returnValue = '';
    }
});

setBusy(true);
form.hidden = true;

(async () => {
    try {
       let response = await fetch('projects-source.json', {
    cache: 'no-store'
});

if (response.status === 404) {
    response = await fetch('projects.json', {
        cache: 'no-store'
    });
}

        if (!response.ok) throw Error();

        projects = validateProjects(await response.json());

        reset();
        render();
        form.hidden = false;

        message('הפרויקטים נטענו. אפשר להוסיף פרויקט ולבחור כמה תמונות יחד.');
    } catch {
        message('לא ניתן לטעון את הגלריה. אפשר לטעון עותק של projects.json באמצעות טעינת קובץ גלריה.');
    } finally {
        setBusy(false);
    }
})();

/* פתיחת הטופס גם אחרי ייבוא קובץ */
importInput.addEventListener('change', () => {
    form.hidden = false;
});
