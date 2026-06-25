---
num: "01"
slug: "01-figma-handoff-pour-le-code"
title: "Préparer une maquette Figma pour le code."
lede: "Un dev ou une IA qui intègre ta maquette ne devine pas. Il lit ce que tu as construit."
publishDate: 2026-05-18
authors:
  - "FIELD®"
  - "Stan H."
readingTime: 8
categories:
  - guides
  - design
nextSlug: "02-claude-pour-les-designers"
tags:
  - "Figma"
  - "Handoff"
  - "Checklist"
closing: "Tu ne livres pas un visuel. Tu livres une spécification visuelle exécutable. Plus elle est rigoureuse, moins le dev (et l'IA) ont à deviner."
sections:
  - num: "01"
    kicker: "AUTO LAYOUT"
    title: "Auto Layout partout, toujours."
    body: "Deux éléments ou plus dans un conteneur passent en Auto Layout (Shift+A). Tu définis direction, gap, padding, alignement, resizing. Pas de groupe."
    doItems:
      - "Frame avec Cmd+Alt+G, puis Auto Layout avec Shift+A."
      - "Définis direction, gap, padding explicitement."
      - "Choisis le resizing par axe : Fill, Hug, Fixed."
    dontItems:
      - "Cmd+G (Group). Pas de layout exploitable, positions absolues garanties."
    why: "Auto Layout devient du flexbox ou du grid sans traduction. Sans, le dev infère les espacements à partir de coordonnées X/Y. Il se trompe."

  - num: "02"
    kicker: "COMPONENTS"
    title: "Composants pour tout ce qui se répète."
    body: "Un élément apparaît deux fois ? Cmd+Alt+K. Il a des variations ? Variants avec props nommées (size, intent, state, hasIconLeft)."
    doItems:
      - "Cmd+Alt+K pour transformer en Component."
      - "Variants avec props sémantiques. Un seul Button, plusieurs intents."
    dontItems:
      - "Dupliquer 12 instances libres d'un même élément."
      - "Créer ButtonPrimary, ButtonSecondary, ButtonGhost comme 3 composants distincts."
    why: "Un Component avec Variants se traduit en un composant Vue ou React. Une signature, plusieurs apparences. Sans, le dev code la même chose trois fois."

  - num: "03"
    kicker: "VARIABLES"
    title: "Variables Figma pour les tokens."
    body: "Toute valeur réutilisée devient une Variable. Hiérarchie sémantique en slash : color/brand/primary/600, space/inline/md, radius/control."
    doItems:
      - "Une variable color/brand/primary/500 partout."
      - "Nomme par usage, pas par valeur (color/surface/elevated, pas color/grey-200)."
    dontItems:
      - "#FF6B00 en dur dans 30 layers."
      - "Couleurs ad hoc non documentées."
    why: "Les variables Figma se mappent un pour un sur tes design tokens (CSS custom properties, Tailwind config). Un hex en dur dans Figma, un hex en dur dans le CSS."

  - num: "04"
    kicker: "TEXT STYLES"
    title: "Text Styles centralisés."
    body: "Toute typo a un Text Style nommé. Une échelle sémantique : display/xl, heading/h1, body/md, label/sm, mono/tag."
    doItems:
      - "Un Text Style par rôle. Tu l'appliques, tu ne surcharges pas."
      - "Garde les variantes italiques nommées (section/title-italic) si tu utilises Light Italic en éditorial."
    dontItems:
      - "font-size 17px ad hoc dans un calque."
      - "Mélanger 5 valeurs de tracking sans système."
    why: "Les Text Styles deviennent des classes Tailwind ou des classes utilitaires. Sans, le dev recopie chaque taille à la main, et il loupe les tracking."

  - num: "05"
    kicker: "NOMMAGE"
    title: "Noms de layers sémantiques."
    body: "Le nom décrit le rôle, pas la forme. section/Hero, nav/Primary, card/Product, CTA-primary."
    doItems:
      - "Nomme par rôle métier."
      - "Préfixe par catégorie : nav/, section/, card/, list/."
    dontItems:
      - "Frame 247, Rectangle 8, Group 12 copy 3."
      - "Garder les noms par défaut générés par Figma."
    why: "L'IA récupère ces noms via get_metadata. Frame 247 devient un div anonyme. section/Hero devient un section avec class hero."

  - num: "06"
    kicker: "ÉTATS UI"
    title: "États interactifs documentés."
    body: "Pour chaque élément cliquable : default, hover, active, focus (avec anneau visible), disabled, loading. En Variants, ou en frames dédiées."
    doItems:
      - "Documente les 6 états dans des Variants state=default|hover|active|focus|disabled|loading."
      - "Anneau de focus visible. L'a11y l'exige."
    dontItems:
      - "Ne montrer que le default."
      - "Oublier focus. Tu bloques la conformité."
    why: "Sans les états, le dev invente une transition au pifomètre. Avec, il code ce que tu as dessiné, focus inclus."

  - num: "07"
    kicker: "ÉTATS DATA"
    title: "États empty, loading, error."
    body: "Pour chaque vue qui affiche de la donnée : un état vide, un état de chargement, un état d'erreur. Ces trois états pèsent 30 à 50 % du code livré."
    doItems:
      - "Empty avec un message et un CTA pour combler."
      - "Loading avec un skeleton ciblé, pas un spinner générique."
      - "Error avec un message et un retry."
    dontItems:
      - "Livrer uniquement le happy path rempli."
      - "Du Lorem ipsum sans annoter que c'est dynamique."
    why: "Le dev passe la moitié de son temps sur ces états. S'ils ne sont pas dessinés, il bricole, et le rendu dérive du tien."

  - num: "08"
    kicker: "ANNOTATIONS"
    title: "Annotations Figma natives."
    body: "Le panneau Annotations sert à documenter sources d'API, conditions d'affichage, comportements non visuels (debounce, aria-live)."
    doItems:
      - "Source : GET /api/users."
      - "Visible si cart.items.length > 0."
      - "Debounce 300ms sur input."
      - "aria-live polite pour lecteur d'écran."
    dontItems:
      - "Laisser les comportements non visuels dans Slack ou Notion."
      - "Espérer que le dev devine la logique conditionnelle."
    why: "L'IA lit tes annotations via get_design_context. C'est ton PRD inline, attaché au pixel."

  - num: "09"
    kicker: "RESPONSIVE"
    title: "Breakpoints sur des frames séparées."
    body: "Mobile (375 ou 430), Tablet (768), Desktop (1440 ou 1512). Côte à côte ou sur pages distinctes. Mêmes nœuds, mêmes noms."
    doItems:
      - "Une frame par breakpoint."
      - "Aligne les noms d'un breakpoint à l'autre pour la comparaison automatique."
      - "Sur mobile, prévois les touch targets à 44×44 minimum (WCAG 2.5.5)."
    dontItems:
      - "Ne livrer qu'un seul breakpoint."
      - "Renommer les nœuds différemment selon les frames."
    why: "Le dev (et l'IA) inférent les règles responsives par diff entre breakpoints. Sans, il faut redemander ou deviner."

  - num: "10"
    kicker: "FILE STRUCTURE"
    title: "Structure de fichier propre."
    body: "Cover, Foundations (variables, text styles, effects), Components (atoms, molecules, organisms), Flows par device, States, Archive. Une page par couche."
    doItems:
      - "Une page Cover, une page Foundations."
      - "Sépare Components et Flows."
      - "Une page States pour les variations data."
    dontItems:
      - "Tout mélanger sur une seule page."
      - "Garder des layers cachés ou des brouillons en place."
    why: "Une structure prévisible permet à l'IA de naviguer rapidement. Et au dev de ne pas chercher où sont les choses à 18h."
