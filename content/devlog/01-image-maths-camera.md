---
num: "03"
slug: "01-image-maths-camera"
series: "R3D"
title: "Une image, des vecteurs, une caméra."
lede: "Avant la première sphère, il faut une architecture, un endroit où écrire des pixels, une algèbre pour parler d'espace et une caméra qui sait d'où partent les rayons. Jour 1, les fondations, avec tout le code."
publishDate: 2026-11-18
readingTime: 33
tags:
  - "C++"
  - "Raytracing"
  - "Maths"
  - "Caméra"
  - "CMake"
sections:
  - num: "01"
    kicker: "ARCHITECTURE"
  - num: "02"
    kicker: "L'IMAGE"
  - num: "03"
    kicker: "VEC3"
  - num: "04"
    kicker: "LE RAYON"
  - num: "05"
    kicker: "LA CAMÉRA"
  - num: "06"
    kicker: "LE CIEL"
  - num: "07"
    kicker: "RÉCAP"
nextSlug: "02-spheres-materiaux"
closing: "Un dégradé bleu, ça n'impressionne personne. C'est pourtant la preuve que toute la chaîne tient debout : pixel, vecteur, rayon, caméra, fichier."
---

R3D est un raytracer CPU écrit à la main, en C++20, sans bibliothèque graphique. Pas de GPU, pas de shader, pas de Three.js pour tricher. Juste des boucles, des `double` et un fichier image à la fin.

Les deux premiers jours suivent [Ray Tracing in One Weekend](https://raytracing.github.io/books/RayTracingInOneWeekend.html) de Peter Shirley, Trevor David Black et Steve Hollasch, mais avec une architecture différente de celle du livre : des modules, des tests, et une bibliothèque CMake dès le premier jour. Ce billet est un tutoriel complet. Chaque fichier est donné en entier, avec son chemin, et chaque étape se compile et se lance. Le pourquoi passe avant le comment : derrière chaque morceau de code, il y a la formule, et l'endroit où ça casse.

Pas besoin de savoir coder en C++ pour suivre. Le code est écrit pour être lu : des noms longs, une idée par ligne, des variables intermédiaires qui portent le nom de la formule. Les optimisations viennent après, une fois que la version simple marche, et toujours avec une mesure. Chaque construction du langage est expliquée la première fois qu'elle apparaît, dans un encadré « C++ en clair », avec son équivalent JS ou TypeScript quand il existe.

Si tu viens du GLSL comme moi, tu vas reconnaître beaucoup de choses. Un fragment shader qui fait du raymarching, c'est déjà un raytracer : une fonction appelée une fois par pixel, qui fabrique un rayon et renvoie une couleur. La différence, c'est que personne ne fait la boucle pour toi. Ni le framebuffer. Ni `vec3`. Ni l'export. Jour 1, on construit tout ça.

Ce billet est aussi un carnet. Je l'ai écrit en codant, et j'y ai laissé les moments où ça a coincé : une image vide, un binaire périmé, un éditeur qui ne trouve pas un fichier pourtant bien là. Ils sont rangés dans des encadrés « Carnet de bord ». Les explications, elles, restent celles d'un tutoriel : tu peux sauter les encadrés sans rien perdre.

On part du squelette du dépôt : un `CMakeLists.txt`, un `src/main.cc` qui renvoie 0, un test Catch2 bidon dans `tests/smoke_test.cc`. Ça compile, ça ne fait rien.

::devlog-section{num="01" kicker="ARCHITECTURE" title="Où va chaque fichier, et dans quel sens on a le droit d'inclure."}
::

Avant d'écrire une ligne, on décide où les choses vivent. Pas par goût du rangement : en C++, l'ordre des `#include` est un graphe de dépendances, et un graphe mal fichu se paie en temps de compilation, en cycles d'includes et en code impossible à tester seul.

### L'arborescence cible

Voici le dépôt à la fin des trois jours. Aujourd'hui, on n'en crée qu'une partie (marquée `J1`), mais chaque fichier a déjà sa place.

```
src/
├── main.cc                  J1  la scène et l'appel au rendu, rien d'autre
├── math/                        aucune dépendance au reste du projet
│   ├── vec3.h               J1  Vec3, Point3, Color
│   ├── ray.h                J1  Ray
│   ├── interval.h           J2  Interval
│   ├── rng.h                J2  générateur aléatoire
│   └── aabb.h / aabb.cc     J3  boîtes englobantes
├── image/
│   └── image.h / image.cc   J1  le framebuffer en mémoire
├── io/                          tout ce qui lit ou écrit un fichier
│   ├── ppm.h / ppm.cc       J1  écriture PPM
│   └── obj.h / obj.cc       J3  lecture OBJ
├── geometry/                    ce qu'un rayon peut toucher
│   ├── hittable.h           J2  l'interface + HitRecord
│   ├── sphere.h / .cc       J2
│   ├── hittable_list.h/.cc  J2
│   ├── triangle.h / .cc     J3
│   └── bvh.h / bvh.cc       J3
├── material/
│   └── material.h / .cc     J2  diffus, métal, verre
└── render/
    ├── camera.h / camera.cc J1  pixel → rayon
    └── renderer.h / .cc     J2  la boucle, puis les threads (J3)
tests/
├── vec3_test.cc             J1  un fichier de test par module
├── image_test.cc            J1
└── camera_test.cc           J1
```

### Le sens des dépendances

Un module n'inclut que ceux qui sont **en dessous** de lui. Jamais l'inverse.

```
main.cc
  │
  ├──▶ render ───▶ material ───▶ geometry ───▶ math
  │      │                                      ▲
  │      └──────▶ image ────────────────────────┤
  │                 ▲                           │
  └──▶ io ──────────┴──── (ppm : image, obj : geometry)
```

- **`math/` n'inclut rien du projet.** C'est la fondation, testable sans rien d'autre. Si un jour `vec3.h` inclut `camera.h`, quelque chose est faux.
- **`image/` ne sait rien des fichiers.** Un framebuffer, c'est un tableau de couleurs. L'écrire en PPM, en PNG ou dans un test, c'est le travail de `io/`.
- **`geometry/` ne connaît les matériaux que de nom.** Au jour 2, un impact devra porter son matériau. On s'en sortira avec une déclaration anticipée (`class Material;`) plutôt qu'un include, pour ne pas créer de cycle.
- **`render/` est en haut.** C'est le seul module qui connaît tout le monde : il orchestre, il n'implémente pas la géométrie.
- **`main.cc` compose.** Il construit une scène et appelle le rendu. Aucune maths dedans.

### Les conventions

| Sujet | Règle | Pourquoi |
|---|---|---|
| Fichiers | `snake_case`, `.h` / `.cc` | C'est déjà ce qu'utilise le dépôt (`main.cc`, `smoke_test.cc`) |
| Includes | relatifs à `src/` : `#include "math/vec3.h"` | Le module est lisible dans chaque include, et un seul chemin d'include suffit |
| Espace de noms | tout dans `namespace r3d` | Pas de collision avec la bibliothèque standard ou Catch2 |
| Helpers privés | `namespace { }` dans le `.cc` | Invisibles hors du fichier, pas de conflit à l'édition de liens |
| Types | `PascalCase` | `Vec3`, `HitRecord`, `Camera` |
| Fonctions, variables | `camelCase` | `unitVector`, `rayForPixel`, `imageHeight` |
| Membres privés | suffixe `_` | `width_` : on voit d'un coup d'œil ce qui est un état de l'objet |
| Constantes | `UPPER_SNAKE_CASE` | `PARALLEL_EPSILON` |

**Header seul ou `.h` + `.cc` ?** Les petites fonctions mathématiques appelées des millions de fois (`dot`, `operator+`) restent dans le header, marquées `inline` : le compilateur doit voir leur corps pour les intégrer directement dans le code qui les appelle. On y revient avec `Vec3`. Tout le reste a un `.cc` : le header ne montre que l'interface, l'implémentation peut changer sans recompiler tout le projet, et les includes lourds (`<iostream>`, `<thread>`) restent confinés.

**Pourquoi pas un dossier `include/` séparé ?** Parce que R3D est un exécutable, pas une bibliothèque qu'on installe. Un seul dossier `src/` suffit tant que personne d'autre ne consomme nos headers.

### SOLID, appliqué à R3D

Les cinq principes SOLID sont souvent récités en abstrait. Ici, chacun correspond à une décision précise du moteur, qu'on retrouvera dans le code des trois jours.

| Principe | Dans R3D | Ce que ça achète |
|---|---|---|
| **S**ingle responsibility | `Image` stocke des pixels et ne sait rien des fichiers ; `writePpm` écrit, ne calcule rien. `Camera` fabrique des rayons, le renderer parcourt l'image. Au jour 3, `parseObj` lit le texte, `makeTriangles` construit la géométrie. | Chaque pièce se teste seule, et un format PNG ne toucherait qu'un fichier de `io/`. |
| **O**pen / closed | Le renderer ne parle qu'aux interfaces `Hittable` et `Material`. | Ajouter le triangle et la BVH (jour 3) ou un nouveau matériau ne modifie pas une ligne de `rayColor`. |
| **L**iskov substitution | Tout `Hittable` respecte le même contrat : un impact dans $\left]t_{\min}, t_{\max}\right[$, normale unitaire tournée contre le rayon, ou rien. | Une sphère, un triangle, une liste ou un nœud de BVH s'emboîtent librement : une liste peut contenir un arbre qui contient une liste. |
| **I**nterface segregation | `Hittable` : `hit` (puis `boundingBox` au jour 3). `Material` : `scatter`. Rien d'autre. | Implémenter une forme ou un matériau, c'est une ou deux méthodes, pas une classe de base fourre-tout. |
| **D**ependency inversion | `render` prend un `const Hittable&`, pas une `HittableList`. `writePpm` et `parseObj` prennent des `std::ostream&` / `std::istream&`, pas des noms de fichier. | La scène peut changer de structure sans toucher au moteur, et les tests remplacent les fichiers par des `std::ostringstream`. |

### Les autres règles du code

- **`const` partout où c'est vrai.** Méthodes qui ne modifient rien marquées `const`, paramètres lourds en `const&`, variables locales `const` par défaut. Au jour 3, c'est ce qui permet à dix threads de lire la même scène sans verrou.
- **Des valeurs, pas des objets.** `Vec3`, `Ray`, `Interval` sont de petits types copiables, sans identité ni allocation. On les passe, on les renvoie, on ne les partage pas.
- **RAII, et la propriété écrite dans les types.** Aucun `new` ni `delete` : un `std::vector` possède les pixels, un `std::shared_ptr` possède les objets de la scène, un pointeur brut (`const Material*`) veut dire « je désigne, je ne possède pas ». Les threads sont joints avant que leurs données ne meurent.
- **L'absence est un type.** Un rayon qui ne touche rien renvoie un `std::optional` vide, pas un `bool` et une structure à moitié remplie. Une erreur de données (image vide, OBJ invalide) lève une exception avec son contexte, à la frontière.
- **Pas de commentaire qui paraphrase.** Le code dit quoi, les noms disent pourquoi. Un commentaire n'existe que pour un *pourquoi* non évident (l'acné de surface, la graine par tuile).
- **Un fichier de test par module**, qui teste un comportement observable (« le plus proche gagne ») plutôt qu'un détail d'implémentation. Jamais `==` entre deux flottants calculés, toujours une tolérance, sauf quand le test vérifie justement une égalité au bit près (le déterminisme du jour 3).

