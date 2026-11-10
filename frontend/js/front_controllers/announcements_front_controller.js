document.addEventListener('DOMContentLoaded', () => {
    loadAnnouncements();
    window.setInterval(loadAnnouncements, 30000);
});

async function loadAnnouncements() {
    try {
        const announcements = await apiService.request('/announcements');
        renderAnnouncements(announcements);
    } catch (error) {
        const list = document.getElementById('announcementList');
        list.replaceChildren();
        const message = document.createElement('p');
        message.className = 'w3-text-red';
        message.textContent = `No se pudieron cargar los avisos: ${error.message}`;
        list.appendChild(message);
    }
}

function renderAnnouncements(announcements) {
    const list = document.getElementById('announcementList');
    list.replaceChildren();
    const unread = announcements.filter(item => item.unread).length;
    document.getElementById('unreadCount').textContent = `${unread} sin leer`;

    if (!announcements.length) {
        const empty = document.createElement('p');
        empty.textContent = 'Todavía no hay avisos de tus docentes.';
        list.appendChild(empty);
        return;
    }

    announcements.forEach(item => {
        const card = document.createElement('article');
        card.className = 'w3-panel w3-leftbar w3-border-teal vault-card w3-padding';
        const heading = document.createElement('h4');
        heading.textContent = item.title;
        const meta = document.createElement('small');
        meta.className = 'w3-text-grey';
        const subject = item.subject ? ` · ${item.subject}` : '';
        meta.textContent = `${item.teacher}${subject} · ${new Date(item.created_at).toLocaleString()}`;
        const body = document.createElement('p');
        body.textContent = item.content;
        card.append(heading, meta, body);

        if (item.attachment_path) {
            const download = document.createElement('button');
            download.className = 'w3-button w3-dark-grey w3-round w3-small';
            download.textContent = 'Descargar material PDF';
            download.addEventListener('click', async () => {
                try {
                    await apiService.download(`/announcements/${item.id}/file?download=1`, 'material.pdf');
                } catch (error) {
                    showModal('Error al descargar', error.message);
                }
            });
            card.appendChild(download);
        }

        if (item.unread) {
            const markRead = document.createElement('button');
            markRead.className = 'w3-button w3-teal w3-round w3-small w3-margin-left';
            markRead.textContent = 'Marcar como leído';
            markRead.addEventListener('click', async () => {
                try {
                    await apiService.request(`/announcements/${item.id}/read`, 'PATCH');
                    loadAnnouncements();
                } catch (error) {
                    showModal('Error', error.message);
                }
            });
            card.appendChild(markRead);
        } else {
            const read = document.createElement('span');
            read.className = 'w3-tag w3-round w3-dark-grey w3-margin-left';
            read.textContent = 'Leído';
            card.appendChild(read);
        }
        list.appendChild(card);
    });
}
