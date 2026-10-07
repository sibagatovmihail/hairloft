# The HairLoft by Colle & Roy · Website-Entwurf

Entwurf einer Website für den Friseursalon The HairLoft by Colle & Roy, Kopernikusstraße 3, 17036 Neubrandenburg.
Statisches HTML/CSS/JS ohne Build-Schritt.

**© 2026 Mykhailo Sibahatov. Alle Rechte vorbehalten.** Der Entwurf dient ausschließlich zur Ansicht. Kopieren, Veröffentlichen oder Weiterverwenden nur mit schriftlicher Vereinbarung, siehe [LICENSE](LICENSE). Namen, Logo, Fotos und Bewertungen des Salons sind ausgenommen und bleiben bei ihren Inhabern.

| Seite | Inhalt |
|---|---|
| `index.html` | Startseite: Leistungen, Ergebnisse, Salon, Stimmen, Besuch |
| `termin.html` | Terminanfrage: Leistung, Stylist, Kalender, Wunschzeit, Kontakt |
| `karriere.html` | Recruiting: Vorteile, Ablauf, Kurzbewerbung |
| `impressum.html`, `datenschutz.html` | Rechtliches (Platzhalter markiert) |

## Lokal ansehen

```bash
python3 -m http.server 8791
```

Gemeinsame Blöcke (Header, Footer, Icon-Sprite) nur in `index.html` ändern, danach `python3 tools/build.py`.

## Woher die Inhalte stammen

Google-Unternehmensprofil, Instagram (@the_hairloft_by_colle_roy_) und Branchenverzeichnisse, Stand 03.10.2026:
Adresse, Telefon, Öffnungszeiten, Schwerpunkte, "Green HairLoft", Eröffnung am 01.10.2025, Bewertung 5,0 bei
47 Rezensionen, drei wörtlich zitierte Google-Rezensionen (gekürzt auf ganze Sätze), die Vorteile aus dem
Stellen-Post vom 28.08.2026 und die Fotos.

## Vor dem Livegang klären

- **Terminvergabe:** Der Salon vergibt Termine bisher nur telefonisch oder vor Ort. Die Seite sendet deshalb eine
  Anfrage, die telefonisch bestätigt wird. Wunschzeiten: alle 30 Minuten, letzter Beginn eine Stunde vor Schluss.
- **Formulare:** Web3Forms-Schlüssel eintragen (`WEB3FORMS-KEY` in `termin.html` und `karriere.html`). Bis dahin
  wird der Versand nur simuliert.
- **Preise:** nicht bekannt, daher keine Preisliste. Der Text verweist auf die Beratung.
- **Texte, die wir formuliert haben** (bitte bestätigen oder korrigieren): Kurzbeschreibungen der Techniken, die drei
  Sätze zu "Green HairLoft", der Bewerbungsablauf in drei Schritten, "Kein Anschreiben, kein Lebenslauf",
  die Erfahrungsstufen im Bewerbungsformular.
- **Barrierefreiheit** (Parkplatz, Sitzgelegenheiten, genderneutrale Toilette): aus dem Google-Profil, bitte bestätigen.
- **Fotos:** aus Instagram (max. 640 px). Für die fertige Seite Originale verwenden, außerdem Fotos vom Innenraum.
- **Impressum und Datenschutz:** Inhaber, Rechtsform, USt-ID, Kammer, Hoster ergänzen und rechtlich prüfen.
- `noindex` auf allen Seiten entfernen, sobald die Seite live geht.

## Schriften

Bebas Neue (Dharma Type, SIL Open Font License; Überschriften) und Hasköy (Ertekin, SIL Open Font License; Fließtext), beide lokal eingebunden (`fonts/`).
