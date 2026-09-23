# Framer Relay

Kleiner Vermittlungsdienst, der n8n erlaubt, Artikel automatisch in eine Framer-CMS-Collection zu schreiben und zu veröffentlichen (Framers Server-API läuft nicht über einfache REST-Calls, sondern über das `framer-api`-npm-Paket mit dauerhafter Verbindung – deshalb dieser kleine Zwischen-Server).

## 1. Deployment (Render.com, kostenlos)

1. Gehe auf https://render.com und logg dich ein (z.B. mit GitHub).
2. "New" → "Web Service".
3. Lade diesen Ordner hoch bzw. verbinde ein Git-Repo, das diesen Ordner enthält.
4. Build Command: `npm install`
5. Start Command: `npm start`
6. Unter "Environment" folgende Variablen setzen (NICHT im Chat mit mir teilen):
   - `FRAMER_API_KEY` = dein Framer Server-API-Key
   - `FRAMER_PROJECT_URL` = z.B. `https://framer.com/projects/<deine-id>`
   - `FRAMER_COLLECTION_NAME` = der Name deiner Blog/News-Collection in Framer (z.B. "Blog")
   - `RELAY_SHARED_SECRET` = ein von dir frei erfundenes, langes Passwort (z.B. per Passwort-Manager generiert) – schützt den Endpunkt
7. Deploy starten. Render gibt dir am Ende eine URL wie `https://framer-relay-xyz.onrender.com`.

## 2. Testen

```
curl -X POST https://DEINE-RENDER-URL/publish-article \
  -H "Content-Type: application/json" \
  -H "x-relay-secret: DEIN_RELAY_SHARED_SECRET" \
  -d '{"title":"Testartikel","body":"Das ist ein Test.","metaDescription":"Test"}'
```

Erwartete Antwort: `{"ok":true,"slug":"testartikel","deploymentId":"..."}`

## 3. Danach

Gib mir nur die Render-URL und bestätige, dass RELAY_SHARED_SECRET gesetzt ist (den Wert selbst nicht teilen — du kannst ihn direkt im n8n HTTP-Request-Node als Header hinterlegen). Ich baue dann im n8n-Workflow den finalen Schritt, der nach Freigabe automatisch diesen Endpunkt aufruft, statt die Homepage-Mail zu schicken.

## Feldnamen in Framer

Der Server sucht automatisch nach Feldern mit diesen Namen (Groß-/Kleinschreibung egal) in deiner Collection:
- Title
- Content / Body / Text / Article
- Meta Description / Excerpt / Summary (optional)
- Sources / Quellen (optional)
- Published Date / Date / Veröffentlicht (optional)

Falls deine Collection-Felder anders heißen, entweder in Framer umbenennen oder mir Bescheid geben, dann passe ich `server.js` an.
