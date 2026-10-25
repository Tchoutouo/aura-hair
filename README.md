# Aurahair – site de commande

Site Next.js : catalogue des textures, calculateur de prix (détail / gros) avec transport au poids,
commande envoyée sur WhatsApp et par e-mail, et page `/admin` protégée pour gérer prix, réglages et commandes.

## Comment les prix sont calculés

- **Prix fournisseur** (fiches Silk Hair) + **marge** : gros +2 $, détail +5 $ par paquet de 100 g et par closure
  (= vos fiches « +2 » et « +3 »). Les prix fournisseurs ne sont jamais envoyés au navigateur.
- **Perruque (détail)** : jusqu'à 14" = 2 paquets, 16"–24" = 2,5 paquets, 26"–30" = 3 paquets, + la closure choisie.
- **Couleur claire** : Single Donor = supplément par paquet (+3 / +8 / +15 $) ; Virgin = colonne de prix dédiée + marge.
- **Montage de la perruque** (détail) : +10 $ par perruque, sans marge, réglable dans *Réglages*. Coché par défaut ;
  la cliente peut choisir « Je la monte moi-même ».
- **Transport** : poids total × 17 000 FCFA/kg (paquet = 100 g ; poids des closures réglable dans l'admin).
- **Affichage** : USD et FCFA, au taux réglé dans l'admin (600 par défaut — à ajuster).

Le site est en français (`/fr`) et en anglais (`/en`) ; un visiteur arrivant sur `/` est envoyé vers la langue de
son navigateur. L'admin (`/admin`) reste en français et liste aussi les demandes du formulaire de contact.

Autres fonctions :

- **Prochain envoi** : un bandeau en haut de chaque page donne la date du prochain envoi (chaque vendredi par défaut)
  et l'arrivée estimée (7 à 10 jours). Jour et délais réglables dans *Réglages → Envois*.
- **Suivi de commande** (`/fr/suivi`) : la cliente entre son numéro AH-… et son téléphone. Vous changez l'étape
  (payée, contrôlée, expédiée, arrivée, livrée) et ajoutez un message depuis l'onglet *Commandes* de l'admin.
  Le lien de suivi est ajouté au message WhatsApp de chaque commande.
- **Avis clientes** (`/fr/avis`) : publiés seulement après validation dans l'onglet *Avis* de l'admin ;
  les 3 derniers s'affichent sur l'accueil.
- **FAQ** (`/fr/faq`) : textes dans `src/i18n/fr.ts` et `en.ts` (`faq`).

Tout se modifie dans `/admin` → *Prix fournisseurs* et *Réglages*.

## Déployer sur Vercel

1. Créez un dépôt **vide** sur github.com, puis envoyez-y le code :
   `git remote add origin https://github.com/<vous>/aura-hair.git` puis `git push -u origin main`.
   Sur vercel.com : **Add New → Project → Import** ce dépôt (Next.js est détecté tout seul).
2. Dans **Settings → Environment Variables**, ajoutez `ADMIN_PASSWORD` (long, unique) et
   `ADMIN_SECRET` (chaîne aléatoire, ex. `openssl rand -hex 32`). Voir `.env.example`.
3. Dans **Storage → Marketplace**, ajoutez **Upstash Redis** et reliez-le au projet
   (sans lui, le site marche avec les prix par défaut mais l'admin ne peut pas enregistrer, les commandes ne sont pas
   gardées et les limites anti-abus ne valent que par serveur).
4. Pour les e-mails : créez un compte sur resend.com, ajoutez `RESEND_API_KEY` et `ORDER_EMAIL_TO`.
   Sans domaine vérifié, Resend n'envoie qu'à l'adresse de votre compte Resend.
5. Redéployez (Deployments → ⋯ → Redeploy), puis ouvrez `/admin` : l'avertissement « stockage non connecté » doit
   avoir disparu.

### Limites anti-abus (`src/lib/ratelimit.ts`)

- 5 commandes et 5 demandes de contact par connexion (adresse IP) toutes les 10 minutes.
- 5 tentatives de connexion admin par IP toutes les 15 minutes.
- Copie de commande au client (seulement si `RESEND_FROM` est défini) : 2 par adresse e-mail et par 24 h.

## En local

```bash
npm install
cp .env.example .env.local   # puis remplissez ADMIN_PASSWORD
npm run dev                  # http://localhost:3000
```

## Où changer quoi

| À changer | Fichier |
| --- | --- |
| Prix, marges, taux, transport, numéros | `/admin` (ou valeurs par défaut dans `src/lib/defaults.ts`) |
| Liste des textures | `src/lib/defaults.ts` + images dans `public/textures/` |
| Textes du site (français / anglais) | `src/i18n/fr.ts` et `src/i18n/en.ts` |
| Mise en page de l'accueil | `src/app/[lang]/page.tsx` |
| Photos et vidéos | fichiers dans `public/media/` + liste dans `src/lib/media.ts` + légendes dans `src/i18n/*.ts` (`media`) |
| Logique de calcul | `src/lib/pricing.ts` |
| Message WhatsApp / e-mail | `src/lib/order.ts` |
