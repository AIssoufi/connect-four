## Vidéo de démonstration

[![IMAGE ALT TEXT HERE](http://img.youtube.com/vi/T-oEjFyau7A/0.jpg)](http://www.youtube.com/watch?v=T-oEjFyau7A)

## Installer le projet
`
npm install
`

## Lancer le projet en local
`
npm run start
`

## Jouer avec l'interface graphique

1. Lancer le serveur `npm run start`

2. Saisir `http://localhost:3000` sur votre navigateur et c'est tout!

<img src="https://gitlab.com/issoufi/puissance-4/raw/master/screenshots/screenshot2.png" alt="UI">


## Jouer via l'API

`GET /api/play?playerid=red&column=3`

Les paramètres :
> `playerid` ne peut avoir que deux valeurs: `red` et `yellow`.
> `column` prend des valeurs entre `1` et `7`.


<img src="https://gitlab.com/issoufi/puissance-4/raw/master/screenshots/screenshot1.png" alt="API">

## Connaitre le statut de la partie

`GET /api.stauts`