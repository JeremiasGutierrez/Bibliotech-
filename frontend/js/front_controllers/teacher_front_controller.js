document.getElementById('announcementForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData();
    data.append('title', document.getElementById('announcementTitle').value);
    data.append('content', document.getElementById('announcementContent').value);
    const file = document.getElementById('announcementFile').files[0];
    if (file) data.append('attachment', file);

    try {
        const result = await apiService.request('/announcements', 'POST', data, true);
        form.reset();
        showModal('Aviso publicado', result.message);
    } catch (error) {
        showModal('No se pudo publicar', error.message);
    }
});

document.getElementById('bookUploadForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData();
    data.append('title', document.getElementById('bookTitle').value);
    data.append('author', document.getElementById('bookAuthor').value);
    data.append('category', document.getElementById('bookCategory').value);
    data.append('pages', document.getElementById('bookPages').value);
    data.append('pdfFile', document.getElementById('bookFile').files[0]);
    try {
        const result = await apiService.request('/books/upload', 'POST', data, true);
        form.reset();
        showModal('Material publicado', 'El PDF ya está en la biblioteca y se notificó a los estudiantes.');
    } catch (error) {
        showModal('No se pudo subir el material', error.message);
    }
});
