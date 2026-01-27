# Changelog - GymLog

## [1.0.6] - 2026-01-27

### ✨ Dodano
- Nowy folder `assets/` dla wszystkich plików graficznych
- Wykorzystanie wielorozmiarowego logo (64, 128, 192, 256, 512px)
- Logo-small-192.png dla standardowej ikony PWA

### 🔄 Zmieniono
- **Wszystkie ścieżki do grafik** zaktualizowane z głównego katalogu do `assets/`
- **Service Worker** (v1.0.5 → v1.0.6):
  - Cache'owanie wszystkich rozmiarów logo
  - Zaktualizowane ścieżki do SVG i PNG
- **manifest.json**:
  - Ikony teraz wskazują na `assets/logo-small-*.png`
  - Dodano wszystkie rozmiary: 64, 128, 192, 256, 512px
  - Shortcuts używają `logo-small-192.png`
- **HTML (index, stats, history)**:
  - Favicon: `assets/logo-small-64.png` (64x64)
  - Apple Touch Icon: `assets/logo-small-256.png` (256x256)
  - Header logo: `assets/logo.png`
  - Ikony nawigacji: `assets/dumbbell-solid-full.svg`, `assets/chart-simple-solid-full.svg`
- **Dokumentacja** (README, DOCUMENTATION, INSTALL_SETUP):
  - Zaktualizowane ścieżki
  - Usunięte wzmianki o placeholderach `icon-192.png` i `icon-512.png`
  - Dodana sekcja o strukturze folderu `assets/`

### 📂 Struktura katalogów
```
GymLog/
├── assets/                          # 🆕 Wszystkie grafiki
│   ├── logo.png                     # Header (1024x352)
│   ├── logo-small-64.png            # Favicon
│   ├── logo-small-128.png           # Ikona PWA
│   ├── logo-small-192.png           # Standardowa ikona PWA
│   ├── logo-small-256.png           # Apple Touch Icon
│   ├── logo-small-512.png           # Duża ikona + maskable
│   ├── logo-small.png               # Oryginalna (512x512)
│   ├── dumbbell-solid-full.svg      # Ikona treningu
│   └── chart-simple-solid-full.svg  # Ikona statystyk
├── index.html                       # ✅ Zaktualizowano
├── stats.html                       # ✅ Zaktualizowano
├── history.html                     # ✅ Zaktualizowano
├── sw.js                            # ✅ v1.0.6
├── manifest.json                    # ✅ Zaktualizowano
├── app.js
├── install.js
├── README.md                        # ✅ Zaktualizowano
├── DOCUMENTATION.md                 # ✅ Zaktualizowano
└── INSTALL_SETUP.md                 # ✅ Zaktualizowano
```

### 🎯 Korzyści
- **Lepiej zorganizowana struktura** - wszystkie grafiki w jednym miejscu
- **Łatwiejsze zarządzanie** - aktualizacja logo wymaga zmiany tylko w folderze assets/
- **Zgodność z PWA** - wykorzystanie wielorozmiarowych ikon dla różnych platform
- **Optymalizacja** - odpowiednie rozmiary dla różnych kontekstów użycia

---

## [1.0.5] - Poprzednia wersja

### ✨ Funkcje
- System instalacji PWA z przyciskiem
- Service Worker z version checking
- Kompletna aplikacja treningowa (3 strony)
- JSON import/export
- Wake Lock API
- Web Share API