---

**Niveau** 🟢 Fondamentaux · ~8 min · pour designers UI/UX qui livrent à un dev (humain ou IA)

## L'histoire qu'on se raconte

> *« Le dev va comprendre, c'est juste un padding à ajuster. »*
> *« On verra les états hover plus tard. »*
> *« Le design system gère les couleurs. »*

Sauf que le dev (humain ou IA) ne va pas comprendre tout seul. Il lit ce que tu as écrit dans le fichier. Si tu as dessiné une couleur en dur, il code une couleur en dur. Si tu as utilisé `Group` au lieu de `Frame Auto Layout`, il devine les espacements. Et il se trompe.

Le handoff n'est pas un acte de communication. C'est un acte de programmation. Tu programmes en Figma, et chaque calque, chaque nom, chaque variable est une instruction.

## Ce qui change quand une IA lit ta maquette

Quand Claude via MCP Figma, Cursor ou un outil équivalent ouvre ton fichier, il appelle :

```
get_metadata          → arbre des layers (id, type, nom)
get_screenshot        → rendu visuel
get_design_context    → structure, styles, composants
get_variable_defs     → tokens couleurs et espacements
```

Tout ce qu'il reçoit, c'est ce que tu as construit. Pas ce que tu avais en tête. Pas de FaceTime, pas de "tu vois ce que je veux dire".

