const viewer = document.querySelector('.viewer');
const grid = document.querySelector('.projects');
const status = document.querySelector('.gallery-status');

const canvas = viewer.querySelector('.viewer__canvas');
const navigation = viewer.querySelector('.viewer__navigation');
const description = viewer.querySelector('.viewer__description');

let projects = [];
let visible = [];
let currentProject = null;
let selectedImage = 0;
let enlarged = false;

/* גלריית התמונות בתוך הפרויקט */
const album = document.createElement('div');
album.className = 'project-album';
canvas.before(album);

/* חזרה מהתמונה המוגדלת לתמונות הפרויקט */
const back = document.createElement('button');
back.type = 'button';
back.className = 'album-back';
back.textContent = '→ לכל תמונות הפרויקט';
back.hidden = true;
canvas.before(back);

function showAlbum() {
    enlarged = false;
    canvas.hidden = true;
    navigation.hidden = true;
    back.hidden = true;
    album.hidden = false;
    description.hidden = false;

    if (album.children[selectedImage]) {
        album.children[selectedImage].focus();
    }
}

function showImage(index) {
    if (!currentProject) return;

    const images = currentProject.images;
    selectedImage = (index + images.length) % images.length;
    enlarged = true;

    album.hidden = true;
    description.hidden = true;
    canvas.hidden = false;
    navigation.hidden = false;
    back.hidden = false;

    const image = viewer.querySelector('.viewer__image');
    image.src = images[selectedImage];
    image.alt =
        `${currentProject.title} — תמונה ${selectedImage + 1}`;

    viewer.querySelector('.viewer__count').textContent =
        `${selectedImage + 1} / ${images.length}`;
}

function openProject(project) {
    currentProject = project;
    selectedImage = 0;
    enlarged = false;

    document.querySelector('#viewer-title').textContent = project.title;
    description.textContent = project.description;

    album.replaceChildren();

    project.images.forEach((source, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'project-album__item';
        button.setAttribute(
            'aria-label',
            `הגדלת תמונה ${index + 1} של ${project.title}`
        );

        const image = document.createElement('img');
        image.src = source;
        image.alt = `${project.title} — תמונה ${index + 1}`;
        image.loading = 'lazy';

        button.append(image);

        button.addEventListener('click', () => {
            showImage(index);
            back.focus();
        });

        album.append(button);
    });

    canvas.hidden = true;
    navigation.hidden = true;
    back.hidden = true;
    album.hidden = false;
    description.hidden = false;

    viewer.showModal();
    document.body.classList.add('viewer-open');
}

function render(category = 'הכול') {
    visible = projects.filter(project =>
        category === 'הכול' || project.category === category
    );

    grid.replaceChildren();

    status.textContent = visible.length
        ? ''
        : projects.length
            ? 'אין פרויקטים בקטגוריה הזו.'
            : 'הפרויקטים הראשונים יופיעו כאן בקרוב.';

    visible.forEach(project => {
        const figure = document.createElement('figure');
        figure.className = 'project';

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'project__thumbnail';
        button.setAttribute('aria-haspopup', 'dialog');
        button.setAttribute(
            'aria-label',
            'פתיחת הפרויקט ' + project.title
        );

        const image = document.createElement('img');
        image.src = project.image;
        image.alt = project.title;
        image.loading = 'lazy';

        const hint = document.createElement('span');
        hint.className = 'project__hint';
        hint.textContent = 'לצפייה בפרויקט ↗';

        button.append(image, hint);
        button.addEventListener('click', () => openProject(project));

        const caption = document.createElement('figcaption');
        caption.append(document.createTextNode(project.title));

        const label = document.createElement('span');
        label.textContent =
            `${project.category} · ${project.images.length} תמונות`;

        caption.append(label);
        figure.append(button, caption);
        grid.append(figure);
    });
}

const filters = document.querySelector('.filters');

['הכול', 'מיתוג', 'דפוס', 'אחר'].forEach(category => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = category;
    button.setAttribute('aria-pressed', String(category === 'הכול'));

    button.addEventListener('click', () => {
        for (const item of filters.children) {
            item.setAttribute('aria-pressed', String(item === button));
        }

        render(category);
    });

    filters.append(button);
});

back.addEventListener('click', showAlbum);

viewer.querySelector('.viewer__close').addEventListener('click', () => {
    viewer.close();
});

viewer.querySelector('.viewer__previous').textContent = '→ הקודמת';
viewer.querySelector('.viewer__next').textContent = 'הבאה ←';

viewer.querySelector('.viewer__previous').addEventListener('click', () => {
    showImage(selectedImage - 1);
});

viewer.querySelector('.viewer__next').addEventListener('click', () => {
    showImage(selectedImage + 1);
});

viewer.addEventListener('close', () => {
    document.body.classList.remove('viewer-open');
    currentProject = null;
});

viewer.addEventListener('click', event => {
    const bounds = viewer.getBoundingClientRect();

    if (
        event.target === viewer &&
        (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
        )
    ) {
        viewer.close();
    }
});

viewer.addEventListener('keydown', event => {
    if (!enlarged) return;

    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        showImage(
            selectedImage + (event.key === 'ArrowLeft' ? 1 : -1)
        );
    }

    if (event.key === 'Escape') {
        event.preventDefault();
        showAlbum();
    }
});

(async () => {
    try {
        const response = await fetch('projects.json', {
            cache: 'no-store'
        });

        if (!response.ok) throw Error();

        projects = validateProjects(await response.json());
        render();
    } catch {
        status.textContent =
            'לא הצלחנו לטעון את הפרויקטים. נסו לרענן את העמוד.';
    }
})();
