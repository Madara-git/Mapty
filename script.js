('use strict');
import { Running, Cycling } from './Workout.js';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const sort = document.querySelector('#sort');

class App {
  #map;
  #mapE;
  #workouts = [];
  constructor() {
    this._getPosition();
    this._getDataFromLocalstorage();
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPuppup.bind(this));
    containerWorkouts.addEventListener('click', this._deleteList.bind(this));
    sort.addEventListener('change', this._sort.bind(this));
  }
  _deleteList(e) {
    const btn = e.target.closest('.del--btn');
    if (!btn) return;

    const btnList = this.#workouts.find(work => work.id === btn.dataset.id);
    const workoutIndex = this.#workouts.findIndex(
      work => work.id === btn.dataset.id
    );
    if (workoutIndex !== -1) this.#workouts.splice(workoutIndex, 1);

    const listContainer = document.querySelector(`li[data-id="${btnList.id}"]`);
    listContainer.remove();
    this._setToLocalstorage();

    const screen = document.querySelector(`.leaflet-popup.d-${btnList.id}`);
    screen?.remove();
  }

  _getPosition() {
    navigator.geolocation.getCurrentPosition(
      this._loadMap.bind(this),
      function () {
        alert('falid');
      }
    );
  }
  _loadMap(pos) {
    let { latitude } = pos.coords;
    let { longitude } = pos.coords;
    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.#map);
    this.#map.on('click', this._showForm.bind(this));
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }
  _showForm(mapEvent) {
    this.#mapE = mapEvent;
    form.classList.remove('hidden');
    inputDistance.focus();
  }
  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }
  _hideForm() {
    // prettier-ignore
    inputElevation.value = inputCadence.value = inputDuration.value = inputDistance.value = '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }
  _newWorkout(e) {
    e.preventDefault();

    const validation = (...inputs) => inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp <= 0);
    validation();
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    let workout;

    const { lat, lng } = this.#mapE.latlng;

    if (type === 'running') {
      const cadence = +inputCadence.value;

      if (
        !validation(distance, duration, cadence) ||
        allPositive(distance, duration, cadence)
      )
        return alert('Input has to be a possitive number');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      if (
        !validation(distance, duration, elevation) ||
        allPositive(distance, duration)
      )
        return alert('Input has to be a number');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    this.#workouts.push(workout);
    this._sort();
    this._renderWorkoutMarker(workout);
    this._hideForm();
    this._setToLocalstorage(this.#workouts);
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
          className: `d-${workout.id}`,
        })
      )
      .setPopupContent(
        `  ${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.descriptipn}`
      )
      .openPopup('');
  }

  _renderList(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
   
         <h2 class="workout__title">${
           workout.descriptipn
         }  <button class="del--btn" data-id=${workout.id}> x </button> </h2>
            <div class="workout__details">
              <span class="workout__icon">${
                workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
              } </span>
              <span class="workout__value">${workout.distance}</span>
              <span class="workout__unit">km</span>
            </div>
            <div class="workout__details">
              <span class="workout__icon">⏱</span>
              <span class="workout__value">${workout.duration}</span>
              <span class="workout__unit">min</span>
             
            </div>
      `;
    if (workout.type === 'running')
      html += `
            <div class="workout__details">
              <span class="workout__icon">⚡️</span>
              <span class="workout__value">${workout.pace?.toFixed(1)}</span>
              <span class="workout__unit">min/km</span>
            </div>
            <div class="workout__details">
              <span class="workout__icon">🦶🏼</span>
              <span class="workout__value">${workout.cadence}</span>
              <span class="workout__unit">spm</span>
            </div>
          </li>
        `;

    if (workout.type === 'cycling')
      html += `
        <div class="workout__details">
              <span class="workout__icon">⚡️</span>
              <span class="workout__value">${workout.speed.toFixed(1)}</span>
              <span class="workout__unit">km/h</span>
            </div>
            <div class="workout__details">
              <span class="workout__icon">⛰</span>
              <span class="workout__value">${workout.elevation}</span>
              <span class="workout__unit">m</span>
            </div>
          </li>`;

    containerWorkouts.insertAdjacentHTML('beforeend', html);
  }
  _moveToPuppup(e) {
    const workout = e.target.closest('.workout');
    if (!workout) return;

    const found = this.#workouts.find(val => val.id === workout.dataset.id);
    this.#map.setView(found.coords, 13, {
      animation: true,
    });
  }
  _setToLocalstorage(list) {
    localStorage.setItem('workout', JSON.stringify(list || []));
    localStorage.setItem('sortValue', sort.value);
  }
  _getDataFromLocalstorage() {
    if (localStorage.getItem('workout')) {
      const data = JSON.parse(localStorage.getItem('workout'));
      this.#workouts = data;
      this.#workouts.forEach(work => {
        this._renderList(work);
      });
    }
    if (localStorage.getItem('sortValue')) {
      sort.value = localStorage.getItem('sortValue');
    }
  }
  _sort() {
    if (sort.value === 'duration') {
      const sortList = [...this.#workouts]

        .filter(work => work.duration)
        .sort((a, b) => b.duration - a.duration);
      this._clearList();
      sortList.forEach(work => {
        this._renderList(work);
      });
      this._setToLocalstorage(sortList);
    }
    if (sort.value === 'none') {
      this._clearList();
      this.#workouts.forEach(work => this._renderList(work));
      this._setToLocalstorage(this.#workouts);
    }
    if (sort.value === 'distance') {
      const sortList = [...this.#workouts]
        .filter(work => work.distance)
        .sort((a, b) => b.distance - a.distance);
      this._clearList();
      sortList.forEach(work => {
        this._renderList(work);
      });
      this._setToLocalstorage(sortList);
    }
  }

  reset() {
    localStorage.removeItem('workout');
    location.reload();
  }
  _clearList() {
    const li = document.querySelectorAll('.workout');
    li.forEach(li => li.remove());
  }
}

const app = new App();
