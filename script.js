// DOM Elements
const cityInput = document.getElementById('city-input');
// searchBtn removed from HTML, we rely on Enter key or Voice. 
// Actually, let's keep search icon click working if it was a button, but it's an icon now.
// We can add a click listener to the icon if we wrap it or select it.
const searchBox = document.querySelector('.search-box');
const locationBtn = document.getElementById('location-btn');
const voiceBtn = document.getElementById('voice-search-btn');

// Dashboard Areas
const dashboardContainer = document.getElementById('dashboard-container');
const authOverlay = document.getElementById('auth-overlay');
const loginForm = document.getElementById('login-form');
const authNameInput = document.getElementById('auth-name');
const authContactInput = document.getElementById('auth-contact');

const weatherDashboard = document.getElementById('weather-dashboard');
const welcomeMessage = document.getElementById('welcome-message');
const errorMessage = document.getElementById('error-message');
const loadingIndicator = document.getElementById('loading-indicator');
const errorText = document.getElementById('error-text');
const suggestionsList = document.getElementById('suggestions-list');
const themeToggle = document.getElementById('theme-toggle');

// User Action Buttons & Modals
// User Action Buttons & Modals
const favoritesList = document.getElementById('favorites-list');
const historyList = document.getElementById('history-list');

const settingsBtn = document.getElementById('login-btn'); // Login btn icon inside sidebar
const addFavoriteBtn = document.getElementById('add-favorite-btn');
const settingsModal = document.getElementById('settings-modal');
const closeModals = document.querySelectorAll('.close-modal');

// Settings Elements
const settingsNameInput = document.getElementById('settings-name-input');
const saveProfileBtn = document.getElementById('save-profile-btn');
const unitToggleBtn = document.getElementById('unit-toggle-btn');
const clearHistoryBtn = document.getElementById('clear-history-btn');
const clearFavoritesBtn = document.getElementById('clear-favorites-btn');
const logoutBtn = document.getElementById('logout-btn');

// Profile
const userNameDisplay = document.getElementById('user-name-display');

// API URLs
const GEO_API_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHER_API_URL = 'https://api.open-meteo.com/v1/forecast';
const AQI_API_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';

// State
let userSession = JSON.parse(localStorage.getItem('weather_user_session'));
let favorites = JSON.parse(localStorage.getItem('weather_favorites')) || [];
let searchHistory = JSON.parse(localStorage.getItem('weather_history')) || [];
let isDarkMode = localStorage.getItem('weather_theme') === 'dark';
let tempUnit = localStorage.getItem('weather_unit') || 'celsius'; // 'celsius' or 'fahrenheit'

// --- Initialization ---
function init() {
    applyTheme();
    updateUnitUI();
    setupEventListeners(); // Move this here so login form works!

    if (userSession) {
        // User is logged in
        showDashboard();
    } else {
        // User is NOT logged in
        showLoginScreen();
    }
}

function showLoginScreen() {
    authOverlay.classList.remove('hidden');
    dashboardContainer.classList.add('hidden');
}

function showDashboard() {
    authOverlay.classList.add('hidden');
    dashboardContainer.classList.remove('hidden');

    updateUserProfile();
    renderFavorites();
    renderHistory();


    // Load last searched city if available
    const lastCity = localStorage.getItem('weather_last_city');
    if (lastCity) {
        getCityCoordinates(lastCity);
    }
}

function handleLogin(e) {
    e.preventDefault();
    const name = authNameInput.value.trim();
    const contact = authContactInput.value.trim();

    if (name && contact) {
        // Create Session
        userSession = { name, contact, lastLogin: new Date().toISOString() };
        localStorage.setItem('weather_user_session', JSON.stringify(userSession));

        // Show Dashboard
        showDashboard();
        showToast(`Welcome back, ${name}!`);
    } else {
        showToast('Please fill in all details.');
    }
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('weather_user_session');
        location.reload();
    }
}

function applyTheme() {
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        document.body.classList.remove('dark-mode');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }
}

function updateUserProfile() {
    if (userSession) {
        userNameDisplay.textContent = userSession.name;
    }
}

function updateUnitUI() {
    unitToggleBtn.textContent = tempUnit === 'celsius' ? '°C' : '°F';
}

