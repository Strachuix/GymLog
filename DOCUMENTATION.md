# 📚 Dokumentacja Techniczna GymLog

## Spis treści
1. [Architektura](#architektura)
2. [Struktura Danych](#struktura-danych)
3. [API Funkcji](#api-funkcji)
4. [Service Worker](#service-worker)
5. [Progressive Web App](#progressive-web-app)
6. [Web APIs](#web-apis)
7. [Integracja](#integracja)

---

## 🏗️ Architektura

### Przegląd
GymLog jest aplikacją Progressive Web App (PWA) z czterema widokami (index.html, stats.html, history.html, profile.html) wykorzystującą architekturę klient-serwer bez backend'u. Wszystkie dane są przechowywane lokalnie w przeglądarce.

```
┌──────────────────────────────────────────────────────────┐
│                    Przeglądarka                          │
├──────────────────────────────────────────────────────────┤
│  index.html  │ stats.html │ history.html │ profile.html │
│  (Trening)   │ (Statystyki)│  (Historia)  │  (Profil)   │
├──────────────────────────────────────────────────────────┤
│                      app.js                              │
│                 (Wspólna logika)                         │
├──────────────────────────────────────────────────────────┤
│              Dedykowane moduły JS                        │
│  index-page.js │ stats-page.js │ history-page.js         │
│  profile-page.js │ wake-lock.js │ sw-manager.js          │
│  notifications.js │ main-page.js                         │
├──────────────────────────────────────────────────────────┤
│                  localStorage                            │
│  gymlog_data: Array │ gymlog_profile │ gymlog_weight    │
├──────────────────────────────────────────────────────────┤
│                 Service Worker                           │
│                (Cache offline)                           │
└──────────────────────────────────────────────────────────┘
```

### Komponenty

#### 1. **index.html** - Ekran Treningu
- Formularz dodawania serii
- Screen Wake Lock API
- Toast notifications
- Historia ostatnich 5 serii
- Sugestie progresji

#### 2. **stats.html** - Ekran Statystyk
- Top 5 ćwiczeń ciężarowych
- Top 5 ćwiczeń czasowych
- Rekordy osobiste (PR) dla wszystkich typów ćwiczeń
- Kalkulator 1RM (5 różnych formuł)
- Wykresy postępu (Chart.js)
- Eksport/Import do JSON
- Web Share API

#### 3. **history.html** - Ekran Historii
- Pełna lista wszystkich treningów
- Filtrowanie po typie ćwiczenia (ciężar, masy, czas)
- Wyszukiwanie po nazwie
- Edycja i usuwanie serii
- Licznik treningów

#### 4. **profile.html** - Ekran Profilu
- Zarządzanie profilem użytkownika
- Zdjęcie profilowe (kamera/galeria)
- Dane biometryczne (wiek, wzrost, waga)
- Kalkulator BMI z kategorią
- Historia wagi z wykresem
- Statystyki treningowe

#### 5. **app.js** - Logika Biznesowa
- Zarządzanie danymi (CRUD)
- Sanityzacja danych wejściowych
- Migracja danych (dodawanie pola type)
- Obliczenia statystyczne
- Obsługa trzech typów ćwiczeń (weighted, bodyweight, timed)
- Eksport/import danych (JSON)
- Funkcje pomocnicze
- Web Share API

#### 6. **Dedykowane moduły JS** (folder /js)
- **wake-lock.js** - zarządzanie Screen Wake Lock API
- **sw-manager.js** - obsługa Service Worker i aktualizacji
- **notifications.js** - system powiadomień
- **index-page.js** - logika strony głównej treningu
- **stats-page.js** - logika statystyk i wykresów
- **history-page.js** - logika historii treningów
- **profile-page.js** - logika profilu użytkownika
- **main-page.js** - dodatkowa logika wspólna

#### 7. **sw.js** - Service Worker
- Cache offline assets
- Strategia Cache First
- Wersjonowanie cache (v1.3.2)
- Obsługa wiadomości (SKIP_WAITING, GET_VERSION)
- Synchronizacja w tle

---

## 💾 Struktura Danych

### LocalStorage Keys
```javascript
const STORAGE_KEY = 'gymlog_data';           // Główne dane treningowe (Array<GymSet>)
const PROFILE_KEY = 'gymlog_profile';        // Dane profilu użytkownika
const WEIGHT_HISTORY_KEY = 'gymlog_weight_history';  // Historia wagi
```

### Model Danych - Set (Seria treningowa)

```typescript
interface GymSet {
    id: string;           // UUID v4
    exercise: string;     // Nazwa ćwiczenia (np. "Wyciskanie sztangi")
    type: 'weighted' | 'bodyweight' | 'timed';  // Typ ćwiczenia
    
    // Dla typu 'weighted':
    weight?: number;      // Ciężar w kg (może być float: 60.5)
    reps?: number;        // Liczba powtórzeń (integer)
    
    // Dla typu 'bodyweight':
    reps?: number;        // Liczba powtórzeń
    addedWeight?: number; // Opcjonalny dodatkowy ciężar (np. w podciąganiach)
    
    // Dla typu 'timed':
    duration?: number;    // Czas trwania w sekundach
    distance?: number;    // Opcjonalny dystans w metrach
    
    timestamp: number;    // Unix timestamp w milisekundach
}
```

### Przykłady

#### Ćwiczenie ciężarowe (weighted):
```javascript
{
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    exercise: "Wyciskanie sztangi",
    type: "weighted",
    weight: 80.5,
    reps: 8,
    timestamp: 1737900000000
}
```

#### Ćwiczenie z masą ciała (bodyweight):
```javascript
{
    id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    exercise: "Podciąganie",
    type: "bodyweight",
    reps: 12,
    addedWeight: 10,  // Opcjonalne obciążenie
    timestamp: 1737900000000
}
```

#### Ćwiczenie czasowe (timed):
```javascript
{
    id: "c3d4e5f6-a7b8-9012-cdef-123456789012",
    exercise: "Bieganie",
    type: "timed",
    duration: 1800,   // 30 minut w sekundach
    distance: 5000,   // 5 km w metrach
    timestamp: 1737900000000
}
```

### Struktura w localStorage

#### gymlog_data (Array)
```javascript
// Tablica obiektów, posortowana malejąco po timestamp (najnowsze pierwsze)
[
    { id: "...", exercise: "...", type: "weighted", weight: 80, reps: 8, timestamp: 1737900000000 },
    { id: "...", exercise: "...", type: "bodyweight", reps: 12, timestamp: 1737800000000 },
    { id: "...", exercise: "...", type: "timed", duration: 1800, distance: 5000, timestamp: 1737700000000 }
]
```

#### gymlog_profile (Object)
```javascript
{
    username: "Jan Kowalski",
    age: 25,
    height: 180,        // cm
    weight: 80,         // kg
    profilePic: "data:image/jpeg;base64,..."  // Base64 encoded image
}
```

#### gymlog_weight_history (Array)
```javascript
[
    { date: 1738972800000, weight: 80.5 },
    { date: 1738886400000, weight: 81.0 },
    { date: 1738800000000, weight: 80.8 }
]
```

---

## 🔧 API Funkcji

### app.js - Funkcje Publiczne

#### `loadSets(): GymSet[]`
Wczytuje wszystkie serie z localStorage.

**Returns:** Tablica wszystkich serii, posortowana malejąco po timestamp

**Example:**
```javascript
const sets = loadSets();
console.log(sets.length); // 42
```

---

#### `saveSets(sets: GymSet[]): void`
Zapisuje tablicę serii do localStorage.

**Parameters:**
- `sets` - Tablica obiektów GymSet do zapisania

**Example:**
```javascript
const sets = loadSets();
sets.push(newSet);
saveSets(sets);
```

---

#### `getExerciseHistory(): string[]`
Zwraca unikalne nazwy ćwiczeń, posortowane alfabetycznie.

**Returns:** Tablica unikalnych nazw ćwiczeń

**Example:**
```javascript
const exercises = getExerciseHistory();
// ["Martwy ciąg", "Przysiad", "Wyciskanie sztangi"]
```

---

#### `getLastSetForExercise(exerciseName: string): GymSet | null`
Zwraca ostatnią serię dla danego ćwiczenia.

**Parameters:**
- `exerciseName` - Nazwa ćwiczenia (case-insensitive)

**Returns:** Ostatnia seria lub null jeśli nie znaleziono

**Example:**
```javascript
const lastSet = getLastSetForExercise("Wyciskanie sztangi");
if (lastSet && lastSet.reps >= 5) {
    console.log(`Sugestia: ${lastSet.weight + 2.5}kg`);
}
```

---

#### `groupSetsByExercise(): { [exercise: string]: GymSet[] }`
Grupuje serie według nazw ćwiczeń.

**Returns:** Obiekt z kluczami będącymi nazwami ćwiczeń i wartościami tablicami serii

**Example:**
```javascript
const grouped = groupSetsByExercise();
console.log(grouped["Wyciskanie sztangi"].length); // 15
```

---

#### `getTopExercises(): TopExercise[]`
Zwraca Top 5 najczęściej wykonywanych ćwiczeń **ciężarowych** (type='weighted').

**Returns:** Tablica z top 5 ćwiczeniami, posortowana malejąco po totalVolume

**Type Definition:**
```typescript
interface TopExercise {
    name: string;
    count: number;        // Liczba serii
    totalVolume: number;  // Suma (weight × reps)
}
```

**Example:**
```javascript
const top5 = getTopExercises();
// [
//   { name: "Wyciskanie sztangi", count: 25, totalVolume: 2000 },
//   { name: "Przysiad", count: 20, totalVolume: 1800 },
//   { name: "Martwy ciąg", count: 18, totalVolume: 2200 },
//   { name: "Wiosłowanie", count: 15, totalVolume: 1500 },
//   { name: "OHP", count: 12, totalVolume: 1200 }
// ]
```

---

#### `getTopTimedExercises(): TopTimedExercise[]`
Zwraca Top 5 najczęściej wykonywanych ćwiczeń **czasowych** (type='timed').

**Returns:** Tablica z top 5 ćwiczeniami czasowymi, posortowana malejąco po count

**Type Definition:**
```typescript
interface TopTimedExercise {
    name: string;
    count: number;          // Liczba serii
    totalDuration: number;  // Suma czasu w sekundach
    totalDistance: number;  // Suma dystansu w metrach
}
```

**Example:**
```javascript
const topTimed = getTopTimedExercises();
// [
//   { name: "Bieganie", count: 15, totalDuration: 27000, totalDistance: 75000 },
//   { name: "Rower", count: 10, totalDuration: 18000, totalDistance: 50000 },
//   { name: "Plank", count: 8, totalDuration: 480, totalDistance: 0 }
// ]
```

---

#### `getPersonalRecords(): PersonalRecord[]`
Zwraca rekordy życiowe dla każdego ćwiczenia, z różnymi metrykami w zależności od typu.

**Returns:** Tablica rekordów, posortowana według typu (weighted po ciężarze, bodyweight po powtórzeniach, timed po czasie)

**Type Definition:**
```typescript
interface PersonalRecord {
    exercise: string;
    type: 'weighted' | 'bodyweight' | 'timed';
    
    // Dla weighted:
    weight?: number;
    reps?: number;
    
    // Dla bodyweight:
    reps?: number;
    addedWeight?: number;
    
    // Dla timed:
    duration?: number;  // w sekundach
    distance?: number;  // w metrach
    
    date: number;  // timestamp
}
```

**Example:**
```javascript
const records = getPersonalRecords();
records.forEach(pr => {
    if (pr.type === 'weighted') {
        console.log(`${pr.exercise}: ${pr.weight}kg × ${pr.reps}`);
    } else if (pr.type === 'bodyweight') {
        console.log(`${pr.exercise}: ${pr.reps} powtórzeń`);
    } else if (pr.type === 'timed') {
        console.log(`${pr.exercise}: ${pr.duration}s, ${pr.distance}m`);
    }
});
```

---

#### `exportToJSON(): void`
Eksportuje wszystkie dane do pliku JSON i inicjuje pobieranie.

**Format JSON:**
```json
[
  {
    "id": "uuid",
    "exercise": "Wyciskanie sztangi",
    "type": "weighted",
    "weight": 80,
    "reps": 8,
    "timestamp": 1737900000000
  },
  {
    "id": "uuid",
    "exercise": "Podciąganie",
    "type": "bodyweight",
    "reps": 12,
    "timestamp": 1737900000000
  }
]
```

**Example:**
```javascript
exportToJSON(); // Pobierze plik: gymlog_export_2026-02-06.json
```

---

#### `importFromJSON(file: File): Promise<{imported: number, skipped: number}>`
Importuje dane z pliku JSON.

**Parameters:**
- `file` - Obiekt File z danymi JSON

**Returns:** Promise z liczbą zaimportowanych i pominiętych rekordów

**Validation:**
- Sprawdza format JSON
- Waliduje wymagane pola (exercise, weight/reps/duration)
- Sanityzuje nazwy ćwiczeń
- Pomija duplikaty (po ID)
- Generuje ID jeśli brakuje

**Example:**
```javascript
const fileInput = document.getElementById('importFile');
fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    try {
        const result = await importFromJSON(file);
        console.log(`Zaimportowano: ${result.imported}, Pominięto: ${result.skipped}`);
    } catch (err) {
        console.error('Import error:', err.message);
    }
});
```

---

#### `shareRecord(exercise: string, weight: number, reps: number): Promise<void>`
Udostępnia rekord za pomocą Web Share API lub kopiuje do schowka.

**Parameters:**
- `exercise` - Nazwa ćwiczenia
- `weight` - Ciężar w kg
- `reps` - Liczba powtórzeń

**Example:**
```javascript
await shareRecord("Wyciskanie sztangi", 80, 8);
// Otwiera systemowe menu udostępniania
```

---

#### `deleteSet(id: string): boolean`
Usuwa serię o podanym ID.

**Parameters:**
- `id` - UUID serii do usunięcia

**Returns:** true jeśli usunięto, false jeśli nie znaleziono

**Example:**
```javascript
const deleted = deleteSet('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
if (deleted) {
    console.log('Seria usunięta');
}
```

---

#### `updateSet(id: string, updates: Partial<GymSet>): boolean`
Aktualizuje serię o podanym ID.

**Parameters:**
- `id` - UUID serii do aktualizacji
- `updates` - Obiekt z polami do aktualizacji

**Returns:** true jeśli zaktualizowano, false jeśli nie znaleziono

**Example:**
```javascript
const updated = updateSet('a1b2c3d4-e5f6-7890-abcd-ef1234567890', {
    weight: 85,
    reps: 10
});
```

---

#### `sanitizeInput(input: string, maxLength: number = 40): string`
Czyści i sanityzuje dane wejściowe użytkownika.

**Parameters:**
- `input` - Tekst do sanityzacji
- `maxLength` - Maksymalna długość (domyślnie 40)

**Security measures:**
- Usuwa białe znaki na początku/końcu
- Usuwa tagi HTML
- Usuwa URLe
- Usuwa potencjalnie niebezpieczne znaki (<>"'`)
- Ogranicza długość

**Example:**
```javascript
const clean = sanitizeInput('<script>alert("xss")</script>Wyciskanie');
// Wynik: "scriptalert\"xss\"/scriptWyciskanie"
```

---

#### `checkNewRecord(exercise: string, weight: number): RecordInfo | null`
Sprawdza, czy nowa seria ustanawia rekord osobisty.

**Parameters:**
- `exercise` - Nazwa ćwiczenia
- `weight` - Nowy ciężar

**Returns:** Obiekt z informacją o rekordzie lub null

**Type Definition:**
```typescript
interface RecordInfo {
    exercise: string;
    newWeight: number;
    previousWeight: number;
    improvement: number;  // różnica w kg
}
```

**Example:**
```javascript
const record = checkNewRecord('Wyciskanie sztangi', 85);
if (record) {
    console.log(`Nowy rekord! +${record.improvement}kg`);
}
```

---

## 🔄 Service Worker

### sw.js - Strategia Cache

#### Cache Name & Version
```javascript
const VERSION = '1.3.2';
const CACHE_NAME = `gymlog-v${VERSION}`;
```

#### Cached Assets
```javascript
const VERSION = '1.3.2';
const CACHE_NAME = `gymlog-v${VERSION}`;
const urlsToCache = [
    '/',
    '/index.html',
    '/stats.html',
    '/history.html',
    '/profile.html',
    '/app.js',
    '/install.js',
    '/manifest.json',
    '/assets/logo.png',
    '/assets/logo-small-64.png',
    '/assets/logo-small-128.png',
    '/assets/logo-small-192.png',
    '/assets/logo-small-256.png',
    '/assets/logo-small-512.png',
    '/assets/dumbbell-solid-full.svg',
    '/assets/chart-simple-solid-full.svg',
    'https://cdn.tailwindcss.com',
    'https://cdn.jsdelivr.net/npm/chart.js'
];
```

### Cykl życia

#### 1. Install Event
```javascript
self.addEventListener('install', event => {
    // Cache wszystkich assets
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
    );
    self.skipWaiting();
});
```

#### 2. Message Event
```javascript
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({
            type: 'VERSION',
            version: VERSION
        });
    }
});
```

#### 3. Fetch Event (Cache First z Network Fallback)
```javascript
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) return response;
                
                const fetchRequest = event.request.clone();
                
                return fetch(fetchRequest).then(response => {
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME)
                        .then(cache => cache.put(event.request, responseToCache));
                    
                    return response;
                });
            })
            .catch(() => caches.match('/index.html'))
    );
});
```

#### 4. Activate Event
```javascript
self.addEventListener('activate', event => {
    // Usuń stare cache'e
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => 
            Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            )
        ).then(() => self.clients.claim())
    );
});
```

### Rejestracja Service Worker

Zarządzana przez dedykowany moduł `js/sw-manager.js`:

```javascript
// sw-manager.js
if ('serviceWorker' in navigator) {
    let refreshing = false;
    
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
    });
    
    navigator.serviceWorker.register('/sw.js')
        .then(reg => {
            console.log('Service Worker registered');
            
            // Check for updates every 60 seconds
            setInterval(() => reg.update(), 60000);
            
            // Listen for new Service Worker waiting
            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        showUpdateNotification();
                    }
                });
            });
        })
        .catch(err => console.error('Service Worker error', err));
}
```

---

## 📱 Progressive Web App

### manifest.json

#### Kluczowe właściwości

```json
{
  "name": "GymLog - Tracker Treningowy",
  "short_name": "GymLog",
  "display": "standalone",           // Pełnoekranowy widok
  "background_color": "#121212",     // Dark mode
  "theme_color": "#121212",
  "orientation": "portrait",
  "start_url": "/"
}
```

#### Ikony

```json
{
  "icons": [
    {
      "src": "assets/logo-small-64.png",
      "sizes": "64x64",
      "type": "image/png"
    },
    {
      "src": "assets/logo-small-128.png",
      "sizes": "128x128",
      "type": "image/png"
    },
    {
      "src": "assets/logo-small-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "assets/logo-small-256.png",
      "sizes": "256x256",
      "type": "image/png"
    },
    {
      "src": "assets/logo-small-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

#### Shortcuts (Quick Actions)

```json
{
  "shortcuts": [
    {
      "name": "Dodaj serię",
      "short_name": "Nowa seria",
      "description": "Szybko dodaj nową serię",
      "url": "/index.html",
      "icons": [{ "src": "assets/logo-small-192.png", "sizes": "192x192" }]
    },
    {
      "name": "Statystyki",
      "short_name": "Stats",
      "description": "Zobacz swoje statystyki",
      "url": "/stats.html",
      "icons": [{ "src": "assets/logo-small-192.png", "sizes": "192x192" }]
    }
  ]
}
```

#### Kategorie

```json
{
  "categories": ["health", "fitness", "lifestyle"]
}
```

### Instalacja PWA

#### Kryteria instalacji:
- ✅ Manifest.json z poprawnymi polami
- ✅ Service Worker zarejestrowany
- ✅ HTTPS (lub localhost w dev)
- ✅ Ikony w odpowiednich rozmiarach

---

## 🌐 Web APIs

### 1. Screen Wake Lock API

**Lokalizacja:** `js/wake-lock.js` (zaimportowany w index.html)

**Cel:** Zapobiega wygaszaniu ekranu podczas treningu

#### Implementacja

Moduł `wake-lock.js` zapewnia pełną obsługę Wake Lock API:

```javascript
let wakeLock = null;
let wakeLockEnabled = false;

async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
            wakeLockEnabled = true;
            updateWakeLockUI(true);
            
            wakeLock.addEventListener('release', () => {
                wakeLockEnabled = false;
                updateWakeLockUI(false);
            });
        }
    } catch (err) {
        console.error('Wake Lock error:', err);
        wakeLockEnabled = false;
        updateWakeLockUI(false);
    }
}

async function toggleWakeLock() {
    if (wakeLockEnabled) {
        await releaseWakeLock();
    } else {
        await requestWakeLock();
    }
}

function updateWakeLockUI(active) {
    const dot = document.getElementById('wakeLockDot');
    const icon = document.getElementById('wakeLockIcon');
    
    if (active) {
        // Green pulsing dot, locked icon
        dot.className = 'w-2 h-2 bg-neon-green rounded-full animate-pulse';
        icon.className = 'w-4 h-4 text-neon-green';
    } else {
        // Gray dot, unlocked icon
        dot.className = 'w-2 h-2 bg-gray-600 rounded-full';
        icon.className = 'w-4 h-4 text-gray-600';
    }
}

// Re-acquire wake lock when page becomes visible
document.addEventListener('visibilitychange', async () => {
    if (wakeLockEnabled && document.visibilityState === 'visible') {
        await requestWakeLock();
    }
});
```

#### Wsparcie przeglądarek:
- ✅ Chrome 84+
- ✅ Edge 84+
- ❌ Safari
- ❌ Firefox

---

### 2. File System Access API (Blob)

**Lokalizacja:** `stats.html`, funkcja `exportToCSV()`

**Cel:** Eksport danych treningowych do pliku CSV

#### Implementacja

```javascript
function exportToCSV() {
    const sets = loadSets();
    
    // Tworzenie CSV
    let csv = 'Data,Godzina,Ćwiczenie,Ciężar (kg),Powtórzenia\n';
    sets.forEach(set => {
        const date = new Date(set.timestamp);
        const dateStr = date.toLocaleDateString('pl-PL');
        const timeStr = date.toLocaleTimeString('pl-PL', 
            { hour: '2-digit', minute: '2-digit' });
        csv += `${dateStr},${timeStr},"${set.exercise}",${set.weight},${set.reps}\n`;
    });
    
    // Tworzenie Blob i pobieranie
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gymlog_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
```

#### Wsparcie:
- ✅ Wszystkie nowoczesne przeglądarki (Blob API)

---

### 3. Web Share API

**Lokalizacja:** `stats.html`, funkcja `shareRecord()`

**Cel:** Natywne udostępnianie rekordów

#### Implementacja

```javascript
async function shareRecord(exercise, weight, reps) {
    const shareData = {
        title: 'GymLog - Mój rekord!',
        text: `Mój rekord w ${exercise} to ${weight}kg × ${reps}! 💪 Zrobione w #GymLog`,
    };
    
    try {
        if (navigator.share) {
            await navigator.share(shareData);
        } else {
            // Fallback: kopiuj do schowka
            await navigator.clipboard.writeText(shareData.text);
            alert('📋 Tekst skopiowany do schowka!\n\n' + shareData.text);
        }
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error('Share error:', err);
        }
    }
}
```

#### Wymagania:
- HTTPS (lub localhost)
- Interakcja użytkownika (kliknięcie)
- Wspierane tylko na mobile i niektórych desktop browsers

#### Wsparcie:
- ✅ Safari (iOS/macOS)
- ✅ Chrome (Android)
- ⚠️ Chrome (Desktop) - ograniczone
- ❌ Firefox Desktop

---

## 🧮 Kalkulator 1RM

### Przegląd

Kalkulator One-Rep Max (1RM) w GymLog pozwala na oszacowanie maksymalnego ciężaru, który użytkownik może podnieść w jednym powtórzeniu, na podstawie wykonanych serii z mniejszą wagą i większą liczbą powtórzeń.

**Lokalizacja:** `stats-page.js`, zakładka "1RM" w [stats.html](stats.html)

### Dostępne formuły

#### 1. Formuła Epley (domyślna)
```javascript
1RM = weight × (1 + reps / 30)
```
- Najpopularniejsza formuła
- Dokładna dla 1-10 powtórzeń
- Używana przez większość kalkulatorów online

#### 2. Formuła Brzycki
```javascript
1RM = weight × (36 / (37 - reps))
```
- Bardzo dokładna dla małych liczb powtórzeń
- Zalecana dla powerlifterów
- Nie działa dla 37+ powtórzeń

#### 3. Formuła Lombardi
```javascript
1RM = weight × reps^0.10
```
- Optymalna dla 1-5 powtórzeń
- Konserwatywna metoda
- Używana w badaniach naukowych

#### 4. Formuła Landers
```javascript
1RM = (100 × weight) / (101.3 - 2.67123 × reps)
```
- Kompleksowa formuła matematyczna
- Dobra dla średnich zakresów (5-10 reps)

#### 5. Formuła O'Conner
```javascript
1RM = weight × (1 + reps / 40)
```
- Najbardziej konserwatywna
- Bezpieczna dla początkujących
- Dobre oszacowanie dla 8-12 powtórzeń

### Implementacja

```javascript
// Obiekt z wszystkimi formułami
const formulas = {
    epley: (weight, reps) => weight * (1 + reps / 30),
    brzycki: (weight, reps) => weight * (36 / (37 - reps)),
    lombardi: (weight, reps) => weight * Math.pow(reps, 0.10),
    landers: (weight, reps) => (100 * weight) / (101.3 - 2.67123 * reps),
    oconner: (weight, reps) => weight * (1 + reps / 40)
};

// Oblicz 1RM dla wybranej formuły
function calculate1RM(exercise, formula = 'epley') {
    const sets = loadSets()
        .filter(s => s.exercise === exercise && s.type === 'weighted')
        .sort((a, b) => b.timestamp - a.timestamp);
    
    if (sets.length === 0) return null;
    
    const lastSet = sets[0];
    const result = formulas[formula](lastSet.weight, lastSet.reps);
    
    return {
        value: Math.round(result * 10) / 10,
        weight: lastSet.weight,
        reps: lastSet.reps,
        formula: formula,
        date: lastSet.timestamp
    };
}

// Oblicz średnią ze wszystkich formuł
function calculateAverage1RM(exercise) {
    const results = Object.keys(formulas).map(formula => 
        calculate1RM(exercise, formula)
    ).filter(r => r !== null);
    
    if (results.length === 0) return null;
    
    const average = results.reduce((sum, r) => sum + r.value, 0) / results.length;
    return Math.round(average * 10) / 10;
}
```

### UI Flow

1. **Wybór ćwiczenia** - użytkownik wybiera z listy wykonywanych ćwiczeń ciężarowych
2. **Wyświetlenie ostatniego wykonania** - pokazuje ostatnią serię (ciężar, powtórzenia, data)
3. **Wybór formuły** - może wybrać konkretną formułę lub "Wszystkie formuły"
4. **Obliczenie** - kliknięcie przycisku oblicza 1RM
5. **Wyniki:**
   - Pojedyncza formuła: duży wynik z nazwą formuły
   - Wszystkie formuły: lista wyników + średnia

### Przykład użycia

```javascript
// W stats-page.js
document.getElementById('calculateBtn').addEventListener('click', () => {
    const exercise = document.getElementById('exerciseSelect').value;
    const formula = document.getElementById('formulaSelect').value;
    
    if (formula === 'all') {
        // Pokaż wszystkie wyniki
        const results = Object.keys(formulas).map(f => ({
            name: formulaNames[f],
            value: calculate1RM(exercise, f).value
        }));
        displayMultipleResults(results);
        
        // Pokaż średnią
        const avg = calculateAverage1RM(exercise);
        document.getElementById('averageResult').textContent = `${avg}kg`;
    } else {
        // Pokaż pojedynczy wynik
        const result = calculate1RM(exercise, formula);
        displaySingleResult(result);
    }
});
```

### Limitacje i ostrzeżenia

⚠️ **Ważne informacje dla użytkowników:**

1. **Zakres powtórzeń:** Formuły są najbardziej dokładne dla 1-10 powtórzeń
2. **Margines błędu:** ±10% odchylenia od rzeczywistego 1RM
3. **Bezpieczeństwo:** Nie testuj rzeczywistego 1RM bez asekuracji
4. **Kontekst:** Wyniki zależą od techniki, kondycji, odpoczynku
5. **Używaj rozsądnie:** To tylko narzędzie pomocnicze, nie nakaz

### Walidacja

```javascript
function validate1RMInput(weight, reps) {
    if (!weight || weight <= 0) {
        return { valid: false, error: 'Ciężar musi być większy od 0' };
    }
    
    if (!reps || reps <= 0) {
        return { valid: false, error: 'Powtórzenia muszą być większe od 0' };
    }
    
    if (reps >= 37) {
        return { valid: false, error: 'Formuły są nieprecyzyjne dla 37+ powtórzeń' };
    }
    
    if (reps > 20) {
        return { 
            valid: true, 
            warning: 'Dokładność spada dla >20 powtórzeń' 
        };
    }
    
    return { valid: true };
}
```

---

## 🔌 Integracja

### Dodawanie nowego ćwiczenia z zewnętrznego źródła

```javascript
function addSetFromAPI(exerciseName, weight, reps) {
    const newSet = {
        id: crypto.randomUUID(),
        exercise: exerciseName,
        weight: weight,
        reps: reps,
        timestamp: Date.now()
    };
    
    const sets = loadSets();
    sets.unshift(newSet);
    saveSets(sets);
}

// Przykład użycia
addSetFromAPI("Wyciskanie sztangi", 80, 8);
```

### Import danych z CSV

```javascript
function importFromCSV(csvString) {
    const lines = csvString.split('\n').slice(1); // Pomiń header
    const sets = [];
    
    lines.forEach(line => {
        const [date, time, exercise, weight, reps] = line.split(',');
        if (exercise) {
            sets.push({
                id: crypto.randomUUID(),
                exercise: exercise.replace(/"/g, ''),
                weight: parseFloat(weight),
                reps: parseInt(reps),
                timestamp: new Date(`${date} ${time}`).getTime()
            });
        }
    });
    
    saveSets(sets);
}
```

### Synchronizacja z Cloud (szkielet)

```javascript
async function syncToCloud() {
    const sets = loadSets();
    
    try {
        const response = await fetch('https://api.example.com/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sets })
        });
        
        if (response.ok) {
            console.log('Synced successfully');
        }
    } catch (err) {
        console.error('Sync error:', err);
    }
}
```

---

## 🎨 Style Guide

### Tailwind CSS Classes

#### Kolory
```css
bg-dark-bg        /* #121212 - główne tło */
bg-dark-card      /* #1e1e1e - karty */
text-neon-green   /* #10b981 - akcent */
```

#### Komponenty

**Przycisk główny:**
```html
<button class="w-full bg-neon-green hover:bg-emerald-400 active:scale-98 
               text-dark-bg font-black text-xl py-5 rounded-2xl 
               shadow-lg shadow-neon-green/30 transition-all">
    TEKST
</button>
```

**Karta:**
```html
<div class="bg-dark-card border border-gray-800 rounded-xl p-4 
            hover:border-gray-700 transition-colors">
    Zawartość
</div>
```

**Input:**
```html
<input class="w-full bg-dark-card border-2 border-gray-700 rounded-2xl 
              py-4 px-5 text-xl font-semibold focus:border-neon-green 
              focus:outline-none transition-all">
```

---

## 🧪 Testowanie

### Testy manualne

#### Test 1: Dodawanie serii
1. Otwórz `index.html`
2. Wypełnij formularz
3. Kliknij "DODAJ SERIĘ"
4. Sprawdź czy seria pojawia się na liście

#### Test 2: Sugestia progresji
1. Dodaj serię z ≥5 powtórzeniami
2. Wybierz to samo ćwiczenie ponownie
3. Wpisz ≥5 powtórzeń
4. Sprawdź czy pojawia się sugestia +2.5kg

#### Test 3: Offline mode
1. Otwórz DevTools → Application → Service Workers
2. Kliknij "Offline"
3. Odśwież stronę
4. Sprawdź czy aplikacja działa

#### Test 4: Eksport JSON
1. Przejdź do statystyk
2. Kliknij ikonę pobierania (eksport)
3. Sprawdź czy plik JSON się pobiera
4. Otwórz w edytorze tekstu i zweryfikuj format

#### Test 5: Import JSON
1. W statystykach kliknij ikonę importu
2. Wybierz wcześniej wyeksportowany plik JSON
3. Sprawdź czy dane zostały zaimportowane
4. Zweryfikuj licznik zaimportowanych/pominiętych

#### Test 6: Historia i edycja
1. Przejdź do zakładki "Historia"
2. Znajdź serię do edycji
3. Kliknij ikonę ołówka
4. Zmień wartości i zapisz
5. Sprawdź czy zmiany zostały zapisane

#### Test 7: Kalkulator 1RM
1. Przejdź do statystyk → zakładka "1RM"
2. Wybierz ćwiczenie z listy
3. Wybierz formułę (lub "Wszystkie formuły")
4. Kliknij "Oblicz 1RM"
5. Zweryfikuj wyniki

#### Test 8: Profil użytkownika
1. Przejdź do profilu
2. Uzupełnij dane (wiek, wzrost, waga)
3. Sprawdź czy BMI zostało obliczone
4. Dodaj zdjęcie profilowe (kamera lub galeria)
5. Sprawdź wykres historii wagi

### Performance

```javascript
// Measure localStorage performance
console.time('loadSets');
const sets = loadSets();
console.timeEnd('loadSets'); // ~0.5ms dla 1000 rekordów

console.time('saveSets');
saveSets(sets);
console.timeEnd('saveSets'); // ~1ms dla 1000 rekordów
```

---

## 📈 Metryki

### Wydajność
- **First Contentful Paint:** < 1s
- **Time to Interactive:** < 2s
- **Lighthouse Score:** 95+

### Rozmiar
- **HTML (index.html):** ~14KB
- **HTML (stats.html):** ~14KB
- **HTML (history.html):** ~12KB
- **HTML (profile.html):** ~12KB
- **JS (app.js):** ~10KB
- **JS (stats-page.js):** ~35KB (z kalkulatorem 1RM)
- **JS (pozostałe moduły):** ~15KB łącznie
- **SW (sw.js):** ~3KB
- **Total:** ~115KB (bez external CDN)

### Limity
- **LocalStorage:** ~5-10MB (wystarczy na ~50,000 serii)
- **Cache Storage:** Unlimited (przez Service Worker)

---

## 🔐 Bezpieczeństwo

### Content Security Policy (Opcjonalne)

Dodaj do `<head>`:

```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net; 
               style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com;">
```

### Sanityzacja danych

Funkcja `sanitizeInput()` w [app.js](app.js) zapewnia bezpieczeństwo:

```javascript
function sanitizeInput(input, maxLength = 40) {
    if (!input || typeof input !== 'string') {
        return '';
    }
    
    // Trim whitespace
    let sanitized = input.trim();
    
    // Remove HTML tags
    sanitized = sanitized.replace(/<[^>]*>/g, '');
    
    // Remove URLs
    sanitized = sanitized.replace(/(https?:\/\/|www\.)[^\s]+/gi, '');
    
    // Remove potentially dangerous characters
    sanitized = sanitized.replace(/[<>"'`]/g, '');
    
    // Limit length
    if (sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength);
    }
    
    return sanitized;
}
```

**Zabezpieczenia:**
- Usuwanie tagów HTML (XSS protection)
- Usuwanie URLi
- Usuwanie niebezpiecznych znaków
- Limit długości tekstu
- Walidacja typu danych

---

## 📝 Changelog

### v1.3.2 (2026-02-06) - Aktualna wersja
- ✨ **Nowe strony:** history.html (historia treningów), profile.html (profil użytkownika)
- ✨ **Typy ćwiczeń:** weighted (ciężary), bodyweight (masa ciała), timed (czasowe)
- ✨ **Kalkulator 1RM:** 5 różnych formuł obliczeniowych
- ✨ **Edycja serii:** możliwość edycji i usuwania treningów
- ✨ **Profil użytkownika:** BMI calculator, historia wagi, zdjęcie profilowe
- ✨ **Import/Export JSON:** pełna wymiana danych w formacie JSON
- ✨ **Dedykowane moduły JS:** oddzielne pliki dla każdej strony
- ✨ **Service Worker Manager:** automatyczne aktualizacje z powiadomieniami
- ✨ **Wake Lock Manager:** dedykowany moduł zarządzania ekranem
- 🐛 **Sanityzacja danych:** zaawansowana ochrona przed XSS
- 🐛 **Migracja danych:** automatyczne dodawanie pola type do starych wpisów
- 🎨 **UI Improvements:** lepsze filtry, wyszukiwarka, kategorie

### v1.0.0 (2026-01-26) - Pierwsze wydanie
- ✨ Inicjalne wydanie
- ✨ Ekran treningu z formularzem
- ✨ Ekran statystyk z wykresami
- ✨ Screen Wake Lock API
- ✨ Web Share API
- ✨ Eksport do CSV
- ✨ PWA z Service Worker
- ✨ Dark mode design

---

## 🚧 Roadmap

### v1.4.0 (W planach)
- [ ] Filtrowanie historii po zakresie dat
- [ ] Eksport do PDF z podsumowaniem
- [ ] Zaawansowane statystyki (progresja w czasie)
- [ ] Notyfikacje o treningach
- [ ] Dark/Light mode toggle

### v1.5.0
- [ ] Plan treningowy (workout routines)
- [ ] Timer odpoczynku między seriami
- [ ] Notatki do treningów
- [ ] Backup automatyczny do cloud (Firebase/Supabase)
- [ ] Wielojęzyczność (en, de, es)

### v2.0.0 (Przyszłość)
- [ ] Społeczność (udostępnianie planów treningowych)
- [ ] Galeria zdjęć postępów (przed/po)
- [ ] Integracja z urządzeniami fitness (smart watch)
- [ ] AI asystent treningowy
- [ ] Współdzielone sesje treningowe
- [ ] Ranking i achievements

---

**Ostatnia aktualizacja:** 6 lutego 2026
