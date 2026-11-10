let allBooks = [];

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('subjectFilter').addEventListener('change', () => renderBooksTable());
    loadBooks();
});

async function loadBooks() {
    try {
        allBooks = await apiService.request('/books/my-books');
        populateSubjectFilter(allBooks);
        renderBooksTable();
    } catch (error) {
        showModal('No se pudo cargar la biblioteca', error.message);
    }
}

function populateSubjectFilter(books) {
    const filter = document.getElementById('subjectFilter');
    const selected = filter.value;
    const subjects = [...new Set(books.map(book => book.subject || 'Sin materia'))]
        .sort((a, b) => a.localeCompare(b, 'es'));
    filter.replaceChildren();

    const allOption = document.createElement('option');
    allOption.value = '';
    allOption.textContent = 'Todas las materias';
    filter.appendChild(allOption);

    subjects.forEach(subject => {
        const option = document.createElement('option');
        option.value = subject;
        option.textContent = subject;
        filter.appendChild(option);
    });
    filter.value = subjects.includes(selected) ? selected : '';
}

function renderBooksTable() {
    const tbody = document.getElementById('booksTableBody');
    const selectedSubject = document.getElementById('subjectFilter').value;
    const filteredBooks = allBooks
        .filter(book => !selectedSubject || (book.subject || 'Sin materia') === selectedSubject)
        .slice()
        .sort((a, b) => {
            const bySubject = (a.subject || 'Sin materia').localeCompare(b.subject || 'Sin materia', 'es');
            return bySubject || a.title.localeCompare(b.title, 'es');
        });

    document.getElementById('bookCount').textContent =
        `${filteredBooks.length} ${filteredBooks.length === 1 ? 'documento' : 'documentos'}`;
    tbody.replaceChildren();

    if (!filteredBooks.length) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 7;
        cell.textContent = selectedSubject
            ? `Todavía no hay documentos para ${selectedSubject}.`
            : 'Todavía no hay documentos compartidos.';
        row.appendChild(cell);
        tbody.appendChild(row);
        return;
    }

    filteredBooks.forEach(book => {
        const row = document.createElement('tr');
        [book.subject || 'Sin materia', book.title, book.author, book.category, book.pages, book.owner || 'Tu biblioteca'].forEach(value => {
            const cell = document.createElement('td');
            cell.textContent = value ?? '';
            row.appendChild(cell);
        });

        const actions = document.createElement('td');
        const view = document.createElement('button');
        view.className = 'w3-button w3-teal w3-tiny w3-round w3-margin-right';
        view.textContent = 'Leer';
        view.addEventListener('click', () => openBook(book));

        const download = document.createElement('button');
        download.className = 'w3-button w3-dark-grey w3-tiny w3-round';
        download.textContent = 'Descargar';
        download.addEventListener('click', () => downloadBook(book));
        actions.append(view, download);
        row.appendChild(actions);
        tbody.appendChild(row);
    });
}

async function openBook(book) {
    try {
        const url = await apiService.download(`/books/${book.id}/file`);
        showPdfModal(book.title, url);
    } catch (error) {
        showModal('No se pudo abrir el documento', error.message);
    }
}

async function downloadBook(book) {
    try {
        await apiService.download(`/books/${book.id}/file?download=1`, `${book.title}.pdf`);
    } catch (error) {
        showModal('No se pudo descargar el documento', error.message);
    }
}