function setupEventListeners() {
    // Auth Form
    loginForm.addEventListener('submit', handleLogin);

    // Search on Enter
    cityInput.addEventListener('keypress', (e) => e.key === 'Enter' && handleSearch());

    // Search Icon Click
    if (document.querySelector('.search-icon')) {
        document.querySelector('.search-icon').addEventListener('click', handleSearch);
    }

    // Auto-suggestions (Debounced)
    let debounceTimer;
    cityInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(fetchSuggestions, 300);
    });

    // Device Location
    locationBtn.addEventListener('click', getUserLocation);

    // Voice Search
    voiceBtn.addEventListener('click', startVoiceSearch);

    // Theme Toggle
    themeToggle.addEventListener('click', () => {
        isDarkMode = !isDarkMode;
        localStorage.setItem('weather_theme', isDarkMode ? 'dark' : 'light');
        applyTheme();
    });

    // Settings Modal Open
    settingsBtn.addEventListener('click', () => {
        if (userSession) settingsNameInput.value = userSession.name;
        showModal(settingsModal);
    });

    closeModals.forEach(btn => {
        btn.addEventListener('click', () => {
            settingsModal.classList.add('hidden');
        });
    });

    // Add Favorite
    addFavoriteBtn.addEventListener('click', toggleFavorite);

    // --- Settings Actions ---

    // Save Profile Name
    saveProfileBtn.addEventListener('click', () => {
        const newName = settingsNameInput.value.trim();
        if (newName) {
            userSession.name = newName;
            localStorage.setItem('weather_user_session', JSON.stringify(userSession));
            updateUserProfile();
            showToast('Profile name updated!');
        }
    });

    // Unit Toggle
    unitToggleBtn.addEventListener('click', () => {
        tempUnit = tempUnit === 'celsius' ? 'fahrenheit' : 'celsius';
        localStorage.setItem('weather_unit', tempUnit);
        updateUnitUI();

        // Refresh weather data if a city is loaded
        const currentCity = weatherDashboard.dataset.cityName;
        const currentCountry = weatherDashboard.dataset.country;
        if (currentCity) {
            getCityCoordinates(currentCity); // Re-fetch mostly to get fresh unit data easily
        }
    });

    // Clear History
    clearHistoryBtn.addEventListener('click', () => {
        searchHistory = [];
        localStorage.setItem('weather_history', JSON.stringify([]));
        renderHistory();
        showToast('Search history cleared.');
    });

    // Clear Favorites
    clearFavoritesBtn.addEventListener('click', () => {
        favorites = [];
        localStorage.setItem('weather_favorites', JSON.stringify([]));
        renderFavorites();
        updateFavoriteBtnIcon(weatherDashboard.dataset.cityName);
        showToast('Favorites cleared.');
    });

    // Logout
    logoutBtn.addEventListener('click', logout);
}
// Add click event for suggestion items handled dynamically


// --- search & API Logic ---

function handleSearch() {
    const city = cityInput.value.trim();
    if (city) {
        getCityCoordinates(city);
        suggestionsList.classList.add('hidden');
    }
}

async function fetchSuggestions() {
    const query = cityInput.value.trim();
    if (query.length < 3) {
        suggestionsList.classList.add('hidden');
        return;
    }

    try {
        const response = await fetch(`${GEO_API_URL}?name=${query}&count=5&language=en&format=json`);
        const data = await response.json();

        if (data.results) {
            renderSuggestions(data.results);
        } else {
            suggestionsList.classList.add('hidden');
        }
    } catch (error) {
        console.error('Error fetching suggestions:', error);
    }
}

function renderSuggestions(cities) {
    suggestionsList.innerHTML = '';
    cities.forEach(city => {
        const li = document.createElement('li');
        li.className = 'suggestion-item';
        li.textContent = `${city.name}, ${city.country}`;
        li.addEventListener('click', () => {
            cityInput.value = city.name;
            getCityCoordinates(city.name);
            suggestionsList.classList.add('hidden');
        });
        suggestionsList.appendChild(li);
    });
    suggestionsList.classList.remove('hidden');
}

function getUserLocation() {
    if (navigator.geolocation) {
        showLoading(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                // Reverse geocoding to get city name is optional but good for UI
                // For now, we pass lat/lon directly to weather and generic name
                getWeatherDetails(latitude, longitude, 'Your Location', '');
            },
            (error) => {
                showLoading(false);
                showToast('Unable to retrieve your location.');
            }
        );
    } else {
        showToast('Geolocation is not supported by your browser.');
    }
}

function startVoiceSearch() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        showToast('Voice search is not supported in this browser.');
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.start();

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        cityInput.value = transcript;
        handleSearch();
    };

    recognition.onerror = (event) => {
        console.error('Voice error:', event.error);
        showToast('Voice recognition failed.');
    };
}

