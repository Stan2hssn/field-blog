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
closing: "Le designer ne livre pas un visuel. Il livre une spécification visuelle exécutable. Plus elle est rigoureuse, moins le dev (et l'IA) ont à deviner — et plus le résultat ressemble à ce que tu avais en tête."
sections:
  - num: "01"
    kicker: "AUTO LAYOUT"
    title: "Auto Layout partout, toujours."
    body: "Tout conteneur de 2 éléments ou plus passe en Auto Layout (Shift+A). Définis direction, gap, padding, alignement, et resizing — Fill container, Hug contents ou Fixed."
    doItems:
      - "Cmd+Alt+G pour créer une Frame, puis Shift+A pour Auto Layout"
      - "Définir direction, gap, padding explicitement"
      - "Choisir le resizing par axe (Fill / Hug / Fixed)"
    dontItems:
      - "Cmd+G (Group) — pas de layout exploitable, positions absolues garanties"
    why: "Auto Layout se traduit directement en flexbox ou grid. Sans, le dev doit deviner les espacements à partir de positions absolues — il se trompe systématiquement."

  - num: "02"
    kicker: "COMPONENTS"
    title: "Composants pour tout ce qui se répète."
    body: "Dès qu'un élément apparaît 2 fois ou plus, transforme-le en Component (Cmd+Alt+K). Variations visuelles → Variants avec props nommées (size, intent, state, hasIconLeft…)."
    doItems:
      - "Cmd+Alt+K pour transformer en Component"
      - "Variants avec props sémantiques (size, intent, state, hasIconLeft…)"
      - "Un seul Button avec variant intent, jamais 3 composants distincts"
    dontItems:
      - "Dupliquer 12 instances libres d'un même élément"
      - "Créer ButtonPrimary, ButtonSecondary, ButtonGhost comme 3 composants séparés"
    why: "Un Component avec Variants = une signature claire pour le dev = un seul composant React ou Vue à coder, vs autant d'implémentations qu'il y a de duplications."

  - num: "03"
    kicker: "VARIABLES"
    title: "Variables Figma pour les tokens."
    body: "Toute valeur réutilisée passe en Variable. Hiérarchie sémantique en slash — color/brand/primary/600, space/inline/md, radius/control."
    doItems:
      - "Variable color/brand/primary/500 partout"
      - "Hiérarchie en slash pour espaces et radius"
      - "Nommer par usage, pas par valeur (color/surface/elevated, pas color/grey-200)"
    dontItems:
      - "#FF6B00 en dur dans 30 layers"
      - "Couleurs ad hoc non documentées"
    why: "Les variables Figma se mappent 1:1 aux design tokens (CSS custom properties, Tailwind config). Un hex en dur dans Figma = un hex en dur dans le CSS."

  - num: "04"
    kicker: "TEXT STYLES"
    title: "Text Styles centralisés."
    body: "Toute typo → Text Style nommé. Échelle sémantique — display/xl, heading/h1, body/md, label/sm, caption, code."
    doItems:
      - "Créer une Text Style pour chaque rôle (display, heading, body, label, caption, code)"
      - "Réutiliser le style, jamais surcharger la font-size locale"
    dontItems:
      - "font-size 17px ad hoc"
      - "Mélanger 5 valeurs de tracking sans système"
    why: "Les Text Styles se traduisent en classes utilitaires Tailwind ou variables CSS. Sans, on retombe en valeurs en dur, impossibles à maintenir."

  - num: "05"
    kicker: "NOMMAGE"
    title: "Noms de layers sémantiques."
    body: "Le nom = le rôle, pas la forme — section/Hero, nav/Primary, card/Product, CTA-primary."
    doItems:
      - "Nommer par rôle métier (section/Hero, CTA-primary, card/Product)"
      - "Préfixer par catégorie (nav/, section/, card/, list/)"
    dontItems:
      - "Frame 247, Rectangle 8, Group 12 copy 3"
      - "Garder les noms par défaut générés par Figma"
    why: "L'IA récupère ces noms via get_metadata. Frame 247 devient un <div> sans nom dans le code ; section/Hero devient un <section class=\"hero\">."

  - num: "06"
    kicker: "ÉTATS UI"
    title: "États interactifs documentés."
    body: "Pour chaque élément interactif — default, hover, active, focus (anneau visible), disabled, loading. En Variants ou en frames séparées sur une page States."
    doItems:
      - "Documenter les 6 états — default, hover, active, focus, disabled, loading"
      - "Anneau de focus visible (a11y obligatoire)"
      - "Utiliser une page States dédiée si pas en Variants"
    dontItems:
      - "Ne montrer que l'état default"
      - "Oublier focus (a11y bloqué)"
    why: "Sans les états, le dev invente. Avec, il code exactement les transitions visuelles attendues. Focus visible = a11y conforme dès le design."

  - num: "07"
    kicker: "ÉTATS DATA"
    title: "États de données — empty, loading, error."
    body: "Pour chaque vue data-driven, prévoir empty, loading et error. Ces 3 états représentent 30 à 50 % du code réellement écrit."
    doItems:
      - "Empty — message + CTA pour combler"
      - "Loading — skeleton ou spinner ciblé"
      - "Error — message + retry"
    dontItems:
      - "Ne livrer que le happy path rempli"
      - "Du Lorem ipsum sans préciser que c'est dynamique"
    why: "Le dev passe la moitié de son temps sur ces états. S'ils ne sont pas dessinés, il bricole — et le résultat ne ressemble pas à ce que tu avais imaginé."

  - num: "08"
    kicker: "ANNOTATIONS"
    title: "Annotations Figma."
    body: "Utilise le panneau Annotations natif pour documenter sources d'API, conditions d'affichage, comportements non visuels (debounce, aria-live)."
    doItems:
      - "Source GET /api/users"
      - "Visible si cart.items.length > 0"
      - "Debounce 300ms sur input"
      - "aria-live=polite pour lecteur d'écran"
    dontItems:
      - "Laisser les comportements non visuels dans un Slack/Notion à part"
      - "Espérer que le dev devine la logique conditionnelle"
    why: "Les annotations sont lues par l'IA via get_design_context. C'est ton PRD inline, dans la même surface que la maquette."

  - num: "09"
    kicker: "RESPONSIVE"
    title: "Breakpoints sur des frames séparées."
    body: "Frame Mobile (375), Tablet (768), Desktop (1440) — côte-à-côte ou sur pages distinctes, mêmes nœuds nommés à l'identique."
    doItems:
      - "Une frame par breakpoint, nœuds nommés à l'identique"
      - "Aligner les noms pour permettre la comparaison automatique"
    dontItems:
      - "Ne livrer qu'un seul breakpoint (Desktop only)"
      - "Renommer les nœuds différemment d'un breakpoint à l'autre"
    why: "Le dev (et l'IA) inférent les règles responsives par diff entre breakpoints. Sans, il faut redemander ou deviner."

  - num: "10"
    kicker: "FILE STRUCTURE"
    title: "Structure de fichier propre."
    body: "Cover, Foundations (variables, text styles, effects), Components (atoms → molecules → organisms), Flows par device, States, Archive."
    doItems:
      - "Une page Cover + une page Foundations"
      - "Séparer Components et Flows"
      - "Une page States pour les variations data"
    dontItems:
      - "Tout mélanger sur une seule page"
      - "Garder des layers cachés ou brouillons en place"
    why: "Une structure prédictible permet à l'IA de naviguer rapidement et au dev de ne pas chercher où sont les choses."
