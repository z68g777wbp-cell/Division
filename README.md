# Teilen mit Rest – Lernspiel

Ein statisches, für GitHub Pages geeignetes Lernspiel (HTML, CSS und JavaScript) für die Volksschule.

## Starten / auf GitHub hochladen
1. ZIP entpacken.
2. `index.html`, `style.css`, `script.js` und `README.md` direkt in das Stammverzeichnis des GitHub-Repositories hochladen.
3. In GitHub unter **Settings → Pages** die Bereitstellung über den Branch `main` und Ordner `/ (root)` aktivieren.
4. Die Seite öffnen und auf einem Desktop oder iPad testen.

Die ZIP-Datei selbst ist kein direkt ausführbarer GitHub-Pages-Inhalt. Bitte die enthaltenen Dateien entpackt hochladen.

## Funktionen
- Vier Stufen zur Division mit Rest.
- Ziffernfeld für alle Eingaben; automatische Kontrolle nach 250 ms.
- Punktebilder mit 10er-Zeilen und 5er-Gliederung.
- Level 1: Punkte können vom Kind zu Kegeln gezogen werden; beim Messen färbt das Kind Punkte mit neun Farbpinseln.
- Level 2: Teilen-/Messen-Animationen werden automatisch dargestellt.
- Sprachunterstützung über die Browser-Sprachausgabe, falls verfügbar.
- 20 bewertete Aufgaben pro Runde; eine Runde kann über die offene Tür beendet werden.
- Erfassung von Gesamtdauer, Dauer pro Aufgabe, Erstversuchsergebnis, Hilfeverwendung und Rechenaufgabe.
- Ergebnisse werden lokal im Browser gespeichert und können als JSON exportiert werden.
- Ergebnisdaten enthalten `schemaVersion`, `gameId`, `sessionId`, optionalen `studentId` und einzelne Aufgabeneinträge. Dieses Format ist als Integrationspunkt für eine spätere Lernumgebung gedacht.

## Hinweise zur Integration
Aktuell gibt es **keine echte Anmeldung und keine serverseitige Lehrpersonenübersicht**. Der optionale Kind-Code dient nur zur Zuordnung innerhalb der exportierten Daten. Für eine spätere größere Lernumgebung sollte die Plattform eine authentifizierte `studentId` übergeben und die Ergebnisse an eine abgesicherte API senden, statt sich auf `localStorage` oder manuelle JSON-Downloads zu verlassen. Es werden keine Zugangsdaten benötigt oder gespeichert.

## Testhinweise
- Die Eingabe erfolgt über das integrierte Ziffernfeld.
- Die Zeit läuft ab Spielstart und wird bei einer vorzeitigen Beendigung ebenfalls erfasst.
- Der Browser muss JavaScript aktiviert haben.
- Die Sprachausgabe hängt von Betriebssystem, Browser und verfügbaren Stimmen ab.


## Anpassung nach Bildvorlage
In der Spielansicht werden keine schriftlichen Erklärungen oder Hilfetexte eingeblendet; Hinweise erfolgen über Sprachausgabe. Die Zuordnung in Level 1 erfolgt manuell durch das Kind. Bitte vor dem Unterrichtseinsatz auf den verwendeten Geräten praktisch testen.