async function getCityCoordinates(city) {
    showLoading(true);
    // hideError not really needed with toast logic, but let's clear toasts if we want

    try {
        const response = await fetch(`${GEO_API_URL}?name=${city}&count=1&language=en&format=json`);
        if (!response.ok) throw new Error('Failed to fetch city data');
        const data = await response.json();

        if (!data.results || data.results.length === 0) {
            showToast(`City "${city}" not found.`);
            showLoading(false);
            return;
        }

        const { latitude, longitude, name, country } = data.results[0];
        addToHistory(name, country);
        getWeatherDetails(latitude, longitude, name, country);
        localStorage.setItem('weather_last_city', name);

    } catch (error) {
        showToast('Network error.');
        showLoading(false);
    }
}

async function getWeatherDetails(lat, lon, cityName, country) {
    try {
        let weatherUrl = `${WEATHER_API_URL}?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,surface_pressure,wind_speed_10m,visibility,wind_direction_10m&hourly=temperature_2m,weather_code,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=auto`;

        if (tempUnit === 'fahrenheit') {
            weatherUrl += '&temperature_unit=fahrenheit';
        }

        const weatherRes = await fetch(weatherUrl);
        const weatherData = await weatherRes.json();

        const aqiUrl = `${AQI_API_URL}?latitude=${lat}&longitude=${lon}&current=us_aqi,european_aqi`;
        const aqiRes = await fetch(aqiUrl);
        const aqiData = await aqiRes.json();

        updateUI(weatherData, aqiData, cityName, country);
        showLoading(false);

    } catch (error) {
        console.error(error);
        showToast('Error fetching weather details.');
        showLoading(false);
    }
}

// --- UI Updates ---

function updateUI(data, aqiData, cityName, country) {
    welcomeMessage.classList.add('hidden');
    weatherDashboard.classList.remove('hidden');

    // Header
    document.getElementById('city-name').textContent = country ? `${cityName}, ${country}` : cityName;
    const now = new Date();
    document.getElementById('date').textContent = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    updateFavoriteBtnIcon(cityName);
    // Store current city details for favorites
    weatherDashboard.dataset.cityName = cityName;
    weatherDashboard.dataset.country = country || '';

    // Current Weather
    const current = data.current;
    const weatherCode = questionsWeatherCode(current.weather_code);

    document.getElementById('temperature').textContent = Math.round(current.temperature_2m);
    document.querySelector('.degree').textContent = tempUnit === 'celsius' ? '°C' : '°F';
    document.getElementById('condition').textContent = weatherCode.description;
    document.getElementById('feels-like').textContent = `Feels like ${Math.round(current.apparent_temperature)}${tempUnit === 'celsius' ? '°C' : '°F'}`;

    const iconContainer = document.querySelector('.weather-icon-container');
    const iconClass = current.is_day ? weatherCode.icon : weatherCode.icon.replace('sun', 'moon');
    iconContainer.innerHTML = `<i class="${iconClass}"></i>`;

    // Update Background
    updateBackground(current.weather_code, current.is_day);

    // Details Grid
    document.getElementById('humidity').textContent = `${current.relative_humidity_2m}%`;
    document.getElementById('humidity-bar').style.width = `${current.relative_humidity_2m}%`;

    document.getElementById('wind-speed').textContent = Math.round(current.wind_speed_10m);
    // Rotate compass: 0=N, 90=E, 180=S, 270=W. wind_direction_10m
    const compass = document.querySelector('.compass i');
    compass.style.transform = `rotate(${current.wind_direction_10m}deg)`;

    document.getElementById('pressure').textContent = Math.round(current.surface_pressure);
    document.getElementById('visibility').textContent = (current.visibility / 1000).toFixed(1);

    // Astro
    const today = data.daily;
    const sunrise = new Date(today.sunrise[0]).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const sunset = new Date(today.sunset[0]).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    document.getElementById('sunrise').textContent = sunrise;
    document.getElementById('sunset').textContent = sunset;

    const aqi = aqiData.current ? aqiData.current.us_aqi : 0;
    document.getElementById('aqi-value').textContent = aqi;
    document.getElementById('aqi-text').textContent = getAQIDescription(aqi);
    // Colorize gauge text
    const aqiEl = document.getElementById('aqi-value');
    if (aqi <= 50) aqiEl.style.color = '#2ecc71';
    else if (aqi <= 100) aqiEl.style.color = '#f1c40f';
    else if (aqi <= 150) aqiEl.style.color = '#e67e22';
    else aqiEl.style.color = '#e74c3c';

    // Forecasts
    renderHourlyForecast(data.hourly, now.getHours());
    renderDailyForecast(data.daily);
}

