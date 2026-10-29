# Pakker En Loper

Het speeltijdspel als RTS in de browser. Geen installatie nodig.

## Openen
Open de map in VS Code en dubbelklik `index.html`, of open het in je browser.
Met de VS Code-extensie Live Server herlaadt het spel vanzelf als je iets bewaart.

## Spelen
Kies in het menu:
- **Solo**: tegen de computer, met pauze.
- **Online: host** of **Online: meedoen**: tegen een vriend (zie hieronder).
- **Kijken**: computer tegen computer.
- **Oefenen**: een rondleiding voor nieuwe spelers.

Je kiest ook het aantal kinderen (6 tot 30) en de speeltijd (15 of 30 minuten, of geen bel). Bij de bel wint de ploeg met de meeste punten; de lopende ronde telt dan niet mee.

Tactiekbord: kies bij Formaties een lijn, boog of pijl (of druk L, J of U) en sleep over het veld.

## Online tegen een vriend
1. Open het spel via je GitHub Pages-link (online werkt niet als je `index.html` gewoon van je schijf opent, en ook niet in Claude).
2. Kies **Online: host**, stel het spel in en klik op **Spel aanmaken**. Je krijgt een code van 4 letters en een link.
3. Je vriend opent de link, of kiest **Online: meedoen** en tikt de code in. Hij heeft geen account nodig.
4. Online is er geen pauze. Opstellen duurt hoogstens 60 seconden. Valt je vriend weg, dan neemt de computer zijn ploeg over tot hij terugkomt via dezelfde link.

De verbinding loopt rechtstreeks tussen jullie browsers (WebRTC via PeerJS). Op sommige netwerken, zoals school of mobiele data, lukt dat niet.

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
- `js/12-online.js`: online spelen tegen een vriend (PeerJS)
- `js/13-oefenen.js`: de rondleiding voor nieuwe spelers
- `js/14-mobiel.js`: knoppen en lade op gsm en tablet
- `js/15-lus.js`: de lus die alles 60 keer per seconde laat lopen

De bestanden worden in deze volgorde geladen. Ze delen hun variabelen, dus de volgorde in `index.html` niet veranderen.
