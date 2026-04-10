# Elokuva-analytiikka-sovellus

Tämä on data-analytiikan sovellus, joka tutkii elokuvien budjetin, tuottojen ja arvostelujen välisiä korrelaatioita ja taloudellisia realiteetteja.

🚀 **Kokeile sovellusta selaimella:** [https://johansamoila1.github.io/Data-analytiikka/](https://johansamoila1.github.io/Data-analytiikka/)

## Projektin tarkoitus

Sovellus mahdollistaa laajan elokuvadatan analysoinnin ja visualisoinnin interaktiivisesti. Käyttäjä voi suodattaa elokuvia vuoden, genren ja budjetin perusteella. Sovellus soveltaa elokuva-alan todellisia talousstandardeja, kuten "2.5x Break-even" -sääntöä ja teatterijakoa (Theatrical Split), ja esittää datan tilastollisesti merkittävillä tavoilla (esim. käyttäen mediaania keskiarvon sijaan voimakkaasti vinoutuneen datan takia).

## Datalähteet

Laskentamoottori käyttää kahta eri datalähdettä varmistaakseen tilastollisen eheyden:
- **Laajennettu data (Extended):** Yli 12 000 elokuvaa laajoihin taloudellisiin trendi- ja budjettianalyyseihin.
- **Arvosteludata (Rated):** Yli 2 600 elokuvaa, joilla on kattavat arvosanat, laatuanalyyseihin ja regressiomallinnuksiin.

Data on alunperin koottu muun muassa seuraavista lähteistä:
- **TMDB + IMDB Merged Movies Dataset**
- **Rotten Tomatoes movies and critic reviews dataset**
- **Letterboxd ratings (1.4M)**
- **16000+ Movies 1910-2024 (Metacritic)**

## Analyysit

| Analyysi | Kuvaus |
|----------|--------|
| **Yleisnäkymä** | Budjetti vs Tuotto -sirontakuvio logaritmisilla akseleilla + korrelaatiomatriisi eri arvosteluplatformien välillä. |
| **Genret** | Tuottokerroin (Multiple) ja ROI-analyysi genreittäin (mediaani, riskit). |
| **Arvostelut** | Arvosanojen ja kannattavuuden vertailu arvosteluplatformeittain. |
| **Trendit** | Vuosittaiset budjetti- ja arvosanatrendit sekä tuottojen kehitys. |
| **Regressio** | Kolme matemaattista mallia (esim. Arvosana vs. Tuottokerroin, Budjetti vs. Tuottokerroin), jotka mittaavat pääoman tehokkuutta. |
| **Kannattavuus** | ROI-jakauma ja elokuvien jakautuminen rakenteellisiin budjettiluokkiin (Indie, Mid-budget, Blockbuster). |
| **Dokumentaatio** | Kattava kuvaus sovelluksen käyttämistä matemaattisista malleista ja alan taloudellisista realiteeteista. |

## Teknologiat

- **Angular 21** - Frontend-framework
- **Chart.js** - Visualisoinnit
- **Angular Material** - Käyttöliittymäkomponentit

## Käyttö paikallisesti

```bash
# Asenna riippuvuudet
npm install

# Käynnistä kehitysympäristö (esikatselu: http://localhost:4200)
npm start

# Rakenna tuotantoversio
npm run build
```

## Huomiot
- Pienbudjetin elokuvat (<$10k) on suodatettu pois oletusnäkymistä laadun varmistamiseksi.
- Tuottokerroin (Multiple) = Lipputulot / Budjetti.
- Projektissa on painotettu, modernia Angular (Standalone Components) arkkitehtuuria ja selkeää käyttöliittymää mobiililaitteille ja työpöydälle.