---

**Niveau** 🟢 Fondamentaux · ~10 min · pour designers UI/UX qui livrent à un dev (humain ou IA)

> **À retenir en une phrase** : un fichier Figma propre = du code propre. Aucun prompt ne compense un fichier mal structuré.

## L'histoire qu'on se raconte

> *« Le dev va comprendre, c'est juste un padding à ajuster. »*
> *« On verra les états hover plus tard, c'est secondaire. »*
> *« Je laisse le design system gérer les couleurs. »*

Sauf que le dev (humain ou IA) **ne va pas comprendre tout seul**. Il va lire ce que tu as écrit dans le fichier. Si tu as dessiné un bouton avec une couleur en dur, il va coder une couleur en dur. Si tu as utilisé `Group` au lieu de `Frame Auto Layout`, il va deviner les espacements — et se tromper.

Le handoff n'est pas un acte de communication. C'est un **acte de programmation**. Tu programmes en Figma, et chaque calque, chaque nom, chaque variable est une instruction.

## Ce qui change quand une IA lit ta maquette

Quand un assistant comme **Claude via MCP Figma**, Cursor, ou tout outil similaire ouvre ton fichier, il appelle :

```
get_metadata          → arbre des layers (id, type, nom)
get_screenshot        → rendu visuel
get_design_context    → structure + styles + composants
get_variable_defs     → tokens (couleurs, espacements)
```

