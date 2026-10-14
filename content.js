function validateProjects(value) {
    if (!Array.isArray(value) || value.length > 100) {
        throw Error('קובץ הגלריה חייב להכיל עד 100 עבודות');
    }

    const ids = new Set();

    return value.map(project => {
        if (
            !project ||
            typeof project.id !== 'string' ||
            !project.id ||
            ids.has(project.id) ||
            typeof project.title !== 'string' ||
            !project.title.trim() ||
            project.title.length > 100 ||
            !['מיתוג', 'עיצוב אתרים', 'דפוס', 'אחר'].includes(project.category) ||
            typeof project.description !== 'string' ||
            project.description.length > 2000 ||
            typeof project.image !== 'string'
        ) {
            throw Error('פרטי עבודה בקובץ אינם תקינים');
        }

        const embeddedImage =
            /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(project.image);

        const imageFile =
            /^assets\/[A-Za-z0-9_/-]+\.(png|jpe?g|webp)$/i.test(project.image);

        if (!embeddedImage && !imageFile) {
            throw Error('תמונה אינה תקינה: יש לבחור תמונת PNG, JPG או WebP');
        }

        if (
            project.image.length > 12000000 ||
            project.image.includes('..')
        ) {
            throw Error('התמונה גדולה מדי או שהנתיב אינו תקין');
        }

        ids.add(project.id);

        return {
            id: project.id,
            title: project.title.trim(),
            category: project.category,
            description: project.description,
            image: project.image
        };
    });
}
