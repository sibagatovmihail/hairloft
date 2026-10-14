# The HairLoft by Colle & Roy · Website-Entwurf

Entwurf einer Website für den Friseursalon The HairLoft by Colle & Roy, Kopernikusstraße 3, 17036 Neubrandenburg.
Statisches HTML/CSS/JS ohne Build-Schritt.

**© 2026 Mykhailo Sibahatov. Alle Rechte vorbehalten.** Der Entwurf dient ausschließlich zur Ansicht. Kopieren, Veröffentlichen oder Weiterverwenden nur mit schriftlicher Vereinbarung, siehe [LICENSE](LICENSE). Namen, Logo, Fotos und Bewertungen des Salons sind ausgenommen und bleiben bei ihren Inhabern.

Es gibt zwei Entwürfe mit denselben Inhalten und denselben Formularen:

| Entwurf | Adresse | Gestaltung |
|---|---|---|
| A | https://sibagatovmihail.github.io/hairloft/ (auch `/v1/`) | Rasterdesign: Zellen auf einem 12er-Raster, Bebas Neue |
| B | https://sibagatovmihail.github.io/hairloft/v2/ | „Atelier“: klassisches Layout, eine serifenlose Schrift aus dem Logo (Montserrat), Bogenfotos, ruhige Scroll-Animationen |

Das Kästchen „Entwurf · A | B“ unten links wechselt auf jeder Seite zur gleichen Seite im anderen Entwurf.

| Seite | Inhalt |
|---|---|
| `index.html` | Startseite: Leistungen, Ergebnisse, Salon, Stimmen, Besuch |
| `termin.html` | Einstieg in die Terminanfrage (Direktlink, auch mit `?leistung=glossing`) |
| `karriere.html` | Recruiting: Vorteile, Ablauf, Kurzbewerbung |

Die Terminanfrage ist ein Fenster in vier Schritten (Leistung, Termin mit Tag und Uhrzeit in einem Schritt, Kontakt, Senden) und öffnet sich auf jeder
Seite über „Termin anfragen". Die Kurzbewerbung läuft genauso in vier Schritten (Über dich, Kontakt, Unterlagen, Senden).

| Seite | Inhalt |
|---|---|
| `impressum.html`, `datenschutz.html` | Rechtliches (Platzhalter markiert) |

## Lokal ansehen

```bash
python3 -m http.server 8791
```

Gemeinsame Blöcke (Header, Footer, Icon-Sprite, Terminanfrage) nur in `index.html` ändern, danach `python3 tools/build.py`.
Entwurf B liegt in `v2/` (eigenes CSS und Header/Footer in `v2/index.html`); Terminanfrage, Kurzbewerbung und die
Rechtstexte übernimmt `tools/build.py` aus Entwurf A, die Logik (`js/main.js`, `js/booking.js`) teilen sich beide.

## Woher die Inhalte stammen

Google-Unternehmensprofil, Instagram (@the_hairloft_by_colle_roy_) und Branchenverzeichnisse, Stand 03.10.2026:
Adresse, Telefon, Öffnungszeiten, Schwerpunkte, "Green HairLoft", Eröffnung am 01.10.2025, Bewertung 5,0 bei
47 Rezensionen, drei wörtlich zitierte Google-Rezensionen (gekürzt auf ganze Sätze), die Vorteile aus dem
Stellen-Post vom 28.08.2026 und die Fotos.

## Vor dem Livegang klären

- **Terminvergabe:** Der Salon vergibt Termine bisher nur telefonisch oder vor Ort. Die Seite sendet deshalb eine
  Anfrage, die telefonisch bestätigt wird. Wunschzeiten: alle 30 Minuten, letzter Beginn eine Stunde vor Schluss.
- **Formulare:** Web3Forms-Schlüssel eintragen (`WEB3FORMS-KEY` in der Terminanfrage in `index.html`, danach
  `python3 tools/build.py`, und in der Kurzbewerbung in `karriere.html`). Bis dahin wird der Versand nur simuliert.
  Vor dem Livegang entscheiden, ob stattdessen eine eigene Mail-Funktion (SMTP in der EU) genutzt wird: dann geht
  nichts an einen Drittanbieter.
- **Preise:** nicht bekannt, daher keine Preisliste. Der Text verweist auf die Beratung.
- **Texte, die wir formuliert haben** (bitte bestätigen oder korrigieren): Kurzbeschreibungen der Techniken, die drei
  Sätze zu "Green HairLoft", der Bewerbungsablauf in drei Schritten, "Kein Anschreiben nötig, Unterlagen optional",
  die Erfahrungsstufen im Bewerbungsformular.
- **Barrierefreiheit** (Parkplatz, Sitzgelegenheiten, genderneutrale Toilette): aus dem Google-Profil, bitte bestätigen.
- **Fotos:** aus Instagram (max. 640 px). Für die fertige Seite Originale verwenden, außerdem Fotos vom Innenraum.
- **Impressum und Datenschutz:** Inhaber, Rechtsform, USt-ID, Kammer, Hoster ergänzen und rechtlich prüfen.
- **Bewerbung mit Anhängen:** Das Formular hat ein eigenes Dateifeld (bis zu 3 Dateien, je 5 MB; PDF, JPG, PNG, Word; Feldname `attachment`). Web3Forms nimmt Anhänge nur im Bezahltarif an, Limits und Mehrfach-Upload vor dem Livegang testen. Alternative: eigene SMTP-Funktion. Bewerbungsunterlagen sind besonders sensibel: Auftragsverarbeitung und Datenschutztext (Abschnitt Bewerbungen) mit dem Salon abstimmen.
- `noindex` auf allen Seiten entfernen, sobald die Seite live geht.

## Schriften

Bebas Neue (Dharma Type, SIL Open Font License; Überschriften) und Hasköy (Ertekin, SIL Open Font License; Fließtext), beide lokal eingebunden (`fonts/`).
Entwurf B: Montserrat (SIL Open Font License, die serifenlose Schrift des Logos), lokal in `v2/fonts/`.
Lenis (MIT-Lizenz) für das weiche Scrollen, lokal in `v2/js/`.
