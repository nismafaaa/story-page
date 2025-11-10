import L from '../map/leaflet-config.js';
import StoryModel from '../../model/story-model.js';
import { showFormattedDate } from '../../utils/index.js';

export default class HomePage {
  constructor() {
    this.storyModel = new StoryModel();
    this.map = null;
    this.markers = [];
  }

  async render() {
    return `
      <section class="container">
        <h1>Home Page</h1>
        <h2>Daftar Story Terbaru</h2>
        <div class="map-list-wrapper">
          <div id="home-map" class="map-area" aria-label="Peta lokasi story"></div>
          <div class="list-area">
            <ul id="story-list"></ul>
          </div>
        </div>
      </section>
    `;
  }

  async afterRender() { 
    const stories = await this.storyModel.getStories(1, 15);
    const listContainer = document.getElementById('story-list');

    if (this.map) {
      this.map.remove();
      this.map = null;
    }

    this.map = L.map('home-map').setView([-6.2, 106.816], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    this.markers.forEach(marker => marker.remove());
    this.markers = [];
    listContainer.innerHTML = '';

    if (!stories.length) {
      listContainer.innerHTML = '<li>Tidak ada story yang bisa ditampilkan.</li>';
      return;
    }

    const bounds = [];

    stories.forEach(story => {
      const lat = story.lat ?? null;
      const lon = story.lon ?? null;
      if (lat === null || lon === null) return;

      const name = story.name || story.userId || 'Unknown';
      const desc = story.description || '-';
      const created = showFormattedDate(story.createdAt);

      const marker = L.marker([lat, lon]).addTo(this.map)
        .bindPopup(`
          <b>${name}</b><br>
          ${desc}<br>
          <small>Dibuat: ${created}</small><br>
          <img src="${story.photoUrl}" alt="Foto ${name}" width="100">
        `);
      this.markers.push(marker);
      bounds.push([lat, lon]);

      const li = document.createElement('li');
      li.style.cursor = 'pointer';
      li.innerHTML = `
        <div class="story-item">
          <img src="${story.photoUrl}" alt="Foto ${name}" class="story-thumb">
          <div class="story-info">
            <h3>${name}</h3>
            <p>${desc.length > 80 ? desc.slice(0, 80) + '…' : desc}</p>
            <small>Dibuat: ${created}</small>
          </div>
        </div>
      `;
      listContainer.appendChild(li);

      li.addEventListener('click', () => {
        this.map.setView([lat, lon], 13, { animate: false });
        marker.openPopup();
      });
      marker.on('click', () => li.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    });

    if (bounds.length === 1) {
      this.map.setView(bounds[0], 13, { animate: false });
    } else if (bounds.length > 1) {
      this.map.fitBounds(bounds, { padding: [50, 50], animate: false });
    }
  }
}