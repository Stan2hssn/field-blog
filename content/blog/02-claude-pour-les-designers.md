---
num: "02"
slug: "02-claude-pour-les-designers"
title: "Claude pour designer dans Figma."
lede: "Tu n'utilises plus l'IA après le handoff pour générer du code. Tu l'utilises avant, pour construire et nettoyer ta maquette. Claude via MCP et Figma AI natif, en tandem."
publishDate: 2026-05-28
authors:
  - "FIELD®"
  - "Stan H."
readingTime: 11
categories:
  - guides
  - ia
nextSlug: "03-variables-figma-et-design-tokens"
tags:
  - "IA"
  - "MCP"
  - "Figma AI"
  - "Workflow"
closing: "Tu as deux IA dans Figma. L'une vit dedans (Figma AI), l'autre y entre depuis l'extérieur (Claude MCP). L'une est rapide pour les opérations atomiques natives, l'autre lit ton repo et ton intention. Tu ne choisis pas. Tu utilises les deux selon le geste."
sections:
  - num: "01"
    kicker: "POURQUOI"
    title: "Déléguer le Figma à l'IA, pas le design."
    body: "Tu peux faire faire à l'IA tout ce qui est mécanique dans Figma : auto-layout, variables, text styles, instanciation de masters, annotations, breakpoints, renommage. Ce qu'elle ne fait pas : le goût, l'arbitrage, la cohérence narrative."
    doItems:
      - "Délègue les transformations structurelles : Group vers Frame, hex vers Variable, duplications vers Components."
      - "Délègue les répétitions : 13 instances de chapter list, 6 sections d'article, 4 variants d'un bouton."
      - "Garde la main sur les choix typo, palette, hiérarchie visuelle."
    dontItems:
      - "Demander 'rends la maquette plus moderne'. L'IA n'a pas de goût."
      - "Lui faire faire des choix d'UX critiques (placement CTA, hiérarchie info)."
    why: "L'IA amplifie la rigueur. Sur ce qui se mesure (auto-layout présent/absent, variable bound/unbound), elle est précise et rapide. Sur ce qui se juge, elle propose au mieux."

  - num: "02"
    kicker: "OUTILS"
    title: "Deux IA dans Figma : la native et celle qui entre par MCP."
    body: "Figma AI est intégré dans l'interface (panneau Actions, menu contextuel, Make). Claude MCP s'exécute depuis l'extérieur via use_figma. La native est rapide pour les gestes atomiques. Claude lit ton repo et raisonne sur l'intention globale."
    doItems:
      - "Active Figma AI dans Settings (Plan Pro ou Organization)."
      - "Active le serveur MCP Figma dans Claude Code, Desktop ou Cursor. OAuth une fois."
      - "Apprends à choisir : geste atomique répétitif → Figma AI. Refonte multi-frames cohérente → Claude MCP."
    dontItems:
      - "Mélanger les deux dans la même opération sans réfléchir. Tu finis par doublonner."
      - "Compter sur Claude pour faire ce que Figma AI fait en 2 clics (rename layers, fill text)."
    why: "Figma AI est dans la pièce avec toi : zéro latence, accès à ton fichier en cours. Claude est un agent : il lit ton repo, tes annotations, tes guidelines. Les deux ensemble, c'est ce qui rend le workflow rapide et propre."

  - num: "03"
    kicker: "FIGMA AI"
    title: "Ce que Figma AI fait nativement, mieux que Claude."
    body: "Figma AI a sept gestes que tu utilises sans réfléchir. Rename Layers, Make Designs Realistic, Replace Content, Generate Variants, Visual Search, Translate, Auto-arrange. Tous accessibles en deux clics depuis la frame ou le canvas."
    doItems:
      - "Rename Layers sur une frame : Figma AI sniffe le contenu et propose des noms sémantiques (section/Hero, card/Product). Plus de Frame 247."
      - "Make Designs Realistic : remplace Lorem ipsum par du contenu plausible cohérent avec le contexte."
      - "Generate Variants : Figma génère les Variants d'un Component à partir d'un master, avec props sémantiques."
      - "Translate : traduit tout le contenu d'une frame en gardant la typo et le layout."
      - "Visual Search : retrouve les composants visuellement similaires dans le fichier (utile pour détecter les duplications candidates aux Components)."
    dontItems:
      - "Accepter le Rename Layers sans relire. Il propose parfois 'Frame Title' générique. Reformule en rôle métier."
      - "Faire confiance à Make Designs Realistic pour les chiffres réels (taux, dates, prix). Il invente."
    why: "Ces sept gestes étaient 30 minutes de travail manuel par fichier. Maintenant c'est 30 secondes. Tu gagnes du temps sur le bruit, tu gardes la tête disponible pour l'arbitrage."

  - num: "04"
    kicker: "ANNOTATIONS"
    title: "Annotations posées par Claude, finetunées par toi."
    body: "Claude scanne tes frames via MCP, détecte les éléments à comportement non visuel (sticky, scroll-snap, dynamic content, responsive font, touch target) et pose les annotations Figma natives avec la bonne catégorie : Development, Interaction, Accessibility, Content."
    doItems:
      - "Demande un audit annotation avant chaque handoff. Claude trouve ce que tu aurais oublié."
      - "Relis chaque annotation. Reformule pour qu'elle parle à ton dev, pas à un manuel."
      - "Une annotation par node. Pas d'annotation cascade sur un parent."
    dontItems:
      - "Annoter 80 nodes au pifomètre. Tu noies l'info utile."
      - "Laisser les annotations Claude telles quelles si elles sont trop techniques."
    why: "Une annotation Figma native est lue par les outils d'extraction (get_design_context). C'est ton PRD inline, attaché au pixel. Mieux qu'un Notion à part qui n'est jamais à jour."

  - num: "05"
    kicker: "AUTO LAYOUT"
    title: "Convertir Group en Frame Auto Layout en lot."
    body: "Tu hérites d'un fichier où la moitié des conteneurs sont des Groups. Tu demandes à Claude de convertir en Auto Layout, avec direction/gap/padding inférés des positions actuelles. Frame par frame, avec validation à chaque étape."
    doItems:
      - "Commence par une frame. Vérifie le résultat visuellement avant d'étendre."
      - "Donne le pattern attendu : VERTICAL gap 16, padding 32 sur la frame parent. HORIZONTAL gap 8 sur les rows internes."
      - "Demande à Claude de set layoutSizingHorizontal FILL ou HUG selon le rôle."
    dontItems:
      - "Lui demander de convertir 50 frames en un seul appel. Ça plante."
      - "Le laisser inférer le layout sans lui donner la direction principale."
    why: "Auto Layout devient flex/grid sans traduction. Sans, le dev infère depuis des X/Y. Une conversion automatique propre te fait gagner des heures et évite les positions absolues fragiles."

  - num: "06"
    kicker: "VARIABLES"
    title: "Construire le système de tokens à la commande."
    body: "Tu donnes à Claude une palette ou un screenshot. Il crée la collection Tokens avec les Variables (color/, space/, radius/), avec les bonnes scopes (TEXT_FILL, FRAME_FILL, GAP) et les bons modes (light/dark si pertinent)."
    doItems:
      - "Donne la hiérarchie sémantique attendue : color/brand/primary/600, pas color/orange-500."
      - "Précise les scopes par usage : color/text/* en TEXT_FILL, color/bg/* en FRAME_FILL et SHAPE_FILL."
      - "Définis les modes en amont (light, dark, high-contrast)."
    dontItems:
      - "Laisser le scope par défaut ALL_SCOPES. Tu pollues le sélecteur de propriété."
      - "Mélanger nommage par valeur (color/grey-200) et par usage (color/surface/muted). Choisis."
    why: "Les Variables Figma se mappent un pour un sur tes CSS custom properties ou ta config Tailwind. Quand Claude les crée proprement, ton repo récupère la même grammaire."

  - num: "07"
    kicker: "VECTORIELS"
    title: "Icônes et illustrations en vectoriel. Pas de masks pour la couleur."
    body: "Toute icône, tout pictogramme, toute illustration utilisée comme image avec un mask pour changer la couleur est un piège. Le mask casse le binding sur Variable. Au lieu d'un fill thématisable, tu te retrouves avec une image figée en couleur."
    doItems:
      - "Importe les SVG en vectoriel pur. Pas de flatten."
      - "Décompose les illustrations multi-couleurs en layers séparés. Chaque layer a son fill bindable sur une Variable."
      - "Crée un Component par icône, avec un fill exposé en property. Tu changes la couleur via la prop, pas via un mask."
      - "Pour les illustrations complexes : Component avec slot Color, ou variant intent=primary|accent|muted."
    dontItems:
      - "Importer une icône PNG/JPG et la masker pour la teinter. La couleur sera en dur en code."
      - "Aplatir un SVG après import (Flatten). Tu perds le vectoriel et les fills séparables."
      - "Laisser une illustration avec 4 couleurs en un seul layer fill mixte. Le dev ne peut pas la thématiser."
    why: "En code, une icône avec fill via prop devient un <svg fill={color}>. Une icône masquée devient un background-image figé. Le premier change avec le thème dark/light, le second non. Et tes utilisateurs daltoniens te remercient."

  - num: "08"
    kicker: "TEXT STYLES"
    title: "Créer et appliquer la ramp typo en lot."
    body: "Claude crée tes Text Styles (display/xl, heading/h1, body/md, mono/tag, etc.) puis les applique aux nodes existants. Match font-family + style + font-size pour propager sans casser le rendu."
    doItems:
      - "Définis la ramp avant. Donne à Claude la liste avec font/size/lineHeight/tracking."
      - "Demande l'application en best-effort : applique si match exact, laisse en dur sinon."
      - "Crée des variants éditoriales nommées (section/title-italic) si tu utilises Light Italic en hors-ramp."
    dontItems:
      - "Laisser Claude inventer des noms de styles. Il prend des libertés."
      - "Faire appliquer une ramp incomplète. Tu te retrouves avec 30 % de nodes en font-size en dur."
    why: "Les Text Styles deviennent des classes Tailwind ou des variables CSS. Une application en lot couvre 70 à 80 % des nodes. Les 20 % restants sont des cas spécifiques que tu traites à la main."

  - num: "09"
    kicker: "COMPONENTS"
    title: "Détecter les duplications et les transformer en Components."
    body: "Figma AI repère les composants visuellement similaires (Visual Search). Claude valide via MCP, te liste les duplications, transforme en Component avec Variants, remplace les instances par des références."
    doItems:
      - "Visual Search sur la page Flows pour repérer les candidats Components."
      - "Audit duplication via Claude avant chaque release. Tu nettoies les copies sauvages."
      - "Vérifie les Variants proposés. Ils doivent correspondre à des props sémantiques (size, intent, state)."
    dontItems:
      - "Laisser Claude créer des Variants au hasard. Vérifie chaque axe."
      - "Garder un master ancien et un nouveau sans flag deprecated."
    why: "Un Component avec Variants devient un seul composant Vue ou React. 12 duplications deviennent 12 instances d'un même master. Le dev code une fois."

  - num: "10"
    kicker: "RESPONSIVE"
    title: "Générer un breakpoint à partir d'un autre."
    body: "Tu as la frame Desktop, propre. Tu demandes à Claude la version Mobile : il restructure les Auto Layout horizontaux en verticaux, adapte les Text Styles (display/title 56 vers heading/h3 32), instancie les bons masters, ajoute les touch targets à 44×44."
    doItems:
      - "Frame source propre (chapitre 01)."
      - "Donne les patterns attendus : ImageCardStack en ruban débordant, Chapter list horizontale, CTA accent + hint TAP/SWIPE."
      - "Demande les annotations responsive sur les nodes critiques (h1 breakpoint, sticky behavior)."
    dontItems:
      - "Faire générer un breakpoint à partir d'une frame faite au pifomètre. Il propage."
      - "Sauter la passe annotations responsive après. Ton dev a besoin des règles, pas juste du visuel."
    why: "On a fait ce blog comme ça. Une fois la Desktop propre, Mobile et Tablet ont été générées et alignées en moins d'une heure. Sans cette base, ça aurait été deux jours."

  - num: "11"
    kicker: "RELECTURE"
    title: "Comment valider ce que l'IA a fait dans Figma."
    body: "Après chaque passe, tu regardes le fichier. Tu compares avec un screenshot avant/après. Tu vérifies la structure (hiérarchie, naming), tu vérifies le visuel (alignement, colors), tu vérifies les bindings (chaque fill a sa variable)."
    doItems:
      - "Screenshot avant/après pour chaque grosse opération."
      - "get_metadata sur la frame mutée. Vérifie qu'aucun layer parasite n'a été créé."
      - "Lance le matcher textStyleId une fois après chaque changement de ramp. Tu rattrapes les nodes oubliés."
    dontItems:
      - "Faire confiance aveuglément à la sortie."
      - "Push direct sans relire. L'IA peut casser un layout proprement."
    why: "Les opérations sont atomiques par appel, pas par session. Tu fais une opération, tu regardes, tu corriges. C'est plus rapide en cumul que de relire un gros patch à la fin."