### CMake : d'une bibliothèque vide à une vraie bibliothèque

Le squelette déclare `r3d_core` comme bibliothèque `INTERFACE` : une bibliothèque sans aucun fichier compilé, qui ne transporte que des réglages (le dossier d'include, les warnings). C'était le bon choix tant que `src/` ne contenait que `main.cc`.

Dès qu'un premier `.cc` arrive (ce sera `image.cc`, à la section 03), on passe en `STATIC`. Le moteur est compilé **une fois**, puis lié **deux fois** : dans l'exécutable `r3d` et dans les tests `r3d_tests`. Sans cette bibliothèque, il faudrait lister chaque `.cc` dans les deux cibles, et les compiler deux fois.

Avec ce changement, les mots-clés `INTERFACE` deviennent `PUBLIC` : le réglage s'applique à `r3d_core` elle-même **et** à tout ce qui la lie. Voici le `CMakeLists.txt` de fin de journée, en entier :

::code-compare{right="CMake ≈ package.json"}
#cpp
```cmake
cmake_minimum_required(VERSION 3.20)
project(R3D LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

if(NOT CMAKE_BUILD_TYPE AND NOT CMAKE_CONFIGURATION_TYPES)
  set(CMAKE_BUILD_TYPE Debug)
endif()

add_library(r3d_core STATIC
  src/image/image.cc
  src/io/ppm.cc
  src/render/camera.cc
)
target_include_directories(r3d_core PUBLIC src)
target_compile_options(r3d_core PUBLIC
  $<$<CXX_COMPILER_ID:GNU,Clang,AppleClang>:-Wall -Wextra -Wpedantic>
  $<$<CXX_COMPILER_ID:MSVC>:/W4>
)

add_executable(r3d src/main.cc)
target_link_libraries(r3d PRIVATE r3d_core)

include(FetchContent)
FetchContent_Declare(
  Catch2
  GIT_REPOSITORY https://github.com/catchorg/Catch2.git
  GIT_TAG v3.7.1
)
FetchContent_MakeAvailable(Catch2)

enable_testing()

add_executable(r3d_tests
  tests/vec3_test.cc
  tests/image_test.cc
  tests/camera_test.cc
)
target_link_libraries(r3d_tests
  PRIVATE r3d_core Catch2::Catch2WithMain)

list(APPEND CMAKE_MODULE_PATH ${catch2_SOURCE_DIR}/extras)
include(Catch)
catch_discover_tests(r3d_tests)
```

#ts
```ts
// "engines": { "node": ">=20" }
// "name": "r3d"

// tsconfig : "target": "ES2020"
// tsconfig : refuser une cible plus ancienne
// tsconfig : pas d'extensions propres au compilateur
// infos pour l'éditeur (comme le LSP de tsserver)

// en dev par défaut : "sourceMap": true, sans minify
//
//

// un paquet interne du workspace : packages/r3d-core
//   ses fichiers, listés à la main (pas de glob)
//
//
// )
// "paths": { "*": ["src/*"] }, transmis aux dépendants
// la config du linter, selon l'outil :
//   eslint avec toutes les règles strictes
//   (équivalent pour MSVC)
// )

// "bin": { "r3d": "src/main.ts" }
// "dependencies": { "r3d-core": "workspace:*" }

// npm install d'une dépendance externe :
// "devDependencies": {
//   "catch2": "github:catchorg/Catch2",
//
//   "#v3.7.1"
// }
// téléchargée au premier "cmake -B build"

// "scripts": { "test": "vitest" }

// les fichiers de test, listés eux aussi
//
//
//
// )
// devDependencies du paquet de test :
//   r3d-core + le runner de Catch2

// rend chaque TEST_CASE visible par ctest,
// comme vitest découvre les test()
//
```
::

Les sources sont listées à la main, par ordre alphabétique. Pas de `file(GLOB ...)` : CMake ne relancerait pas la configuration quand un fichier apparaît, et la liste explicite dit exactement ce qui est compilé. `tests/smoke_test.cc` peut être supprimé : il n'existait que pour que la cible de test ait quelque chose à lier.

::devlog-note{kicker="C++ EN CLAIR"}
CMake joue le rôle du `package.json` et du bundler. `add_library(r3d_core STATIC ...)` déclare un paquet interne, compilé une fois. `add_executable(r3d src/main.cc)` déclare un programme. `target_link_libraries(r3d PRIVATE r3d_core)` dit « `r3d` utilise `r3d_core` », comme une dépendance entre paquets d'un workspace. `PUBLIC` transmet un réglage (dossier d'include, warnings) à ceux qui lient la cible, `PRIVATE` le garde pour elle. La ligne `$<$<CXX_COMPILER_ID:...>:...>` choisit les options selon le compilateur : à recopier telle quelle.
::

Tu peux ajouter les fichiers au `CMakeLists.txt` au fur et à mesure, ou tout de suite et écrire les fichiers dans l'ordre du billet. La commande de build ne change pas de la journée :

```bash
cmake -B build -G Ninja                      # une seule fois
cmake --build build                          # après chaque modification
ctest --test-dir build --output-on-failure   # les tests
./build/r3d > image.ppm                      # le rendu
```

::devlog-note{kicker="CARNET DE BORD" tone="accent"}
Ma première configuration a échoué deux fois de suite. D'abord `Cannot find source file: tests/vec3_test.cc` : mon fichier s'appelait encore `vec3.test.cc`, avec un point à la place du tiret bas. Puis `No SOURCES given to target: r3d_core` : j'avais commenté `image.cc` en attendant de l'écrire, et une bibliothèque `STATIC` sans aucun fichier est refusée. C'est exactement pour ça que le squelette démarre en `INTERFACE` : tant qu'il n'y a rien à compiler, la bibliothèque ne peut pas être `STATIC`.

Autre surprise : l'éditeur soulignait `#include <catch2/...>` en rouge alors que tout compilait. Le build tournait dans le dev container, l'éditeur sur le Mac, et `compile_commands.json` pointait vers `/workspaces/R3D/...`, un chemin qui n'existe que dans le container. Même cause, autre symptôme : le formatage changeait selon la machine, parce que ce n'était pas la même version de clang-format. Depuis, j'ouvre le projet dans le container, et l'éditeur voit exactement ce que voit le compilateur.
::

::devlog-section{num="02" kicker="VEC3" title="Un type pour tout ce qui a trois nombres."}
::

Tout ce qui suit parle d'espace : positions, directions, normales, couleurs. En GLSL, `vec3` est gratuit. En C++, on l'écrit.

### Un seul type, ou trois ?

Premier vrai choix de design. Un point, une direction et une couleur sont tous trois des triplets de nombres. Mais ils ne se comportent pas pareil :

- $\text{point} + \text{direction}$ → un point. Sensé.
- $\text{point} - \text{point}$ → une direction. Sensé.
- $\text{point} + \text{point}$ → rien de géométrique. Ça compile quand même.
- $\text{couleur} \cdot \text{direction}$ → aucun sens.

Deux écoles :

| Approche | Pour | Contre |
|---|---|---|
| Un seul `Vec3`, avec des alias `Point3` et `Color` | Simple, peu de code, identique au GLSL | Le compilateur laisse passer $\text{point} + \text{point}$ |
| Types distincts `Point3`, `Vec3`, `Color` | Les erreurs de sens deviennent des erreurs de compilation | Trois fois plus d'opérateurs, des conversions explicites partout |

Je prends la première, comme le livre. Les alias `using Point3 = Vec3;` (le `type Point3 = Vec3` de TypeScript : un autre nom, pas un nouveau type) ne protègent de rien, mais ils documentent l'intention. Pour un raytracer qu'on veut voir tourner en deux jours, la sécurité de types ne paie pas encore son coût.

::devlog-note{kicker="CARNET DE BORD" tone="accent"}
Écrire `color.x` pour parler du rouge m'a gêné tout de suite. Mon premier réflexe : une classe `Color` qui hérite de `Vec3`, avec des champs `r, g, b, a`. Mauvaise idée sur toute la ligne. Une couleur hériterait de `cross` et de `length`, `rouge + bleu` renverrait un `Vec3` au lieu d'une `Color`, et une couleur passerait sans broncher là où on attend une position. Quant à l'alpha, un raytracer n'en fait rien : la transparence d'un verre, c'est de la réfraction, calculée par les rayons, pas un canal qu'on mélange.

Dans mon propre dépôt, j'ai fini par écrire un `struct Color { r, g, b }` séparé, avec seulement les opérations dont la lumière a besoin : addition, produit par un nombre, produit de deux couleurs, et un `lerp`. Le billet garde l'alias, plus court pour démarrer. Les deux tiennent. L'héritage, non.
::

### Un agrégat, pas une classe

`Vec3` est un `struct` à trois membres publics, sans constructeur. C'est un **agrégat** : on l'initialise avec des accolades, `Vec3{1, 2, 3}`, et les valeurs par défaut `= 0.0` donnent `Vec3{}` nul. Pas d'invariant à protéger (contrairement à l'`Image` de la section suivante), donc pas de raison de cacher les données derrière des accesseurs. Lire `v.x` est plus clair que `v.x()`.

::devlog-note{kicker="C++ EN CLAIR"}
`struct` et `class` sont presque le même mot : la seule différence, c'est que tout est public par défaut dans un `struct`. La convention : `struct` pour un simple paquet de données, `class` dès qu'il y a un invariant à protéger. `Vec3{1, 2, 3}` remplit les champs dans l'ordre de déclaration, comme un objet littéral `{ x: 1, y: 2, z: 3 }` dont les clés seraient fixées d'avance.
::

Ce dont on a besoin, et rien de plus :

- **composante par composante** : `+`, `−`, `*` entre deux vecteurs (le `*` sert pour les couleurs : filtrer une lumière par une teinte), `−` devant un vecteur pour l'inverser ;
- **avec un scalaire** : `v * t`, `t * v`, `v / t` ;
- **géométrie** : produit scalaire, produit vectoriel, longueur, normalisation.

::devlog-note{kicker="C++ EN CLAIR"}
JS n'a pas de surcharge d'opérateurs : avec Three.js, on écrit `a.clone().add(b)`. En C++, `Vec3 operator+(const Vec3& a, const Vec3& b)` est une fonction ordinaire avec un nom spécial, et le compilateur traduit `a + b` en `operator+(a, b)`. Plusieurs fonctions peuvent porter le même nom si leurs paramètres diffèrent (la surcharge) : le compilateur choisit selon les types, d'où un `operator-` à deux paramètres (soustraction) et un à un seul (le signe moins).
::

