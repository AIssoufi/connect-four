## Installer le projet
`
npm install
`

## Lancer le projet 
`
npm run start
`

## Comment jouer avec l'interface graphique

1. Lancer le serveur `npm run start`

2. Saisir `http://localhost:3000` sur votre navigateur et c'est tout!

<img src="https://gitlab.com/issoufi/puissance-4/blob/master/screenshots/screenshot1.png" alt="UI">


## Comment jouer via l'API

`GET /api/play?playerid=red&column=3`

Les paramètres :
> `playerid` ne peut avoir que deux valeurs: `red` et `yellow`.
> `column` prend des valeurs entre `1` et `7`.


<img src="https://gitlab.com/issoufi/puissance-4/blob/master/screenshots/screenshot1.png" alt="API">

## Connaitre le statut de la partie

`GET /api.stauts`