# Pakker En Loper

Het speeltijdspel als RTS in de browser. Geen installatie nodig.

## Openen
Open de map in VS Code en dubbelklik `index.html`, of open het in je browser.
Met de VS Code-extensie Live Server herlaadt het spel vanzelf als je iets bewaart.

## Bestanden
- `index.html`: de schermen en knoppen
- `css/style.css`: kleuren, lettertypes en layout (pc, gsm en tablet)
- `js/01-regels.js`: veld, kinderen, niveaus, nieuw spel en nieuwe ronde
- `js/02-computer-plannen.js`: tactieken van de computer en wat hij van jou leert
- `js/03-computer-gedrag.js`: zicht, en hoe elke rol beweegt (jager, muur, bewaker, lokaas...)
- `js/04-bevelen-rollen.js`: bevelen en rollen van jouw ploeg
- `js/05-simulatie.js`: beweging, tikken, punten en de spelstap
- `js/06-tekenen.js`: het veld tekenen, draaien op gsm, zoomen
- `js/07-invoer.js`: muis, aanraken, toetsen en formaties
- `js/08-scherm.js`: verslagen, tiebreaker en de zijbalk
- `js/09-geluid.js`: geluiden
- `js/10-unit-possession.js`: zelf een kind besturen
- `js/11-statistieken.js`: statistieken per kind
- `js/12-mobiel.js`: knoppen en lade op gsm en tablet
- `js/13-lus.js`: de lus die alles 60 keer per seconde laat lopen

De bestanden worden in deze volgorde geladen. Ze delen hun variabelen, dus de volgorde in `index.html` niet veranderen.