Deux pièges propres au C++ :

1. **`t * v` et `v * t` sont deux fonctions.** En GLSL, ça marche dans les deux sens. En C++, si tu ne définis que `operator*(Vec3, double)`, alors `2.0 * v` ne compile pas. Il faut les deux.
2. **Une fonction libre définie dans un header doit être `inline`.** Sinon, chaque `.cc` qui inclut le header en a sa propre copie, et l'éditeur de liens se plaint de définitions multiples. C'est la règle ODR (*One Definition Rule*), et c'est le premier mur que tout le monde se prend en venant du JS. Les fonctions membres définies dans la classe sont `inline` implicitement.

::devlog-note{kicker="C++ EN CLAIR"}
`inline` a deux rôles ici. Le rôle obligatoire : autoriser la même définition dans plusieurs `.cc` (la règle ODR ci-dessus). Le rôle de performance : ces fonctions seront appelées des milliards de fois, et le compilateur ne peut les recopier dans le code appelant, au lieu de faire un vrai appel, que s'il voit leur corps. Un `vec3.h` qui ne ferait que déclarer, avec un `vec3.cc` à côté, marcherait aussi, juste plus lentement. Le jour 3 mesure ce que coûte un code où rien n'est intégré (build Debug contre Release). C'est la seule optimisation présente dès le jour 1, et elle est dans les conventions du projet.
::

Premier fichier du projet, donc un peu de syntaxe de base avant le code :

::devlog-note{kicker="C++ EN CLAIR"}
Un module, c'est deux fichiers. Le `.h` (header) déclare ce qui existe et avec quels types, un peu comme un `.d.ts`. Le `.cc` contient l'implémentation. `#include "math/vec3.h"` n'est pas un `import` : avant de compiler, le préprocesseur **colle le texte** du fichier à cet endroit. `#pragma once` empêche de coller deux fois le même header dans un même `.cc`. Les chevrons (`#include <vector>`) désignent la bibliothèque standard, les guillemets nos propres fichiers.
::

::devlog-note{kicker="C++ EN CLAIR"}
`namespace r3d { ... }` range tout sous un préfixe, comme l'objet `THREE` de Three.js : de l'extérieur, on écrit `r3d::Vec3`. `std::` est le préfixe de la bibliothèque standard. Le `namespace { ... }` sans nom, qu'on croisera dans les `.cc`, rend une fonction invisible hors de son fichier : c'est une fonction qu'on n'aurait pas exportée d'un module ES.
::

Fichier `src/math/vec3.h` :

::code-compare
#cpp
```cpp
#pragma once

#include <cmath>

namespace r3d {

struct Vec3 {
    double x = 0.0;
    double y = 0.0;
    double z = 0.0;

    double lengthSquared() const {
        return x * x + y * y + z * z;
    }
    double length() const {
        return std::sqrt(lengthSquared());
    }
};

using Point3 = Vec3;
using Color = Vec3;

inline Vec3 operator+(const Vec3& a, const Vec3& b) {
    return Vec3{a.x + b.x, a.y + b.y, a.z + b.z};
}

inline Vec3 operator-(const Vec3& a, const Vec3& b) {
    return Vec3{a.x - b.x, a.y - b.y, a.z - b.z};
}

inline Vec3 operator-(const Vec3& v) {
    return Vec3{-v.x, -v.y, -v.z};
}

inline Vec3 operator*(const Vec3& a, const Vec3& b) {
    return Vec3{a.x * b.x, a.y * b.y, a.z * b.z};
}

inline Vec3 operator*(double t, const Vec3& v) {
    return Vec3{t * v.x, t * v.y, t * v.z};
}

inline Vec3 operator*(const Vec3& v, double t) {
    return Vec3{t * v.x, t * v.y, t * v.z};
}

inline Vec3 operator/(const Vec3& v, double t) {
    const double inverse = 1.0 / t;
    return Vec3{inverse * v.x, inverse * v.y, inverse * v.z};
}

inline double dot(const Vec3& a, const Vec3& b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

inline Vec3 cross(const Vec3& a, const Vec3& b) {
    const double x = a.y * b.z - a.z * b.y;
    const double y = a.z * b.x - a.x * b.z;
    const double z = a.x * b.y - a.y * b.x;
    return Vec3{x, y, z};
}

inline Vec3 unitVector(const Vec3& v) {
    return v / v.length();
}

}  // namespace r3d
```

#ts
```ts
// (pas d'équivalent : un module ES n'est chargé qu'une fois)

// <cmath> : Math est global en JS

// namespace r3d : c'est le module lui-même

export class Vec3 {
  constructor(public x = 0.0,
              public y = 0.0,
              public z = 0.0) {}

  lengthSquared(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z
  }
  length(): number {
    return Math.sqrt(this.lengthSquared())
  }
}

export type Point3 = Vec3
export type Color = Vec3

export function add(a: Vec3, b: Vec3): Vec3 {
  return new Vec3(a.x + b.x, a.y + b.y, a.z + b.z)
}

export function sub(a: Vec3, b: Vec3): Vec3 {
  return new Vec3(a.x - b.x, a.y - b.y, a.z - b.z)
}

export function negate(v: Vec3): Vec3 {
  return new Vec3(-v.x, -v.y, -v.z)
}

export function mul(a: Vec3, b: Vec3): Vec3 {
  return new Vec3(a.x * b.x, a.y * b.y, a.z * b.z)
}

export function scale(t: number, v: Vec3): Vec3 {
  return new Vec3(t * v.x, t * v.y, t * v.z)
}

export function scaleBy(v: Vec3, t: number): Vec3 {
  return new Vec3(t * v.x, t * v.y, t * v.z)
}

export function div(v: Vec3, t: number): Vec3 {
  const inverse = 1.0 / t
  return new Vec3(inverse * v.x, inverse * v.y, inverse * v.z)
}

export function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  const x = a.y * b.z - a.z * b.y
  const y = a.z * b.x - a.x * b.z
  const z = a.x * b.y - a.y * b.x
  return new Vec3(x, y, z)
}

export function unitVector(v: Vec3): Vec3 {
  return div(v, v.length())
}

// fin du module
```
::

::devlog-note{kicker="C++ EN CLAIR"}
En JS, un objet passé à une fonction est partagé et un nombre est copié. En C++, **tout est copié** par défaut, objets compris. `const Vec3& a` demande une référence, un alias vers l'objet de l'appelant, au lieu d'une copie, et `const` interdit de le modifier : c'est la façon standard de passer un objet en lecture. Une référence sans `const` (`std::ostream& out`, plus tard `Rng& rng`) permet de modifier l'original. Un pointeur (`const Material*`, au jour 2) est une adresse qui peut valoir `nullptr`, l'équivalent de `null`.
::

Quelques détails qui comptent :

- **Les opérateurs sont des fonctions libres**, hors du `struct` : elles traitent les deux opérandes de façon symétrique. Seules les méthodes qui ne parlent que d'un vecteur (`length`) sont dedans.
- **Pas de `+=`.** On écrira `sum = sum + couleur`. Un opérateur de moins à écrire et à comprendre, et le compilateur produit le même code.
- **`/` multiplie par l'inverse.** Une division coûte plusieurs fois une multiplication. Ici on fait une division et trois multiplications au lieu de trois divisions.
- **Tout est passé par `const&`**. Pour 24 octets, une copie coûterait à peu près pareil, mais `const&` est l'idiome, et il dit « je ne modifie pas ».

### Le produit scalaire

C'est l'opération la plus utilisée de tout le raytracer. Calcul trivial, sens profond.

::devlog-formula{label="Produit scalaire"}
$$
\mathbf{a} \cdot \mathbf{b} = a_x b_x + a_y b_y + a_z b_z
$$

$$
\mathbf{a} \cdot \mathbf{b} = \lVert \mathbf{a} \rVert \, \lVert \mathbf{b} \rVert \cos\theta
$$
::

La deuxième ligne est celle qui compte. Elle dit trois choses :

- **le signe donne l'orientation.** Positif : les deux vecteurs pointent du même côté ($\theta < 90°$). Négatif : côtés opposés. Nul : perpendiculaires. Au jour 2, c'est ce qui dira si un rayon frappe une surface par l'avant ou par l'arrière.
- **avec un vecteur unitaire, c'est une projection.** Si $\lVert \mathbf{b} \rVert = 1$, alors $\mathbf{a} \cdot \mathbf{b}$ est la longueur de l'ombre de $\mathbf{a}$ sur l'axe de $\mathbf{b}$. C'est le trait orange de la démo.
- **$\mathbf{a} \cdot \mathbf{a} = \lVert \mathbf{a} \rVert^2$.** La longueur au carré, sans racine. C'est exactement `lengthSquared()`, et on s'en servira pour éviter des `sqrt` inutiles.

::devlog-figure{n="01" caption="Le produit scalaire projette, le produit vectoriel mesure une aire"}
  :::demo-vectors
  :::
::

Mets $\mathbf{a}$ et $\mathbf{b}$ à angle droit : le produit scalaire tombe à zéro, la projection disparaît. Retourne $\mathbf{b}$ : la projection passe de l'autre côté de l'origine, le produit scalaire devient négatif.

### Le produit vectoriel

::devlog-formula{label="Produit vectoriel"}
$$
\mathbf{a} \times \mathbf{b} = \left( a_y b_z - a_z b_y,\ a_z b_x - a_x b_z,\ a_x b_y - a_y b_x \right)
$$

$$
\lVert \mathbf{a} \times \mathbf{b} \rVert = \lVert \mathbf{a} \rVert \, \lVert \mathbf{b} \rVert \sin\theta
$$
::

Le résultat est un **vecteur perpendiculaire** à $\mathbf{a}$ et à $\mathbf{b}$, orienté selon la règle de la main droite, et dont la longueur vaut l'aire du parallélogramme formé par les deux. Dans la démo en 2D, $\mathbf{a} \times \mathbf{b}$ pointe hors de l'écran : seule sa composante `z` existe, et elle est égale à l'aire grisée, avec un signe qui dit si $\mathbf{b}$ est à gauche ou à droite de $\mathbf{a}$.

Attention, il n'est **pas commutatif** : $\mathbf{b} \times \mathbf{a} = -(\mathbf{a} \times \mathbf{b})$. Inverser l'ordre retourne une normale. Le jour 1 n'en a pas besoin, mais la caméra orientable du jour 2 s'en sert pour construire un repère à partir d'une direction de visée, et le triangle du jour 3 pour calculer sa normale.

### Longueur et normalisation

$\lVert \mathbf{v} \rVert = \sqrt{\mathbf{v} \cdot \mathbf{v}}$, et $\text{unitVector}(\mathbf{v}) = \mathbf{v} / \lVert \mathbf{v} \rVert$. Un vecteur unitaire, c'est une direction pure. On en a besoin dès qu'une formule suppose $\lVert \mathbf{v} \rVert = 1$, comme le ciel en section 06.

