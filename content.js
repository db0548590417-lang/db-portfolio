function validateProjects(value) {
    if (!Array.isArray(value) || value.length > 100) {
        throw Error('אפשר להוסיף עד 100 פרויקטים');
    }

    const ids = new Set();
    const categories = ['מיתוג', 'עיצוב אתרים', 'דפוס', 'אחר'];

    function validateImage(image) {
        if (typeof image !== 'string') {
            throw Error('קובץ התמונה אינו תקין');
        }

        const embeddedImage =
            /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(image);

        const imageFile =
            /^assets\/[A-Za-z0-9_/-]+\.(png|jpe?g|webp)$/i.test(image);

        if (
            (!embeddedImage && !imageFile) ||
            image.length > 12000000 ||
            image.includes('..')
        ) {
            throw Error('יש לבחור תמונת PNG, JPG או WebP תקינה');
        }

        return image;
    }

    return value.map(project => {
        if (
            !project ||
            typeof project.id !== 'string' ||
            !project.id ||
            ids.has(project.id) ||
            typeof project.title !== 'string' ||
            !project.title.trim() ||
            project.title.length > 100 ||
            !categories.includes(project.category) ||
            typeof project.description !== 'string' ||
            project.description.length > 2000
        ) {
            throw Error('פרטי הפרויקט אינם תקינים');
        }

        /* תמיכה גם בעבודות הישנות */
        const sourceImages = project.images === undefined
            ? [project.image]
            : project.images;

        if (
            !Array.isArray(sourceImages) ||
            sourceImages.length === 0 ||
            sourceImages.length > 30
        ) {
            throw Error('כל פרויקט צריך להכיל בין תמונה אחת ל־30 תמונות');
        }

        const images = sourceImages.map(validateImage);

        /* תמונת השער חייבת להיות חלק מהגלריה */
        const cover = typeof project.image === 'string' &&
            images.includes(project.image)
                ? project.image
                : images[0];

        ids.add(project.id);

        return {
            id: project.id,
            title: project.title.trim(),
            category: project.category === 'עיצוב אתרים'
                ? 'אחר'
                : project.category,
            description: project.description,
            image: cover,
            images: images
        };
    });
}
