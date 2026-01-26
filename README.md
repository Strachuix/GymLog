# 💪 GymLog - Tracker Treningowy PWA

**GymLog** to nowoczesna aplikacja Progressive Web App (PWA) do śledzenia postępów treningowych w siłowni. Śledź swoje serie, analizuj statystyki i osiągaj nowe rekordy!

![GymLog Logo](logo.png)

## ✨ Funkcje

### 📱 Ekran Treningu (index.html)
- ➕ **Szybkie dodawanie serii** - formularz z polami: Ćwiczenie, Ciężar, Powtórzenia
- 💡 **Inteligentne sugestie** - jeśli ostatnia seria miała ≥5 powtórzeń, aplikacja sugeruje +2.5kg
- 📝 **Autouzupełnianie** - dynamiczny datalist z historią ćwiczeń
- 📊 **Ostatnie 5 serii** - szybki podgląd najnowszych wpisów
- 🔒 **Screen Wake Lock API** - ekran nie gaśnie podczas treningu
- 💾 **Automatyczny zapis** - wszystkie dane w localStorage

### 📈 Ekran Statystyk (stats.html)
- 🏆 **Top 3 ćwiczenia** - najczęściej wykonywane z medalami i objętością
- 💪 **Rekordy życiowe (PR)** - najwyższe ciężary dla każdego ćwiczenia
- 📊 **Wykresy postępu** - Chart.js wizualizuje twoje osiągnięcia
- 📥 **Eksport do CSV** - pobierz kopię zapasową wszystkich danych
- 🔗 **Web Share API** - udostępnij swoje rekordy znajomym

