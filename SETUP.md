# Firebase instellen (eenmalig, ±5 minuten)

1. Ga naar https://console.firebase.google.com en maak een project (Analytics mag uit).
2. **Web-app toevoegen:** Project overview → `</>` → geef een naam → kopieer het `firebaseConfig`-object
   en plak de waarden in `firebase-config.js`.
3. **Authentication** → Get started → Sign-in method → **Email/Password** aanzetten (de tweede schakelaar, "Email link", niet nodig).
4. **Firestore Database** → Create database → kies een regio (bv. `eur3`) → start in production mode.
   Ga dan naar het tabblad **Rules**, plak de inhoud van `firestore.rules` en klik **Publish**.
5. **Authentication → Settings → Authorized domains:** voeg `jouwnaam.github.io` toe.
6. Upload alle bestanden naar je GitHub-repo (zie eerder: Settings → Pages → branch `main`, map `/root`).

## Hoe het werkt
- Gebruikersnaam + korte code (min. 4 tekens). Firebase wil minstens 6 tekens, dus de app voegt intern
  een vast achtervoegsel toe aan je code. Gebruikersnamen worden intern als `naam@beurzen.game` opgeslagen (niet echt verstuurd).
- Er is geen "wachtwoord vergeten": wie zijn code kwijt is, maakt een nieuwe account.
- Een spel heeft een code van 4 tekens. Iedereen logt in op zijn eigen toestel en voert die code in.
- Elk verlies wordt als apart document in `losses` bewaard, daarom kan "Mijn verliezen" het totaal over alle spellen tonen.