---

**Niveau** 🟢 Fondamentaux · ~11 min · pour designers qui veulent piloter l'IA dans Figma

## Pourquoi tu lis cet article

Le chapitre 01 parle de rigueur côté Figma. Tu sais ce qu'il faut faire. Reste à le faire, sur des fichiers existants qui ne sont pas tous propres, avec un budget de temps qui n'est pas extensible.

C'est là que l'IA entre. Pas pour extraire du code après ton design (ça, c'est l'angle du chapitre suivant). Pour construire et nettoyer la maquette pendant que tu designs.

Et tu en as deux à ta disposition. Figma AI, qui vit dans l'interface, et Claude via MCP, qui entre depuis l'extérieur. Cet article te montre comment les utiliser ensemble.

## Les deux IA, côte à côte

### Figma AI (native)

Intégrée directement dans Figma. Tu y accèdes via le panneau Actions, le menu contextuel sur une frame ou un layer, ou Figma Make pour générer un design entier depuis un prompt.

Ses points forts :

- **Rename Layers** : sniffe le contenu et propose des noms sémantiques. Frame 247 devient section/Hero. Cherche-le dans le menu d'une frame.
- **Make Designs Realistic** : remplace Lorem ipsum et "User Name" par du contenu plausible cohérent avec le contexte (nom français, email, date, prix).
- **Replace Content** : injecte du contenu spécifique (jeu de tweets, jeu de produits, jeu de profils).
- **Generate Variants** : crée les Variants d'un Component à partir d'un master.
- **Visual Search** : retrouve les nodes visuellement similaires dans le fichier (Cmd+F → onglet visuel).
- **Translate** : traduit le contenu d'une frame en gardant la typo et le layout.
- **Auto-arrange** : organise des éléments libres sur une frame.

