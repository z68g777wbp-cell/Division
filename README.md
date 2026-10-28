# Teilen mit Rest – Lernspiel

Browserbasiertes Lernspiel für vier Levels. Keine Installation und keine Build-Schritte erforderlich.

## Start und GitHub Pages
1. Die vier Projektdateien `index.html`, `style.css`, `script.js` und `README.md` in das Stammverzeichnis eines GitHub-Repositories hochladen.
2. Unter **Settings → Pages** die Veröffentlichung aus dem gewünschten Branch und Verzeichnis aktivieren.
3. Die veröffentlichte `index.html` im Browser öffnen. Die Web Speech API des Browsers wird für die Sprachanweisungen verwendet.

## Bedienung
- Level 1: Punkte selbst auf die Kegel ziehen oder mit Farbpinsel Gruppen markieren.
- Level 2: Punkte werden beim Teilen bzw. Messen sichtbar und schrittweise gruppiert.
- Level 3: Zuerst das nächstkleinere Vielfache bestimmen; danach werden Ergebnis und Rest eingegeben.
- Level 4: Produkt, Ergebnis und Rest werden in drei getrennten Eingabefeldern erfasst.
- Eingaben erfolgen über das eingebaute Ziffernfeld.

## Ergebnisdaten und Datenschutz
Eine beendete Runde wird als JSON in `localStorage` unter `teilenMitRestResults` gespeichert und kann über die Export-Schaltfläche heruntergeladen werden. Enthalten sind unter anderem Sitzungskennung, Level, Start-/Endzeit, Gesamtdauer, Erstversuchsergebnisse sowie Dauer und Ergebnis je Aufgabe. Die eigenständige Spielversion erfasst keine Namen und übermittelt keine Daten an einen Server.

`studentId` ist derzeit `null`. Benutzerkonten und eine Lehrpersonenübersicht sind nicht Bestandteil dieses eigenständigen Spiels; die Ergebnisstruktur ist für eine spätere Anbindung an eine authentifizierte Lernplattform vorgesehen.

## Testprotokoll
Die Dateien wurden mit `node --check` und automatisierten Chromium-/Playwright-Browsertests geprüft. Geprüft wurden:
- Start, Levelwechsel, Auswahl von Teilen/Messen und Fehlerfreiheit der Browserkonsole
- Level 1: unvollständige Verteilung wird zurückgewiesen; korrekte Kegelverteilung akzeptiert; fehlerhafte Farbgruppe wird weiß zurückgesetzt; korrekte Farbgruppen und Rest werden akzeptiert
- Level 2: Kegel werden angelegt und Punkte schrittweise verteilt; Messen färbt Gruppen schrittweise; keine gesprochene Aufforderung „Teile die Punkte gleichmäßig auf“
- Level 3: z-Feld anfangs gesperrt, nach richtigem Produkt freigeschaltet; Sprachausgabe verwendet die konkreten Zahlen
- Level 4: sichtbare Multiplikationsoperatoren/-labels ausgeblendet; Produktfeld unter der Dividend-Zahl ausgerichtet; drei Eingabefelder werden nacheinander freigeschaltet
- vollständiger 20-Aufgaben-Durchgang mit korrekter Auswertung und Zeitdaten
- falscher Erstversuch, verzögerte Wiederholung ohne doppelte Zählung und korrekte Erstversuchsstatistik
- responsives Layout bei 390×844, 1024×768 und 1366×768 ohne äußeres Seiten-Scrollen
- 20 Aufgaben pro Runde ohne doppelte Dividend/Divisor-Kombination

Die Sprachausgabe hängt von Browser und Betriebssystem ab. Die Daten bleiben lokal, bis sie manuell exportiert werden.


## Version 9 – gezielte Korrekturen
- Das Punktefeld verwendet nun ein stabiles Raster ohne überlappende Sonderabstände.
- Ein fehlendes `zLabel`-Element wurde ergänzt, damit der Aufgabenwechsel ohne JavaScript-Fehler funktioniert.
- In Level 3 bleibt das Eingabefeld für z zunächst gesperrt und wird nach richtiger Produkteingabe freigeschaltet; erst nach korrekter z-Eingabe folgt die Restfrage.
- In Level 4 ist das zusätzliche z-Eingabefeld ausgeblendet; die Folge bleibt Produkt → z → Rest.
- Details zu den automatisierten Prüfungen stehen in `TESTPROTOKOLL.md`.