function updateBackground(code, isDay) {
    document.body.className = isDarkMode ? 'dark-mode' : '';

    let bgClass = '';
    // WMO Code mapping to backgrounds
    if (code <= 1) bgClass = isDay ? 'bg-sunny' : 'dark-mode'; // Clear
    else if (code <= 3) bgClass = 'bg-cloudy';
    else if (code <= 48) bgClass = 'bg-cloudy'; // Fog
    else if (code <= 67) bgClass = 'bg-rainy';
    else if (code <= 77) bgClass = 'bg-snowy';
    else if (code <= 82) bgClass = 'bg-rainy';
    else if (code <= 86) bgClass = 'bg-snowy';
    else bgClass = 'bg-rainy'; // Thunderstorm

    // Note: In dark mode, we might want to override these or keep them subtle.
    // CSS variable overrides in .bg-* classes handle it for light/dark mode mostly.
    document.body.classList.add(bgClass);
}

function getAQIDescription(aqi) {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy (Sens.)';
    if (aqi <= 200) return 'Unhealthy';
    return 'Hazardous';
}

function renderHourlyForecast(hourly, currentHour) {
    const container = document.getElementById('hourly-forecast');
    container.innerHTML = '';

    // We get 7 days of hourly data (168 hours). We only want next 24 hours.
    // API returns array aligned with time. We need to find the start index.
    // But simplest is to just take first 24 items if we assume start time is now-ish or close.
    // Actually Open-Meteo returns from 00:00 of the requested day.
    // We need to slice based on current hour.

    const startIndex = currentHour;
    const endIndex = startIndex + 24;

    for (let i = startIndex; i < endIndex; i++) {
        if (!hourly.time[i]) break;

        const timeStr = new Date(hourly.time[i]).toLocaleTimeString('en-US', { hour: 'numeric' });
        const temp = Math.round(hourly.temperature_2m[i]);
        const code = questionsWeatherCode(hourly.weather_code[i]);
        const isDay = hourly.is_day[i];

        const div = document.createElement('div');
        div.className = 'hourly-item';
        div.innerHTML = `
            <span class="hourly-time">${timeStr}</span>
            <i class="${isDay ? code.icon : code.icon.replace('sun', 'moon')} hourly-icon"></i>
            <span class="hourly-temp">${temp}°</span>
        `;
        container.appendChild(div);
    }
}

function renderDailyForecast(daily) {
    const container = document.getElementById('daily-forecast');
    container.innerHTML = '';

    for (let i = 0; i < 7; i++) {
        // i=0 is today, maybe skip or keep? Let's keep for summary.
        // Actually usually daily forecast starts from today.

        const date = new Date(daily.time[i]);
        const dayName = i === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'long' });
        const code = questionsWeatherCode(daily.weather_code[i]);
        const max = Math.round(daily.temperature_2m_max[i]);
        const min = Math.round(daily.temperature_2m_min[i]);

        const div = document.createElement('div');
        div.className = 'daily-item';
        div.innerHTML = `
            <span class="daily-day">${dayName}</span>
            <i class="${code.icon} daily-icon"></i>
            <span class="daily-temps">
                <span class="max-temp">${max}°</span>
                <span class="min-temp">${min}°</span>
            </span>
        `;
        container.appendChild(div);
    }
}

// --- User Data Helpers ---

function addToHistory(city, country) {
    const entry = `${city}, ${country || ''}`;
    // Remove if exists to push to top
    searchHistory = searchHistory.filter(item => item !== entry);
    searchHistory.unshift(entry);
    if (searchHistory.length > 5) searchHistory.pop();
    localStorage.setItem('weather_history', JSON.stringify(searchHistory));
    renderHistory();
}

function renderHistory() {
    historyList.innerHTML = '';
    if (searchHistory.length === 0) {
        historyList.innerHTML = '<li class="placeholder-text">No recent searches</li>';
        return;
    }
    searchHistory.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        li.addEventListener('click', () => {
            const cityName = item.split(',')[0].trim();
            getCityCoordinates(cityName);
        });
        historyList.appendChild(li);
    });
}