Tous ces gestes étaient 5 à 30 minutes de travail manuel. Maintenant c'est 5 à 30 secondes.

### Claude via MCP

S'exécute depuis l'extérieur. Tu lui parles dans Claude Code, Claude Desktop, ou Cursor. Il appelle des outils Figma via le protocole MCP : `get_metadata`, `get_screenshot`, `get_design_context`, `get_variable_defs`, `use_figma`.

Ses points forts :

- Lit ton repo en parallèle (composants Vue existants, Tailwind config, conventions).
- Comprend une intention complexe ("aligne le breakpoint tablet sur la direction mobile que j'ai posée").
- Exécute du JavaScript dans le fichier (use_figma) pour des opérations massives en batch.
- Pose des annotations Figma natives avec catégories sémantiques.
- Garde la trace des IDs mutés à chaque appel, pour audit.

### Comment choisir

Geste atomique répétitif sur une frame que tu as sous les yeux → Figma AI.

Opération massive qui traverse plusieurs frames, lit ton repo, et applique une logique métier → Claude MCP.

Tu n'as pas à arbitrer pour chaque action. Tu utilises l'outil qui fait le geste le plus court.

## Les trois usages qui changent la vie

### Annotations posées en lot

Tu finis une frame responsive. Il faut documenter le sticky, le scroll-snap, les touch targets, le breakpoint font, le contenu dynamique. À la main, 40 minutes sur 12 frames. Avec Claude MCP, 30 secondes. Tu décris la liste, il pose les annotations sur les bons nodes avec les bonnes catégories. Tu relis et tu reformules.

