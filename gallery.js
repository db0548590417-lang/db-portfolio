const viewer = document.querySelector('.viewer');
const grid = document.querySelector('.projects');
const status = document.querySelector('.gallery-status');

let projects = [];
let visible = [];
let selected = 0;
let category = 'הכול';

function showWork(index) {
    if (!visible.length) return;

    selected = (index + visible.length) % visible.length;
    const project = visible[selected];

    document.querySelector('#viewer-title').textContent = project.title;

    const image = viewer.querySelector('.viewer__image');
    image.src = project.image;
    image.alt = project.title;

    viewer.querySelector('.viewer__description').textContent =
        project.description;

    viewer.querySelector('.viewer__count').textContent =
        `${selected + 1} / ${visible.length}`;
}

function render() {
    visible = projects.filter(project =>
        category === 'הכול' || project.category === category
    );

    grid.replaceChildren();

    status.textContent = visible.length
        ? ''
        : projects.length
            ? 'אין עבודות בקטגוריה הזו.'
            : 'העבודות הראשונות יופיעו כאן בקרוב.';

    visible.forEach((project, index) => {
        const figure = document.createElement('figure');
        figure.className = 'project';

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'project__thumbnail';
        button.setAttribute(
            'aria-label',
            'פתיחת ' + project.title + ' בתצוגה מוגדלת'
        );
        button.setAttribute('aria-haspopup', 'dialog');

        const image = document.createElement('img');
        image.src = project.image;
        image.alt = project.title;
        image.loading = 'lazy';

        const hint = document.createElement('span');
        hint.className = 'project__hint';
        hint.textContent = 'לצפייה בעבודה ↗';

        button.append(image, hint);

        button.addEventListener('click', () => {
            showWork(index);
            viewer.showModal();
            document.body.classList.add('viewer-open');
        });

        const caption = document.createElement('figcaption');
        caption.append(document.createTextNode(project.title));

        const label = document.createElement('span');
        label.textContent = project.category;
        caption.append(label);

        figure.append(button, caption);
        grid.append(figure);
    });
}

function createFilters() {
    const navigation = document.querySelector('.filters');

    ['הכול', 'מיתוג', 'דפוס', 'אחר'].forEach(name => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = name;
        button.setAttribute('aria-pressed', String(name === category));

        button.addEventListener('click', () => {
            category = name;

            for (const item of navigation.children) {
                item.setAttribute('aria-pressed', String(item === button));
            }

            render();
        });

        navigation.append(button);
    });
}

viewer.querySelector('.viewer__close').addEventListener('click', () => {
    viewer.close();
});

viewer.querySelector('.viewer__previous').addEventListener('click', () => {
    showWork(selected - 1);
});

viewer.querySelector('.viewer__next').addEventListener('click', () => {
    showWork(selected + 1);
});

viewer.addEventListener('close', () => {
    document.body.classList.remove('viewer-open');
});

viewer.addEventListener('click', event => {
    const bounds = viewer.getBoundingClientRect();

    const outside =
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom;

    if (event.target === viewer && outside) {
        viewer.close();
    }
});

viewer.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        showWork(selected + (event.key === 'ArrowLeft' ? 1 : -1));
    }
});

createFilters();

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
            'לא הצלחנו לטעון את העבודות. נסו לרענן את העמוד.';
    }
})();
