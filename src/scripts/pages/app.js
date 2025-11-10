import '../../styles/styles.css';
import routes from '../routes/routes.js';
import { sleep } from '../utils/index.js';
import swRegister from '../utils/sw-register.js';
import { addDraft, getAllDrafts, deleteDraft } from '../utils/db.js';
import { syncOfflineData } from '../utils/sync.js';

class App {
  #content;
  #drawerButton;
  #navigationDrawer;
  #draftsCache = [];

  constructor({ content, drawerButton, navigationDrawer }) {
    this.#content = content;
    this.#drawerButton = drawerButton;
    this.#navigationDrawer = navigationDrawer;

    this._setupDrawer();
    this._setupInstallPrompt();
    this._registerServiceWorker();

    window.addEventListener('hashchange', () => this.renderPage());
    this.renderPage();
  }

  _setupDrawer() {
    this.#drawerButton.addEventListener('click', () => {
      this.#navigationDrawer.classList.toggle('open');
    });
    document.body.addEventListener('click', e => {
      if (!this.#navigationDrawer.contains(e.target) &&
          !this.#drawerButton.contains(e.target)) {
        this.#navigationDrawer.classList.remove('open');
      }
    });
    this.#navigationDrawer.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        this.#navigationDrawer.classList.remove('open');
      });
    });
  }

  _updateAuthLinks() {
    const loginLink = document.getElementById('nav-login');
    const logoutLink = document.getElementById('nav-logout');

    if (localStorage.getItem('token')) {
      if (loginLink) loginLink.style.display = 'none';
      if (logoutLink) logoutLink.style.display = 'inline-block';
    } else {
      if (loginLink) loginLink.style.display = 'inline-block';
      if (logoutLink) logoutLink.style.display = 'none';
    }

    if (logoutLink) {
      logoutLink.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        this._updateAuthLinks();
        window.location.hash = '/login';
      });
    }
  }

  async _registerServiceWorker() {
    try {
      await swRegister();
      console.log('✅ Service Worker registered');
    } catch (err) {
      console.error('❌ Service Worker registration failed:', err);
    }
  }

  _setupInstallPrompt() {
    let deferredPrompt;
    const installBtn = document.getElementById('installBtn');

    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      deferredPrompt = e;
      if (installBtn) {
        installBtn.style.display = 'block';
        installBtn.addEventListener('click', async () => {
          installBtn.style.display = 'none';
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          console.log('User choice:', outcome);
          deferredPrompt = null;
        });
      }
    });

    window.addEventListener('appinstalled', () => console.log('🎉 App installed!'));
  }

  async _renderDrafts(filterText = '', sortAsc = true) {
    const draftsList = document.getElementById('note-list');
    if (!draftsList) return;

    if (!this.#draftsCache.length) this.#draftsCache = await getAllDrafts();
    let drafts = [...this.#draftsCache];

    if (filterText) {
      drafts = drafts.filter(d => d.text.toLowerCase().includes(filterText.toLowerCase()));
    }

    drafts.sort((a, b) => {
      if (a.text.toLowerCase() < b.text.toLowerCase()) return sortAsc ? -1 : 1;
      if (a.text.toLowerCase() > b.text.toLowerCase()) return sortAsc ? 1 : -1;
      return 0;
    });

    draftsList.innerHTML = '';
    drafts.forEach(draft => {
      const li = document.createElement('li');
      li.textContent = draft.text;

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Hapus';
      deleteBtn.addEventListener('click', async () => {
        await deleteDraft(draft.id);
        this.#draftsCache = this.#draftsCache.filter(d => d.id !== draft.id);
        this._renderDrafts(filterText, sortAsc);
      });

      li.appendChild(deleteBtn);
      draftsList.appendChild(li);
    });
  }

  async _setupDraftForm() {
    const form = document.getElementById('note-form');
    const input = document.getElementById('note-input');
    const searchInput = document.getElementById('search-note');
    const sortButton = document.getElementById('sort-note');

    if (!form || !input) return;

    let sortAsc = true;

    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!input.value.trim()) return;

      const draft = { text: input.value, createdAt: Date.now() };
      await addDraft(draft);

      this.#draftsCache = await getAllDrafts();
      this._renderDrafts(searchInput?.value || '', sortAsc);

      if (navigator.onLine) {
        try {
          const token = localStorage.getItem('token') || '';
          const response = await fetch('https://story-api.dicoding.dev/v1/stories', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ title: input.value, description: input.value })
          });

          if (response.ok) {
            console.log('Story berhasil dikirim ke server');
            await deleteDraft(draft.id);
            this.#draftsCache = await getAllDrafts();
            this._renderDrafts(searchInput?.value || '', sortAsc);
          } else {
            console.log('Gagal kirim ke server, tetap tersimpan offline');
          }
        } catch (err) {
          console.log('Gagal sync ke server:', err);
        }
      }

      input.value = '';
    });

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        this._renderDrafts(searchInput.value, sortAsc);
      });
    }

    if (sortButton) {
      sortButton.addEventListener('click', () => {
        sortAsc = !sortAsc;
        this._renderDrafts(searchInput?.value || '', sortAsc);
      });
    }
  }

  async renderPage() {
    const url = window.location.hash.slice(1) || '/';
    const page = routes[url] || routes['/'];

    const updatePage = async () => {
      this.#content.innerHTML = await page.render();
      if (page.afterRender) await page.afterRender();

      this._updateAuthLinks();

      if (document.getElementById('note-form')) {
        this.#draftsCache = await getAllDrafts();
        await this._renderDrafts();
        await this._setupDraftForm();
      }
    };

    if (document.startViewTransition) {
      document.startViewTransition(async () => {
        await sleep(100);
        await updatePage();
      });
    } else {
      this.#content.classList.add('slide-out');
      setTimeout(async () => {
        await updatePage();
        this.#content.classList.remove('slide-out');
        this.#content.classList.add('slide-in');
        setTimeout(() => this.#content.classList.remove('slide-in'), 300);
      }, 200);
    }
  }
}

const AppModule = {
	init() {
n
	},
	render() {
		return ''; 
	},
	afterRender() {
	},
};

export { App };
export default App;

document.addEventListener('DOMContentLoaded', () => {
  const app = new App({
    content: document.querySelector('#main-content'),
    drawerButton: document.querySelector('#drawer-button'),
    navigationDrawer: document.querySelector('#navigation-drawer'),
  });

  app.renderPage();

  const header = document.querySelector('.main-header');
  if (header && !document.getElementById('btn-local-push')) {
    const btn = document.createElement('button');
    btn.id = 'btn-local-push';
    btn.textContent = 'Push Test Lokal';
    btn.style.marginLeft = '10px';
    header.appendChild(btn);

    btn.addEventListener('click', () => {
      if (Notification.permission === 'granted') {
        new Notification('Cerita baru!', { body: 'Push test dari localhost' });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(p => {
          if (p === 'granted') new Notification('Cerita baru!', { body: 'Push test dari localhost' });
        });
      }
    });
  }
});