Le gain n'est pas que le temps. C'est le fait que tu annotes vraiment, au lieu de te dire "on verra plus tard".

### Auto Layout en bloc

Tu hérites d'un fichier où 60 % des conteneurs sont des Groups. Tu n'as pas envie de tout refaire. Tu demandes à Claude de convertir frame par frame, en lui donnant le pattern attendu (VERTICAL gap 16, HORIZONTAL gap 8). Il transforme, tu vérifies après chaque frame.

Le résultat n'est pas parfait à 100 % du premier coup. Mais 80 % de la conversion est faite. Les 20 % restants sont des décisions à prendre (HUG ou FIXED, FILL ou HUG selon le breakpoint). Là, c'est à toi.

### Système de tokens depuis une palette

Tu commences un projet. Tu as une palette dans la tête, ou un screenshot d'inspiration. Tu décris la palette à Claude : "color/brand/primary en orange 0xff4d1f, color/text/primary en presque-noir 0x0a0a0a, color/bg/page en blanc, color/rule en gris foncé opacity 15 %". Il crée la collection, les variables, les scopes appropriés (TEXT_FILL sur color/text/*, FRAME_FILL sur color/bg/*).

Tu n'as pas écrit une ligne de code. Tu as décrit le système.

## L'erreur des assets masqués