Le piège : normaliser un vecteur nul. $0/0$ en flottant donne `NaN`, pas une exception. Et un `NaN` contamine tout ce qu'il touche, silencieusement, jusqu'à un pixel noir au milieu de l'image. Pas besoin de le gérer partout aujourd'hui, mais il faut savoir que ça existe le jour où un pixel noir sort de nulle part.

### Les tests de Vec3

`Vec3` est la seule pièce du projet où un test unitaire coûte trois lignes et rapporte énormément. Une erreur de signe dans `cross`, et tout ce qui en dépend est faux, sans planter. Le rendu sera juste « un peu bizarre », et tu chercheras pendant une heure dans la mauvaise fonction.

Une subtilité : on ne compare **jamais** deux flottants avec `==`. `0.1 + 0.2 == 0.3` est faux en IEEE 754. Catch2 fournit le matcher `WithinAbs(valeur, tolérance)`, utilisé avec `REQUIRE_THAT`, l'équivalent du `toBeCloseTo` de Vitest. Une petite fonction `requireNear` évite de répéter trois lignes par vecteur. `using r3d::Vec3;` en tête de fichier importe un nom pour ne plus écrire le préfixe, comme un `import { Vec3 } from ...`.

::devlog-note{kicker="C++ EN CLAIR"}
Catch2 ressemble à Vitest. `TEST_CASE("nom", "[tag]") { ... }` est le `test("nom", () => { ... })`, `REQUIRE(a == b)` est le `expect(a).toBe(b)` et arrête le test au premier échec.
::

Fichier `tests/vec3_test.cc` :

::code-compare{right="JS (Vitest)"}
#cpp
```cpp
#include <catch2/catch_test_macros.hpp>
#include <catch2/matchers/catch_matchers_floating_point.hpp>

#include "math/vec3.h"

using Catch::Matchers::WithinAbs;
using r3d::Vec3;

namespace {

void requireNear(const Vec3& actual, const Vec3& expected) {
    REQUIRE_THAT(actual.x, WithinAbs(expected.x, 1e-12));
    REQUIRE_THAT(actual.y, WithinAbs(expected.y, 1e-12));
    REQUIRE_THAT(actual.z, WithinAbs(expected.z, 1e-12));
}

}  // namespace

TEST_CASE("dot of perpendicular vectors is zero", "[vec3]") {
    REQUIRE_THAT(
        r3d::dot(Vec3{1, 0, 0}, Vec3{0, 3, 0}),
        WithinAbs(0.0, 1e-12));
}

TEST_CASE(
    "dot of a vector with itself is its squared length",
    "[vec3]") {
    const Vec3 v{1, 2, 3};
    REQUIRE_THAT(
        r3d::dot(v, v), WithinAbs(v.lengthSquared(), 1e-12));
    REQUIRE_THAT(
        v.length() * v.length(),
        WithinAbs(v.lengthSquared(), 1e-12));
}

TEST_CASE("cross follows the right-hand rule", "[vec3]") {
    requireNear(
        r3d::cross(Vec3{1, 0, 0}, Vec3{0, 1, 0}),
        Vec3{0, 0, 1});
}

TEST_CASE("cross is anti-commutative", "[vec3]") {
    const Vec3 a{1, 2, 3};
    const Vec3 b{-4, 0.5, 2};
    requireNear(r3d::cross(b, a), -r3d::cross(a, b));
}

TEST_CASE("unitVector has length one", "[vec3]") {
    REQUIRE_THAT(
        r3d::unitVector(Vec3{3, -4, 12}).length(),
        WithinAbs(1.0, 1e-12));
}

TEST_CASE("scalar product works on both sides", "[vec3]") {
    const Vec3 v{1, -2, 3};
    requireNear(2.0 * v, v * 2.0);
    requireNear(2.0 * v, Vec3{2, -4, 6});
}
```

#ts
```ts
import { expect, test } from 'vitest'
// WithinAbs ≈ expect(...).toBeCloseTo(valeur, chiffres)

import { cross, dot, negate, scale, scaleBy, unitVector,
         Vec3 } from '../src/math/vec3'

// (toBeCloseTo est déjà une méthode d'expect)
// (Vec3 importé ci-dessus)

// fonction locale au fichier, non exportée

function requireNear(actual: Vec3, expected: Vec3): void {
  expect(actual.x).toBeCloseTo(expected.x, 12)
  expect(actual.y).toBeCloseTo(expected.y, 12)
  expect(actual.z).toBeCloseTo(expected.z, 12)
}

//

test('dot of perpendicular vectors is zero', () => {
  expect(
    dot(new Vec3(1, 0, 0), new Vec3(0, 3, 0)),
  ).toBeCloseTo(0.0, 12)
})

test(
  'dot of a vector with itself is its squared length',
  () => {
  const v = new Vec3(1, 2, 3)
  expect(
    dot(v, v)).toBeCloseTo(v.lengthSquared(), 12)
  expect(
    v.length() * v.length(),
  ).toBeCloseTo(v.lengthSquared(), 12)
})

test('cross follows the right-hand rule', () => {
  requireNear(
    cross(new Vec3(1, 0, 0), new Vec3(0, 1, 0)),
    new Vec3(0, 0, 1))
})

test('cross is anti-commutative', () => {
  const a = new Vec3(1, 2, 3)
  const b = new Vec3(-4, 0.5, 2)
  requireNear(cross(b, a), negate(cross(a, b)))
})

test('unitVector has length one', () => {
  expect(
    unitVector(new Vec3(3, -4, 12)).length(),
  ).toBeCloseTo(1.0, 12)
})

test('scalar product works on both sides', () => {
  const v = new Vec3(1, -2, 3)
  requireNear(scale(2.0, v), scaleBy(v, 2.0))
  requireNear(scale(2.0, v), new Vec3(2, -4, 6))
})
```
::

Le deuxième argument de `TEST_CASE` est un tag. `./build/r3d_tests "[vec3]"` ne lance que les tests de ce module : pratique quand la suite grossit.

::devlog-section{num="03" kicker="L'IMAGE" title="Un tableau de couleurs, et un fichier texte."}
::

Une image, pour un raytracer, c'est un rectangle de $w \times h$ pixels, chacun avec une couleur RGB. Rien de plus. Pas de canvas, pas de contexte, pas de swap chain. On calcule chaque pixel, on le range quelque part, et à la fin on écrit le tout dans un fichier.

### Un tableau à plat

L'intuition naturelle serait un tableau 2D : `pixels[y][x]`. En pratique, on stocke **un seul tableau linéaire** de $w \times h$ cases, et on range les lignes bout à bout. C'est ce qu'on appelle l'ordre *row-major* : la ligne 0 d'abord, de gauche à droite, puis la ligne 1, etc.

::devlog-formula{label="Index d'un pixel (row-major)"}
$$
\text{index} = y \cdot w + x
$$

$$
x = \text{index} \bmod w \qquad y = \left\lfloor \frac{\text{index}}{w} \right\rfloor
$$
::

Pourquoi à plat ? Parce qu'un `std::vector` de `std::vector` alloue chaque ligne séparément, n'importe où en mémoire. Un seul bloc contigu, c'est une allocation, aucune indirection, et un parcours $y$ puis $x$ qui lit la mémoire dans l'ordre. Le cache CPU adore ça. C'est aussi exactement la façon dont une texture vit en VRAM : `gl.texImage2D` attend un `Uint8Array` à plat, pas un tableau de tableaux.

::devlog-figure{n="02" caption="Chaque pixel de l'image a une seule case en mémoire : y · w + x"}
  :::schema-pixel-buffer
  :::
::

Regarde le pixel B, en $(4, 1)$ : il est à l'index $1 \cdot 6 + 4 = 10$. Si l'image faisait 8 pixels de large, il serait à l'index 12, sans avoir bougé dans l'image. L'index dépend de $w$. C'est le bug classique quand on se trompe de dimension et qu'on écrit $x \cdot h + y$ ou $y \cdot h + x$. L'image sort décalée en diagonale, ou en bandes. Si tu vois ça un jour, regarde ta formule d'index avant tout le reste.

### Des floats, pas des octets

Chaque canal est stocké en `double` entre `0.0` et `1.0`, pas en entier entre 0 et 255. Trois raisons :

1. **Les maths parlent en réels.** Un éclairage, c'est $0.73 \times \text{couleur}$. Avec des octets, tu arrondis à chaque opération et l'erreur s'accumule.
2. **On va additionner.** Dès le jour 2, chaque pixel est la moyenne de plusieurs rayons (antialiasing). Additionner 100 échantillons dans un octet, ça déborde au troisième.
3. **On peut dépasser 1.** Une source lumineuse peut renvoyer plus que du blanc. On garde l'info jusqu'au bout, et on ne coupe qu'à l'écriture.

C'est la même logique qu'un render target `HalfFloatType` dans Three.js avant le tone mapping : on travaille en haute précision, on convertit en 8 bits au tout dernier moment.

### La classe Image

Le type `Color` vient de `math/vec3.h`, écrit à la section précédente : une couleur, c'est trois `double`, `x`, `y`, `z` pour rouge, vert, bleu.

Fichier `src/image/image.h` :

::code-compare
#cpp
```cpp
#pragma once

#include <vector>

#include "math/vec3.h"

namespace r3d {

class Image {
public:
    Image(int width, int height);

    int width() const { return width_; }
    int height() const { return height_; }

    Color pixel(int x, int y) const {
        return pixels_[index(x, y)];
    }
    void setPixel(int x, int y, const Color& color) {
        pixels_[index(x, y)] = color;
    }

private:
    int index(int x, int y) const { return y * width_ + x; }

    int width_;
    int height_;
    std::vector<Color> pixels_;
};

}  // namespace r3d
```

#ts
```ts
// (pas d'équivalent : les modules ES)

// <vector> : les tableaux sont natifs

import type { Color } from '../math/vec3'

// namespace r3d : le module lui-même

export class Image {
  // public : le défaut en TS
  constructor(width: number, height: number) // -> image.cc

  width(): number { return this.#width }
  height(): number { return this.#height }

  pixel(x: number, y: number): Color {
    return this.#pixels[this.#index(x, y)]
  }
  setPixel(x: number, y: number, color: Color): void {
    this.#pixels[this.#index(x, y)] = color
  }

  // private : le préfixe # en TS
  #index(x: number, y: number): number {
    return y * this.#width + x }

  readonly #width: number
  readonly #height: number
  readonly #pixels: Color[]
}

// fin du module
```
::

Fichier `src/image/image.cc` :

::code-compare
#cpp
```cpp
#include "image/image.h"

#include <cstddef>
#include <stdexcept>

namespace r3d {

Image::Image(int width, int height)
    : width_(width), height_(height) {
    if (width <= 0 || height <= 0) {
        throw std::invalid_argument(
            "Image: width and height must be positive");
    }
    const std::size_t pixelCount =
        static_cast<std::size_t>(width)
            * static_cast<std::size_t>(height);
    pixels_.resize(pixelCount);
}

}  // namespace r3d
```

