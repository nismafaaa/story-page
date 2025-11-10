import routes from '../routes/routes.js';
import swRegister from '../utils/sw-register.js';
import { addDraft, getAllDrafts, deleteDraft } from '../utils/db.js';

class App {
  #content;
  #drawerButton;
  #navigationDrawer;
  #draftsCache = [];
  #isRendering = false;
  #logoutListenerAttached = false;
  #lastAuthState = null;

  constructor({ content, drawerButton, navigationDrawer }) {
    this.#content = content;
    this.#drawerButton = drawerButton;
    this.#navigationDrawer = navigationDrawer;

    // Set initial auth state WITHOUT calling updateAuthLinks
    this.#lastAuthState = !!localStorage.getItem('token');

    this._setupDrawer();
    this._registerServiceWorker();

    window.addEventListener('hashchange', () => {
      this.#navigationDrawer.classList.remove('open');
      this.renderPage();
    });
    
    this.renderPage();
  }

  _setupDrawer() {
    this.#drawerButton.addEventListener('click', (e) => {
      e.stopPropagation();
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
    const isLoggedIn = !!localStorage.getItem('token');
    
    if (this.#lastAuthState === isLoggedIn) return;
    this.#lastAuthState = isLoggedIn;

    const loginLink = document.getElementById('nav-login');
    const registerLink = document.getElementById('nav-register');
    const addLink = document.getElementById('nav-add');
    const logoutLink = document.getElementById('nav-logout');
    const logoutAnchor = document.getElementById('logout-link');

    if (loginLink) loginLink.style.display = isLoggedIn ? 'none' : 'block';
    if (registerLink) registerLink.style.display = isLoggedIn ? 'none' : 'block';
    if (addLink) addLink.style.display = isLoggedIn ? 'block' : 'none';
    if (logoutLink) logoutLink.style.display = isLoggedIn ? 'block' : 'none';

    if (logoutAnchor && !this.#logoutListenerAttached) {
      this.#logoutListenerAttached = true;
      logoutAnchor.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        this.#lastAuthState = null;
        this._updateAuthLinks();
        window.location.hash = '/login';
      });
    }
  }

  async _registerServiceWorker() {
    try {
      await swRegister();
    } catch (err) {
      console.error('SW registration failed:', err);
    }
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
            await deleteDraft(draft.id);
            this.#draftsCache = await getAllDrafts();
            this._renderDrafts(searchInput?.value || '', sortAsc);
          }
        } catch (err) {
          console.log('Sync failed:', err);
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
    if (this.#isRendering) return;
    this.#isRendering = true;
    
    this.#navigationDrawer.classList.remove('open');
    
    const url = window.location.hash.slice(1) || '/';
    const page = routes[url] || routes['/'];

    this.#content.innerHTML = await page.render();
    this._updateAuthLinks();
    if (page.afterRender) await page.afterRender();

    if (document.getElementById('note-form')) {
      this.#draftsCache = await getAllDrafts();
      await this._renderDrafts();
      await this._setupDraftForm();
    }

    this.#isRendering = false;
  }
}

export default App;
