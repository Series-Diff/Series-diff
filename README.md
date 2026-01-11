# SeriesDiff
SeriesDiff jest webową aplikacją służącą do porównywania szeregów czasowych, obliczania dla nich odpowiednich metryk i statystyk oraz wizualizacji ich na wykresie. <br>
Powstała ona w ramach pracy inżynierskiej na zlecenie firmy Rockwool.

## Uruchamianie aplikacji
### Dostęp sieciowy
Aplikacja jest ogólnodostępna pod adresem [seriesdiff.com](https://www.seriesdiff.com). <br>
Możliwy jest także dostęp do API aplikacja pod adresem [api.seriesdiff.com](https://api.seriesdiff.com/). <br>
Po więcej szczegółów dotyczących punktów końcowych API odsyłamy pod [dokumentację API](Flask-API/README.md).
### Uruchamianie w kontenerze za pomocą docker-compose
W przypadku chęci rozwoju oprogramowania lokalnie na swojej maszynie, możliwe jest wykorzystanie narzędzia orkiestracji kontenerów _docker compose_.<br>
Do uruchomienia aplikacji lokalnie potrzebujemy sklonować repozytorium na swój komputer za pomocą komendy `git clone https://github.com/Series-Diff/Series-diff.git` w odpowiednim folderze dla repozytorium, a następnie uruchamiamy narzędzie compose za pomocą komendy `docker compose up --build` w folderze głównym projektu.

> [!TIP]
> W przypadku chęci odpalenia tylko jednej z części aplikacji, to proces w jaki można to zrobić został opisany w kolejno [dokumenacji aplikacji Flask API](Flask-API/README.md) oraz [dokumentacji aplikacji frontendowej React](client/README.md).

## Funkcjonalności
Aplikacja oferuje szereg funkcjonalności dotyczących analizy danych szeregów czasowych. Wśród nich można wyróżnić m.in.:
- Obsługę najpopularniejszych formatów danych: JSON i csv.
- Wizualizację danych czasowych w postaci wykresu liniowego
- Analizę danych pod względem statystycznym za pomocą szeregu predefiniowanych statystyk oraz metryk
- Porównywanie danych z różnych plików oraz różnych kategorii na wykresie, odpowiednio filtrując te które mają być widoczne i niewidoczne
- Filtracje po czasie oraz przedziale danych
- Wgrywanie własnych pluginów do porównywania szeregów
- Analiza danych w postaci tabelarycznej
- Naniesienie na wykres średniej kroczącej
- Oznaczenie własnych pomiarów referencyjnych które również będą widocznymi na wykresie punktami 
- Dwa widoki wykresu: jednolita oraz zestackowana wedle kategorii
- Obserwacje wykresu różnic

# Autorzy
- Michał Bojara
- Mikołaj Szulc
- Karol Kowalczyk
- Franciszka Jędraszak
- Natalia Szymczak