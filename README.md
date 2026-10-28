# Teilen mit Rest – Lernspiel

Browserbasiertes Lernspiel für vier Levels. Keine Installation oder Build-Schritte erforderlich.

## Start
- `index.html` direkt öffnen oder die Dateien in ein GitHub-Repository laden und GitHub Pages aktivieren.
- Die Anwendung läuft lokal im Browser; Sprachausgabe nutzt die Web Speech API des Browsers.
- Für die Eingabe wird das integrierte Ziffernfeld verwendet.

## Dateien
- `index.html` – Spielfeld und Bedienelemente
- `style.css` – responsives Layout
- `script.js` – Aufgabenlogik, Auswertung, Zeitmessung und Ergebnisexport

## Ergebnisdaten / spätere Lernumgebung
Jede beendete Runde wird als JSON in `localStorage` unter `teilenMitRestResults` gespeichert und kann über die Export-Schaltfläche heruntergeladen werden. Das Ergebnisobjekt enthält `schemaVersion`, `gameId`, `sessionId`, `studentId` (derzeit `null`), Level, Start-/Endzeit, Gesamtdauer, Anzahl richtiger/falscher Erstversuche und die einzelnen Aufgabendatensätze mit Dauer und Erstversuchsergebnis.

Für die spätere Anmeldung und Lehrpersonenübersicht kann die umgebende Lernplattform `studentId` beim Start setzen und die exportierten Ergebnisobjekte an einen authentifizierten Server-Endpunkt übermitteln. In dieser eigenständigen Version werden noch keine Benutzerkonten oder Serverdaten angelegt.

## Prüfungen
Die Dateien sind ohne externe Laufzeitbibliotheken umgesetzt. Die Spielabläufe wurden mit automatisierten Browser-Smoke- und Integrationstests geprüft; Details sind im Übergabebericht im Chat angeführt.
