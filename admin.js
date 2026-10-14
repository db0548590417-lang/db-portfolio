const status = document.querySelector('.status');
const form = document.querySelector('#project-form');

let projects = [];
let editing = null;
let dirty = false;
let busy = false;

function message(text) {
    status.textContent = text;
}

function reset() {
    editing = null;
    form.reset();
    document.querySelector('#form-title').textContent = 'הוספת עבודה';
    form.querySelector('[type=submit]').textContent = 'הוספה לטיוטה';
    document.querySelector('#cancel-edit').hidden = true;
    document.querySelector('#image-preview').hidden = true;
}

function render() {
    const list = document.querySelector('#admin-projects');
    list.replaceChildren();

    if (!projects.length) {
        list.textContent = 'עדיין אין עבודות. הוסף את העבודה הראשונה שלך.';
        return;
    }

    for (const project of projects) {
        const row = document.createElement('article');
        row.className = 'admin-project';

        const image = document.createElement('img');
        image.src = project.image;
        image.alt = project.title;

        const title = document.createElement('h3');
        title.textContent = project.title;

        const edit = document.createElement('button');
        edit.type = 'button';
        edit.className = 'secondary';
        edit.textContent = 'עריכה';

        edit.addEventListener('click', () => {
            if (busy) return;
            reset();
            editing = project.id;

            for (const key of ['title', 'category', 'description']) {
                form.elements[key].value = project[key];
            }

            document.querySelector('#form-title').textContent = 'עריכת עבודה';
            form.querySelector('[type=submit]').textContent = 'עדכון הטיוטה';
            document.querySelector('#cancel-edit').hidden = false;

            const preview = document.querySelector('#image-preview');
            preview.src = project.image;
            preview.hidden = false;
            form.elements.title.focus();
        });

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'secondary';
        remove.textContent = 'מחיקה';

        remove.addEventListener('click', () => {
            if (busy) return;
            if (!confirm(`למחוק מהטיוטה את ״${project.title}״?`)) return;

            projects = projects.filter(item => item.id !== project.id);
            if (editing === project.id) reset();

            dirty = true;
            render();
            message('העבודה הוסרה מהטיוטה. הורד את הקובץ והעלה לגיטהאב כדי לפרסם.');
        });

        row.append(image, title, edit, remove);
        list.append(row);
    }
}

async function imageData(file) {
    const formats = ['image/png', 'image/jpeg', 'image/webp'];

    if (file.size > 8000000 || !formats.includes(file.type)) {
        throw Error('בחר PNG, JPG או WebP עד 8MB');
    }

    const bitmap = await createImageBitmap(file);

    try {
        if (bitmap.width * bitmap.height > 25000000) {
            throw Error('התמונה גדולה מדי');
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

form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;

    busy = true;
    const button = form.querySelector('[type=submit]');
    button.disabled = true;

    try {
        const file = form.elements.image.files[0];
        const old = projects.find(project => project.id === editing);

        if (!file && !old) throw Error('יש לבחור תמונה');

        const project = {
            id: editing || crypto.randomUUID(),
            title: form.elements.title.value,
            category: form.elements.category.value,
            description: form.elements.description.value,
            image: file ? await imageData(file) : old.image
        };

        validateProjects([project]);

        if (editing) {
            projects = projects.map(item =>
                item.id === editing ? project : item
            );
        } else {
            if (projects.length >= 100) {
                throw Error('ניתן להוסיף עד 100 עבודות');
            }
            projects.unshift(project);
        }

        dirty = true;
        reset();
        render();
        message('הטיוטה עודכנה. הורד את קובץ הגלריה והעלה אותו לגיטהאב כדי לפרסם.');
    } catch (error) {
        message(error.message || 'לא הצלחנו לקרוא את התמונה');
    } finally {
        busy = false;
        button.disabled = false;
    }
});

document.querySelector('#cancel-edit').addEventListener('click', () => {
    if (!busy) reset();
});

document.querySelector('#export').addEventListener('click', () => {
    if (busy) return;

    const blob = new Blob(
        [JSON.stringify(projects, null, 2) + '\n'],
        { type: 'application/json' }
    );

    if (blob.size > 20000000) {
        message('הקובץ גדול מדי. השתמש בתמונות קטנות יותר — עד 20MB לקובץ הגלריה.');
        return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'projects.json';
    link.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
    dirty = false;
    message('הקובץ הוכן להורדה. העלה את projects.json לגיטהאב כדי לעדכן את האתר.');
});

document.querySelector('#import').addEventListener('change', async event => {
    const file = event.target.files[0];
    if (!file || busy) return;

    if (dirty && !confirm('להחליף את הטיוטה הנוכחית בקובץ?')) {
        event.target.value = '';
        return;
    }

    try {
        if (file.size > 20000000) throw Error('הקובץ גדול מדי');

        const imported = validateProjects(
            JSON.parse(await file.text())
        );

        projects = imported;
        dirty = true;
        reset();
        render();
        message('הקובץ נטען לטיוטה. השינויים עדיין לא פורסמו.');
    } catch (error) {
        message(error.message);
    } finally {
        event.target.value = '';
    }
});

window.addEventListener('beforeunload', event => {
    if (dirty) {
        event.preventDefault();
        event.returnValue = '';
    }
});

form.querySelector('[type=submit]').disabled = true;

(async () => {
    try {
        const response = await fetch('projects.json', {
            cache: 'no-store'
        });

        if (!response.ok) throw Error();

        projects = validateProjects(await response.json());
        render();
        message('הגלריה נטענה. אפשר לערוך ולהוריד קובץ מעודכן.');
    } catch {
        render();
        message('לא ניתן לטעון את הגלריה. טען עותק של projects.json לפני עריכה כדי לשמור על העבודות הקיימות.');
    } finally {
        form.querySelector('[type=submit]').disabled = false;
    }
})();