function toggleFavorite() {
    const city = weatherDashboard.dataset.cityName;
    const country = weatherDashboard.dataset.country;
    if (!city) return;

    const entry = `${city}, ${country || ''}`;
    const index = favorites.indexOf(entry);

    if (index === -1) {
        favorites.push(entry);
        addFavoriteBtn.querySelector('i').className = 'fas fa-heart'; // Solid
        addFavoriteBtn.style.color = '#e74c3c';
    } else {
        favorites.splice(index, 1);
        addFavoriteBtn.querySelector('i').className = 'far fa-heart'; // Outline
        addFavoriteBtn.style.color = '';
    }
    localStorage.setItem('weather_favorites', JSON.stringify(favorites));
    renderFavorites();
}

function updateFavoriteBtnIcon(city) {
    if (!city) return;
    const isFav = favorites.some(f => f.includes(city));
    if (isFav) {
        addFavoriteBtn.querySelector('i').className = 'fas fa-heart';
        addFavoriteBtn.style.color = '#e74c3c';
    } else {
        addFavoriteBtn.querySelector('i').className = 'far fa-heart';
        addFavoriteBtn.style.color = '';
    }
}

function renderFavorites() {
    favoritesList.innerHTML = '';
    if (favorites.length === 0) {
        favoritesList.innerHTML = '<li class="placeholder-text">No favorites added yet.</li>';
        return;
    }
    favorites.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        li.addEventListener('click', () => {
            const cityName = item.split(',')[0].trim();
            getCityCoordinates(cityName);
        });
        favoritesList.appendChild(li);
    });
}

function showModal(modal) {
    modal.classList.remove('hidden');
}

function showLoading(isLoading) {
    if (isLoading) {
        loadingIndicator.classList.remove('hidden');
    } else {
        loadingIndicator.classList.add('hidden');
    }
}

// Toast Notification
function showToast(message) {
    errorMessage.classList.remove('hidden');
    errorText.textContent = message;

    // Auto-hide after 3 seconds
    setTimeout(() => {
        errorMessage.classList.add('hidden');
    }, 3000);
}

// Weather Codes Map
function questionsWeatherCode(code) {
    const codeMap = {
        0: { description: 'Clear Sky', icon: 'fas fa-sun' },
        1: { description: 'Mainly Clear', icon: 'fas fa-cloud-sun' },
        2: { description: 'Partly Cloudy', icon: 'fas fa-cloud-sun' },
        3: { description: 'Overcast', icon: 'fas fa-cloud' },
        45: { description: 'Foggy', icon: 'fas fa-smog' },
        48: { description: 'Depositing Rime Fog', icon: 'fas fa-smog' },
        51: { description: 'Light Drizzle', icon: 'fas fa-cloud-rain' },
        53: { description: 'Moderate Drizzle', icon: 'fas fa-cloud-rain' },
        55: { description: 'Dense Drizzle', icon: 'fas fa-cloud-showers-heavy' },
        56: { description: 'Light Freezing Drizzle', icon: 'fas fa-snowflake' },
        57: { description: 'Dense Freezing Drizzle', icon: 'fas fa-snowflake' },
        61: { description: 'Slight Rain', icon: 'fas fa-cloud-rain' },
        63: { description: 'Moderate Rain', icon: 'fas fa-cloud-rain' },
        65: { description: 'Heavy Rain', icon: 'fas fa-cloud-showers-heavy' },
        66: { description: 'Light Freezing Rain', icon: 'fas fa-snowflake' },
        67: { description: 'Heavy Freezing Rain', icon: 'fas fa-snowflake' },
        71: { description: 'Slight Snow Fall', icon: 'fas fa-snowflake' },
        73: { description: 'Moderate Snow Fall', icon: 'fas fa-snowflake' },
        75: { description: 'Heavy Snow Fall', icon: 'fas fa-snowflake' },
        77: { description: 'Snow Grains', icon: 'fas fa-snowflake' },
        80: { description: 'Slight Rain Showers', icon: 'fas fa-cloud-rain' },
        81: { description: 'Moderate Rain Showers', icon: 'fas fa-cloud-rain' },
        82: { description: 'Violent Rain Showers', icon: 'fas fa-cloud-showers-heavy' },
        85: { description: 'Slight Snow Showers', icon: 'fas fa-snowflake' },
        86: { description: 'Heavy Snow Showers', icon: 'fas fa-snowflake' },
        95: { description: 'Thunderstorm', icon: 'fas fa-bolt' },
        96: { description: 'Thunderstorm with Hail', icon: 'fas fa-bolt' },
        99: { description: 'Thunderstorm with Hail', icon: 'fas fa-bolt' },
    };
    return codeMap[code] || { description: 'Unknown', icon: 'fas fa-question' };
}

// Start
init();