Un cas vécu trop souvent. Tu importes une icône PNG ou JPG depuis un site stock. Tu veux la teinter en accent. Tu mets un mask par-dessus avec un fill orange.

À l'écran, ça marche.

En code, c'est mort. Le mask est rastérisé. La couleur est figée dans l'image. Le dev récupère un fichier image qu'il ne peut pas thématiser. Si tu passes en dark mode, l'icône reste orange. Si l'utilisateur active le high-contrast, l'icône reste orange. Si tu changes la couleur d'accent demain, tu réimportes 30 icônes à la main.

**La règle** : icônes et illustrations en SVG vectoriel pur. Chaque layer coloré a son fill bindable sur une Variable. Les icônes deviennent des Components avec une property color exposée. Le dev récupère un `<svg fill={color}>` thématisable, pas une image figée.

Si tu hérites de masks déjà en place, tu peux demander à Claude de les détecter et de proposer une conversion en vectoriel. Il ne pourra pas tout sauver (un PNG aplati reste un PNG), mais il liste les cas et propose une stratégie.

## Comment formuler une intention propre

Ce qui marche :

> *« Sur la frame 387:469 (Index Mobile), binde tous les fills des TEXT nodes nommés "kicker" sur color/obys/text-mid, et tous les fills des nodes "title" sur color/obys/text-primary. Applique le textStyleId mono/xs-track sur les kickers. Renvoie la liste des IDs mutés. »*

Ce qui ne marche pas :

> *« Rends la frame plus cohérente. »*

Intention concrète, cible précise (frame ID, sélecteur par nom), résultat attendu (binding + textStyleId), demande de retour vérifiable (liste des IDs mutés). C'est tout.

## Le piège des opérations en cascade

Une suite d'appels use_figma n'est pas atomique. Si l'appel 3 plante, les appels 1 et 2 sont déjà commités. Tu ne peux pas rollback automatiquement.

Trois réflexes :

1. Travaille sur une branche Figma si l'opération est risquée. Tu peux jeter la branche.
2. Découpe les opérations en étapes vérifiables. Après chaque use_figma, screenshot ou get_metadata.
3. Garde la liste des IDs mutés à chaque étape. Si tu dois revenir en arrière, tu sais où aller.

## Quick start

Choisis une frame moyenne (200 à 400 nodes). Vérifie qu'elle est sur sa propre page (pas mélangée). Tu fais en deux temps.

**Pass 1, Figma AI native** : sélectionne la frame, ouvre le menu IA, lance Rename Layers. Relis, ajuste les rares noms génériques. Puis Make Designs Realistic si tu as encore du Lorem ipsum. Puis Visual Search pour repérer les duplications visuelles.

**Pass 2, Claude MCP** : partage l'URL de la frame à Claude, demande :

> *« Audit cette frame : liste tous les Groups (devraient être Frames), tous les hex en dur (devraient être Variables), tous les TEXT sans textStyleId, tous les nodes avec un mask sur image (devraient être SVG fills bindés). Donne un plan de cleanup en 3 étapes. »*

Tu lis le plan. Tu valides une étape. Tu dis "vas-y". Il exécute. Tu regardes. Tu passes à la suivante.

## À retenir

Tu as deux IA dans Figma. L'une vit dedans (Figma AI), l'autre y entre depuis l'extérieur (Claude MCP). L'une est rapide pour les opérations atomiques natives, l'autre lit ton repo et ton intention. Tu ne choisis pas. Tu utilises les deux selon le geste.

Prochaine étape : on rentre dans le détail des Variables Figma et de leur mapping en design tokens. → [chapitre 03](/blog/03-variables-figma-et-design-tokens) *(à venir)*.