Tout ce qu'il reçoit, c'est **ce que tu as construit, pas ce que tu avais en tête**. Pas de FaceTime entre vous, pas de "tu vois ce que je veux dire".

| Ce que tu fais | Ce que l'IA voit | Ce que ça produit |
|---|---|---|
| Calque `Frame 247` | Nœud anonyme | `<div>` sans nom |
| Couleur `#FF6B00` en dur | Pas de variable | Hex en dur dans le CSS |
| Groupe `Cmd+G` | Pas de layout | Position absolue |
| Bouton dupliqué 12× | 12 nœuds non liés | 12 implémentations |
| Composant `Button` + Variants | Une signature claire | **Un composant React propre** |
| Variable `color/brand/primary` | Token nommé | **Token dans la config** |

## Checklist avant chaque handoff

- URL copiée **avec node-id** (clic droit → `Copy link to selection`)
- Auto Layout sur la frame partagée
- Zéro `Frame 247` dans les noms
- Couleurs en **Variables**
- Espacements en **Variables**
- Typo en **Text Styles**
- Composants réutilisés sont des **Components**
- Variants documentés
- États `hover` / `focus` / `disabled` présents
- États `empty` / `loading` / `error` présents si data-driven
- Annotations sur les comportements non visuels
- Layers cachés / brouillons supprimés
- Icônes en vectoriel (pas aplaties)

## Les 6 erreurs les plus coûteuses

### 1. Group au lieu de Frame
**Coût** : pas d'Auto Layout possible → positions absolues partout.
**Fix** : `Cmd + Alt + G` (Frame Selection), puis `Shift + A`.

### 2. Icônes aplaties
**Coût** : impossible d'extraire le SVG → image bitmap à uploader.
**Fix** : icônes en vectoriel, centralisées en composants.

### 3. Layers fantômes
**Coût** : bruit dans l'extraction, markup mort généré.
**Fix** : supprimer ou déplacer dans `🗑 Archive`.

### 4. Effets empilés
**Coût** : reproduction CSS approximative, perf dégradée.
**Fix** : simplifier ; si non reproductible → exporter en image.

### 5. Contenu en dur
**Coût** : "Lorem ipsum" et "John Doe" arrivent **littéralement** dans le code.
**Fix** : annoter chaque texte dynamique (`{user.fullName}`).

### 6. Screenshot de composant
**Coût** : l'IA tente de reproduire pixel par pixel au lieu de réutiliser le vrai composant.
**Fix** : toujours utiliser le vrai composant ou un placeholder annoté.

## En cas de doute

Demande-toi : *« Si je supprimais cette maquette, est-ce que le dev pourrait reconstruire le résultat exact à partir de ce qui reste ? »*

- Oui → c'est bien explicite.
- Non → il manque une annotation, une variant ou un état.

## À retenir

> Le designer ne livre pas un visuel. Il livre **une spécification visuelle exécutable**. Plus elle est rigoureuse, moins le dev (et l'IA) ont à deviner. Et moins ils devinent, plus le résultat ressemble à ce que tu avais en tête.