| Ce que tu fais | Ce que l'IA voit | Ce que ça produit |
|---|---|---|
| Calque `Frame 247` | Nœud anonyme | `<div>` sans nom |
| Couleur `#FF6B00` en dur | Pas de variable | Hex en dur dans le CSS |
| Groupe `Cmd+G` | Pas de layout | Position absolue |
| Bouton dupliqué 12× | 12 nœuds non liés | 12 implémentations |
| Composant `Button` + Variants | Une signature claire | Un composant Vue propre |
| Variable `color/brand/primary` | Token nommé | Token dans la config |

## Ce qu'on a appris en construisant ce blog

Cette série est elle-même issue d'un fichier Figma. En refondant les frames responsive du chapitre 01, on a découvert quelques règles non négligeables.

**Instancie tes masters partout.** Si tu as un `SectionHead`, un `DoCard`, un `PullQuote`, un `ScrollProgressBar` dans ta page Components, tu n'as aucune raison de redessiner ces blocs en inline dans tes flows. Quand on a refait la passe propre, on a remplacé une demi-douzaine de "fake components" par les vraies instances. Le dev récupère une seule signature.

**Les italiques éditoriales ont leur propre style.** L'Inter Light Italic à 36 ou 26 pixels n'est pas dans le ramp standard (display/, heading/, body/). Si tu en utilises, crée des styles dédiés (`section/title-italic`, `pullquote/text-italic`). Sinon, chaque instance refait sa typo à la main, et l'IA voit du bruit.

**Les rules sont des LINE, pas des RECTANGLE 1px.** Petit détail, gros gain à l'extraction. Le LINE se traduit naturellement en `<hr>` ou `border-top` ; le rectangle de 1px de haut, en `<div>` plat.

**Les touch targets carousel font 44 minimum sur mobile, 56 sur tablet.** Tu peux mettre le glyphe à 16, peu importe : c'est la frame parent qui compte pour l'a11y. Et pour le pouce.

## Checklist avant chaque handoff

- URL copiée avec node-id (clic droit, `Copy link to selection`).
- Auto Layout sur la frame partagée.
- Zéro `Frame 247` dans les noms.
- Couleurs en Variables.
- Espacements en Variables.
- Typo en Text Styles.
- Composants réutilisés sont des Components.
- Variants documentés.
- États `hover` / `focus` / `disabled` présents.
- États `empty` / `loading` / `error` présents si data-driven.
- Annotations sur les comportements non visuels.
- Layers cachés ou brouillons supprimés.
- Icônes en vectoriel.

## Les 6 erreurs les plus coûteuses

### 1. Group au lieu de Frame
**Coût** : pas d'Auto Layout possible, positions absolues partout.
**Fix** : `Cmd + Alt + G` (Frame Selection), puis `Shift + A`.

### 2. Icônes aplaties
**Coût** : impossible d'extraire le SVG, image bitmap à uploader.
**Fix** : icônes en vectoriel, centralisées en composants.

### 3. Layers fantômes
**Coût** : bruit dans l'extraction, markup mort généré.
**Fix** : supprime, ou déplace dans `🗑 Archive`.

### 4. Effets empilés
**Coût** : reproduction CSS approximative, perf dégradée.
**Fix** : simplifie. Si non reproductible, exporte en image.

### 5. Contenu en dur
**Coût** : "Lorem ipsum" et "John Doe" arrivent littéralement dans le code.
**Fix** : annote chaque texte dynamique (`{user.fullName}`).

### 6. Screenshot de composant
**Coût** : l'IA reproduit pixel par pixel au lieu de réutiliser ton composant.
**Fix** : toujours utiliser le vrai composant, ou un placeholder annoté.

## En cas de doute

Demande-toi : *« Si je supprimais cette maquette, est-ce que le dev pourrait reconstruire le résultat exact à partir de ce qui reste ? »*

Si oui, c'est explicite. Si non, il manque une annotation, un variant ou un état.

## À retenir

Tu ne livres pas un visuel. Tu livres une spécification visuelle exécutable. Plus elle est rigoureuse, moins le dev (et l'IA) ont à deviner. Et moins ils devinent, plus le résultat ressemble à ce que tu avais en tête.

Prochaine étape : maintenant que ton fichier Figma est propre, apprends à le faire lire par Claude pour générer ton code. → [chapitre 02](/blog/02-claude-pour-les-designers).
