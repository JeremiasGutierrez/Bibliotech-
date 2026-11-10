document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
    loadAdminBooks();
    document.getElementById('createUserForm')?.addEventListener('submit', createUser);
    document.getElementById('newRole')?.addEventListener('change', toggleTeacherSubject);
    toggleTeacherSubject();
});

function toggleTeacherSubject() {
    const role = document.getElementById('newRole');
    const wrapper = document.getElementById('teacherSubjectField');
    const subject = document.getElementById('newSubject');
    const isTeacher = role.value === 'teacher';
    wrapper.style.display = isTeacher ? '' : 'none';
    subject.required = isTeacher;
    subject.disabled = !isTeacher;
    if (!isTeacher) subject.value = '';
}

async function createUser(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const submitButton = form.querySelector('button[type="submit"]');
    const username = document.getElementById('newUsername').value;
    const password = document.getElementById('newPassword').value;
    const role = document.getElementById('newRole').value;
    const subject = document.getElementById('newSubject').value.trim();
    submitButton.disabled = true;
    try {
        await apiService.request('/admin/users', 'POST', { username, password, role, subject });
        form.reset();
        toggleTeacherSubject();
        showModal('Cuenta creada', 'La cuenta ya puede iniciar sesión.');
        loadUsers();
    } catch (error) {
        showModal('No se pudo crear la cuenta', error.message);
    } finally {
        submitButton.disabled = false;
    }
}

async function loadUsers() {
    try {
        renderUsersTable(await apiService.request('/admin/users'));
    } catch (error) {
        showModal('Acceso denegado', error.message);
        window.location.href = '/login';
    }
}

function renderUsersTable(users) {
    const tbody = document.getElementById('usersTableBody');
    tbody.replaceChildren();
    users.forEach(user => {
        const row = document.createElement('tr');
        const id = document.createElement('td');
        id.textContent = user.id;
        const username = document.createElement('td');
        const bold = document.createElement('b');
        bold.textContent = user.username;
        username.appendChild(bold);
        const role = document.createElement('td');
        const select = document.createElement('select');
        select.className = 'w3-select w3-border w3-round w3-black w3-text-white';
        [['client', 'Estudiante'], ['teacher', 'Docente'], ['admin', 'Administrador']].forEach(([value, label]) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = label;
            option.selected = value === user.role;
            select.appendChild(option);
        });
        role.appendChild(select);
        const subject = document.createElement('td');
        const subjectInput = document.createElement('input');
        subjectInput.className = 'w3-input w3-border w3-round w3-transparent w3-text-white';
        subjectInput.maxLength = 100;
        subjectInput.placeholder = 'Materia';
        subjectInput.value = user.subject || '';
        subjectInput.disabled = user.role !== 'teacher';
        const saveSubject = document.createElement('button');
        saveSubject.className = 'w3-button w3-teal w3-tiny w3-round w3-margin-top';
        saveSubject.textContent = 'Guardar materia';
        saveSubject.disabled = user.role !== 'teacher';
        saveSubject.addEventListener('click', () => updateRole(user.id, 'teacher', subjectInput.value.trim()));
        subject.append(subjectInput, saveSubject);
        select.addEventListener('change', () => {
            if (select.value === 'teacher') {
                subjectInput.disabled = false;
                saveSubject.disabled = false;
                showModal('Materia requerida', 'Escribí la materia del docente y elegí “Guardar materia”.');
                select.value = user.role;
                return;
            }
            subjectInput.disabled = true;
            saveSubject.disabled = true;
            updateRole(user.id, select.value, null);
        });
        const date = document.createElement('td');
        date.textContent = new Date(user.created_at).toLocaleDateString();
        const actions = document.createElement('td');
        const remove = document.createElement('button');
        remove.className = 'w3-button w3-red w3-tiny w3-round';
        remove.textContent = 'Eliminar cuenta';
        remove.addEventListener('click', () => deleteUser(user.id));
        actions.appendChild(remove);
        row.append(id, username, role, subject, date, actions);
        tbody.appendChild(row);
    });
}

async function updateRole(userId, role, subject = null) {
    try {
        await apiService.request(`/admin/users/${userId}/role`, 'PATCH', { role, subject });
        showModal('Rol actualizado', 'Los permisos de la cuenta ya están actualizados.');
        loadUsers();
    } catch (error) {
        showModal('No se pudo cambiar el rol', error.message);
        loadUsers();
    }
}

async function loadAdminBooks() {
    try {
        renderAdminBooks(await apiService.request('/admin/books'));
    } catch (error) {
        showModal('No se pudieron cargar los documentos', error.message);
    }
}

function renderAdminBooks(books) {
    const tbody = document.getElementById('booksTableBody');
    tbody.replaceChildren();
    if (!books.length) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 7;
        cell.textContent = 'Todavía no hay documentos en la biblioteca.';
        row.appendChild(cell);
        tbody.appendChild(row);
        return;
    }
    books.forEach(book => {
        const row = document.createElement('tr');
        [book.title, book.author, book.category, book.subject, book.owner, new Date(book.created_at).toLocaleDateString()].forEach(value => {
            const cell = document.createElement('td');
            cell.textContent = value ?? '';
            row.appendChild(cell);
        });
        const actions = document.createElement('td');
        const read = document.createElement('button');
        read.className = 'w3-button w3-teal w3-tiny w3-round w3-margin-right';
        read.textContent = 'Leer';
        read.addEventListener('click', async () => {
            try {
                const endpoint = book.kind === 'book' ? `/admin/books/${book.id}/file` : `/admin/announcements/${book.id}/file`;
                const url = await apiService.download(endpoint);
                showPdfModal(book.title, url);
            } catch (error) {
                showModal('No se pudo abrir el PDF', error.message);
            }
        });
        const download = document.createElement('button');
        download.className = 'w3-button w3-dark-grey w3-tiny w3-round w3-margin-right';
        download.textContent = 'Descargar';
        download.addEventListener('click', () => {
            const endpoint = book.kind === 'book' ? `/admin/books/${book.id}/file?download=1` : `/admin/announcements/${book.id}/file?download=1`;
            apiService.download(endpoint, `${book.title}.pdf`).catch(error => showModal('Error', error.message));
        });
        const remove = document.createElement('button');
        remove.className = 'w3-button w3-red w3-tiny w3-round';
        remove.textContent = 'Eliminar';
        remove.addEventListener('click', () => deleteBook(book.id, book.kind));
        actions.append(read, download, remove);
        row.appendChild(actions);
        tbody.appendChild(row);
    });
}

async function deleteBook(id, kind) {
    if (!confirm('¿Eliminar este documento de la biblioteca y borrar su archivo?')) return;
    try {
        const endpoint = kind === 'book' ? `/admin/books/${id}` : `/admin/announcements/${id}`;
        await apiService.request(endpoint, 'DELETE');
        showModal('Documento eliminado', 'Se quitó el documento y su archivo.');
        loadAdminBooks();
    } catch (error) {
        showModal('No se pudo eliminar', error.message);
    }
}

async function deleteUser(id) {
    if (!confirm('¿Eliminar este usuario y los documentos de su propiedad?')) return;
    try {
        await apiService.request(`/admin/users/${id}`, 'DELETE');
        showModal('Cuenta eliminada', 'La cuenta y sus documentos fueron eliminados.');
        loadUsers();
        loadAdminBooks();
    } catch (error) {
        showModal('No se pudo eliminar la cuenta', error.message);
    }
}
