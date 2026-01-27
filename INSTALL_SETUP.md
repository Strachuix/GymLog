# 📱 Instrukcja Instalacji PWA - GymLog

## ✅ Co zostało zaimplementowane:

### 1. **Logika instalacji PWA** (`install.js`)
- Obsługa zdarzenia `beforeinstallprompt`
- Automatyczne wykrywanie czy aplikacja jest już zainstalowana
- Przycisk pojawia się tylko gdy PWA jest możliwa do zainstalowania
- Ukrycie przycisku po instalacji
- Pamięć preferencji użytkownika (7 dni po zamknięciu)

### 2. **Elegancki przycisk instalacji**
- Pozycja: prawy dolny róg (nad nawigacją)
- Kolor: neon-green (#10b981)
- Tekst: "Zainstaluj GymLog na telefonie"
- Ikona pobierania + przycisk zamknięcia (X)
- Animacja płynnego pojawiania się
- Responsywny design

### 3. **Ikony aplikacji** (`manifest.json`)
Wykorzystane różne rozmiary logo:
- `logo-small-64.png` (64x64) - favicon
- `logo-small-128.png` (128x128) - średnia ikona
- `logo-small-192.png` (192x192) - standardowa ikona PWA
- `logo-small-256.png` (256x256) - Apple touch icon
- `logo-small-512.png` (512x512) - duża ikona + maskable

---

## 📂 Struktura plików w projekcie:

```
GymLog/
├── assets/             ✅ NOWY FOLDER (wszystkie grafiki)
│   ├── logo.png                    ✅ (header)
│   ├── logo-small-64.png           ✅ (favicon)
│   ├── logo-small-128.png          ✅ (ikona PWA)
│   ├── logo-small-192.png          ✅ (ikona PWA)
│   ├── logo-small-256.png          ✅ (Apple touch)
│   ├── logo-small-512.png          ✅ (maskable)
│   ├── dumbbell-solid-full.svg     ✅ (nawigacja)
│   └── chart-simple-solid-full.svg ✅ (nawigacja)
├── index.html          ✅ Zaktualizowany (ścieżki do assets/)
├── stats.html          ✅ Zaktualizowany (ścieżki do assets/)
├── history.html        ✅ Zaktualizowany (ścieżki do assets/)
├── app.js              ✅ Istniejący (logika aplikacji)
├── install.js          ✨ NOWY (logika instalacji PWA)
├── sw.js               ✅ Zaktualizowany (v1.0.6, cache assets/)
└── manifest.json       ✅ Zaktualizowany (ikony z assets/)
```

---

## ✅ Ikony - Wszystko gotowe!

Aplikacja wykorzystuje wielorozmiarowe logo (`logo-small-*.png`):
- **64x64** - favicon w przeglądarce
- **128x128** - małe ikony systemowe
- **192x192** - standardowa ikona PWA
- **256x256** - Apple Touch Icon (iOS)
- **512x512** - duża ikona + maskable (Android)

Wszystkie ikony znajdują się w folderze `assets/` i są:
- ✅ Dodane do manifest.json
- ✅ Cache'owane przez Service Worker
- ✅ Używane we wszystkich HTML

---

## 📂 Lokalizacja plików graficznych:

Wszystkie grafiki przeniesione do folderu `assets/`:
```
assets/logo.png                     # Header (1024x352px)
assets/logo-small-64.png            # Favicon
assets/logo-small-128.png           # Ikona PWA
assets/logo-small-192.png           # Ikona PWA (standard)
assets/logo-small-256.png           # Apple Touch Icon
assets/logo-small-512.png           # Duża ikona + maskable
assets/dumbbell-solid-full.svg      # Ikona treningu (nawigacja)
assets/chart-simple-solid-full.svg  # Ikona statystyk (nawigacja)
```

---

## 🧪 Jak przetestować instalację:

### Desktop (Chrome/Edge):
1. Otwórz aplikację przez `http://localhost` lub HTTPS
2. W prawym dolnym rogu pojawi się przycisk "Zainstaluj GymLog"
3. Kliknij przycisk → pojawi się systemowe okno instalacji
4. Po instalacji przycisk znika
5. Aplikacja dostępna w menu Start / Aplikacje

### Mobile (Android):
1. Otwórz w Chrome przez HTTPS
2. Przycisk pojawi się automatycznie
3. Możesz też użyć menu Chrome → "Dodaj do ekranu głównego"
4. Po instalacji: ikona na ekranie głównym, pełny ekran, splash screen

### iOS (Safari):
⚠️ Safari nie wspiera `beforeinstallprompt`, więc:
- Przycisk NIE pojawi się automatycznie
- Użyj: Przycisk "Udostępnij" → "Dodaj do ekranu początkowego"
- Ikony i manifest działają normalnie

---

## 🔧 Debugowanie:

### Chrome DevTools:
1. F12 → Application → Manifest
   - Sprawdź czy ikony się ładują
   - Czy wszystkie pola są wypełnione

2. Console:
   - `beforeinstallprompt fired` = przycisk powinien się pojawić
   - `PWA was installed` = instalacja zakończona

3. Lighthouse:
   - Uruchom audit PWA
   - Sprawdź czy wszystkie kryteria są spełnione (score 100)

---

## 💡 Dodatkowe funkcje:

### Zamknięcie przycisku (X):
- Użytkownik może ukryć przycisk klikając X
- Przycisk nie pojawi się przez 7 dni
- Dane zapisane w localStorage: `gymlog_install_hide_until`

### Wykrywanie zainstalowanej aplikacji:
- Jeśli PWA jest już zainstalowana, przycisk NIE pojawi się
- Sprawdzane przez: `window.matchMedia('(display-mode: standalone)')`

### Toast notification:
- Po pomyślnej instalacji: "✓ GymLog zainstalowana!" (3 sekundy)

---

## 📝 Customizacja:

### Zmiana pozycji przycisku:
W plikach HTML znajdź `#installButton` i zmień klasy:
```html
<!-- Prawy dolny róg (domyślnie) -->
class="...bottom-24 right-4..."

<!-- Lewy dolny róg -->
class="...bottom-24 left-4..."

<!-- Na środku u dołu -->
class="...bottom-24 left-1/2 -translate-x-1/2..."
```

### Zmiana tekstu:
```html
<p class="text-sm leading-tight">Zainstaluj GymLog</p>
<p class="text-xs opacity-75 leading-tight">na telefonie</p>
```

### Zmiana czasu ukrycia (domyślnie 7 dni):
W `install.js` linia 96:
```javascript
const hideUntil = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 dni
```

---

## ✅ Checklist przed wdrożeniem:

- [x] Ikony w różnych rozmiarach w folderze `assets/`
- [x] Wszystkie ścieżki zaktualizowane do `assets/`
- [x] Service Worker v1.0.6 cache'uje wszystkie grafiki
- [ ] Aplikacja działa przez HTTPS (lub localhost)
- [ ] Service Worker zarejestrowany poprawnie
- [ ] Manifest.json bez błędów (DevTools → Application)
- [ ] Test instalacji na Desktop Chrome
- [ ] Test instalacji na Android Chrome
- [ ] Lighthouse PWA score = 100

---

## 🚀 Gotowe!

Po dodaniu ikon możesz od razu wdrożyć aplikację. Przycisk instalacji pojawi się automatycznie u użytkowników, którzy jeszcze nie zainstalowali PWA.

**Deploy:**
```bash
# Wgraj wszystkie pliki na serwer (Vercel/Netlify)
# Upewnij się że HTTPS jest włączone
# Gotowe! 🎉
```
