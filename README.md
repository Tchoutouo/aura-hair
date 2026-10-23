# Aura Hair – site de commande

Site Next.js : catalogue des textures, calculateur de prix (détail / gros) avec transport au poids,
commande envoyée sur WhatsApp et par e-mail, et page `/admin` protégée pour gérer prix, réglages et commandes.

## Comment les prix sont calculés

- **Prix fournisseur** (fiches Silk Hair) + **marge** : gros +2 $, détail +5 $ par paquet de 100 g et par closure
  (= vos fiches « +2 » et « +3 »). Les prix fournisseurs ne sont jamais envoyés au navigateur.
- **Perruque (détail)** : jusqu'à 14" = 2 paquets, 16"–24" = 2,5 paquets, 26"–30" = 3 paquets, + la closure choisie.
- **Couleur claire** : Single Donor = supplément par paquet (+3 / +8 / +15 $) ; Virgin = colonne de prix dédiée + marge.
- **Transport** : poids total × 17 000 FCFA/kg (paquet = 100 g ; poids des closures réglable dans l'admin).
- **Affichage** : USD et FCFA, au taux réglé dans l'admin (600 par défaut — à ajuster).

Tout se modifie dans `/admin` → *Prix fournisseurs* et *Réglages*.

## Déployer sur Vercel

1. Mettez ce dossier sur GitHub (nouveau dépôt), puis sur vercel.com : **Add New → Project → Import** ce dépôt.
2. Dans **Settings → Environment Variables**, ajoutez au minimum `ADMIN_PASSWORD` (voir `.env.example`).
3. Dans **Storage → Marketplace**, ajoutez **Upstash Redis** et reliez-le au projet
   (sans lui, le site marche avec les prix par défaut mais l'admin ne peut pas enregistrer et les commandes ne sont pas gardées).
4. Pour les e-mails : créez un compte sur resend.com, ajoutez `RESEND_API_KEY` et `ORDER_EMAIL_TO`.
   Sans domaine vérifié, Resend n'envoie qu'à l'adresse de votre compte Resend.
5. Redéployez (Deployments → ⋯ → Redeploy).

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
| Textes de l'accueil | `src/app/page.tsx` |
| Logique de calcul | `src/lib/pricing.ts` |
| Message WhatsApp / e-mail | `src/lib/order.ts` |