### 🌐 Funkcje PWA
- ⚡ **Działa offline** - Service Worker cache'uje wszystkie zasoby
- 📲 **Instalowalna** - dodaj do ekranu głównego telefonu
- 🎨 **Dark Mode** - przyjazny dla oczu ciemny motyw (#121212)
- 🎯 **Obsługa kciukiem** - duże przyciski, touch-friendly interface
- 🚀 **Szybka i responsywna** - zoptymalizowana wydajność

## 🛠️ Technologie

- **HTML5** - struktura aplikacji
- **Tailwind CSS** - nowoczesny styling
- **Vanilla JavaScript** - logika bez frameworków
- **Chart.js** - interaktywne wykresy
- **Service Worker API** - obsługa offline
- **LocalStorage API** - przechowywanie danych
- **Screen Wake Lock API** - zapobieganie wygaszaniu ekranu
- **File System Access API** - eksport danych do CSV
- **Web Share API** - natywne udostępnianie

## 📦 Instalacja

1. **Sklonuj repozytorium:**
```bash
git clone https://github.com/twoj-username/gymlog.git
cd gymlog
```

2. **Uruchom lokalny serwer:**
```bash
# Używając Python 3
python -m http.server 8000

# Lub używając Node.js (npx)
npx serve

# Lub używając PHP
php -S localhost:8000
```

3. **Otwórz przeglądarkę:**
```
http://localhost:8000
```

4. **Zainstaluj jako PWA:**
   - W Chrome/Edge: Kliknij ikonę instalacji w pasku adresu
   - Na telefonie: Menu → "Dodaj do ekranu głównego"

## 🎯 Użycie

### Dodawanie serii treningowej:
1. Wpisz nazwę ćwiczenia (lub wybierz z listy)
2. Wprowadź ciężar (kg) i liczbę powtórzeń
3. Kliknij **"DODAJ SERIĘ"**
4. Aplikacja automatycznie zapisze dane i pokaże sugestię progresji

### Przeglądanie statystyk:
1. Przejdź do zakładki **"STATYSTYKI"**
2. Zobacz Top 3 najczęściej wykonywanych ćwiczeń
3. Sprawdź swoje rekordy życiowe (PR)
4. Analizuj wykresy postępu

### Eksport danych:
1. W zakładce statystyk kliknij ikonę pobierania
2. Pobierz plik CSV z całą historią treningów
3. Otwórz w Excel/Google Sheets lub użyj jako backup

### Udostępnianie rekordów:
1. Przy każdym rekordzie kliknij ikonę udostępniania
2. Wybierz aplikację (WhatsApp, Facebook, etc.)
3. Pochwal się swoim osiągnięciem! 💪

## 📁 Struktura Projektu

```
gymlog/
├── index.html          # Ekran treningu (główny)
├── stats.html          # Ekran statystyk
├── app.js              # Wspólna logika aplikacji
├── sw.js               # Service Worker (offline support)
├── manifest.json       # Manifest PWA
├── logo.png            # Logo aplikacji (1024x352px)
└── README.md           # Ten plik
```

## 🔧 Konfiguracja

### LocalStorage Key:
Wszystkie dane są przechowywane pod kluczem: `gymlog_data`

### Format danych:
```javascript
{
  id: "uuid",
  exercise: "Wyciskanie sztangi",
  weight: 60.5,
  reps: 10,
  timestamp: 1737900000000
}
```

### Cache Strategy:
Service Worker używa strategii **Cache First** z fallbackiem do sieci.

## 🎨 Customizacja

### Zmiana kolorów:
Edytuj plik `index.html` i `stats.html`, sekcja `<script>`:
```javascript
tailwind.config = {
    theme: {
        extend: {
            colors: {
                'neon-green': '#10b981',  // Zmień kolor akcentu
                'dark-bg': '#121212',      // Zmień kolor tła
                'dark-card': '#1e1e1e',    // Zmień kolor kart
            }
        }
    }
}
```

### Dodanie nowych ćwiczeń do podpowiedzi:
Ćwiczenia są automatycznie dodawane do listy po pierwszym użyciu.

## 📱 Wsparcie przeglądarek

- ✅ Chrome 87+
- ✅ Edge 87+
- ✅ Safari 15.4+
- ✅ Firefox 103+
- ✅ Samsung Internet 15+
- ✅ Opera 73+

**Uwaga:** Screen Wake Lock API nie jest wspierane przez wszystkie przeglądarki (głównie Chrome/Edge).

## 🚀 Deployment

### GitHub Pages:
1. Push kod do repozytorium GitHub
2. Włącz GitHub Pages w ustawieniach repo
3. Wybierz branch `main` i folder `/ (root)`

### Netlify:
```bash
netlify deploy --prod
```

### Vercel:
```bash
vercel --prod
```

## 🐛 Znane problemy

- Screen Wake Lock API nie działa w Safari
- Web Share API wymaga HTTPS w production
- LocalStorage ma limit ~5-10MB (wystarczy na tysiące wpisów)

## 🤝 Współpraca

Chętnie przyjmuję pull requesty! Jeśli masz pomysł na nową funkcję:

1. Forkuj projekt
2. Stwórz branch (`git checkout -b feature/AmazingFeature`)
3. Commit zmiany (`git commit -m 'Add some AmazingFeature'`)
4. Push do brancha (`git push origin feature/AmazingFeature`)
5. Otwórz Pull Request

## 📄 Licencja

Ten projekt jest dostępny na licencji MIT. Zobacz plik `LICENSE` dla szczegółów.

## 👤 Autor

Stworzono z 💪 przez [Twoje Imię]

## 🙏 Podziękowania

- [Tailwind CSS](https://tailwindcss.com/) - za świetny framework CSS
- [Chart.js](https://www.chartjs.org/) - za piękne wykresy
- Społeczność fitness - za inspirację do tworzenia tej aplikacji

---

**Zbuduj siłę, śledź progres, osiągaj cele! 💪**

## 📸 Screenshots

### Ekran Treningu
![Training Screen](screenshots/training.png)

### Ekran Statystyk
![Stats Screen](screenshots/stats.png)

### PWA na telefonie
![Mobile PWA](screenshots/mobile.png)

---

**Made with ❤️ for the fitness community**