#ts
```ts
// image.ts, suite : le corps du constructeur

// <cstddef> : size_t, pas d'équivalent (un seul type number)
// <stdexcept> : les classes d'erreur sont globales

// namespace r3d

constructor(width: number, height: number) {
  this.#width = width; this.#height = height
  if (width <= 0 || height <= 0) {
    throw new RangeError(
      'Image: width and height must be positive')
  }
  const pixelCount =
    width
      * height
  this.#pixels = Array.from({ length: pixelCount },
    () => new Vec3()) // cases noires
}

// fin du module
```
::

Beaucoup de syntaxe nouvelle en vingt lignes. Dans l'ordre :


::devlog-note{kicker="C++ EN CLAIR"}
`class` ressemble à une classe TypeScript, mais `public:` et `private:` ouvrent des sections au lieu d'annoter chaque membre. Le constructeur porte le nom de la classe ; sa déclaration est dans le `.h`, son corps dans le `.cc`, préfixé par `Image::`. `: width_(width), height_(height)` est la liste d'initialisation : elle remplit les membres avant le corps, comme les *parameter properties* de TS (`constructor(private width: number)`). Le `const` après `int width()` promet que la méthode ne modifie pas l'objet.
::

::devlog-note{kicker="C++ EN CLAIR"}
`std::vector<Color>` est le `Array<Color>` du C++ : un tableau dynamique d'un seul type, écrit entre chevrons comme un générique TS. `resize(n)` fixe la taille (les cases sont remplies avec `Color{}`, donc du noir), `push_back(x)` est le `push` de JS. La mémoire est libérée toute seule quand l'`Image` disparaît.
::

::devlog-note{kicker="C++ EN CLAIR"}
`throw std::invalid_argument("...")` est le `throw new RangeError("...")` de JS, sans `new`. `static_cast<std::size_t>(width)` est une conversion de type écrite en toutes lettres : `std::size_t` est l'entier non signé qui sert aux tailles. Ici, la multiplication se fait en `std::size_t` pour ne pas déborder d'un `int` sur une image géante.
::

Et trois choix de conception :

- **Des membres privés.** Une `Image` a un invariant : `pixels_.size() == width_ * height_`. Si `width_` était public, n'importe qui pourrait le modifier et casser la formule d'index. Les accesseurs ne coûtent rien : définis dans la classe, le compilateur les intègre au code appelant.
- **Lire et écrire, deux méthodes.** `pixel(x, y)` renvoie une copie de la couleur, `setPixel(x, y, couleur)` l'écrit. On croisera souvent dans du C++ une seule méthode `at()` qui renvoie une référence modifiable (`image.at(x, y) = couleur`), mais deux noms explicites se lisent mieux.
- **Le constructeur refuse une image vide.** Une largeur nulle produirait une division par zéro dans la caméra, bien plus loin. Mieux vaut échouer tout de suite, avec un message.

### Le format PPM

Pour écrire l'image, on n'a pas besoin de PNG ni de bibliothèque. Le format [PPM](https://netpbm.sourceforge.net/doc/ppm.html), variante `P3`, est du **texte brut** :

- ligne 1 : le nombre magique `P3` ;
- ligne 2 : largeur et hauteur, séparées par un espace ;
- ligne 3 : la valeur max d'un canal, ici `255` ;
- puis un pixel par ligne, `R G B` en entiers, dans l'ordre row-major.

Pour une image de 3 × 2 qui va du noir au rouge en haut, et du vert au jaune en bas, ça donne :

```
P3
3 2
255
0 0 0
127 0 0
255 0 0
0 255 0
127 255 0
255 255 0
```

C'est le format le plus bête du monde, et c'est sa qualité : tu peux l'ouvrir dans un éditeur de texte pour déboguer un pixel précis. Le schéma plus haut donne d'ailleurs le numéro de ligne PPM de chaque pixel repéré : $\text{index} + 4$, puisque les trois lignes d'en-tête passent avant.

La conversion vers l'octet a un petit piège. Le réflexe est $\text{octet} = \lfloor 255 \cdot v \rfloor$. Problème : seul $v = 1.0$ exact donne $255$, donc la dernière case est quasiment vide. Le livre utilise $\lfloor 256 \cdot v \rfloor$ après avoir clampé $v$ dans $[0,\ 0.999]$, ce qui répartit les 256 valeurs uniformément sur $[0, 1]$. Et le clamp protège aussi du `1.3`, qui deviendrait 332, ce qui n'est pas une couleur valide.

::devlog-formula{label="Conversion à l'écriture"}
$$
v' = \operatorname{clamp}(v,\ 0,\ 0.999)
$$

$$
\text{octet} = \lfloor 256 \cdot v' \rfloor
$$
::

Fichier `src/io/ppm.h` :

::code-compare
#cpp
```cpp
#pragma once

#include <ostream>

#include "image/image.h"

namespace r3d {

void writePpm(std::ostream& out, const Image& image);

}  // namespace r3d
```

#ts
```ts
// (pas d'équivalent : les modules ES)

import type { Writable } from 'node:stream' // <ostream>

import type { Image } from '../image/image'

// namespace r3d

export function writePpm(out: Writable, image: Image): void

// fin du module
```
::

Fichier `src/io/ppm.cc` :

::code-compare
#cpp
```cpp
#include "io/ppm.h"

#include <algorithm>

namespace r3d {

namespace {

int toByte(double channel) {
    const double clamped = std::clamp(channel, 0.0, 0.999);
    return static_cast<int>(256.0 * clamped);
}

}  // namespace

void writePpm(std::ostream& out, const Image& image) {
    out << "P3\n";
    out << image.width() << ' ' << image.height() << '\n';
    out << "255\n";

    for (int y = 0; y < image.height(); ++y) {
        for (int x = 0; x < image.width(); ++x) {
            const Color color = image.pixel(x, y);
            const int red = toByte(color.x);
            const int green = toByte(color.y);
            const int blue = toByte(color.z);
            out << red << ' ' << green << ' ' << blue << '\n';
        }
    }
}

}  // namespace r3d
```

#ts
```ts
import type { Writable } from 'node:stream'

// <algorithm> : std::clamp, écrit à la main ci-dessous

// namespace r3d

// namespace anonyme : fonction non exportée

function toByte(channel: number): number {
  const clamped = Math.min(Math.max(channel, 0.0), 0.999)
  return Math.trunc(256.0 * clamped)
}

// fin du namespace anonyme

export function writePpm(out: Writable, image: Image): void {
  out.write('P3\n')
  out.write(`${image.width()} ${image.height()}\n`)
  out.write('255\n')

  for (let y = 0; y < image.height(); ++y) {
    for (let x = 0; x < image.width(); ++x) {
      const color = image.pixel(x, y)
      const red = toByte(color.x)
      const green = toByte(color.y)
      const blue = toByte(color.z)
      out.write(`${red} ${green} ${blue}\n`)
    }
  }
}

// fin du module
```
::

::devlog-note{kicker="C++ EN CLAIR"}
`std::ostream` est un flux de sortie, l'équivalent d'un *writable stream* de Node. `out << x` écrit `x` dans le flux, et s'enchaîne : `out << red << ' ' << green` écrit trois choses à la suite. `std::cout` est `process.stdout`, `std::clog` est `process.stderr`, `std::ostringstream` écrit dans une chaîne en mémoire. Le `&` de `std::ostream& out` veut dire « le flux de l'appelant, pas une copie » ; on a vu les références avec `Vec3`.
::

Prendre un `std::ostream&` plutôt qu'un nom de fichier, c'est ce qui permet d'écrire vers `std::cout`, vers un fichier (`std::ofstream`), ou vers un `std::ostringstream` dans un test, sans changer une ligne. `toByte` vit dans un espace de noms anonyme : c'est un détail d'implémentation, personne d'autre n'a à l'appeler. `std::clamp(v, 0.0, 0.999)` vaut `Math.min(Math.max(v, 0), 0.999)`, et `static_cast<int>` tronque vers zéro comme `Math.trunc`. `'\n'` entre apostrophes est un caractère seul, `"P3\n"` entre guillemets une chaîne.

On écrit l'image sur la sortie standard et on redirige vers un fichier. Conséquence directe : tout message de progression doit partir sur `std::clog` (stderr), jamais sur `std::cout`. Un seul `std::cout << "done"` oublié et le fichier est corrompu.

::devlog-note{kicker="CARNET DE BORD" tone="accent"}
Mon premier `image.ppm` faisait zéro octet. `writePpm` était écrite, mais `main` se contentait de `return 0` : une fonction qui existe ne s'exécute pas toute seule. Le deuxième faisait trois lignes, l'en-tête et rien d'autre, parce que la double boucle n'était pas encore écrite. Et entre les deux, j'ai corrigé pendant dix minutes un fichier que CMake ne compilait pas : une vieille copie de `ppm.cc` dans un sous-dossier, pendant que je relançais sagement un binaire daté de 10 h 16.

Deux réflexes en sont sortis. Enchaîner `cmake --build build && ./build/r3d > image.ppm`, pour qu'un build raté n'écrive jamais d'image. Et regarder `wc -l image.ppm` avant d'ouvrir quoi que ce soit : 3 lignes d'en-tête plus une par pixel, sinon il manque quelque chose.
::

### Le test de l'image

Le test vérifie deux choses d'un coup : l'ordre row-major (le pixel $(2, 0)$ est le troisième écrit, le pixel $(0, 1)$ le quatrième) et le format exact du fichier. Le `std::ostringstream` remplace le fichier : aucun disque, aucun nettoyage.

Fichier `tests/image_test.cc` :

::code-compare{right="JS (Vitest)"}
#cpp
```cpp
#include <catch2/catch_test_macros.hpp>

#include <sstream>
#include <stdexcept>
#include <string>

#include "image/image.h"
#include "io/ppm.h"

TEST_CASE("pixels are stored row-major", "[image]") {
    r3d::Image image(3, 2);
    image.setPixel(2, 0, r3d::Color{1, 0, 0});
    image.setPixel(0, 1, r3d::Color{0, 1, 0});

    std::ostringstream out;
    r3d::writePpm(out, image);

    const std::string expected =
        "P3\n3 2\n255\n"
        "0 0 0\n0 0 0\n255 0 0\n"
        "0 255 0\n0 0 0\n0 0 0\n";
    REQUIRE(out.str() == expected);
}

TEST_CASE("channels are clamped before conversion", "[ppm]") {
    r3d::Image image(1, 1);
    image.setPixel(0, 0, r3d::Color{1.3, -0.2, 0.5});

    std::ostringstream out;
    r3d::writePpm(out, image);

    REQUIRE(out.str() == "P3\n1 1\n255\n255 0 128\n");
}

TEST_CASE("an empty image is rejected", "[image]") {
    REQUIRE_THROWS_AS(
        r3d::Image(0, 10), std::invalid_argument);
}
```

#ts
```ts
import { expect, test } from 'vitest'

// <sstream> : un faux flux qui accumule une string
// <stdexcept> : RangeError est global
import { Vec3 } from '../src/math/vec3' // (<string>)

import { Image } from '../src/image/image'
import { writePpm } from '../src/io/ppm'

test('pixels are stored row-major', () => {
  const image = new Image(3, 2)
  image.setPixel(2, 0, new Vec3(1, 0, 0))
  image.setPixel(0, 1, new Vec3(0, 1, 0))

  const out = { text: '', write(t: string) { out.text += t } }
  writePpm(out, image)

  const expected =
    'P3\n3 2\n255\n'
    + '0 0 0\n0 0 0\n255 0 0\n'
    + '0 255 0\n0 0 0\n0 0 0\n'
  expect(out.text).toBe(expected)
})

test('channels are clamped before conversion', () => {
  const image = new Image(1, 1)
  image.setPixel(0, 0, new Vec3(1.3, -0.2, 0.5))

  const out = { text: '', write(t: string) { out.text += t } }
  writePpm(out, image)

  expect(out.text).toBe('P3\n1 1\n255\n255 0 128\n')
})

test('an empty image is rejected', () => {
  expect(
    () => new Image(0, 10)).toThrow(RangeError)
})
```
::

::devlog-note{kicker="C++ EN CLAIR"}
`REQUIRE_THROWS_AS(expression, Type)` vérifie qu'une exception de ce type est levée, comme `expect(() => ...).toThrow(RangeError)`. `r3d::Image image(3, 2);` crée l'objet directement, sans `new` : il est détruit tout seul à la fin du bloc.
::

::devlog-note{kicker="PIÈGE" tone="accent"}
`double r = i / (w - 1);` avec `i` et `w` entiers donne 0 partout, sauf au dernier pixel. La division est entière avant d'être convertie. Il faut caster un des deux côtés en `double` d'abord.
::

Premier jalon, si tu veux voir quelque chose avant d'avoir une caméra : dans `main`, remplis l'image avec $r = x / (w - 1)$, $g = y / (h - 1)$, $b = 0$ et écris-la. Tu dois obtenir le dégradé du schéma : noir en haut à gauche, rouge à droite, vert en bas, jaune en bas à droite. Si le vert est en haut, tes lignes sont à l'envers.

::devlog-section{num="04" kicker="LE RAYON" title="Une origine, une direction, un paramètre."}
::

À ce stade, j'avais un tableau de pixels et une algèbre pour parler d'espace, mais rien qui relie l'un à l'autre. Le dégradé rouge et vert prouvait que l'écriture marchait, pas qu'on regardait quoi que ce soit. Le rayon est la pièce qui manque : c'est lui qui transforme un pixel en question posée à la scène.

Un rayon, c'est une demi-droite. On le décrit avec un point de départ $O$ et une direction $\mathbf{D}$, et n'importe quel point du rayon s'obtient en avançant d'une quantité $t$ le long de $\mathbf{D}$.

::devlog-formula{label="Équation du rayon"}
$$
P(t) = O + t\,\mathbf{D}
$$
::

C'est la forme **paramétrique** : au lieu de dire « l'ensemble des points qui vérifient telle équation », on dit « le point que j'obtiens pour telle valeur de $t$ ». C'est exactement ce qu'il faut pour un raytracer, parce que la question qu'on posera à chaque objet de la scène sera : *pour quelle valeur de $t$ ce rayon te touche-t-il ?* Et parmi toutes les réponses, on gardera le plus petit $t$ positif : l'objet le plus proche.

::devlog-figure{n="03" caption="P(t) avance d'un pas de D à chaque unité de t, et recule derrière O quand t < 0"}
  :::schema-ray
  :::
::

Quelques remarques qui comptent pour la suite :

- **$t < 0$, c'est derrière l'origine.** Un objet touché à $t = -2$ est derrière la caméra. Il faudra le rejeter, sinon tu verras des objets qui sont dans ton dos.
- **$\mathbf{D}$ n'a pas besoin d'être unitaire.** Si $\lVert \mathbf{D} \rVert = 1$, alors $t$ est une distance. Sinon, $t$ est mesuré en « nombre de $\mathbf{D}$ ». Les deux marchent, il faut juste savoir lequel tu manipules.
- **Un rayon est une valeur.** Deux `Vec3`, aucune ressource, aucune identité, et il ne change jamais après sa création. D'où des membres privés lisibles par deux accesseurs, sans rien pour les modifier : on construit, on lit, c'est tout.

Fichier `src/math/ray.h` :

::code-compare
#cpp
```cpp
#pragma once

#include "math/vec3.h"

namespace r3d {

class Ray {
public:
    Ray(const Point3& origin, const Vec3& direction)
        : origin_(origin), direction_(direction) {}

    Point3 origin() const { return origin_; }
    Vec3 direction() const { return direction_; }

    Point3 at(double t) const {
        return origin_ + t * direction_;
    }

private:
    Point3 origin_;
    Vec3 direction_;
};

}  // namespace r3d
```

#ts
```ts
// (pas d'équivalent : les modules ES)

import { add, scale, type Point3, type Vec3 } from './vec3'

// namespace r3d

export class Ray {
  // public :
  constructor(origin: Point3, direction: Vec3) {
    this.#origin = origin; this.#direction = direction }

  origin(): Point3 { return this.#origin }
  direction(): Vec3 { return this.#direction }

  at(t: number): Point3 {
    return add(this.#origin, scale(t, this.#direction))
  }

  // private :
  readonly #origin: Point3
  readonly #direction: Vec3
}

// fin du module
```
::

Un seul constructeur, qui exige une origine et une direction : il est impossible de fabriquer un rayon à moitié rempli. `origin()` et `direction()` renvoient des copies, 24 octets chacune, un coût invisible à côté du reste. `Ray` est tout entier dans le header, comme `Vec3` : trois lignes de logique, appelées des millions de fois, le compilateur doit voir leur corps.

::devlog-section{num="05" kicker="LA CAMÉRA" title="D'où partent les rayons, et où ils passent."}
::

On a une image et des rayons. Il reste à relier les deux : pour chaque pixel $(i, j)$, quel rayon lancer ?

Le modèle est celui d'une **caméra sténopé** (*pinhole*). Un œil ponctuel, et devant lui, à une distance fixe, un rectangle dans l'espace : le **viewport**. On découpe ce rectangle en une grille de $w \times h$ cases, une par pixel. Le rayon du pixel $(i, j)$ part de l'œil et passe par le centre de sa case. Ce qu'il touche dans la scène donne la couleur du pixel.

C'est la vieille fenêtre d'Albrecht Dürer : un cadre quadrillé entre l'œil et le sujet, et on peint chaque case avec ce qu'on voit à travers.

### Le repère

On place l'œil à l'origine. On suit la convention main droite, la même que Three.js et OpenGL :

- $x$ vers la droite,
- $y$ vers le haut,
- la caméra regarde vers **$-z$**.

Si tu as déjà fait `camera.position.z = 5` pour voir un cube placé en `(0, 0, 0)`, c'est la même idée : par défaut, une caméra Three.js regarde vers les $z$ négatifs.

### La taille du viewport

Le viewport est à une distance $f$ de l'œil : la **focale**. Sa hauteur est fixée arbitrairement à 2 (de $y = -1$ à $y = 1$), et sa largeur doit respecter le **rapport d'aspect** de l'image, sinon les pixels ne sont plus carrés et tout est étiré.

::devlog-formula{label="Dimensions"}
$$
h_{\text{image}} = \max\!\left(1,\ \left\lfloor \frac{w_{\text{image}}}{\text{aspect}} \right\rfloor\right)
$$

$$
h_{\text{viewport}} = 2
$$

$$
w_{\text{viewport}} = h_{\text{viewport}} \cdot \frac{w_{\text{image}}}{h_{\text{image}}}
$$
::

Deux pièges dans ces trois lignes.

1. **`16 / 9` vaut 1.** Division entière, encore. Il faut `16.0 / 9.0`.
2. **Le rapport réel n'est pas le rapport idéal.** $h_{\text{image}}$ est tronqué en entier. Avec 400 px de large et 16/9, on obtient 225 px de haut : ça tombe juste. Avec 401 px, on obtient 225 aussi, et le vrai rapport n'est plus 16/9. C'est pour ça que la largeur du viewport se calcule avec $w_{\text{image}} / h_{\text{image}}$ réels (en `double`), pas avec $\text{aspect}$. Sinon, déformation de quelques fractions de pixel, invisible jusqu'au jour où un cercle n'est plus rond.

### La focale et le champ de vision

Hauteur fixe, focale variable : plus le viewport est loin, plus les rayons sont serrés, plus le champ de vision est étroit. C'est un téléobjectif. Viewport proche : rayons écartés, grand angle.

::devlog-formula{label="Champ de vision vertical"}
$$
\text{FOV} = 2 \arctan\!\left( \frac{h_{\text{viewport}} / 2}{f} \right)
$$
::

Avec $f = 1$ et une hauteur de 2, on obtient un FOV vertical de 90°. Au jour 2, la caméra prendra un `verticalFov` en degrés et fera le calcul inverse, comme le `fov` d'une `PerspectiveCamera`. Pour l'instant, focale à 1, et on ne bouge pas.

::devlog-figure{n="04" caption="Vue de profil : un rayon par centre de pixel, le FOV dépend de la focale"}
  :::demo-camera-rays
  :::
::

Fais varier la focale : le viewport recule, l'éventail se referme. Monte le nombre de pixels : les rayons se resserrent, mais ils passent toujours par des **centres**, jamais par les bords des cases.

### Image en bas, monde en haut

Voilà le piège le plus visuel du jour. Dans l'image, $j = 0$ est **en haut** et $j$ augmente vers le bas, parce que c'est l'ordre d'écriture du fichier. Dans le monde, $y$ augmente vers le **haut**. Les deux axes sont opposés.

La solution propre : décrire le viewport avec deux vecteurs d'arête qui suivent l'ordre de l'image, pas celui du monde.

- $\mathbf{V}_u = (w_{\text{viewport}}, 0, 0)$ : le bord haut, de gauche à droite ;
- $\mathbf{V}_v = (0, -h_{\text{viewport}}, 0)$ : le bord gauche, **de haut en bas**.

Le signe moins dans `viewportV` absorbe l'inversion une fois pour toutes. Si tu l'oublies, l'image sort la tête en bas. Avec le ciel de la section suivante, c'est flagrant : le bleu se retrouve en bas.

::devlog-figure{n="05" caption="Le viewport de face : du coin haut gauche au pixel (i, j)"}
  :::schema-viewport
  :::
::

### Le centre des pixels

On divise chaque arête par le nombre de pixels pour obtenir le pas entre deux centres. Puis on part du coin haut gauche, et on avance d'**un demi-pas** dans chaque direction pour tomber au centre du premier pixel.

::devlog-formula{label="Grille de pixels"}
$$
\Delta u = \frac{\mathbf{V}_u}{w_{\text{image}}} \qquad \Delta v = \frac{\mathbf{V}_v}{h_{\text{image}}}
$$

$$
\text{upperLeft} = \text{eye} - (0, 0, f) - \frac{\mathbf{V}_u}{2} - \frac{\mathbf{V}_v}{2}
$$

$$
\text{pixel}_{00} = \text{upperLeft} + \tfrac{1}{2} (\Delta u + \Delta v)
$$

$$
\text{centre}(i, j) = \text{pixel}_{00} + i\,\Delta u + j\,\Delta v
$$
::

Pourquoi le demi-pas ? Un pixel n'est pas un point, c'est une petite surface. Si on visait les coins, l'image entière serait décalée d'un demi-pixel vers le haut à gauche, et la dernière ligne et la dernière colonne viseraient le bord exact du viewport. Viser le centre, c'est échantillonner chaque case de façon symétrique. Au jour 2, l'antialiasing tirera plusieurs rayons au hasard **autour** de ce centre.

Le rayon du pixel $(i, j)$ a pour origine l'œil, et pour direction $\text{centre}(i, j) - \text{eye}$. Pas besoin de normaliser : avec cette direction, $P(1)$ tombe pile sur le centre du pixel dans le viewport. C'est un bon test unitaire, d'ailleurs.

### Qui fait quoi

Le livre, au chapitre 4, met tout ce calcul directement dans `main`. Ça marche, mais `main` mélange alors la configuration, la géométrie de la caméra et la boucle de rendu. On sépare dès maintenant :

- la **caméra** calcule une fois $\text{pixel}_{00}$, $\Delta u$, $\Delta v$ à la construction, puis répond à une seule question : quel rayon pour le pixel $(i, j)$ ;
- la **boucle de rendu** parcourt les pixels, demande un rayon, calcule une couleur, la range dans l'image.

Pré-calculer à la construction plutôt qu'à chaque appel : `rayForPixel` sera appelée $w \times h \times \text{échantillons}$ fois. Pour une image de 1200 × 675 avec 100 échantillons, ça fait 81 millions d'appels. Chaque division évitée compte.

Fichier `src/render/camera.h` :

::code-compare
#cpp
```cpp
#pragma once

#include "math/ray.h"
#include "math/vec3.h"

namespace r3d {

class Camera {
public:
    Camera(int imageWidth,
           double aspectRatio,
           double focalLength = 1.0);

    int imageWidth() const { return imageWidth_; }
    int imageHeight() const { return imageHeight_; }

    Ray rayForPixel(int i, int j) const;

private:
    int imageWidth_;
    int imageHeight_;
    Point3 center_;
    Point3 pixel00_;
    Vec3 pixelDeltaU_;
    Vec3 pixelDeltaV_;
};

}  // namespace r3d
```

#ts
```ts
// (pas d'équivalent : les modules ES)

import type { Ray } from '../math/ray'
import type { Point3, Vec3 } from '../math/vec3'

// namespace r3d

export class Camera {
  // public :
  constructor(imageWidth: number,
              aspectRatio: number,
              focalLength = 1.0) // corps : camera.cc

  imageWidth(): number { return this.#imageWidth }
  imageHeight(): number { return this.#imageHeight }

  rayForPixel(i: number, j: number): Ray // camera.cc

  // private :
  readonly #imageWidth: number
  readonly #imageHeight: number
  readonly #center: Point3
  readonly #pixel00: Point3
  readonly #pixelDeltaU: Vec3
  readonly #pixelDeltaV: Vec3
}

// fin du module
```
::

Fichier `src/render/camera.cc` :

::code-compare
#cpp
```cpp
#include "render/camera.h"

namespace r3d {

namespace {

int computeImageHeight(int imageWidth, double aspectRatio) {
    const int height =
        static_cast<int>(imageWidth / aspectRatio);
    if (height < 1) {
        return 1;
    }
    return height;
}

}  // namespace

Camera::Camera(int imageWidth,
               double aspectRatio,
               double focalLength)
    : imageWidth_(imageWidth),
      imageHeight_(computeImageHeight(imageWidth,
                                      aspectRatio)) {
    center_ = Point3{0.0, 0.0, 0.0};

    const double viewportHeight = 2.0;
    // The truncated pixel ratio, not aspectRatio, keeps
    // pixels square.
    const double pixelRatio =
        static_cast<double>(imageWidth_)
            / static_cast<double>(imageHeight_);
    const double viewportWidth = viewportHeight * pixelRatio;

    const Vec3 viewportU{viewportWidth, 0.0, 0.0};
    const Vec3 viewportV{0.0, -viewportHeight, 0.0};

    pixelDeltaU_ = viewportU / imageWidth_;
    pixelDeltaV_ = viewportV / imageHeight_;

    const Point3 viewportCenter =
        center_ - Vec3{0.0, 0.0, focalLength};
    const Point3 upperLeft =
        viewportCenter - viewportU / 2.0 - viewportV / 2.0;
    const Vec3 halfPixel =
        0.5 * (pixelDeltaU_ + pixelDeltaV_);
    pixel00_ = upperLeft + halfPixel;
}

Ray Camera::rayForPixel(int i, int j) const {
    const Point3 pixelCenter =
        pixel00_ + i * pixelDeltaU_ + j * pixelDeltaV_;
    const Vec3 direction = pixelCenter - center_;
    return Ray{center_, direction};
}

}  // namespace r3d
```

#ts
```ts
// camera.ts, suite : les corps des méthodes

// namespace r3d

// namespace anonyme : non exportée

function computeImageHeight(imageWidth: number,
                            aspectRatio: number): number {
  const height =
    Math.trunc(imageWidth / aspectRatio)
  if (height < 1) {
    return 1
  }
  return height
}

//

constructor(imageWidth: number,
            aspectRatio: number,
            focalLength = 1.0) {
  this.#imageWidth = imageWidth
  this.#imageHeight = computeImageHeight(imageWidth,
                                         aspectRatio)
  this.#center = new Vec3(0.0, 0.0, 0.0)

  const viewportHeight = 2.0
  // The truncated pixel ratio, not aspectRatio, keeps
  // pixels square.
  const pixelRatio =
    this.#imageWidth
      / this.#imageHeight
  const viewportWidth = viewportHeight * pixelRatio

  const viewportU = new Vec3(viewportWidth, 0.0, 0.0)
  const viewportV = new Vec3(0.0, -viewportHeight, 0.0)

  this.#pixelDeltaU = div(viewportU, this.#imageWidth)
  this.#pixelDeltaV = div(viewportV, this.#imageHeight)

  const viewportCenter =
    sub(this.#center, new Vec3(0.0, 0.0, focalLength))
  const upperLeft = sub(sub(viewportCenter,
    div(viewportU, 2.0)), div(viewportV, 2.0))
  const halfPixel =
    scale(0.5, add(this.#pixelDeltaU, this.#pixelDeltaV))
  this.#pixel00 = add(upperLeft, halfPixel)
}

rayForPixel(i: number, j: number): Ray {
  const pixelCenter = add(add(this.#pixel00,
    scale(i, this.#pixelDeltaU)), scale(j, this.#pixelDeltaV))
  const direction = sub(pixelCenter, this.#center)
  return new Ray(this.#center, direction)
}

// fin du module
```
::

Ligne par ligne, ce qui n'est pas évident :

- **`double focalLength = 1.0`** dans le header est un paramètre par défaut, comme en JS. On ne le répète pas dans le `.cc`.
- **La liste d'initialisation** (`: imageWidth_(...), imageHeight_(...)`) remplit les membres **dans l'ordre de leur déclaration dans la classe**, pas dans l'ordre de la liste. `imageHeight_` est déclaré après `imageWidth_`, et le corps du constructeur ne s'exécute qu'après : on peut donc s'en servir pour la largeur du viewport. Si l'ordre de la liste et celui des déclarations divergeaient, `-Wall` préviendrait (`-Wreorder`).
- **`computeImageHeight`** garantit une hauteur d'au moins un pixel, même avec un rapport d'aspect absurde. Elle vit dans l'espace de noms anonyme : c'est un détail de la caméra.
- **`center_` est fixé à l'origine** dans le corps. Au jour 2, il deviendra configurable.
- **`i * pixelDeltaU_`** : `i` est un `int`, converti tout seul en `double` pour appeler `operator*(double, const Vec3&)`.

Les tests vérifient la hauteur, la direction du premier rayon, et la propriété « $P(1)$ tombe au centre du pixel ». Pour ce dernier, une image de 4 × 2 pixels donne un viewport de 4 × 2 unités : chaque pixel mesure exactement 1 × 1, et le centre du premier est facile à calculer à la main.

Fichier `tests/camera_test.cc` :

::code-compare{right="JS (Vitest)"}
#cpp
```cpp
#include <catch2/catch_test_macros.hpp>
#include <catch2/matchers/catch_matchers_floating_point.hpp>

#include "render/camera.h"

using Catch::Matchers::WithinAbs;

TEST_CASE(
    "image height follows the aspect ratio", "[camera]") {
    const r3d::Camera camera(400, 16.0 / 9.0);
    REQUIRE(camera.imageHeight() == 225);
}

TEST_CASE("image height is at least one pixel", "[camera]") {
    const r3d::Camera camera(10, 100.0);
    REQUIRE(camera.imageHeight() == 1);
}

TEST_CASE(
    "the ray of the top-left pixel goes up and left",
    "[camera]") {
    const r3d::Camera camera(400, 16.0 / 9.0);
    const r3d::Ray ray = camera.rayForPixel(0, 0);
    REQUIRE(ray.direction().x < 0.0);
    REQUIRE(ray.direction().y > 0.0);
    REQUIRE_THAT(ray.direction().z, WithinAbs(-1.0, 1e-12));
}

TEST_CASE(
    "P(1) lands on the pixel center, in the viewport plane",
    "[camera]") {
    const r3d::Camera camera(4, 2.0);
    const r3d::Point3 p = camera.rayForPixel(0, 0).at(1.0);
    // Viewport 4 x 2, pixels 1 x 1: the first center is half
    // a pixel from the corner.
    REQUIRE_THAT(p.x, WithinAbs(-1.5, 1e-12));
    REQUIRE_THAT(p.y, WithinAbs(0.5, 1e-12));
    REQUIRE_THAT(p.z, WithinAbs(-1.0, 1e-12));
}
```

#ts
```ts
import { expect, test } from 'vitest'
// WithinAbs ≈ toBeCloseTo

import { Camera } from '../src/render/camera'

// (toBeCloseTo est déjà une méthode d'expect)

test(
  'image height follows the aspect ratio', () => {
  const camera = new Camera(400, 16.0 / 9.0)
  expect(camera.imageHeight()).toBe(225)
})

test('image height is at least one pixel', () => {
  const camera = new Camera(10, 100.0)
  expect(camera.imageHeight()).toBe(1)
})

test(
  'the ray of the top-left pixel goes up and left',
  () => {
  const camera = new Camera(400, 16.0 / 9.0)
  const ray = camera.rayForPixel(0, 0)
  expect(ray.direction().x).toBeLessThan(0.0)
  expect(ray.direction().y).toBeGreaterThan(0.0)
  expect(ray.direction().z).toBeCloseTo(-1.0, 12)
})

test(
  'P(1) lands on the pixel center, in the viewport plane',
  () => {
  const camera = new Camera(4, 2.0)
  const p = camera.rayForPixel(0, 0).at(1.0)
  // Viewport 4 x 2, pixels 1 x 1: the first center is half
  // a pixel from the corner.
  expect(p.x).toBeCloseTo(-1.5, 12)
  expect(p.y).toBeCloseTo(0.5, 12)
  expect(p.z).toBeCloseTo(-1.0, 12)
})
```
::

Le test « tête en bas » est le troisième : si le signe de `viewportV` saute, `direction().y` devient négatif pour le pixel du haut, et le test casse avant même qu'on regarde une image.

::devlog-section{num="06" kicker="LE CIEL" title="Premier rendu : un dégradé qui dépend de la direction."}
::

Après une journée de fondations invisibles, voici la première image qui dépend vraiment de tout le reste : les vecteurs, l'image, le rayon et la caméra. Si un seul maillon est faux, ça se voit.

Pas encore d'objet dans la scène. Alors tout rayon part à l'infini, et il faut bien lui donner une couleur. Le livre propose un ciel : blanc à l'horizon, bleu au zénith. C'est le premier rendu qui utilise vraiment la caméra.

### Un mélange linéaire

L'idée : la couleur ne dépend que de **la hauteur vers laquelle pointe le rayon**. Un rayon qui monte voit du bleu, un rayon horizontal voit du blanc. On prend la composante $y$ de la direction normalisée, qui va de $-1$ (tout en bas) à $1$ (tout en haut), et on la ramène dans $[0, 1]$.

::devlog-formula{label="Couleur du ciel"}
$$
\mathbf{d} = \frac{\mathbf{D}}{\lVert \mathbf{D} \rVert} \qquad a = \tfrac{1}{2} (d_y + 1)
$$

$$
\text{couleur} = (1 - a) \cdot \underbrace{(1, 1, 1)}_{\text{blanc}} + a \cdot \underbrace{(0.5, 0.7, 1.0)}_{\text{bleu}}
$$
::

La troisième ligne est une **interpolation linéaire**, le `mix(blanc, bleu, a)` du GLSL. $a = 0$ donne blanc, $a = 1$ donne bleu, et tout ce qui est entre les deux est un mélange proportionnel.

::devlog-figure{n="06" caption="La hauteur du rayon choisit une couleur dans le dégradé"}
  :::schema-sky-lerp
  :::
::

### Pourquoi normaliser

La direction d'un rayon de caméra n'est pas unitaire : elle va de l'œil au centre d'un pixel, et sa longueur varie d'un pixel à l'autre. Si on utilise $d_y$ brut, $a$ peut sortir de $[0, 1]$, et surtout le dégradé dépend de la position du pixel **et** de la focale, pas seulement de l'angle. Exemple : la direction $(0, 2, -1)$ pointe vers le haut à environ 63°. Brute, elle donne $a = 0.5 \cdot (2 + 1) = 1.5$, hors de l'intervalle. Normalisée, $d_y \approx 0.89$ et $a \approx 0.95$. Même direction, résultat complètement différent.

Normaliser, c'est garantir que seule la **direction** compte. C'est un réflexe à prendre dès maintenant : chaque fois qu'une formule parle d'angle, demande-toi si les vecteurs sont unitaires.

### La boucle complète

`main.cc` assemble tout. La fonction `rayColor` vit dans un espace de noms anonyme : pour l'instant, c'est le seul endroit qui en a besoin. Au jour 2, elle grossira et déménagera dans `render/`.

Fichier `src/main.cc` :

::code-compare
#cpp
```cpp
#include <iostream>

#include "image/image.h"
#include "io/ppm.h"
#include "math/ray.h"
#include "math/vec3.h"
#include "render/camera.h"

namespace {

r3d::Color rayColor(const r3d::Ray& ray) {
    const r3d::Vec3 direction =
        r3d::unitVector(ray.direction());
    const double a = 0.5 * (direction.y + 1.0);
    const r3d::Color white{1.0, 1.0, 1.0};
    const r3d::Color blue{0.5, 0.7, 1.0};
    return (1.0 - a) * white + a * blue;
}

}  // namespace

int main() {
    const r3d::Camera camera(400, 16.0 / 9.0);
    r3d::Image image(camera.imageWidth(),
                     camera.imageHeight());

    for (int j = 0; j < image.height(); ++j) {
        std::clog << "\rLignes restantes : "
            << (image.height() - j) << ' ' << std::flush;
        for (int i = 0; i < image.width(); ++i) {
            const r3d::Ray ray = camera.rayForPixel(i, j);
            const r3d::Color color = rayColor(ray);
            image.setPixel(i, j, color);
        }
    }

    r3d::writePpm(std::cout, image);
    std::clog << "\rTerminé.                 \n";
    return 0;
}
```

#ts
```ts
// <iostream> : process.stdout et process.stderr

import { Image } from './image/image'
import { writePpm } from './io/ppm'
import type { Ray } from './math/ray'
import { add, scale, unitVector, Vec3,
         type Color } from './math/vec3'
import { Camera } from './render/camera'

// namespace anonyme : non exportée

function rayColor(ray: Ray): Color {
  const direction =
    unitVector(ray.direction())
  const a = 0.5 * (direction.y + 1.0)
  const white = new Vec3(1.0, 1.0, 1.0)
  const blue = new Vec3(0.5, 0.7, 1.0)
  return add(scale(1.0 - a, white), scale(a, blue))
}

//

function main(): number {
  const camera = new Camera(400, 16.0 / 9.0)
  const image = new Image(camera.imageWidth(),
                          camera.imageHeight())

  for (let j = 0; j < image.height(); ++j) {
    process.stderr.write('\rLignes restantes : '
      + (image.height() - j) + ' ')
    for (let i = 0; i < image.width(); ++i) {
      const ray = camera.rayForPixel(i, j)
      const color = rayColor(ray)
      image.setPixel(i, j, color)
    }
  }

  writePpm(process.stdout, image)
  process.stderr.write('\rTerminé.                 \n')
  return 0
}
```
::

::devlog-note{kicker="C++ EN CLAIR"}
`int main()` est le point d'entrée : le système l'appelle au lancement, et la valeur renvoyée devient le code de sortie du programme (`0` = succès), comme `process.exit(0)`. `const r3d::Camera camera(400, 16.0 / 9.0);` crée l'objet en appelant son constructeur, sans `new`. `const` sur une variable locale ressemble au `const` de JS, en plus strict : l'objet lui-même devient non modifiable, on ne peut appeler que ses méthodes `const`.
::

`j` à l'extérieur, `i` à l'intérieur : on parcourt l'image dans l'ordre de la mémoire et dans l'ordre du fichier. L'inverse marche aussi, mais il saute de ligne en ligne à chaque pixel, et le cache ne suit plus. Le `\r` ramène le curseur en début de ligne : la progression se réécrit sur place au lieu de remplir le terminal.

On compile, on teste, on rend :

```bash
cmake --build build
ctest --test-dir build --output-on-failure
./build/r3d > image.ppm
open image.ppm                      # Aperçu sur macOS lit le PPM
magick image.ppm image.png          # ou ImageMagick pour convertir
```

### Ce que tu dois voir

Avec cette caméra, $f = 1$ et un viewport de 2 de haut, le haut de l'image regarde à 45° au-dessus de l'horizon, le bas à 45° en dessous. Donc $d_y$ ne va pas de $-1$ à $1$ mais d'environ $-0.7$ à $0.7$. Le rendu n'atteint ni le blanc pur ni le bleu pur : un bleu doux en haut, presque blanc en bas.

Autre détail : à cause du rapport d'aspect, les coins sont plus loin du centre que le haut et le bas. Leur direction normalisée a donc un $d_y$ un peu plus faible. Regarde bien le rendu : le dégradé n'est pas parfaitement horizontal, il se courbe légèrement vers les bords. Ce n'est pas un bug, c'est la perspective.

::devlog-your-render{src="/renders/r3d/jour-1.png" alt="Premier rendu de R3D : un dégradé de ciel, bleu en haut, blanc en bas" caption="Rendu de référence · 400 × 225 · un rayon par pixel, aucun objet"}
::

::devlog-note{kicker="PAS ENCORE"}
Les couleurs sont écrites telles quelles, en linéaire. Un écran attend du sRGB, avec une correction gamma. Pour un dégradé de ciel, ça ne se voit pas trop. Au jour 2, avec des matériaux diffus, ça sautera aux yeux : tout paraîtra trop sombre. On corrigera à ce moment-là, dans `toByte`, au même endroit que la conversion en octets.
::

::devlog-section{num="07" kicker="RÉCAP" title="Ce qu'on a construit, et ce qui tient déjà."}
::

En fin de journée, le dépôt ressemble à ça :

```
CMakeLists.txt          r3d_core passe de INTERFACE à STATIC
src/
├── main.cc             rayColor (ciel) + boucle de rendu
├── math/
│   ├── vec3.h          Vec3, Point3, Color, dot, cross, unitVector
│   └── ray.h           Ray, P(t) = O + t·D
├── image/
│   ├── image.h
│   └── image.cc        framebuffer row-major, refuse les tailles nulles
├── io/
│   ├── ppm.h
│   └── ppm.cc          writePpm(ostream, Image), clamp + conversion octet
└── render/
    ├── camera.h
    └── camera.cc       viewport précalculé, rayForPixel(i, j)
tests/
├── vec3_test.cc        6 tests
├── image_test.cc       3 tests
└── camera_test.cc      4 tests
```

Treize tests, trois modules compilés, un exécutable qui écrit une image. Ce qu'il faut retenir de la journée :

- **Les dépendances descendent.** `math` ne connaît personne, `render` connaît tout le monde, `main` compose. On va tenir cette règle jusqu'au BVH.
- **`r3d_core` est compilée une fois et liée deux fois.** Chaque nouveau `.cc` s'ajoute à sa liste, chaque nouveau test à celle de `r3d_tests`.
- **Les fonctions de calcul prennent des flux, pas des fichiers.** `writePpm` écrit dans un `ostringstream` pendant les tests et dans `std::cout` en vrai.
- **Les pièges du jour sont tous silencieux** : division entière, ODR, axe $y$ inversé, `NaN`, un `cout` en trop. Aucun ne plante. Les tests sont là pour ceux qui ne se voient pas à l'œil.

Ce qui m'a le plus surpris ce premier jour, ce ne sont pas les maths. Presque tous mes blocages venaient des outils : CMake, l'éditeur, un binaire périmé, un fichier au mauvais endroit. Jamais d'une formule. C'est aussi pour ça que les tests arrivent dès le premier jour : ils séparent « mon code est faux » de « mon outillage me trompe ».

Demain : des sphères, des normales, de l'antialiasing et les premiers matériaux. Le ciel va enfin servir de lumière.
