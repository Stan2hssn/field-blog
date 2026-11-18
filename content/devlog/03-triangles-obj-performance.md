---
num: "05"
slug: "03-triangles-obj-performance"
series: "R3D"
title: "Des triangles, un fichier OBJ, et de la vitesse."
lede: "Le livre s'arrête aux sphères. Pour rendre un vrai modèle sorti de Blender, il faut savoir toucher un triangle, savoir lire un fichier OBJ, et arrêter de tester seize mille triangles par rayon. Tout le code, et des chiffres mesurés : huit mille fois plus rapide à la fin de la journée."
publishDate: 2026-11-20
readingTime: 36
tags:
  - "C++"
  - "Raytracing"
  - "Triangles"
  - "Multithreading"
  - "BVH"
sections:
  - num: "01"
    kicker: "ARCHITECTURE"
  - num: "02"
    kicker: "LE TRIANGLE"
  - num: "03"
    kicker: "LE FORMAT OBJ"
  - num: "04"
    kicker: "MULTITHREAD"
  - num: "05"
    kicker: "MESURER"
  - num: "06"
    kicker: "BVH"
  - num: "07"
    kicker: "RÉCAP"
closing: "Un raytracer lent qui rend juste vaut mieux qu'un raytracer rapide qui rend faux : on mesure, on accélère, et on vérifie que l'image n'a pas bougé d'un pixel."
---

Les deux premiers jours suivaient [Ray Tracing in One Weekend](https://raytracing.github.io/books/RayTracingInOneWeekend.html). Une caméra, des sphères, trois matériaux. Ça marche, c'est joli, et ça ne sert à rien dès qu'on veut rendre autre chose qu'une boule.

Aujourd'hui, on sort du livre. Objectif : charger Suzanne, le singe de Blender, et la rendre en un temps raisonnable. Ça demande trois briques qui n'ont rien à voir entre elles, plus une discipline :

- **le triangle**, parce que c'est la seule primitive que les outils 3D exportent vraiment ;
- **le format OBJ**, le plus simple des formats de maillage, lisible avec un éditeur de texte ;
- **la vitesse** : d'abord utiliser tous les cœurs, ensuite ne plus tester chaque triangle pour chaque rayon ;
- et entre les deux, **mesurer**. Sans chiffres, « plus rapide » ne veut rien dire.

Comme les jours précédents, tout le code est là, fichier par fichier, et chaque étape compile. Les chiffres de ce billet ont été mesurés sur un Apple M1 Max (10 cœurs), avec exactement ce code.

Une règle pour toute la journée : **d'abord la version simple, ensuite l'optimisation**. Chaque accélération (sortir tôt du test de triangle, les threads, les tuiles, la BVH) arrive comme une étape à part, après une version naïve qui marche et qui rend une image. Pour chacune : pourquoi elle est nécessaire, ce qui change dans le code, et le chiffre avant / après.

::devlog-section{num="01" kicker="ARCHITECTURE" title="Trois fichiers de géométrie, un parser, et des threads."}
::

L'arborescence du jour 1 avait déjà réservé les places. On les remplit.

```
src/
├── main.cc                  options en ligne de commande, chrono, scène OBJ
├── math/
│   ├── vec3.h               + axisValue (accès par axe)
│   ├── ray.h, interval.h, rng.h
│   └── aabb.h / aabb.cc     NOUVEAU  boîte englobante, slab test
├── image/image.h, image.cc
├── io/
│   ├── ppm.h / ppm.cc
│   └── obj.h / obj.cc       NOUVEAU  parser OBJ + conversion en triangles
├── geometry/
│   ├── hittable.h           + boundingBox()
│   ├── sphere.h / .cc       + boîte
│   ├── hittable_list.h/.cc  + boîte
│   ├── triangle.h / .cc     NOUVEAU  Möller–Trumbore, normales lissées
│   └── bvh.h / bvh.cc       NOUVEAU  l'arbre de boîtes
├── material/material.h, material.cc
└── render/
    ├── camera.h, camera.cc
    └── renderer.h / .cc     tuiles, threads, compteur de rayons
tests/
├── ... (jours 1 et 2)
├── triangle_test.cc         NOUVEAU
├── obj_test.cc              NOUVEAU
├── renderer_test.cc         NOUVEAU
├── aabb_test.cc             NOUVEAU
└── bvh_test.cc              NOUVEAU
assets/
└── suzanne.obj              exporté depuis Blender
```

Le sens des dépendances ne bouge pas. Le seul nouveau venu qui mérite réflexion est `io/obj` : il **lit** un format de fichier (sa place est dans `io/`) et il **produit** des triangles (il dépend donc de `geometry/`). On sépare les deux rôles dans le même fichier : `parseObj` ne connaît que `math/` et renvoie des données brutes, testables sans aucune géométrie. `makeTriangles` fait la conversion. Si un jour on veut des triangles sans pointeur virtuel pour aller plus vite, seule `makeTriangles` change.

```
main ──▶ io/obj ──▶ geometry/triangle ──▶ math
           │
           └── parseObj : ne dépend que de math (positions, normales, indices)
```

Côté CMake, deux nouveautés. Les fichiers, comme d'habitude, et les **threads** : sous Linux (le devcontainer), `std::thread` demande de lier la bibliothèque pthread explicitement, sinon l'éditeur de liens se plaint. `find_package(Threads)` fournit une cible portable qui fait ce qu'il faut sur chaque plateforme. On la lie à `r3d_core` en `PUBLIC`, puisque c'est le renderer (dans le cœur) qui crée les threads.

::code-compare{right="CMake ≈ package.json"}
#cpp
```cmake
add_library(r3d_core STATIC
  src/geometry/bvh.cc
  src/geometry/hittable_list.cc
  src/geometry/sphere.cc
  src/geometry/triangle.cc
  src/image/image.cc
  src/io/obj.cc
  src/io/ppm.cc
  src/material/material.cc
  src/math/aabb.cc
  src/render/camera.cc
  src/render/renderer.cc
)
target_include_directories(r3d_core PUBLIC src)
target_compile_options(r3d_core PUBLIC
  $<$<CXX_COMPILER_ID:GNU,Clang,AppleClang>:-Wall -Wextra -Wpedantic>
  $<$<CXX_COMPILER_ID:MSVC>:/W4>
)

find_package(Threads REQUIRED)
target_link_libraries(r3d_core PUBLIC Threads::Threads)
```

#ts
```ts
// packages/r3d-core : la liste de ses fichiers
//   geometry/bvh.ts
//   geometry/hittable_list.ts
//   geometry/sphere.ts
//   geometry/triangle.ts
//   image/image.ts
//   io/obj.ts
//   io/ppm.ts
//   material/material.ts
//   math/aabb.ts
//   render/camera.ts
//   render/renderer.ts
// )
// "paths": { "*": ["src/*"] }
// la config du linter, selon l'outil :
//   eslint, règles strictes
//   (équivalent pour MSVC)
// )

// les threads : rien à installer côté Node,
// "dependencies": { "node:worker_threads" } est intégré
```
::

::devlog-note{kicker="C++ EN CLAIR"}
`find_package(Threads REQUIRED)` cherche la bibliothèque de threads du système, un peu comme un `import` qui échoue si le paquet manque. `target_link_libraries(r3d_core PUBLIC Threads::Threads)` l'ajoute à `r3d_core` ; `PUBLIC` la transmet à tout ce qui dépend de `r3d_core`, l'exécutable comme les tests. C'est une dépendance au sens de `package.json`, mais résolue à l'édition de liens.
::

::code-compare{right="CMake ≈ package.json"}
#cpp
```cmake
add_executable(r3d_tests
  tests/vec3_test.cc
  tests/image_test.cc
  tests/camera_test.cc
  tests/sphere_test.cc
  tests/material_test.cc
  tests/aabb_test.cc
  tests/triangle_test.cc
  tests/obj_test.cc
  tests/bvh_test.cc
  tests/renderer_test.cc
)
```

#ts
```ts
// les fichiers de test
//   tests/vec3.test.ts
//   tests/image.test.ts
//   tests/camera.test.ts
//   tests/sphere.test.ts
//   tests/material.test.ts
//   tests/aabb.test.ts
//   tests/triangle.test.ts
//   tests/obj.test.ts
//   tests/bvh.test.ts
//   tests/renderer.test.ts
// )
```
::

Le modèle : dans Blender, `Add > Mesh > Monkey`, un modificateur Subdivision Surface niveau 2, clic droit `Shade Smooth`, puis l'export décrit en section 03. On obtient 7 872 quads, soit 15 744 triangles. Pour les premiers tests, exporte aussi la version sans subdivision (500 faces, 968 triangles) : tant qu'il n'y a pas de BVH, chaque triangle compte.

::devlog-section{num="02" kicker="LE TRIANGLE" title="Toucher un triangle, et savoir où."}
::

### Pourquoi le triangle

Une sphère, c'est une équation. Un personnage, une chaise, une théière : aucune équation. Ce qu'on sait faire, c'est approximer n'importe quelle surface par des petites facettes planes. Et la facette plane la plus simple, c'est le triangle : trois points sont toujours coplanaires, alors qu'un quad peut être tordu.

C'est pour ça que tout le pipeline temps réel (WebGL, Three.js, ton GPU) ne parle qu'en triangles, et que Blender, au moment d'exporter, peut tout trianguler. Si ton raytracer sait intersecter un triangle, il sait rendre n'importe quel maillage. C'est la primitive universelle.

### Première idée : le plan, puis le test « dedans »

L'approche naïve se fait en deux temps.

1. Le triangle est posé sur un plan. On intersecte le rayon avec ce plan : c'est une équation du premier degré, plus simple que la sphère.
2. On a un point $P$ sur le plan. Reste à savoir s'il est **dans** le triangle.

::devlog-formula{label="Étape 1 : rayon contre plan"}
$$
\mathbf{N} = (B - A) \times (C - A)
$$

$$
t = \frac{(A - O) \cdot \mathbf{N}}{\mathbf{D} \cdot \mathbf{N}}
$$

$$
\mathbf{D} \cdot \mathbf{N} \approx 0 \implies \text{rayon parallèle au plan, pas d'impact}
$$
::

Pour l'étape 2, l'astuce classique : pour chaque arête, on regarde de quel côté se trouve $P$ avec un produit vectoriel. Si $P$ est du même côté des trois arêtes, il est dedans. Ça marche, mais c'est trois produits vectoriels de plus, après avoir déjà calculé une normale. Et surtout, on jette une information précieuse : **où** dans le triangle on a tapé.

### Les coordonnées barycentriques

N'importe quel point du plan d'un triangle $ABC$ peut s'écrire comme un mélange pondéré des trois sommets :

::devlog-formula{label="Coordonnées barycentriques"}
$$
P = w A + u B + v C, \qquad w = 1 - u - v
$$
::

Les trois poids somment à 1. Ils ont une lecture géométrique très directe : chaque poids, c'est l'aire du petit triangle **opposé** au sommet, divisée par l'aire totale. Quand $P$ s'approche de $B$, le sous-triangle $APC$ grossit et $u$ tend vers 1.

Et le test « dedans » devient gratuit : $P$ est dans le triangle si et seulement si les trois poids sont positifs. Dès qu'un poids passe sous zéro, $P$ est sorti du côté opposé au sommet correspondant.

::devlog-figure{n="01" caption="Glisse P hors du triangle : le poids du sommet opposé devient négatif. La couleur de P est le mélange des trois sommets, pondéré par u, v, w."}
  :::demo-triangle
  :::
::

La couleur du point dans la démo, c'est exactement ce que fait un fragment shader avec un `varying` : le GPU interpole les attributs des sommets avec les coordonnées barycentriques du pixel. Tu l'utilises depuis des années sans l'avoir écrit.

### Möller–Trumbore : tout en un seul calcul

En 1997, Tomas Möller et Ben Trumbore publient [Fast, Minimum Storage Ray/Triangle Intersection](https://www.graphics.cornell.edu/pubs/1997/MT97.pdf). L'idée : ne pas passer par le plan du tout. On écrit directement que le point du rayon est un point barycentrique du triangle.

::devlog-formula{label="L'équation de départ"}
$$
O + t\mathbf{D} = (1 - u - v) A + u B + v C
$$
::

On réarrange en posant $\mathbf{E}_1 = B - A$, $\mathbf{E}_2 = C - A$ et $\mathbf{T} = O - A$ :

::devlog-formula{label="Un système 3 × 3"}
$$
-t\mathbf{D} + u\mathbf{E}_1 + v\mathbf{E}_2 = \mathbf{T}
$$

$$
\begin{bmatrix} -\mathbf{D} & \mathbf{E}_1 & \mathbf{E}_2 \end{bmatrix} \begin{bmatrix} t \\ u \\ v \end{bmatrix} = \mathbf{T}
$$
::

Trois équations (x, y, z), trois inconnues (t, u, v). La règle de Cramer le résout avec des produits mixtes, et en réutilisant habilement les produits vectoriels on tombe sur cette suite d'étapes :

::devlog-formula{label="Möller–Trumbore, étape par étape"}
$$
\mathbf{E}_1 = B - A, \qquad \mathbf{E}_2 = C - A
$$

$$
\mathbf{P} = \mathbf{D} \times \mathbf{E}_2, \qquad \det = \mathbf{E}_1 \cdot \mathbf{P} \qquad (\lvert \det \rvert < \varepsilon \Rightarrow \text{parallèle, raté})
$$

$$
\mathbf{T} = O - A, \qquad u = \frac{\mathbf{T} \cdot \mathbf{P}}{\det} \qquad (u \notin [0, 1] \Rightarrow \text{raté})
$$

$$
\mathbf{Q} = \mathbf{T} \times \mathbf{E}_1, \qquad v = \frac{\mathbf{D} \cdot \mathbf{Q}}{\det} \qquad (v < 0 \ \text{ou}\ u + v > 1 \Rightarrow \text{raté})
$$

$$
t = \frac{\mathbf{E}_2 \cdot \mathbf{Q}}{\det} \qquad (t \notin \left]t_{\min}, t_{\max}\right[ \Rightarrow \text{raté})
$$
::

Les conditions entre parenthèses sont toutes des façons de rater. On peut les vérifier toutes à la fin, ou abandonner dès que l'une échoue : la plupart des rayons ratent la plupart des triangles, et on le sait souvent dès $u$, avant d'avoir calculé $\mathbf{Q}$. On commence par la version qui vérifie tout à la fin, plus simple à lire ; abandonner tôt sera la première optimisation de la journée, mesurée. Dans les deux cas, on ne stocke rien de plus que les trois sommets : pas de normale de plan précalculée. Le détail de la dérivation est très bien fait chez [Scratchapixel](https://www.scratchapixel.com/lessons/3d-basic-rendering/ray-tracing-rendering-a-triangle/moller-trumbore-ray-triangle-intersection.html).

### Le déterminant, la face arrière, et epsilon

Le déterminant $\det$ porte deux informations.

- **Sa valeur absolue proche de zéro** : le rayon est quasi parallèle au plan du triangle. Diviser par ça donnerait des $t$ absurdes. On rejette sous un petit epsilon (`1e-8` en `double`).
- **Son signe** : il dit si le rayon arrive par la face avant ou la face arrière. Avec la convention « sommets dans le sens antihoraire vu de devant », la normale géométrique est $\mathbf{E}_1 \times \mathbf{E}_2$, et $\det < 0$ signifie qu'on tape par derrière.

Faut-il jeter la face arrière (backface culling) ? En rasterisation, souvent oui. En raytracing, presque jamais : un rayon réfracté **à l'intérieur** d'un objet en verre doit pouvoir toucher l'arrière des triangles pour ressortir. On garde les deux faces, et on remplit `frontFace` comme pour la sphère.

::devlog-note{kicker="PIÈGE" tone="accent"}
L'acné de surface revient. Un rayon qui rebondit sur un triangle peut se réintersecter avec ce même triangle à $t \approx 10^{-12}$. Le $t_{\min} = 0.001$ du jour 2 règle le problème, à condition que le triangle respecte l'intervalle qu'on lui passe : `rayT.surrounds(t)`, comme la sphère.
::

### Lisser avec les normales des sommets

Un maillage de sphère en 500 triangles, rendu avec la normale géométrique de chaque facette, ressemble à une boule à facettes. Les modeleurs exportent donc une normale **par sommet** (la moyenne des faces voisines). Au moment de l'impact, on les interpole avec les mêmes $u, v$ que Möller–Trumbore vient de nous donner :

::devlog-formula{label="Normale interpolée (smooth shading)"}
$$
\mathbf{N} = \frac{w\,\mathbf{n}_A + u\,\mathbf{n}_B + v\,\mathbf{n}_C}{\lVert w\,\mathbf{n}_A + u\,\mathbf{n}_B + v\,\mathbf{n}_C \rVert}
$$
::

C'est exactement le principe du Phong shading. Deux précautions : renormaliser après l'interpolation (une moyenne de vecteurs unitaires n'est pas unitaire), et continuer à utiliser la normale **géométrique** pour décider de la face avant ou arrière. Sinon, sur les silhouettes, la normale lissée et le rayon peuvent se contredire.

Un triangle sans normales de sommets (un OBJ exporté sans `vn`) reçoit trois fois sa normale géométrique. L'interpolation de trois vecteurs identiques redonne ce vecteur : un seul chemin de code, pas de booléen « lisse ou pas ».

Fichier `src/geometry/triangle.h` :

::code-compare
#cpp
```cpp
#pragma once

#include <memory>

#include "geometry/hittable.h"

namespace r3d {

class Triangle final : public Hittable {
public:
    Triangle(const Point3& a,
             const Point3& b,
             const Point3& c,
             const std::shared_ptr<const Material>& material);
    Triangle(const Point3& a,
             const Point3& b,
             const Point3& c,
             const Vec3& normalA,
             const Vec3& normalB,
             const Vec3& normalC,
             const std::shared_ptr<const Material>& material);

    std::optional<HitRecord> hit(
            const Ray& ray,
            Interval rayT) const override;

private:
    Point3 a_;
    Point3 b_;
    Point3 c_;
    Vec3 normalA_;
    Vec3 normalB_;
    Vec3 normalC_;
    std::shared_ptr<const Material> material_;
};

}  // namespace r3d
```

#ts
```ts
// (pas d'équivalent : les modules ES)

// <memory> : pas de shared_ptr

import type { Hittable } from './hittable'

// namespace r3d

export class Triangle implements Hittable {
  // public : deux signatures, comme une surcharge TS
  constructor(a: Point3,
              b: Point3,
              c: Point3,
              material: Readonly<Material> | null)
  constructor(a: Point3,
              b: Point3,
              c: Point3,
              normalA: Vec3,
              normalB: Vec3,
              normalC: Vec3,
              material: Readonly<Material> | null)

  hit(
      ray: Ray,
      rayT: Interval): HitRecord | null // -> .cc

  // private :
  readonly #a: Point3
  readonly #b: Point3
  readonly #c: Point3
  #normalA: Vec3
  #normalB: Vec3
  #normalC: Vec3
  readonly #material: Readonly<Material> | null
}

// fin du module
```
::

Fichier `src/geometry/triangle.cc`, version simple :

::code-compare
#cpp
```cpp
#include "geometry/triangle.h"

#include <cmath>

namespace r3d {

namespace {

const double PARALLEL_EPSILON = 1e-8;

}  // namespace

Triangle::Triangle(
        const Point3& a,
        const Point3& b,
        const Point3& c,
        const std::shared_ptr<const Material>& material)
    : a_(a), b_(b), c_(c), material_(material) {
    const Vec3 flatNormal = unitVector(cross(b - a, c - a));
    normalA_ = flatNormal;
    normalB_ = flatNormal;
    normalC_ = flatNormal;
}

Triangle::Triangle(
        const Point3& a,
        const Point3& b,
        const Point3& c,
        const Vec3& normalA,
        const Vec3& normalB,
        const Vec3& normalC,
        const std::shared_ptr<const Material>& material)
    : a_(a), b_(b), c_(c),
      normalA_(normalA), normalB_(normalB), normalC_(normalC),
      material_(material) {}

std::optional<HitRecord> Triangle::hit(const Ray& ray,
                                       Interval rayT) const {
    const Vec3 edge1 = b_ - a_;
    const Vec3 edge2 = c_ - a_;

    const Vec3 p = cross(ray.direction(), edge2);
    const double det = dot(edge1, p);
    if (std::fabs(det) < PARALLEL_EPSILON) {
        return std::nullopt;
    }
    const double inverseDet = 1.0 / det;

    const Vec3 toOrigin = ray.origin() - a_;
    const Vec3 q = cross(toOrigin, edge1);
    const double u = dot(toOrigin, p) * inverseDet;
    const double v = dot(ray.direction(), q) * inverseDet;
    const double t = dot(edge2, q) * inverseDet;

    const bool insideTriangle =
        u >= 0.0 && v >= 0.0 && u + v <= 1.0;
    if (!insideTriangle || !rayT.surrounds(t)) {
        return std::nullopt;
    }

    HitRecord rec;
    rec.t = t;
    rec.point = ray.at(t);
    rec.material = material_.get();

    // Front/back is decided by the geometric normal: the
    // interpolated one can disagree on silhouettes.
    const Vec3 geometricNormal =
        unitVector(cross(edge1, edge2));
    rec.frontFace =
        dot(ray.direction(), geometricNormal) < 0.0;

    const double w = 1.0 - u - v;
    const Vec3 blended =
        w * normalA_ + u * normalB_ + v * normalC_;
    const Vec3 shadingNormal = unitVector(blended);
    if (rec.frontFace) {
        rec.normal = shadingNormal;
    } else {
        rec.normal = -shadingNormal;
    }
    return rec;
}

}  // namespace r3d
```

#ts
```ts
// triangle.ts, suite (TS n'a qu'un corps de constructeur :
//   on montre les deux versions C++ séparément)

// namespace r3d

// namespace anonyme : non exporté

const PARALLEL_EPSILON = 1e-8

//

// constructeur 1 : normale plate
constructor(
    a: Point3,
    b: Point3,
    c: Point3,
    material: Readonly<Material> | null) {
  this.#a = a; this.#b = b; this.#c = c
  this.#material = material
  const flatNormal = unitVector(cross(sub(b, a), sub(c, a)))
  this.#normalA = flatNormal
  this.#normalB = flatNormal
  this.#normalC = flatNormal
}

// constructeur 2 : normales par sommet
constructor(
    a: Point3,
    b: Point3,
    c: Point3,
    normalA: Vec3,
    normalB: Vec3,
    normalC: Vec3,
    material: Readonly<Material> | null) {
  this.#a = a; this.#b = b; this.#c = c
  this.#normalA = normalA; this.#normalB = normalB
  this.#normalC = normalC; this.#material = material
}

hit(ray: Ray,
    rayT: Interval): HitRecord | null {
  const edge1 = sub(this.#b, this.#a)
  const edge2 = sub(this.#c, this.#a)

  const p = cross(ray.direction(), edge2)
  const det = dot(edge1, p)
  if (Math.abs(det) < PARALLEL_EPSILON) {
    return null
  }
  const inverseDet = 1.0 / det

  const toOrigin = sub(ray.origin(), this.#a)
  const q = cross(toOrigin, edge1)
  const u = dot(toOrigin, p) * inverseDet
  const v = dot(ray.direction(), q) * inverseDet
  const t = dot(edge2, q) * inverseDet

  const insideTriangle =
    u >= 0.0 && v >= 0.0 && u + v <= 1.0
  if (!insideTriangle || !rayT.surrounds(t)) {
    return null
  }

  const rec = new HitRecord()
  rec.t = t
  rec.point = ray.at(t)
  rec.material = this.#material

  // Front/back is decided by the geometric normal: the
  // interpolated one can disagree on silhouettes.
  const geometricNormal =
    unitVector(cross(edge1, edge2))
  rec.frontFace =
    dot(ray.direction(), geometricNormal) < 0.0

  const w = 1.0 - u - v
  const blended = add(add(scale(w, this.#normalA),
    scale(u, this.#normalB)), scale(v, this.#normalC))
  const shadingNormal = unitVector(blended)
  if (rec.frontFace) {
    rec.normal = shadingNormal
  } else {
    rec.normal = negate(shadingNormal)
  }
  return rec
}

// fin du module
```
::

Deux constructeurs portent le même nom, avec des paramètres différents : c'est la surcharge déjà vue avec les opérateurs de `Vec3`, et le compilateur choisit selon les arguments passés. Le premier calcule la normale géométrique et la donne aux trois sommets. Le corps de `hit` suit les étapes de la formule une par une, avec les mêmes noms ($u$, $v$, $w$, $t$), et vérifie toutes les conditions de ratage d'un coup, au moment de décider. Seul le test du déterminant reste au début : diviser par un nombre presque nul donnerait des valeurs absurdes. `setFaceNormal` n'est pas utilisé ici : le côté se décide avec la normale géométrique, mais la normale stockée est la normale lissée.

### Optimisation : sortir tôt

La version simple est correcte. Elle est aussi gaspilleuse : pour un rayon qui rate le triangle dès $u$ (le cas le plus fréquent de loin), elle calcule quand même $\mathbf{Q}$, un produit vectoriel, $v$ et $t$, soit trois produits scalaires de plus, pour rien.

**Pourquoi.** Tant qu'il n'y a pas de BVH, chaque rayon teste chaque triangle : ce test est le cœur de la boucle chaude. Mesuré avec le banc d'essai de la section 05 (Suzanne subdivisée, 15 744 triangles, 200 × 112, 4 échantillons, un thread, sans BVH, médiane de trois) : **19,5 s** avec la version simple.

**Ce qui change.** On découpe la vérification et on place chaque morceau juste après le calcul dont il dépend. Dans `Triangle::hit`, le bloc entre `inverseDet` et `HitRecord rec;` devient :

::code-compare
#cpp
```cpp
    const Vec3 toOrigin = ray.origin() - a_;
    const double u = dot(toOrigin, p) * inverseDet;
    if (u < 0.0 || u > 1.0) {
        return std::nullopt;
    }

    const Vec3 q = cross(toOrigin, edge1);
    const double v = dot(ray.direction(), q) * inverseDet;
    if (v < 0.0 || u + v > 1.0) {
        return std::nullopt;
    }

    const double t = dot(edge2, q) * inverseDet;
    if (!rayT.surrounds(t)) {
        return std::nullopt;
    }
```

#ts
```ts
  const toOrigin = sub(ray.origin(), this.#a)
  const u = dot(toOrigin, p) * inverseDet
  if (u < 0.0 || u > 1.0) {
    return null
  }

  const q = cross(toOrigin, edge1)
  const v = dot(ray.direction(), q) * inverseDet
  if (v < 0.0 || u + v > 1.0) {
    return null
  }

  const t = dot(edge2, q) * inverseDet
  if (!rayT.surrounds(t)) {
    return null
  }
```
::

Les conditions acceptées sont exactement les mêmes ($u \le 1$ découle de $v \ge 0$ et $u + v \le 1$), donc les impacts aussi : l'image sort identique au bit près. Seul l'ordre du travail change.

**Avant / après.** 19,5 s → **9,6 s**, deux fois plus rapide pour quelques lignes déplacées. C'est cette version qu'on garde pour la suite de la journée.

Remarque ce qui **ne change pas** : ni `HittableList`, ni `rayColor`, ni les matériaux. Le triangle est un `Hittable` de plus, qui respecte le contrat de l'interface. C'est exactement ce que promettait le principe ouvert / fermé des conventions du jour 1.

Les tests couvrent l'impact de face, les deux façons de rater (hors des arêtes, rayon parallèle), la face arrière, et l'interpolation : au milieu de l'arête $AB$, la normale doit être exactement à mi-chemin entre $\mathbf{n}_A$ et $\mathbf{n}_B$, renormalisée.

Fichier `tests/triangle_test.cc` :

::code-compare{right="JS (Vitest)"}
#cpp
```cpp
#include <catch2/catch_test_macros.hpp>
#include <catch2/matchers/catch_matchers_floating_point.hpp>

#include <limits>
#include <optional>

#include "geometry/triangle.h"

using Catch::Matchers::WithinAbs;
using r3d::Point3;
using r3d::Ray;
using r3d::Vec3;

namespace {

const double INFINITE_DISTANCE =
    std::numeric_limits<double>::infinity();
const r3d::Interval ANY_FORWARD{0.001, INFINITE_DISTANCE};
const r3d::Triangle TRIANGLE(Point3{0, 0, 0},
                             Point3{1, 0, 0},
                             Point3{0, 1, 0},
                             nullptr);
const Vec3 DOWN_Z{0, 0, -1};

}  // namespace

TEST_CASE("a ray through the triangle hits its front",
          "[triangle]") {
    const Ray ray{Point3{0.25, 0.25, 2}, DOWN_Z};
    const std::optional<r3d::HitRecord> hit =
        TRIANGLE.hit(ray, ANY_FORWARD);
    REQUIRE(hit.has_value());
    REQUIRE_THAT(hit->t, WithinAbs(2.0, 1e-12));
    REQUIRE(hit->frontFace);
    REQUIRE_THAT(hit->normal.z, WithinAbs(1.0, 1e-12));
}

TEST_CASE("a ray outside the edges misses", "[triangle]") {
    const Ray pastHypotenuse{Point3{0.8, 0.8, 2}, DOWN_Z};
    const Ray leftOfEdge{Point3{-0.1, 0.5, 2}, DOWN_Z};
    REQUIRE_FALSE(TRIANGLE.hit(pastHypotenuse, ANY_FORWARD));
    REQUIRE_FALSE(TRIANGLE.hit(leftOfEdge, ANY_FORWARD));
}

TEST_CASE("a parallel ray misses", "[triangle]") {
    const Ray ray{Point3{0.25, 0.25, 1}, Vec3{1, 0, 0}};
    REQUIRE_FALSE(TRIANGLE.hit(ray, ANY_FORWARD));
}

TEST_CASE("the back face is hit, flipped", "[triangle]") {
    const Ray ray{Point3{0.25, 0.25, -2}, Vec3{0, 0, 1}};
    const std::optional<r3d::HitRecord> hit =
        TRIANGLE.hit(ray, ANY_FORWARD);
    REQUIRE(hit.has_value());
    REQUIRE_FALSE(hit->frontFace);
    REQUIRE_THAT(hit->normal.z, WithinAbs(-1.0, 1e-12));
}

TEST_CASE("vertex normals are interpolated", "[triangle]") {
    const r3d::Triangle smooth(Point3{0, 0, 0},
                               Point3{1, 0, 0},
                               Point3{0, 1, 0},
                               Vec3{0, 0, 1},
                               Vec3{1, 0, 0},
                               Vec3{0, 0, 1},
                               nullptr);
    const Ray ray{Point3{0.5, 0.0, 2}, DOWN_Z};
    const std::optional<r3d::HitRecord> hit =
        smooth.hit(ray, ANY_FORWARD);
    REQUIRE(hit.has_value());
    // u = 0.5: halfway between nA = +z and nB = +x.
    REQUIRE_THAT(hit->normal.x, WithinAbs(0.70710678, 1e-6));
    REQUIRE_THAT(hit->normal.z, WithinAbs(0.70710678, 1e-6));
}
```

#ts
```ts
import { expect, test } from 'vitest'
// WithinAbs ≈ toBeCloseTo

// <limits> : Infinity
// <optional> : HitRecord | null

import { Triangle } from '../src/geometry/triangle'

// (toBeCloseTo est déjà une méthode d'expect)
import { Vec3 } from '../src/math/vec3' // Point3 = Vec3
import { Ray } from '../src/math/ray'
//

// constantes locales au fichier

const INFINITE_DISTANCE =
  Infinity
const ANY_FORWARD = new Interval(0.001, INFINITE_DISTANCE)
const TRIANGLE = new Triangle(new Vec3(0, 0, 0),
                              new Vec3(1, 0, 0),
                              new Vec3(0, 1, 0),
                              null)
const DOWN_Z = new Vec3(0, 0, -1)

//

test('a ray through the triangle hits its front',
     () => {
  const ray = new Ray(new Vec3(0.25, 0.25, 2), DOWN_Z)
  const hit =
    TRIANGLE.hit(ray, ANY_FORWARD)
  expect(hit).not.toBeNull()
  expect(hit!.t).toBeCloseTo(2.0, 12)
  expect(hit!.frontFace).toBe(true)
  expect(hit!.normal.z).toBeCloseTo(1.0, 12)
})

test('a ray outside the edges misses', () => {
  const pastHypotenuse =
    new Ray(new Vec3(0.8, 0.8, 2), DOWN_Z)
  const leftOfEdge = new Ray(new Vec3(-0.1, 0.5, 2), DOWN_Z)
  expect(TRIANGLE.hit(pastHypotenuse, ANY_FORWARD)).toBeNull()
  expect(TRIANGLE.hit(leftOfEdge, ANY_FORWARD)).toBeNull()
})

test('a parallel ray misses', () => {
  const ray =
    new Ray(new Vec3(0.25, 0.25, 1), new Vec3(1, 0, 0))
  expect(TRIANGLE.hit(ray, ANY_FORWARD)).toBeNull()
})

test('the back face is hit, flipped', () => {
  const ray =
    new Ray(new Vec3(0.25, 0.25, -2), new Vec3(0, 0, 1))
  const hit =
    TRIANGLE.hit(ray, ANY_FORWARD)
  expect(hit).not.toBeNull()
  expect(hit!.frontFace).toBe(false)
  expect(hit!.normal.z).toBeCloseTo(-1.0, 12)
})

test('vertex normals are interpolated', () => {
  const smooth = new Triangle(new Vec3(0, 0, 0),
                              new Vec3(1, 0, 0),
                              new Vec3(0, 1, 0),
                              new Vec3(0, 0, 1),
                              new Vec3(1, 0, 0),
                              new Vec3(0, 0, 1),
                              null)
  const ray = new Ray(new Vec3(0.5, 0.0, 2), DOWN_Z)
  const hit =
    smooth.hit(ray, ANY_FORWARD)
  expect(hit).not.toBeNull()
  // u = 0.5: halfway between nA = +z and nB = +x.
  expect(hit!.normal.x).toBeCloseTo(0.70710678, 6)
  expect(hit!.normal.z).toBeCloseTo(0.70710678, 6)
})
```
::

::devlog-section{num="03" kicker="LE FORMAT OBJ" title="Un maillage, c'est un fichier texte."}
::

### Lisible à l'œil nu

Le format Wavefront OBJ date des années 80, et il a survécu parce qu'il est bête : du texte, une instruction par ligne, un mot-clé en tête. Tu peux l'ouvrir dans VS Code et comprendre ce qu'il y a dedans. La [spécification complète](https://paulbourke.net/dataformats/obj/) est longue, mais on n'en utilise qu'un dixième.

```bash
# quatre positions, une normale, une coordonnée de texture
v  0.0 0.0 0.0
v  1.0 0.0 0.0
v  1.0 1.0 0.0
v  0.0 1.0 0.0
vn 0.0 0.0 1.0
vt 0.0 0.0
# un quad : quatre indices de positions
f  1 2 3 4
# un triangle, avec v/vt/vn pour chaque sommet
f  1/1/1 2/1/1 3/1/1
```

Un commentaire commence par `#` et occupe toute la ligne. Certains fichiers en mettent en fin de ligne, mais beaucoup de parsers ne le gèrent pas : ne compte pas dessus.

Les quatre mots-clés qui comptent :

- `v x y z` : une position.
- `vn x y z` : une normale.
- `vt u v` : une coordonnée de texture (ignorée pour l'instant).
- `f ...` : une face, qui référence les listes précédentes par **index**.

### Les indices, là où tout se joue

Trois règles à graver.

1. **Les indices commencent à 1.** Pas à 0. Le classique bug du premier soir : un décalage de un, et le maillage devient un hérisson de triangles qui partent dans tous les sens.
2. **Chaque liste a sa propre numérotation.** Dans `f 3/7/2`, c'est le 3ᵉ `v`, le 7ᵉ `vt` et la 2ᵉ `vn`. Les trois pools sont indépendants.
3. **Un index négatif est relatif.** `-1` veut dire « le dernier sommet lu **jusqu'ici** », pas le dernier du fichier. C'est rare dans les exports Blender, fréquent dans les fichiers générés par script.

Et les variantes d'un même sommet de face :

::devlog-formula{label="Les quatre formes d'un sommet de face"}
`f 1 2 3              position seule`

`f 1/4 2/5 3/6        position / texture`

`f 1/4/7 2/5/8 3/6/9  position / texture / normale`

`f 1//7 2//8 3//9     position // normale (pas de texture)`
::

Le cas `1//7` est celui qui casse les parsers trop optimistes : le champ du milieu est vide. On cherche les `/` un par un, et un champ vide veut dire « absent ».

### Quads et n-gons : l'éventail

Une ligne `f` peut avoir plus de trois sommets. Notre raytracer ne connaît que les triangles, il faut donc découper. La méthode la plus simple est l'**éventail** (fan) : on garde le premier sommet comme pivot et on balaie les autres.

::devlog-formula{label="Triangulation en éventail d'une face à n sommets"}
$$
(v_0, v_1, v_2),\ (v_0, v_2, v_3),\ \dots,\ (v_0, v_{n-2}, v_{n-1})
$$

$$
n \text{ sommets} \;\longrightarrow\; n - 2 \text{ triangles}
$$
::

L'éventail est correct pour tout polygone **convexe**, et c'est ce que sortent les modeleurs dans 99 % des cas. Sur un n-gon concave (une forme en L), certaines diagonales sortent du polygone : le résultat est faux. La parade n'est pas dans le parser : on demande à Blender de trianguler à l'export.

::devlog-figure{n="02" caption="Quatre lignes v numérotées à partir de 1, une face f qui les cite. L'éventail ajoute la diagonale 1–3 (pointillés) ; en C++, chaque index perd 1."}
  :::schema-obj
  :::
::

### Exporter depuis Blender

`File > Export > Wavefront (.obj)`. Les options qui comptent :

- **Geometry > Triangulated Mesh** : coche-la pour un vrai modèle. Blender gère les n-gons concaves correctement, et ton éventail ne sert que de filet de sécurité. Pour Suzanne, qui n'a que des quads convexes, on peut la laisser décochée : c'est un bon test de l'éventail.
- **Normals** : coche, sinon pas de smooth shading.
- **UV Coordinates** : utile plus tard, inoffensif maintenant.
- **Apply Modifiers** : coche, sinon la Subdivision Surface n'est pas exportée.
- **Forward Axis / Up Axis** : par défaut `-Z` et `Y`. Blender travaille en Z vers le haut, mais l'export convertit en Y vers le haut. C'est la convention de notre caméra depuis le jour 1, comme celle de Three.js. Si ton modèle arrive couché sur le dos, c'est ici que ça se règle.

Range le fichier dans `assets/` à la racine du dépôt. Ouvre-le : les lignes `f` ressemblent à `f 3523/1/3523 3524/2/3524 3527/3/3527 3526/4/3526`, quatre sommets au format complet.

### Parser ligne par ligne

Pas besoin de bibliothèque. Le schéma est toujours le même : lire une ligne, extraire le mot-clé, aiguiller.

- `std::getline` pour lire ligne par ligne, avec un compteur à côté pour les messages d'erreur ;
- un `std::istringstream` construit sur la ligne, puis `>>` pour extraire le mot-clé et les nombres, comme un `split(/\s+/)` typé ;
- pour les tokens de face, une recherche des `/` avec `find`, puis la même technique de flux pour convertir chaque champ en entier.

::devlog-note{kicker="C++ EN CLAIR"}
Les flux d'entrée sont le miroir des flux de sortie du jour 1. `std::istream` se lit, `std::ifstream` lit un fichier, `std::istringstream` lit une chaîne en mémoire. `fields >> keyword` extrait le prochain mot (les espaces servent de séparateurs), `fields >> v.x` le prochain nombre. Après une lecture ratée, `fields.fail()` devient vrai. `std::getline(in, line)` lit une ligne entière et renvoie faux à la fin du fichier, d'où le `while`. `std::string` est la chaîne de caractères, avec `==`, `+`, `find` et `substr` comme en JS.
::

Ce qu'on **ignore** sans remords : `vt` (pas encore de textures), `mtllib` et `usemtl` (les matériaux, dans un fichier `.mtl` à part), `s` (groupes de lissage), `o` et `g` (noms d'objets et de groupes). Ignorer ne veut pas dire planter : une ligne inconnue est sautée en silence.

Le parser ne produit pas de triangles, mais des **indices** : des positions, des normales, et pour chaque triangle trois paires (position, normale). Ça garde `parseObj` indépendant de la géométrie, et ça permet de tester l'éventail ou les index négatifs sans construire un seul `Triangle`. Les indices sont convertis en base 0 dès la lecture : le reste du programme ne voit jamais la convention OBJ.

Fichier `src/io/obj.h` :

::code-compare
#cpp
```cpp
#pragma once

#include <istream>
#include <memory>
#include <string>
#include <vector>

#include "geometry/hittable.h"
#include "math/vec3.h"

namespace r3d {

struct ObjIndex {
    int position = -1;
    int normal = -1;
};

struct ObjTriangle {
    ObjIndex a;
    ObjIndex b;
    ObjIndex c;
};

struct ObjMesh {
    std::vector<Point3> positions;
    std::vector<Vec3> normals;
    std::vector<ObjTriangle> triangles;
};

ObjMesh parseObj(std::istream& in);
ObjMesh loadObj(const std::string& path);

std::vector<std::shared_ptr<Hittable>> makeTriangles(
        const ObjMesh& mesh,
        const std::shared_ptr<const Material>& material);

}  // namespace r3d
```

#ts
```ts
// (pas d'équivalent : les modules ES)

// <istream> : le texte arrive en string
// <memory> : pas de shared_ptr
// <string> : string est natif
// <vector> : tableaux natifs

import type { Hittable } from '../geometry/hittable'
import { Vec3, type Point3 } from '../math/vec3'

// namespace r3d

export class ObjIndex {
  position = -1
  normal = -1
}

export class ObjTriangle {
  a = new ObjIndex()
  b = new ObjIndex()
  c = new ObjIndex()
}

export class ObjMesh {
  positions: Point3[] = []
  normals: Vec3[] = []
  triangles: ObjTriangle[] = []
}

export function parseObj(text: string): ObjMesh
export function loadObj(path: string): ObjMesh

export function makeTriangles(
    mesh: ObjMesh,
    material: Readonly<Material>): Hittable[]

// fin du module
```
::

Un index vaut `-1` tant qu'il est absent : c'est le cas de la normale dans `f 1 2 3`. Un triangle, ce sont trois sommets nommés `a`, `b`, `c`, chacun avec son index de position et son index de normale. Même choix que `writePpm` au jour 1 : le parser prend un `std::istream&`. En production, `loadObj` lui passe un `std::ifstream`. Dans un test, on lui passe un `std::istringstream` avec trois lignes d'OBJ écrites en dur. Pas de fichier temporaire, pas de mock.

Fichier `src/io/obj.cc` :

::code-compare
#cpp
```cpp
#include "io/obj.h"

#include <cstddef>
#include <fstream>
#include <sstream>
#include <stdexcept>

#include "geometry/triangle.h"

namespace r3d {

namespace {

std::runtime_error parseError(int lineNumber,
                              const std::string& message) {
    const std::string where =
        "OBJ, ligne " + std::to_string(lineNumber);
    return std::runtime_error(where + " : " + message);
}

int parseInteger(const std::string& field, int lineNumber) {
    std::istringstream stream(field);
    int value = 0;
    stream >> value;
    const bool readWholeField =
        !stream.fail() && stream.eof();
    if (!readWholeField) {
        throw parseError(lineNumber,
                         "index illisible '" + field + "'");
    }
    return value;
}

int resolveIndex(const std::string& field,
                 std::size_t listSize,
                 int lineNumber) {
    const int rawIndex = parseInteger(field, lineNumber);
    const int size = static_cast<int>(listSize);

    // OBJ counts from 1; negative indices count back from the
    // last element read so far.
    int index = 0;
    if (rawIndex > 0) {
        index = rawIndex - 1;
    } else {
        index = size + rawIndex;
    }

    if (rawIndex == 0 || index < 0 || index >= size) {
        const std::string message = "index " +
            std::to_string(rawIndex) + " hors limites";
        throw parseError(lineNumber, message);
    }
    return index;
}

ObjIndex parseFaceVertex(const std::string& token,
                         const ObjMesh& mesh,
                         int lineNumber) {
    ObjIndex index;
    const std::size_t firstSlash = token.find('/');
    if (firstSlash == std::string::npos) {
        index.position = resolveIndex(
            token, mesh.positions.size(), lineNumber);
        return index;
    }

    const std::string positionField =
        token.substr(0, firstSlash);
    index.position = resolveIndex(
        positionField, mesh.positions.size(), lineNumber);

    const std::size_t secondSlash =
        token.find('/', firstSlash + 1);
    if (secondSlash == std::string::npos) {
        return index;
    }
    const std::string normalField =
        token.substr(secondSlash + 1);
    if (!normalField.empty()) {
        index.normal = resolveIndex(
            normalField, mesh.normals.size(), lineNumber);
    }
    return index;
}

Vec3 readVec3(std::istringstream& fields, int lineNumber) {
    Vec3 v;
    fields >> v.x;
    fields >> v.y;
    fields >> v.z;
    if (fields.fail()) {
        throw parseError(lineNumber,
                         "trois nombres attendus");
    }
    return v;
}

}  // namespace

ObjMesh parseObj(std::istream& in) {
    ObjMesh mesh;
    std::string line;
    int lineNumber = 0;

    while (std::getline(in, line)) {
        ++lineNumber;
        std::istringstream fields(line);
        std::string keyword;
        fields >> keyword;

        if (keyword.empty() || keyword[0] == '#') {
            continue;
        }

        if (keyword == "v") {
            const Point3 point = readVec3(fields, lineNumber);
            mesh.positions.push_back(point);
        } else if (keyword == "vn") {
            const Vec3 normal = readVec3(fields, lineNumber);
            mesh.normals.push_back(normal);
        } else if (keyword == "f") {
            std::vector<ObjIndex> polygon;
            std::string token;
            while (fields >> token) {
                const ObjIndex vertex =
                    parseFaceVertex(token, mesh, lineNumber);
                polygon.push_back(vertex);
            }
            if (polygon.size() < 3) {
                const std::string message =
                    "une face a au moins trois sommets";
                throw parseError(lineNumber, message);
            }
            const std::size_t count = polygon.size();
            for (std::size_t i = 1; i + 1 < count; ++i) {
                const ObjTriangle triangle{
                    polygon[0], polygon[i], polygon[i + 1]};
                mesh.triangles.push_back(triangle);
            }
        }
    }
    return mesh;
}

ObjMesh loadObj(const std::string& path) {
    std::ifstream file(path);
    if (!file.is_open()) {
        throw std::runtime_error(
            "OBJ : impossible d'ouvrir " + path);
    }
    return parseObj(file);
}

std::vector<std::shared_ptr<Hittable>> makeTriangles(
        const ObjMesh& mesh,
        const std::shared_ptr<const Material>& material) {
    std::vector<std::shared_ptr<Hittable>> triangles;

    for (const ObjTriangle& face : mesh.triangles) {
        const Point3 pa = mesh.positions[face.a.position];
        const Point3 pb = mesh.positions[face.b.position];
        const Point3 pc = mesh.positions[face.c.position];

        const bool hasNormals = face.a.normal >= 0
            && face.b.normal >= 0 && face.c.normal >= 0;
        if (hasNormals) {
            const Vec3 na =
                unitVector(mesh.normals[face.a.normal]);
            const Vec3 nb =
                unitVector(mesh.normals[face.b.normal]);
            const Vec3 nc =
                unitVector(mesh.normals[face.c.normal]);
            triangles.push_back(std::make_shared<Triangle>(
                pa, pb, pc, na, nb, nc, material));
        } else {
            triangles.push_back(std::make_shared<Triangle>(
                pa, pb, pc, material));
        }
    }
    return triangles;
}

}  // namespace r3d
```

#ts
```ts
// obj.ts, suite : les corps des fonctions

// <cstddef> : size_t -> number
import { readFileSync } from 'node:fs'
// <sstream> : on découpe les chaînes à la main
// <stdexcept> : Error est global

import { Triangle } from '../geometry/triangle'

// namespace r3d

// namespace anonyme : non exporté

function parseError(lineNumber: number,
                    message: string): Error {
  const where =
    'OBJ, ligne ' + String(lineNumber)
  return new Error(where + ' : ' + message)
}

function parseInteger(field: string,
                      lineNumber: number): number {
  // (le flux >> est remplacé par Number)
  const value = Number(field)
  const readWholeField =
    field !== '' && Number.isInteger(value)
  if (!readWholeField) {
    throw parseError(lineNumber,
                     "index illisible '" + field + "'")
  }
  return value
}

function resolveIndex(field: string,
                      listSize: number,
                      lineNumber: number): number {
  const rawIndex = parseInteger(field, lineNumber)
  const size = listSize

  // OBJ counts from 1; negative indices count back from the
  // last element read so far.
  let index = 0
  if (rawIndex > 0) {
    index = rawIndex - 1
  } else {
    index = size + rawIndex
  }

  if (rawIndex === 0 || index < 0 || index >= size) {
    const message = 'index ' +
      String(rawIndex) + ' hors limites'
    throw parseError(lineNumber, message)
  }
  return index
}

function parseFaceVertex(token: string,
                         mesh: ObjMesh,
                         lineNumber: number): ObjIndex {
  const index = new ObjIndex()
  const firstSlash = token.indexOf('/')
  if (firstSlash === -1) {
    index.position = resolveIndex(
      token, mesh.positions.length, lineNumber)
    return index
  }

  const positionField =
    token.substring(0, firstSlash)
  index.position = resolveIndex(
    positionField, mesh.positions.length, lineNumber)

  const secondSlash =
    token.indexOf('/', firstSlash + 1)
  if (secondSlash === -1) {
    return index
  }
  const normalField =
    token.substring(secondSlash + 1)
  if (normalField !== '') {
    index.normal = resolveIndex(
      normalField, mesh.normals.length, lineNumber)
  }
  return index
}

function readVec3(fields: string[],
                  lineNumber: number): Vec3 {
  const v = new Vec3()
  v.x = Number(fields.shift())
  v.y = Number(fields.shift())
  v.z = Number(fields.shift())
  if (Number.isNaN(v.x + v.y + v.z)) {
    throw parseError(lineNumber,
                     'trois nombres attendus')
  }
  return v
}

//

export function parseObj(text: string): ObjMesh {
  const mesh = new ObjMesh()
  const lines = text.split('\n')
  let lineNumber = 0

  for (const line of lines) {
    ++lineNumber
    const fields = line.trim().split(/\s+/)
    const keyword = fields.shift() ?? ''


    if (keyword === '' || keyword[0] === '#') {
      continue
    }

    if (keyword === 'v') {
      const point = readVec3(fields, lineNumber)
      mesh.positions.push(point)
    } else if (keyword === 'vn') {
      const normal = readVec3(fields, lineNumber)
      mesh.normals.push(normal)
    } else if (keyword === 'f') {
      const polygon: ObjIndex[] = []
      // (pas de variable token : for...of la fournit)
      for (const token of fields) {
        const vertex =
          parseFaceVertex(token, mesh, lineNumber)
        polygon.push(vertex)
      }
      if (polygon.length < 3) {
        const message =
          'une face a au moins trois sommets'
        throw parseError(lineNumber, message)
      }
      const count = polygon.length
      for (let i = 1; i + 1 < count; ++i) {
        const triangle = Object.assign(new ObjTriangle(), {
          a: polygon[0], b: polygon[i], c: polygon[i + 1]})
        mesh.triangles.push(triangle)
      }
    }
  }
  return mesh
}

export function loadObj(path: string): ObjMesh {
  let file: string
  try { file = readFileSync(path, 'utf8') } catch {
    throw new Error(
      "OBJ : impossible d'ouvrir " + path)
  }
  return parseObj(file)
}

export function makeTriangles(
    mesh: ObjMesh,
    material: Readonly<Material>): Hittable[] {
  const triangles: Hittable[] = []

  for (const face of mesh.triangles) {
    const pa = mesh.positions[face.a.position]
    const pb = mesh.positions[face.b.position]
    const pc = mesh.positions[face.c.position]

    const hasNormals = face.a.normal >= 0
      && face.b.normal >= 0 && face.c.normal >= 0
    if (hasNormals) {
      const na =
        unitVector(mesh.normals[face.a.normal])
      const nb =
        unitVector(mesh.normals[face.b.normal])
      const nc =
        unitVector(mesh.normals[face.c.normal])
      triangles.push(new Triangle(
        pa, pb, pc, na, nb, nc, material))
    } else {
      triangles.push(new Triangle(
        pa, pb, pc, material))
    }
  }
  return triangles
}

// fin du module
```
::

Les points qui demandent un mot :

- **`parseInteger` convertit un champ avec un flux**, et vérifie qu'il a tout consommé : `"12abc"` doit être une erreur, pas `12`. `stream.eof()` (*end of file*) n'est vrai que si la lecture est allée jusqu'au bout de la chaîne. C'est plus lent que les fonctions de conversion spécialisées, mais le parsing se fait une fois, avant le rendu, et ne pèse rien.
- **`parseError` fabrique l'exception**, et chaque appelant la lance avec `throw` : on voit à chaque endroit que la fonction s'arrête là. Le message contient toujours le numéro de ligne.
- **`std::string::npos`** est la valeur que renvoie `find` quand il ne trouve rien, le `-1` de `indexOf`. `token.substr(start, length)` découpe comme le `substring` de JS ; sans longueur, il va jusqu'au bout.
- **L'index résolu est vérifié contre la taille actuelle** de la liste, ce qui rend les index négatifs corrects (« relatif à ce qui a été lu jusqu'ici ») et attrape les références en avant.
- **`ObjTriangle triangle{polygon[0], polygon[i], polygon[i + 1]}`** remplit les trois sommets dans l'ordre, comme `Vec3{x, y, z}` : c'est l'éventail de la formule, $(v_0, v_i, v_{i+1})$.
- **Les normales sont renormalisées** à la conversion. Blender exporte des normales unitaires, mais un fichier écrit à la main ou par script n'a aucune garantie, et la règle du jour 2 tient : une normale sort de la géométrie déjà unitaire.

::devlog-note{kicker="PIÈGE"}
Les erreurs de parsing doivent dire **où**. « Index invalide » ne t'aide pas sur un fichier de 40 000 lignes. « OBJ, ligne 18231 : index 0 hors limites » si. C'est tout le rôle du compteur à côté du `getline`.
::

Les tests passent tous par `std::istringstream`. Chacun cible une règle du format : la base 1, l'éventail, les quatre formes de sommet, les index négatifs, les mots-clés inconnus, les index hors limites.

Fichier `tests/obj_test.cc` :

::code-compare{right="JS (Vitest)"}
#cpp
```cpp
#include <catch2/catch_test_macros.hpp>

#include <sstream>
#include <stdexcept>

#include "io/obj.h"

TEST_CASE(
    "positions and a triangle are parsed, "
    "indices become 0-based",
    "[obj]") {
    std::istringstream in(
        "# a comment\n"
        "v 0 0 0\n"
        "v 1 0 0\n"
        "v 0 1 0\n"
        "f 1 2 3\n");
    const r3d::ObjMesh mesh = r3d::parseObj(in);

    REQUIRE(mesh.positions.size() == 3);
    REQUIRE(mesh.triangles.size() == 1);
    REQUIRE(mesh.triangles[0].a.position == 0);
    REQUIRE(mesh.triangles[0].c.position == 2);
    REQUIRE(mesh.triangles[0].a.normal == -1);
}

TEST_CASE(
    "a quad is split into a fan of two triangles", "[obj]") {
    std::istringstream in(
        "v 0 0 0\nv 1 0 0\nv 1 1 0\nv 0 1 0\nf 1 2 3 4\n");
    const r3d::ObjMesh mesh = r3d::parseObj(in);

    REQUIRE(mesh.triangles.size() == 2);
    REQUIRE(mesh.triangles[1].a.position == 0);
    REQUIRE(mesh.triangles[1].b.position == 2);
    REQUIRE(mesh.triangles[1].c.position == 3);
}

TEST_CASE(
    "the four face vertex forms are understood", "[obj]") {
    std::istringstream in(
        "v 0 0 0\nv 1 0 0\nv 0 1 0\n"
        "vt 0 0\n"
        "vn 0 0 1\n"
        "f 1 2 3\n"
        "f 1/1 2/1 3/1\n"
        "f 1/1/1 2/1/1 3/1/1\n"
        "f 1//1 2//1 3//1\n");
    const r3d::ObjMesh mesh = r3d::parseObj(in);

    REQUIRE(mesh.triangles.size() == 4);
    REQUIRE(mesh.triangles[1].a.normal == -1);
    REQUIRE(mesh.triangles[2].a.normal == 0);
    REQUIRE(mesh.triangles[3].a.normal == 0);
}

TEST_CASE(
    "negative indices are relative to what was read so far",
    "[obj]") {
    std::istringstream in(
        "v 0 0 0\nv 1 0 0\nv 0 1 0\nf -3 -2 -1\nv 5 5 5\n");
    const r3d::ObjMesh mesh = r3d::parseObj(in);

    REQUIRE(mesh.triangles[0].a.position == 0);
    REQUIRE(mesh.triangles[0].c.position == 2);
}

TEST_CASE("unknown keywords are skipped", "[obj]") {
    std::istringstream in(
        "mtllib scene.mtl\no Cube\ns 1\n"
        "v 0 0 0\nv 1 0 0\nv 0 1 0\n"
        "usemtl red\nf 1 2 3\n");
    REQUIRE(r3d::parseObj(in).triangles.size() == 1);
}

TEST_CASE("an out-of-range index is reported", "[obj]") {
    std::istringstream zero(
        "v 0 0 0\nv 1 0 0\nv 0 1 0\nf 0 1 2\n");
    REQUIRE_THROWS_AS(
        r3d::parseObj(zero), std::runtime_error);

    std::istringstream tooBig(
        "v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 4\n");
    REQUIRE_THROWS_AS(
        r3d::parseObj(tooBig), std::runtime_error);
}
```

#ts
```ts
import { expect, test } from 'vitest'

// <sstream> : le texte est une simple chaîne
// <stdexcept> : Error est global

import { parseObj } from '../src/io/obj'

test(
  'positions and a triangle are parsed, '
  + 'indices become 0-based',
  () => {
  const text = (
    '# a comment\n'
    + 'v 0 0 0\n'
    + 'v 1 0 0\n'
    + 'v 0 1 0\n'
    + 'f 1 2 3\n')
  const mesh = parseObj(text)

  expect(mesh.positions.length).toBe(3)
  expect(mesh.triangles.length).toBe(1)
  expect(mesh.triangles[0].a.position).toBe(0)
  expect(mesh.triangles[0].c.position).toBe(2)
  expect(mesh.triangles[0].a.normal).toBe(-1)
})

test(
  'a quad is split into a fan of two triangles', () => {
  const text = (
    'v 0 0 0\nv 1 0 0\nv 1 1 0\nv 0 1 0\nf 1 2 3 4\n')
  const mesh = parseObj(text)

  expect(mesh.triangles.length).toBe(2)
  expect(mesh.triangles[1].a.position).toBe(0)
  expect(mesh.triangles[1].b.position).toBe(2)
  expect(mesh.triangles[1].c.position).toBe(3)
})

test(
  'the four face vertex forms are understood', () => {
  const text = (
    'v 0 0 0\nv 1 0 0\nv 0 1 0\n'
    + 'vt 0 0\n'
    + 'vn 0 0 1\n'
    + 'f 1 2 3\n'
    + 'f 1/1 2/1 3/1\n'
    + 'f 1/1/1 2/1/1 3/1/1\n'
    + 'f 1//1 2//1 3//1\n')
  const mesh = parseObj(text)

  expect(mesh.triangles.length).toBe(4)
  expect(mesh.triangles[1].a.normal).toBe(-1)
  expect(mesh.triangles[2].a.normal).toBe(0)
  expect(mesh.triangles[3].a.normal).toBe(0)
})

test(
  'negative indices are relative to what was read so far',
  () => {
  const text = (
    'v 0 0 0\nv 1 0 0\nv 0 1 0\nf -3 -2 -1\nv 5 5 5\n')
  const mesh = parseObj(text)

  expect(mesh.triangles[0].a.position).toBe(0)
  expect(mesh.triangles[0].c.position).toBe(2)
})

test('unknown keywords are skipped', () => {
  const text = (
    'mtllib scene.mtl\no Cube\ns 1\n'
    + 'v 0 0 0\nv 1 0 0\nv 0 1 0\n'
    + 'usemtl red\nf 1 2 3\n')
  expect(parseObj(text).triangles.length).toBe(1)
})

test('an out-of-range index is reported', () => {
  const zero = (
    'v 0 0 0\nv 1 0 0\nv 0 1 0\nf 0 1 2\n')
  expect(
    () => parseObj(zero)).toThrow(Error)

  const tooBig = (
    'v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 4\n')
  expect(
    () => parseObj(tooBig)).toThrow(Error)
})
```
::

### Premier rendu d'un maillage

Le `main.cc` du jour 2 est remplacé par une scène minimale : le modèle, en terre cuite mate, posé sur le sol. Le chemin du fichier vient de la ligne de commande, avec la version légère par défaut. Le `try` / `catch` transforme une erreur de parsing en message lisible et en code de sortie non nul, au lieu d'un `terminate` brutal.

Le sol est une sphère de rayon 1000 dont le sommet affleure à $y = -0.98$, juste sous le menton de Suzanne (ses sommets descendent à $y \approx -0.97$).

Fichier `src/main.cc`, version de l'étape :

::code-compare
#cpp
```cpp
#include <cstdlib>
#include <exception>
#include <iostream>
#include <memory>
#include <string>
#include <vector>

#include "geometry/hittable_list.h"
#include "geometry/sphere.h"
#include "io/obj.h"
#include "io/ppm.h"
#include "material/material.h"
#include "render/camera.h"
#include "render/renderer.h"

int main(int argc, char** argv) {
    try {
        std::string modelPath = "assets/suzanne_low.obj";
        if (argc > 1) {
            modelPath = argv[1];
        }

        r3d::HittableList world;
        const auto clay = std::make_shared<r3d::Lambertian>(
            r3d::Color{0.8, 0.35, 0.25});
        const r3d::ObjMesh mesh = r3d::loadObj(modelPath);
        const std::vector<std::shared_ptr<r3d::Hittable>>
            triangles = r3d::makeTriangles(mesh, clay);
        for (const std::shared_ptr<r3d::Hittable>& triangle :
             triangles) {
            world.add(triangle);
        }

        const auto ground = std::make_shared<r3d::Lambertian>(
            r3d::Color{0.5, 0.5, 0.5});
        world.add(std::make_shared<r3d::Sphere>(
            r3d::Point3{0, -1000.98, 0}, 1000, ground));

        r3d::CameraSettings cameraSettings;
        cameraSettings.verticalFov = 35.0;
        cameraSettings.lookFrom = r3d::Point3{0, 0.8, 5.5};
        cameraSettings.lookAt = r3d::Point3{0, -0.1, 0};
        const r3d::Camera camera(cameraSettings);

        r3d::RenderSettings renderSettings;
        renderSettings.samplesPerPixel = 16;
        renderSettings.maxDepth = 10;

        const r3d::Image image =
            r3d::render(camera, world, renderSettings);
        r3d::writePpm(std::cout, image);
        return EXIT_SUCCESS;
    } catch (const std::exception& error) {
        std::cerr << "Erreur : " << error.what() << '\n';
        return EXIT_FAILURE;
    }
}
```

#ts
```ts
// <cstdlib> : codes de sortie 0 / 1
// <exception> : Error est global
// <iostream> : process.stdout / stderr
// <memory> : pas de shared_ptr
// <string> : natif
// <vector> : natif

import { HittableList } from './geometry/hittable_list'
import { Sphere } from './geometry/sphere'
import { loadObj, makeTriangles } from './io/obj'
import { writePpm } from './io/ppm'
import { Lambertian } from './material/material'
import { Camera, CameraSettings } from './render/camera'
import { render, RenderSettings } from './render/renderer'

function main(argv: string[]): number {
  try {
    let modelPath = 'assets/suzanne_low.obj'
    if (argv.length > 1) {
      modelPath = argv[1]
    }

    const world = new HittableList()
    const clay = new Lambertian(
      new Vec3(0.8, 0.35, 0.25))
    const mesh = loadObj(modelPath)
    const triangles: Hittable[] =
      makeTriangles(mesh, clay)
    for (const triangle of
      triangles) {
      world.add(triangle)
    }

    const ground = new Lambertian(
      new Vec3(0.5, 0.5, 0.5))
    world.add(new Sphere(
      new Vec3(0, -1000.98, 0), 1000, ground))

    const cameraSettings = new CameraSettings()
    cameraSettings.verticalFov = 35.0
    cameraSettings.lookFrom = new Vec3(0, 0.8, 5.5)
    cameraSettings.lookAt = new Vec3(0, -0.1, 0)
    const camera = new Camera(cameraSettings)

    const renderSettings = new RenderSettings()
    renderSettings.samplesPerPixel = 16
    renderSettings.maxDepth = 10

    const image =
      render(camera, world, renderSettings)
    writePpm(process.stdout, image)
    return 0
  } catch (error) {
    const message = (error as Error).message
    process.stderr.write('Erreur : ' + message + '\n')
    return 1
  }
}
```
::

::devlog-note{kicker="C++ EN CLAIR"}
`int main(int argc, char** argv)` reçoit la ligne de commande : `argc` est le nombre d'arguments, `argv[i]` le i-ème, comme `process.argv` (et `argv[0]` est le nom du programme). `try { ... } catch (const std::exception& error) { ... }` est le `try / catch` de JS, et `error.what()` est le `error.message`. Toute exception de la bibliothèque standard, comme notre `std::runtime_error`, est un `std::exception`. `EXIT_SUCCESS` et `EXIT_FAILURE` sont les codes de sortie 0 et 1, écrits en toutes lettres.
::

Le chemin `assets/...` est relatif au **dossier courant**, pas à l'exécutable : lance le programme depuis la racine du dépôt.

```bash
cmake --build build-release
./build-release/r3d assets/suzanne_low.obj > suzanne.ppm
```

::devlog-your-render{src="/renders/r3d/jour-3-obj.png" alt="Suzanne en basse résolution, terre cuite mate, posée sur un sol gris" caption="Rendu de référence · 968 triangles, normales lissées · 400 × 225, 16 échantillons, un cœur, sans BVH"}
::

Les facettes sont visibles sur la silhouette (la géométrie est grossière), mais pas sur les surfaces : c'est le lissage des normales qui fait son travail. Essaie le modèle subdivisé, `assets/suzanne.obj` : seize fois plus de triangles, donc seize fois plus lent. Les deux sections suivantes s'en occupent.

::devlog-section{num="04" kicker="MULTITHREAD" title="Dix cœurs, et un seul qui travaille."}
::

### Embarrassingly parallel

Lance ton rendu et ouvre le moniteur d'activité : un cœur à 100 %, les autres au repos. Pourtant, un raytracer est l'exemple d'école de ce qu'on appelle un problème *embarrassingly parallel* : la couleur d'un pixel ne dépend d'aucun autre pixel. Chaque rayon lit la scène, ne la modifie jamais, et écrit un seul pixel.

Pas de dépendance, pas de communication : il suffit de distribuer les pixels entre plusieurs threads. Avant d'écrire une ligne, deux règles rendent ça sûr.

### Qui écrit où

La règle qui rend tout ça sûr sans un seul verrou : **chaque pixel n'est écrit que par un seul thread**. L'`Image` est allouée une fois, avant de lancer les threads, et plus jamais redimensionnée. Deux threads qui écrivent à deux indices différents d'un même `std::vector` ne se gênent pas.

Ce qui reste partagé en lecture seule : la scène, la caméra, les matériaux. Lire en parallèle est toujours sûr tant que personne n'écrit. Ils sont tous passés par `const&`, et toutes leurs méthodes sont `const` depuis le jour 1 : le compilateur tient la promesse pour nous.

### Le générateur aléatoire : la décision du jour 2 paie

Le livre définit un `random_double()` qui s'appuie sur un générateur `static`, partagé par tout le programme. En multithread, c'est un état partagé modifié à chaque appel par tous les threads : une *data race*, deux threads qui écrivent la même mémoire en même temps. En C++, c'est un comportement indéfini, pas juste un bug. Et `std::rand()` n'est pas mieux : selon la bibliothèque standard, il n'est pas garanti thread-safe, ou il l'est grâce à un verrou interne, ce qui sérialise tes threads sur l'appel le plus fréquent du programme.

Chez nous, `Rng` est déjà un paramètre. Chaque morceau d'image aura le sien, avec une graine calculée à partir de sa position dans l'image. Bonus énorme : l'image devient déterministe, identique au bit près quel que soit le nombre de threads, puisque chaque morceau tire toujours la même suite de nombres, peu importe quel thread le rend et quand. C'est ce qui permettra de vérifier que la BVH ne change rien à l'image.

### Étape 1 : une bande par thread

La version la plus simple : 10 threads, l'image coupée en 10 bandes horizontales, chacun la sienne. Chaque ligne a son propre générateur, de graine `seed + j`.

Fichier `src/render/renderer.h` :

::code-compare
#cpp
```cpp
#pragma once

#include <cstdint>

#include "geometry/hittable.h"
#include "image/image.h"
#include "render/camera.h"

namespace r3d {

struct RenderSettings {
    int samplesPerPixel = 10;
    int maxDepth = 10;
    int threadCount = 0;
    std::uint64_t seed = 42;
};

Image render(const Camera& camera,
             const Hittable& world,
             const RenderSettings& settings);

}  // namespace r3d
```

#ts
```ts
// (pas d'équivalent : les modules ES)

// <cstdint> : uint64_t -> bigint

import type { Hittable } from '../geometry/hittable'
import type { Image } from '../image/image'
import type { Camera } from './camera'

// namespace r3d

export class RenderSettings {
  samplesPerPixel = 10
  maxDepth = 10
  threadCount = 0
  seed = 42n
}

export function render(camera: Camera,
                       world: Hittable,
                       settings: RenderSettings): Image

// fin du module
```
::

`threadCount = 0` veut dire « autant que de threads matériels ».

Fichier `src/render/renderer.cc` :

::code-compare
#cpp
```cpp
#include "render/renderer.h"

#include <algorithm>
#include <limits>
#include <optional>
#include <thread>
#include <vector>

#include "material/material.h"
#include "math/rng.h"

namespace r3d {

namespace {

const double INFINITE_DISTANCE =
    std::numeric_limits<double>::infinity();

Color skyColor(const Ray& ray) {
    const Vec3 direction = unitVector(ray.direction());
    const double a = 0.5 * (direction.y + 1.0);
    const Color white{1.0, 1.0, 1.0};
    const Color blue{0.5, 0.7, 1.0};
    return (1.0 - a) * white + a * blue;
}

Color rayColor(const Ray& ray,
               const Hittable& world,
               int depth,
               Rng& rng) {
    if (depth <= 0) {
        return Color{0.0, 0.0, 0.0};
    }

    // t starts at 0.001, not 0: a bounced ray must not re-hit
    // the surface it leaves (shadow acne).
    const std::optional<HitRecord> hit =
        world.hit(ray, Interval{0.001, INFINITE_DISTANCE});
    if (!hit.has_value()) {
        return skyColor(ray);
    }

    const std::optional<Scatter> scattered =
        hit->material->scatter(ray, hit.value(), rng);
    if (!scattered.has_value()) {
        return Color{0.0, 0.0, 0.0};
    }
    const Color incoming =
        rayColor(scattered->ray, world, depth - 1, rng);
    return scattered->attenuation * incoming;
}

void renderRows(const Camera& camera,
                const Hittable& world,
                const RenderSettings& settings,
                int firstRow,
                int lastRow,
                Image& image) {
    const int samples = settings.samplesPerPixel;
    const double sampleScale = 1.0 / samples;

    for (int j = firstRow; j < lastRow; ++j) {
        // One generator per row: the image does not depend on
        // which thread renders the row.
        Rng rng(
            settings.seed + static_cast<std::uint64_t>(j));
        for (int i = 0; i < image.width(); ++i) {
            Color sum{0.0, 0.0, 0.0};
            for (int s = 0; s < samples; ++s) {
                const Ray ray = camera.sampleRay(i, j, rng);
                sum = sum + rayColor(
                    ray, world, settings.maxDepth, rng);
            }
            image.setPixel(i, j, sampleScale * sum);
        }
    }
}

int resolveThreadCount(int requested) {
    if (requested > 0) {
        return requested;
    }
    const unsigned int hardwareThreads =
        std::thread::hardware_concurrency();
    if (hardwareThreads == 0) {
        return 1;
    }
    return static_cast<int>(hardwareThreads);
}

}  // namespace

Image render(const Camera& camera,
             const Hittable& world,
             const RenderSettings& settings) {
    Image image(camera.imageWidth(), camera.imageHeight());
    const int threadCount =
        resolveThreadCount(settings.threadCount);
    // Rounded up, so the last rows are not left out when the
    // height does not divide evenly.
    const int rowsPerBand =
        (image.height() + threadCount - 1) / threadCount;

    std::vector<std::thread> threads;
    for (int band = 0; band < threadCount; ++band) {
        const int firstRow = band * rowsPerBand;
        const int lastRow =
            std::min(firstRow + rowsPerBand, image.height());
        threads.push_back(std::thread(
            [&camera, &world, &settings, &image,
             firstRow, lastRow]() {
                renderRows(camera, world, settings,
                           firstRow, lastRow, image);
            }));
    }

    for (std::thread& thread : threads) {
        thread.join();
    }
    return image;
}

}  // namespace r3d
```

#ts
```ts
import { Image } from '../image/image'

// <algorithm> : Math.min
// <limits> : Infinity
// <optional> : Scatter | null
// <thread> : analogie, voir startThread plus bas
// <vector> : tableaux natifs

import type { Material } from '../material/material'
import { Rng } from '../math/rng'

// namespace r3d

// namespace anonyme : non exporté

const INFINITE_DISTANCE =
  Infinity

function skyColor(ray: Ray): Color {
  const direction = unitVector(ray.direction())
  const a = 0.5 * (direction.y + 1.0)
  const white = new Vec3(1.0, 1.0, 1.0)
  const blue = new Vec3(0.5, 0.7, 1.0)
  return add(scale(1.0 - a, white), scale(a, blue))
}

function rayColor(ray: Ray,
                  world: Hittable,
                  depth: number,
                  rng: Rng): Color {
  if (depth <= 0) {
    return new Vec3(0.0, 0.0, 0.0)
  }

  // t starts at 0.001, not 0: a bounced ray must not re-hit
  // the surface it leaves (shadow acne).
  const hit =
    world.hit(ray, new Interval(0.001, INFINITE_DISTANCE))
  if (hit === null) {
    return skyColor(ray)
  }

  const scattered =
    hit.material!.scatter(ray, hit, rng)
  if (scattered === null) {
    return new Vec3(0.0, 0.0, 0.0)
  }
  const incoming =
    rayColor(scattered.ray, world, depth - 1, rng)
  return mul(scattered.attenuation, incoming)
}

function renderRows(camera: Camera,
                    world: Hittable,
                    settings: RenderSettings,
                    firstRow: number,
                    lastRow: number,
                    image: Image): void {
  const samples = settings.samplesPerPixel
  const sampleScale = 1.0 / samples

  for (let j = firstRow; j < lastRow; ++j) {
    // One generator per row: the image does not depend on
    // which thread renders the row.
    const rng = new Rng(
      settings.seed + BigInt(j))
    for (let i = 0; i < image.width(); ++i) {
      let sum = new Vec3(0.0, 0.0, 0.0)
      for (let s = 0; s < samples; ++s) {
        const ray = camera.sampleRay(i, j, rng)
        sum = add(sum, rayColor(
          ray, world, settings.maxDepth, rng))
      }
      image.setPixel(i, j, scale(sampleScale, sum))
    }
  }
}

function resolveThreadCount(requested: number): number {
  if (requested > 0) {
    return requested
  }
  const hardwareThreads =
    os.availableParallelism() // import os from 'node:os'
  if (hardwareThreads === 0) {
    return 1
  }
  return hardwareThreads
}

//

export function render(camera: Camera,
                       world: Hittable,
                       settings: RenderSettings): Image {
  const image =
    new Image(camera.imageWidth(), camera.imageHeight())
  const threadCount =
    resolveThreadCount(settings.threadCount)
  // Rounded up, so the last rows are not left out when the
  // height does not divide evenly.
  const rowsPerBand =
    Math.ceil(image.height() / threadCount)

  // startThread : analogie d'un Worker. Un vrai Worker ne
  // partage pas camera/world/image : il faudrait les copier
  // ou passer par un SharedArrayBuffer.
  const threads: Thread[] = []
  for (let band = 0; band < threadCount; ++band) {
    const firstRow = band * rowsPerBand
    const lastRow =
      Math.min(firstRow + rowsPerBand, image.height())
    threads.push(startThread(
      // la closure capture tout, pas de liste [&...]
      () => {
        renderRows(camera, world, settings,
                   firstRow, lastRow, image)
      }))
  }

  for (const thread of threads) {
    thread.join() // ≈ await du Worker
  }
  return image
}

// fin du module
```
::

::devlog-note{kicker="C++ EN CLAIR"}
`std::thread` lance une fonction sur un autre cœur. C'est un Web Worker qui partagerait toute la mémoire du thread principal : côté web, il faut un `SharedArrayBuffer` et `Atomics` pour obtenir ça, en C++ c'est le défaut. Toute la puissance, et tous les risques. `thread.join()` attend la fin du thread, comme un `await` sur sa promesse. Un `std::thread` détruit sans avoir été joint arrête tout le programme (`std::terminate`) : on joint toujours, avant que les données qu'il lit ne disparaissent.
::

::devlog-note{kicker="C++ EN CLAIR"}
`[&camera, &world, &settings, &image, firstRow, lastRow]() { ... }` est une lambda, la fonction fléchée de JS : `() => renderRows(...)`. Entre crochets, la liste de ce qu'elle capture. `&camera` capture par référence (le même objet que dans `render`), `firstRow` par copie (chaque thread garde sa propre valeur, même si la boucle continue). En JS, la closure capture tout automatiquement ; en C++, on l'écrit. Ici, elle ne fait qu'appeler la fonction nommée `renderRows`.
::

Ce qu'il faut lire attentivement :

- **Les références capturées sont sûres parce que les threads meurent avant les variables.** `camera`, `world` et `image` vivent dans `render`, qui ne retourne qu'après les `join()`.
- **`rowsPerBand` est arrondi au supérieur** : avec 225 lignes et 10 threads, 23 lignes par bande, la dernière n'en a que 18. Sans l'arrondi, les dernières lignes ne seraient rendues par personne.
- **`hardware_concurrency()` peut renvoyer 0** si l'information n'est pas disponible : la norme l'autorise. D'où le repli à un thread.
- **La progression ligne par ligne disparaît** : dix threads qui écrivent dans `std::clog` en même temps mélangeraient leurs lignes. Elle revient à l'étape suivante.

`main.cc` ne change pas : `render` a gardé sa signature. Ajoute `find_package(Threads)` comme en section 01, recompile, et regarde le moniteur d'activité : dix cœurs au travail. Sur la scène de la section 03 (968 triangles, 400 × 225, 16 échantillons, sans BVH, médiane de trois), le rendu passe de **11,1 s** sur un cœur à **1,83 s** sur dix threads.

### Étape 2 (optimisation) : des tuiles à la demande

**Pourquoi.** Tous les pixels ne coûtent pas pareil. Un pixel de ciel, c'est un rayon qui ne touche rien. Un pixel sur un objet en verre, c'est un rayon qui rebondit, se réfracte, rebondit encore, pour chaque échantillon. Le thread qui hérite de la bande du ciel finit en premier et attend les bras croisés. Le temps total, c'est celui du thread le plus malchanceux. Sur la scène de benchmark de la section 05 (Suzanne subdivisée, une sphère de verre, une de métal, sans BVH) en 600 pixels de large et 4 échantillons, les bandes mettent **18,1 s**.

**Ce qui change.** On découpe l'image en beaucoup de petites tuiles (32 × 32 pixels), et on laisse chaque thread **piocher** la suivante quand il a fini la sienne. Les threads rapides prennent plus de tuiles, les lents moins, et tout le monde finit à peu près en même temps. Le générateur passe de la ligne à la tuile : graine `seed + indexDeLaTuile`.

::devlog-figure{n="03" caption="Instantané d'un rendu à 4 threads. Le gris indique le coût de chaque tuile : les threads tombés sur l'objet cher ont fini moins de tuiles, mais personne n'attend. Le compteur donne la prochaine tuile à piocher."}
  :::schema-tiles
  :::
::

Pour piocher, il faut un distributeur partagé : un entier « prochaine tuile à traiter ». Si deux threads lisent `next = 12` en même temps, puis écrivent tous les deux `13`, la tuile 12 est rendue deux fois et une autre jamais. C'est encore une data race.

::devlog-note{kicker="C++ EN CLAIR"}
`std::atomic<std::size_t>` est un entier que plusieurs threads peuvent modifier sans se marcher dessus, l'équivalent des `Atomics` de JS sur un `SharedArrayBuffer`. `nextTile.fetch_add(1)` lit la valeur et l'incrémente en une seule opération indivisible, et renvoie l'ancienne valeur. Chaque appel reçoit un numéro différent, garanti : un ticket, comme au rayon boucherie. Pas de file de tâches, pas de verrou.
::

::devlog-formula{label="La boucle de chaque worker"}
`tant que vrai :`

`    i = next.fetch_add(1)`

`    si i ≥ nombreDeTuiles : sortir`

`    rendre la tuile i (écrire uniquement ses propres pixels)`
::

**Compter les rayons.** La section suivante aura besoin du nombre de rayons lancés. On le compte ici, dans `rayColor`, avec un compteur **local à chaque thread**, additionné à la fin. Un `std::atomic` incrémenté à chaque rayon par dix threads, c'est une ligne de cache qui ping-pong entre les cœurs des millions de fois par seconde : la mesure ralentirait ce qu'elle mesure. `render` renvoie donc un `RenderResult` : l'image et le nombre de rayons.

Fichier `src/render/renderer.h` :

::code-compare
#cpp
```cpp
#pragma once

#include <cstdint>
#include <vector>

#include "geometry/hittable.h"
#include "image/image.h"
#include "render/camera.h"

namespace r3d {

struct RenderSettings {
    int samplesPerPixel = 10;
    int maxDepth = 10;
    int threadCount = 0;
    int tileSize = 32;
    std::uint64_t seed = 42;
};

struct RenderResult {
    Image image;
    std::uint64_t rayCount = 0;
};

struct Tile {
    int x0 = 0;
    int y0 = 0;
    int x1 = 0;
    int y1 = 0;
};

std::vector<Tile> makeTiles(int width,
                            int height,
                            int tileSize);

RenderResult render(const Camera& camera,
                    const Hittable& world,
                    const RenderSettings& settings);

}  // namespace r3d
```

#ts
```ts
// (pas d'équivalent : les modules ES)

// <cstdint> : uint64_t -> bigint
// <vector> : tableaux natifs

import type { Hittable } from '../geometry/hittable'
import type { Image } from '../image/image'
import type { Camera } from './camera'

// namespace r3d

export class RenderSettings {
  samplesPerPixel = 10
  maxDepth = 10
  threadCount = 0
  tileSize = 32
  seed = 42n
}

export class RenderResult {
  constructor(public image: Image,
              public rayCount = 0n) {}
}

export class Tile {
  x0 = 0
  y0 = 0
  x1 = 0
  y1 = 0
}

export function makeTiles(width: number,
                          height: number,
                          tileSize: number): Tile[]

export function render(camera: Camera,
                       world: Hittable,
                       settings: RenderSettings): RenderResult

// fin du module
```
::

`makeTiles` est publique pour être testée seule.

Fichier `src/render/renderer.cc` :

::code-compare
#cpp
```cpp
#include "render/renderer.h"

#include <algorithm>
#include <atomic>
#include <cstddef>
#include <iostream>
#include <limits>
#include <optional>
#include <thread>

#include "material/material.h"
#include "math/rng.h"

namespace r3d {

namespace {

const double INFINITE_DISTANCE =
    std::numeric_limits<double>::infinity();

Color skyColor(const Ray& ray) {
    const Vec3 direction = unitVector(ray.direction());
    const double a = 0.5 * (direction.y + 1.0);
    const Color white{1.0, 1.0, 1.0};
    const Color blue{0.5, 0.7, 1.0};
    return (1.0 - a) * white + a * blue;
}

Color rayColor(const Ray& ray,
               const Hittable& world,
               int depth,
               Rng& rng,
               std::uint64_t& rayCount) {
    if (depth <= 0) {
        return Color{0.0, 0.0, 0.0};
    }
    ++rayCount;

    // t starts at 0.001, not 0: a bounced ray must not re-hit
    // the surface it leaves (shadow acne).
    const std::optional<HitRecord> hit =
        world.hit(ray, Interval{0.001, INFINITE_DISTANCE});
    if (!hit.has_value()) {
        return skyColor(ray);
    }

    const std::optional<Scatter> scattered =
        hit->material->scatter(ray, hit.value(), rng);
    if (!scattered.has_value()) {
        return Color{0.0, 0.0, 0.0};
    }
    const Color incoming = rayColor(
        scattered->ray, world, depth - 1, rng, rayCount);
    return scattered->attenuation * incoming;
}

std::uint64_t renderTile(const Camera& camera,
                         const Hittable& world,
                         const RenderSettings& settings,
                         const Tile& tile,
                         Image& image,
                         Rng& rng) {
    std::uint64_t rayCount = 0;
    const int samples = settings.samplesPerPixel;
    const double sampleScale = 1.0 / samples;

    for (int j = tile.y0; j < tile.y1; ++j) {
        for (int i = tile.x0; i < tile.x1; ++i) {
            Color sum{0.0, 0.0, 0.0};
            for (int s = 0; s < samples; ++s) {
                const Ray ray = camera.sampleRay(i, j, rng);
                sum = sum + rayColor(
                    ray, world, settings.maxDepth, rng,
                    rayCount);
            }
            image.setPixel(i, j, sampleScale * sum);
        }
    }
    return rayCount;
}

int resolveThreadCount(int requested) {
    if (requested > 0) {
        return requested;
    }
    const unsigned int hardwareThreads =
        std::thread::hardware_concurrency();
    if (hardwareThreads == 0) {
        return 1;
    }
    return static_cast<int>(hardwareThreads);
}

}  // namespace

std::vector<Tile> makeTiles(int width,
                            int height,
                            int tileSize) {
    std::vector<Tile> tiles;
    for (int y = 0; y < height; y += tileSize) {
        for (int x = 0; x < width; x += tileSize) {
            Tile tile;
            tile.x0 = x;
            tile.y0 = y;
            tile.x1 = std::min(x + tileSize, width);
            tile.y1 = std::min(y + tileSize, height);
            tiles.push_back(tile);
        }
    }
    return tiles;
}

RenderResult render(const Camera& camera,
                    const Hittable& world,
                    const RenderSettings& settings) {
    RenderResult result{Image(
        camera.imageWidth(), camera.imageHeight()), 0};
    const std::vector<Tile> tiles = makeTiles(
        result.image.width(), result.image.height(),
        settings.tileSize);
    const int threadCount =
        resolveThreadCount(settings.threadCount);

    std::atomic<std::size_t> nextTile{0};
    std::atomic<std::size_t> tilesDone{0};
    std::vector<std::uint64_t> rayCounts(threadCount, 0);

    const auto worker = [&](int threadIndex) {
        std::uint64_t localRayCount = 0;
        while (true) {
            const std::size_t tileIndex =
                nextTile.fetch_add(1);
            if (tileIndex >= tiles.size()) {
                break;
            }
            // Seeding from the tile index makes the image
            // independent of the thread count.
            Rng rng(settings.seed + tileIndex);
            localRayCount += renderTile(
                camera, world, settings, tiles[tileIndex],
                result.image, rng);

            const std::size_t done =
                tilesDone.fetch_add(1) + 1;
            // A single thread reports progress, otherwise the
            // lines interleave.
            if (threadIndex == 0) {
                std::clog << "\rTuiles : " << done << " / "
                    << tiles.size() << ' ' << std::flush;
            }
        }
        rayCounts[threadIndex] = localRayCount;
    };

    std::vector<std::thread> threads;
    for (int threadIndex = 0; threadIndex < threadCount;
         ++threadIndex) {
        threads.push_back(std::thread(worker, threadIndex));
    }
    for (std::thread& thread : threads) {
        thread.join();
    }
    std::clog << "\rTuiles : " << tiles.size() << " / "
        << tiles.size() << '\n';

    for (const std::uint64_t count : rayCounts) {
        result.rayCount += count;
    }
    return result;
}

}  // namespace r3d
```

#ts
```ts
import { Image } from '../image/image'

// <algorithm> : Math.min
// <atomic> : Atomics sur SharedArrayBuffer, ici AtomicCounter
// <cstddef> : size_t -> number
// <iostream> : process.stderr
// <limits> : Infinity
// <optional> : Scatter | null
// <thread> : analogie, voir startThread

import type { Material } from '../material/material'
import { Rng } from '../math/rng'

// namespace r3d

// namespace anonyme : non exporté

const INFINITE_DISTANCE =
  Infinity

function skyColor(ray: Ray): Color {
  const direction = unitVector(ray.direction())
  const a = 0.5 * (direction.y + 1.0)
  const white = new Vec3(1.0, 1.0, 1.0)
  const blue = new Vec3(0.5, 0.7, 1.0)
  return add(scale(1.0 - a, white), scale(a, blue))
}

function rayColor(ray: Ray,
                  world: Hittable,
                  depth: number,
                  rng: Rng,
                  rayCount: { value: bigint }): Color {
  if (depth <= 0) {
    return new Vec3(0.0, 0.0, 0.0)
  }
  ++rayCount.value // référence : un objet modifiable

  // t starts at 0.001, not 0: a bounced ray must not re-hit
  // the surface it leaves (shadow acne).
  const hit =
    world.hit(ray, new Interval(0.001, INFINITE_DISTANCE))
  if (hit === null) {
    return skyColor(ray)
  }

  const scattered =
    hit.material!.scatter(ray, hit, rng)
  if (scattered === null) {
    return new Vec3(0.0, 0.0, 0.0)
  }
  const incoming = rayColor(
    scattered.ray, world, depth - 1, rng, rayCount)
  return mul(scattered.attenuation, incoming)
}

function renderTile(camera: Camera,
                    world: Hittable,
                    settings: RenderSettings,
                    tile: Tile,
                    image: Image,
                    rng: Rng): bigint {
  const rayCount = { value: 0n }
  const samples = settings.samplesPerPixel
  const sampleScale = 1.0 / samples

  for (let j = tile.y0; j < tile.y1; ++j) {
    for (let i = tile.x0; i < tile.x1; ++i) {
      let sum = new Vec3(0.0, 0.0, 0.0)
      for (let s = 0; s < samples; ++s) {
        const ray = camera.sampleRay(i, j, rng)
        sum = add(sum, rayColor(
          ray, world, settings.maxDepth, rng,
          rayCount))
      }
      image.setPixel(i, j, scale(sampleScale, sum))
    }
  }
  return rayCount.value
}

function resolveThreadCount(requested: number): number {
  if (requested > 0) {
    return requested
  }
  const hardwareThreads =
    os.availableParallelism() // import os from 'node:os'
  if (hardwareThreads === 0) {
    return 1
  }
  return hardwareThreads
}

//

export function makeTiles(width: number,
                          height: number,
                          tileSize: number): Tile[] {
  const tiles: Tile[] = []
  for (let y = 0; y < height; y += tileSize) {
    for (let x = 0; x < width; x += tileSize) {
      const tile = new Tile()
      tile.x0 = x
      tile.y0 = y
      tile.x1 = Math.min(x + tileSize, width)
      tile.y1 = Math.min(y + tileSize, height)
      tiles.push(tile)
    }
  }
  return tiles
}

export function render(camera: Camera,
                       world: Hittable,
                       settings: RenderSettings,
): RenderResult {
  const result = new RenderResult(new Image(
    camera.imageWidth(), camera.imageHeight()), 0n)
  const tiles = makeTiles(
    result.image.width(), result.image.height(),
    settings.tileSize)
  const threadCount =
    resolveThreadCount(settings.threadCount)

  const nextTile = new AtomicCounter(0)
  const tilesDone = new AtomicCounter(0)
  const rayCounts: bigint[] = new Array(threadCount).fill(0n)

  const worker = (threadIndex: number) => {
    let localRayCount = 0n
    while (true) {
      const tileIndex =
        nextTile.fetchAdd(1)
      if (tileIndex >= tiles.length) {
        break
      }
      // Seeding from the tile index makes the image
      // independent of the thread count.
      const rng = new Rng(settings.seed + BigInt(tileIndex))
      localRayCount += renderTile(
        camera, world, settings, tiles[tileIndex],
        result.image, rng)

      const done =
        tilesDone.fetchAdd(1) + 1
      // A single thread reports progress, otherwise the
      // lines interleave.
      if (threadIndex === 0) {
        process.stderr.write('\rTuiles : ' + done + ' / '
          + tiles.length + ' ')
      }
    }
    rayCounts[threadIndex] = localRayCount
  }

  const threads: Thread[] = [] // analogie Worker
  for (let threadIndex = 0; threadIndex < threadCount;
    ++threadIndex) {
    threads.push(startThread(() => worker(threadIndex)))
  }
  for (const thread of threads) {
    thread.join()
  }
  process.stderr.write('\rTuiles : ' + tiles.length + ' / '
    + tiles.length + '\n')

  for (const count of rayCounts) {
    result.rayCount += count
  }
  return result
}

// fin du module
```
::

Ce qu'il faut lire attentivement :

- **La lambda `worker` capture tout par référence (`[&]`)**, parce qu'elle a besoin de sept variables locales de `render`. Ici, une fonction nommée prendrait sept paramètres : la lambda est plus lisible. `const auto worker` : le type d'une lambda n'a pas de nom qu'on puisse écrire, c'est le seul cas où `auto` est obligatoire.
- **La boucle `while (true)` est exactement le pseudo-code** au-dessus : un ticket, un test de fin, une tuile.
- **`std::thread(worker, threadIndex)`** construit un thread qui appelle `worker(threadIndex)`. Chaque thread reçoit son index par copie.
- **Chaque thread écrit son compteur dans sa case de `rayCounts`, une fois, à la fin.** Pas de partage pendant le rendu, pas d'atomique. `std::vector<std::uint64_t> rayCounts(threadCount, 0)` crée un tableau de `threadCount` zéros, comme `new Array(n).fill(0)`.
- **La progression est affichée par le thread 0 seulement**, à chaque tuile qu'il termine. `tilesDone` est atomique parce que tous les threads l'incrémentent, mais un seul écrit dans `std::clog` : les lignes ne s'entremêlent pas.
- **`RenderResult result{Image(...), 0}`** remplit les deux champs dans l'ordre. Les threads écrivent directement dans `result.image`.

**Avant / après.** Même scène de benchmark, 600 pixels de large, 4 échantillons, sans BVH, médiane de trois : **18,1 s** avec les bandes, **13,7 s** avec les tuiles, 24 % de temps en moins. En 200 pixels de large, l'écart tombe à 6 % (1,88 s contre 1,76 s) : avec onze lignes par bande, les bandes sont déjà assez fines pour s'équilibrer. Le découpage dynamique paie quand les zones chères sont grosses par rapport aux morceaux distribués.

Dans `main.cc`, `render` renvoie maintenant un `RenderResult` : l'appel devient

::code-compare
#cpp
```cpp
        const r3d::RenderResult result =
            r3d::render(camera, world, renderSettings);
        r3d::writePpm(std::cout, result.image);
```

#ts
```ts
    const result =
      render(camera, world, renderSettings)
    writePpm(process.stdout, result.image)
```
::

Les deux tests du renderer vérifient le découpage (chaque pixel couvert exactement une fois, y compris les tuiles incomplètes du bord) et la promesse de déterminisme : même image et même nombre de rayons à 1 et à 4 threads, comparés avec `==` cette fois, parce qu'on attend une égalité au bit près.

Fichier `tests/renderer_test.cc` :

::code-compare{right="JS (Vitest)"}
#cpp
```cpp
#include <catch2/catch_test_macros.hpp>

#include <memory>

#include "geometry/hittable_list.h"
#include "geometry/sphere.h"
#include "material/material.h"
#include "render/renderer.h"

TEST_CASE(
    "tiles cover every pixel exactly once", "[renderer]") {
    const int width = 70;
    const int height = 45;
    int covered = 0;
    const std::vector<r3d::Tile> tiles =
        r3d::makeTiles(width, height, 32);
    for (const r3d::Tile& tile : tiles) {
        REQUIRE(tile.x1 <= width);
        REQUIRE(tile.y1 <= height);
        covered += (tile.x1 - tile.x0) * (tile.y1 - tile.y0);
    }
    REQUIRE(covered == width * height);
}

TEST_CASE(
    "the image does not depend on the thread count",
    "[renderer]") {
    r3d::HittableList world;
    const auto grey = std::make_shared<r3d::Lambertian>(
        r3d::Color{0.5, 0.5, 0.5});
    world.add(std::make_shared<r3d::Sphere>(
        r3d::Point3{0, 0, -1}, 0.5, grey));

    r3d::CameraSettings cameraSettings;
    cameraSettings.imageWidth = 64;
    const r3d::Camera camera(cameraSettings);

    r3d::RenderSettings settings;
    settings.samplesPerPixel = 4;
    settings.tileSize = 16;

    settings.threadCount = 1;
    const r3d::RenderResult single =
        r3d::render(camera, world, settings);
    settings.threadCount = 4;
    const r3d::RenderResult multi =
        r3d::render(camera, world, settings);

    REQUIRE(single.rayCount == multi.rayCount);
    for (int y = 0; y < single.image.height(); ++y) {
        for (int x = 0; x < single.image.width(); ++x) {
            const r3d::Color a = single.image.pixel(x, y);
            const r3d::Color b = multi.image.pixel(x, y);
            REQUIRE(a.x == b.x);
            REQUIRE(a.y == b.y);
            REQUIRE(a.z == b.z);
        }
    }
}
```

#ts
```ts
import { expect, test } from 'vitest'

// <memory> : pas de shared_ptr

import { HittableList } from '../src/geometry/hittable_list'
import { Sphere } from '../src/geometry/sphere'
import { Lambertian } from '../src/material/material'
import { makeTiles, render,
         RenderSettings } from '../src/render/renderer'

test(
  'tiles cover every pixel exactly once', () => {
  const width = 70
  const height = 45
  let covered = 0
  const tiles =
    makeTiles(width, height, 32)
  for (const tile of tiles) {
    expect(tile.x1).toBeLessThanOrEqual(width)
    expect(tile.y1).toBeLessThanOrEqual(height)
    covered += (tile.x1 - tile.x0) * (tile.y1 - tile.y0)
  }
  expect(covered).toBe(width * height)
})

test(
  'the image does not depend on the thread count',
  () => {
  const world = new HittableList()
  const grey = new Lambertian(
    new Vec3(0.5, 0.5, 0.5))
  world.add(new Sphere(
    new Vec3(0, 0, -1), 0.5, grey))

  const cameraSettings = new CameraSettings()
  cameraSettings.imageWidth = 64
  const camera = new Camera(cameraSettings)

  const settings = new RenderSettings()
  settings.samplesPerPixel = 4
  settings.tileSize = 16

  settings.threadCount = 1
  const single =
    render(camera, world, settings)
  settings.threadCount = 4
  const multi =
    render(camera, world, settings)

  expect(single.rayCount).toBe(multi.rayCount)
  for (let y = 0; y < single.image.height(); ++y) {
    for (let x = 0; x < single.image.width(); ++x) {
      const a = single.image.pixel(x, y)
      const b = multi.image.pixel(x, y)
      expect(a.x).toBe(b.x)
      expect(a.y).toBe(b.y)
      expect(a.z).toBe(b.z)
    }
  }
})
```
::

::devlog-section{num="05" kicker="MESURER" title="On ne s'améliore pas sur ce qu'on ne mesure pas."}
::

### Mesurer avant d'optimiser

Tentation du moment : réécrire `Vec3` avec des intrinsics SIMD parce que ça a l'air rapide. Mauvaise idée tant qu'on ne sait pas où part le temps. La règle est simple : une scène de référence, un chiffre de référence, et chaque changement est jugé sur ce chiffre.

### L'horloge

`<chrono>` fournit plusieurs horloges. Pour un chronomètre, c'est `std::chrono::steady_clock` et pas `system_clock`. La seconde suit l'heure murale : elle peut sauter en arrière si le système resynchronise l'heure par le réseau pendant ton rendu. `steady_clock` est garantie monotone, comme `performance.now()` côté navigateur.

::devlog-note{kicker="C++ EN CLAIR"}
`std::chrono::steady_clock::now()` renvoie un `time_point`, un instant. La différence de deux instants est une `duration`. On la range dans une `std::chrono::duration<double>`, une durée en secondes stockée en `double`, et `elapsed.count()` donne le nombre brut : `1.47`. C'est verbeux, mais le type porte l'unité : impossible de confondre millisecondes et secondes.
::

### La bonne métrique : rayons par seconde

Le temps total dépend de la résolution, du nombre d'échantillons et de la scène. Pour comparer deux versions ou deux scènes, on ramène tout à un débit :

::devlog-formula{label="Débit"}
$$
\text{Mrays/s} = \frac{\text{rayons lancés}}{\text{secondes} \times 10^6}
$$
::

« Rayons lancés » inclut les rebonds, pas seulement les rayons primaires : c'est le `rayCount` de la section précédente.

### Une ligne de commande pour comparer

Pour mesurer, il faut pouvoir changer un paramètre sans recompiler : le nombre de threads, la résolution, les échantillons, le modèle. Une boucle sur `argv` suffit, pas besoin de bibliothèque. On copie chaque argument dans une `std::string` pour pouvoir le comparer avec `==` à une chaîne littérale. `std::atoi` est le `parseInt` du C.

La scène gagne deux sphères (verre et métal) pour que le benchmark contienne les trois matériaux. `buildScene` renvoie une petite structure `Scene` : le monde, sous forme de `std::shared_ptr<Hittable>` plutôt que de `HittableList` (en section 06, ce pourra être autre chose qu'une liste sans que `main` change), et le nombre de triangles, pour l'affichage.

Fichier `src/main.cc`, version de l'étape :

::code-compare
#cpp
```cpp
#include <chrono>
#include <cstddef>
#include <cstdlib>
#include <exception>
#include <iostream>
#include <memory>
#include <string>
#include <vector>

#include "geometry/hittable_list.h"
#include "geometry/sphere.h"
#include "io/obj.h"
#include "io/ppm.h"
#include "material/material.h"
#include "render/camera.h"
#include "render/renderer.h"

namespace {

struct Options {
    std::string modelPath = "assets/suzanne.obj";
    int imageWidth = 600;
    int samplesPerPixel = 64;
    int threadCount = 0;
};

struct Scene {
    std::shared_ptr<r3d::Hittable> world;
    std::size_t triangleCount = 0;
};

Options parseOptions(int argc, char** argv) {
    Options options;
    for (int i = 1; i < argc; ++i) {
        const std::string arg = argv[i];
        const bool hasValue = i + 1 < argc;
        if (arg == "--threads" && hasValue) {
            options.threadCount = std::atoi(argv[i + 1]);
            ++i;
        } else if (arg == "--spp" && hasValue) {
            options.samplesPerPixel = std::atoi(argv[i + 1]);
            ++i;
        } else if (arg == "--width" && hasValue) {
            options.imageWidth = std::atoi(argv[i + 1]);
            ++i;
        } else {
            options.modelPath = arg;
        }
    }
    return options;
}

Scene buildScene(const Options& options) {
    const auto clay = std::make_shared<r3d::Lambertian>(
        r3d::Color{0.8, 0.35, 0.25});
    const auto ground = std::make_shared<r3d::Lambertian>(
        r3d::Color{0.5, 0.5, 0.5});
    const auto glass = std::make_shared<r3d::Dielectric>(1.5);
    const auto steel = std::make_shared<r3d::Metal>(
        r3d::Color{0.8, 0.8, 0.85}, 0.05);

    const r3d::ObjMesh mesh = r3d::loadObj(options.modelPath);
    std::vector<std::shared_ptr<r3d::Hittable>> objects =
        r3d::makeTriangles(mesh, clay);
    const std::size_t triangleCount = objects.size();

    objects.push_back(std::make_shared<r3d::Sphere>(
        r3d::Point3{0, -1000.98, 0}, 1000, ground));
    objects.push_back(std::make_shared<r3d::Sphere>(
        r3d::Point3{-2.4, -0.38, 0.6}, 0.6, glass));
    objects.push_back(std::make_shared<r3d::Sphere>(
        r3d::Point3{2.4, -0.38, 0.4}, 0.6, steel));

    const auto list = std::make_shared<r3d::HittableList>();
    for (const std::shared_ptr<r3d::Hittable>& object :
         objects) {
        list->add(object);
    }
    return Scene{list, triangleCount};
}

}  // namespace

int main(int argc, char** argv) {
    try {
        const Options options = parseOptions(argc, argv);
        const Scene scene = buildScene(options);

        r3d::CameraSettings cameraSettings;
        cameraSettings.imageWidth = options.imageWidth;
        cameraSettings.verticalFov = 35.0;
        cameraSettings.lookFrom = r3d::Point3{0, 0.8, 5.5};
        cameraSettings.lookAt = r3d::Point3{0, -0.1, 0};
        const r3d::Camera camera(cameraSettings);

        r3d::RenderSettings renderSettings;
        renderSettings.samplesPerPixel =
            options.samplesPerPixel;
        renderSettings.maxDepth = 10;
        renderSettings.threadCount = options.threadCount;

        const std::chrono::steady_clock::time_point start =
            std::chrono::steady_clock::now();
        const r3d::RenderResult result =
            r3d::render(camera, *scene.world, renderSettings);
        const std::chrono::steady_clock::time_point end =
            std::chrono::steady_clock::now();

        const std::chrono::duration<double> elapsed =
            end - start;
        const double seconds = elapsed.count();
        const double rays =
            static_cast<double>(result.rayCount);
        const double megaRaysPerSecond = rays / seconds / 1e6;

        std::clog << scene.triangleCount << " triangles\n";
        std::clog << seconds << " s, " << megaRaysPerSecond
            << " Mrays/s\n";

        r3d::writePpm(std::cout, result.image);
        return EXIT_SUCCESS;
    } catch (const std::exception& error) {
        std::cerr << "Erreur : " << error.what() << '\n';
        return EXIT_FAILURE;
    }
}
```

#ts
```ts
// <chrono> : performance.now()
// <cstddef> : size_t -> number
// <cstdlib> : Number() pour atoi, codes 0 / 1
// <exception> : Error est global
// <iostream> : process.stdout / stderr
// <memory> : pas de shared_ptr
// <string> : natif
// <vector> : natif

import { HittableList } from './geometry/hittable_list'
import { Sphere } from './geometry/sphere'
import { loadObj, makeTriangles } from './io/obj'
import { writePpm } from './io/ppm'
import { Dielectric, Lambertian,
         Metal } from './material/material'
import { Camera, CameraSettings } from './render/camera'
import { render, RenderSettings } from './render/renderer'

// namespace anonyme : non exporté

class Options {
  modelPath = 'assets/suzanne.obj'
  imageWidth = 600
  samplesPerPixel = 64
  threadCount = 0
}

class Scene {
  constructor(public world: Hittable,
              public triangleCount = 0) {}
}

function parseOptions(argv: string[]): Options {
  const options = new Options()
  for (let i = 1; i < argv.length; ++i) {
    const arg = argv[i]
    const hasValue = i + 1 < argv.length
    if (arg === '--threads' && hasValue) {
      options.threadCount = Number(argv[i + 1])
      ++i
    } else if (arg === '--spp' && hasValue) {
      options.samplesPerPixel = Number(argv[i + 1])
      ++i
    } else if (arg === '--width' && hasValue) {
      options.imageWidth = Number(argv[i + 1])
      ++i
    } else {
      options.modelPath = arg
    }
  }
  return options
}

function buildScene(options: Options): Scene {
  const clay = new Lambertian(
    new Vec3(0.8, 0.35, 0.25))
  const ground = new Lambertian(
    new Vec3(0.5, 0.5, 0.5))
  const glass = new Dielectric(1.5)
  const steel = new Metal(
    new Vec3(0.8, 0.8, 0.85), 0.05)

  const mesh = loadObj(options.modelPath)
  const objects: Hittable[] =
    makeTriangles(mesh, clay)
  const triangleCount = objects.length

  objects.push(new Sphere(
    new Vec3(0, -1000.98, 0), 1000, ground))
  objects.push(new Sphere(
    new Vec3(-2.4, -0.38, 0.6), 0.6, glass))
  objects.push(new Sphere(
    new Vec3(2.4, -0.38, 0.4), 0.6, steel))

  const list = new HittableList()
  for (const object of
    objects) {
    list.add(object)
  }
  return new Scene(list, triangleCount)
}

//

function main(argv: string[]): number {
  try {
    const options = parseOptions(argv)
    const scene = buildScene(options)

    const cameraSettings = new CameraSettings()
    cameraSettings.imageWidth = options.imageWidth
    cameraSettings.verticalFov = 35.0
    cameraSettings.lookFrom = new Vec3(0, 0.8, 5.5)
    cameraSettings.lookAt = new Vec3(0, -0.1, 0)
    const camera = new Camera(cameraSettings)

    const renderSettings = new RenderSettings()
    renderSettings.samplesPerPixel =
      options.samplesPerPixel
    renderSettings.maxDepth = 10
    renderSettings.threadCount = options.threadCount

    const start =
      performance.now()
    const result =
      render(camera, scene.world, renderSettings)
    const end =
      performance.now()

    const elapsed =
      end - start // en millisecondes
    const seconds = elapsed / 1000
    const rays =
      Number(result.rayCount)
    const megaRaysPerSecond = rays / seconds / 1e6

    process.stderr.write(scene.triangleCount + ' triangles\n')
    process.stderr.write(seconds + ' s, ' + megaRaysPerSecond
      + ' Mrays/s\n')

    writePpm(process.stdout, result.image)
    return 0
  } catch (error) {
    const message = (error as Error).message
    process.stderr.write('Erreur : ' + message + '\n')
    return 1
  }
}
```
::

Le chronomètre n'entoure **que** `render` : le chargement du fichier et l'écriture du PPM n'ont rien à voir avec la vitesse du raytracer, et ils fausseraient la comparaison. `std::atoi` renvoie 0 sur une valeur illisible, ce qui pour `--threads` veut dire « automatique » : un défaut acceptable pour un outil de mesure. `*scene.world` déréférence le pointeur : `render` attend un `const Hittable&`, l'objet lui-même, pas son adresse.

### Debug contre Release

C'est le premier gain, et le plus gros, pour zéro ligne de code. En Debug, le compilateur n'optimise rien : chaque petit opérateur de `Vec3` reste un vrai appel de fonction, chaque variable fait un aller-retour en mémoire. En Release (`-O3 -DNDEBUG` avec GCC et Clang), tout ça est inliné, vectorisé, gardé en registre.

Le dépôt garde `Debug` par défaut (c'est le bon mode pour les tests et le débogueur), et on construit la version optimisée dans un dossier à part :

```bash
cmake -B build-release -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build-release
./build-release/r3d --width 200 --spp 4 --threads 1 > /dev/null
```

Deux nuances. Les générateurs multi-configuration (Visual Studio, Xcode) ignorent `CMAKE_BUILD_TYPE` : c'est `cmake --build build --config Release`. Et `RelWithDebInfo` (`-O2 -g`) est le bon compromis pour profiler : optimisé, mais avec les symboles. `-march=native` peut encore grappiller quelques pourcents, au prix d'un binaire qui ne tourne que sur des processeurs comme le tien.

### Une scène de benchmark

Un chiffre n'a de sens que s'il est reproductible :

- **scène figée** dans le code, jamais aléatoire ;
- **résolution, échantillons par pixel, profondeur max** fixes ;
- **seed fixe**, d'où l'intérêt du générateur par tuile ;
- **trois mesures, on garde la médiane** : la première est souvent plus lente (caches froids, fréquence CPU qui monte) ;
- sur portable, branché sur secteur, rien d'autre de lourd qui tourne.

Notre référence : Suzanne subdivisée (15 744 triangles), 200 × 112 pixels, 4 échantillons, profondeur 10. Petite, pour que la version la plus lente reste mesurable. Ça fait environ 188 000 rayons. Les premiers chiffres, médiane de trois :

| Build | Threads | Temps | Mrays/s |
|---|---|---|---|
| Debug | 1 | 126,9 s | 0,0015 |
| Release | 1 | 9,37 s | 0,020 |
| Release | 10 | 1,47 s | 0,128 |

Release : **×13,5**. Les threads : **×6,4** sur 10 cœurs. Pas ×10, parce que le M1 Max a 8 cœurs performance et 2 cœurs efficacité, plus lents, et qu'à la fin du rendu les derniers threads finissent leur tuile pendant que les autres n'ont plus rien à piocher.

Et pourtant : 1,5 seconde pour une image de 200 pixels de large, c'est catastrophique. Un profiler (`perf` sous Linux, Instruments sous macOS) le dirait en une seconde, mais le calcul suffit : chaque rayon fait 15 744 tests Möller–Trumbore, et presque tous ratent.

::devlog-section{num="06" kicker="BVH" title="Arrêter de tester tous les triangles."}
::

### Le problème en O(n)

Pour l'instant, la scène est une liste. Un rayon la parcourt en entier et garde l'impact le plus proche. Avec dix sphères, aucun souci. Avec Suzanne, chaque rayon fait 15 744 tests.

Ordre de grandeur : une image 600 × 337, 64 échantillons, quelques rebonds, c'est autour de 27 millions de rayons. Fois 15 744 triangles : plus de quatre cents milliards de tests. Le multithreading a divisé par six. Il faut diviser par cent, au moins.

C'est la dernière optimisation de la journée, et la seule qui change l'algorithme plutôt que la façon de l'exécuter. Le point de départ, c'est la version qui marche : la liste, testée objet par objet. Le chiffre à battre : **9,37 s** en Release sur un thread, sur le banc d'essai de la section 05.

L'observation qui sauve tout : un rayon ne passe que dans une toute petite partie de la scène. Si on range les triangles dans des boîtes, et les boîtes dans des boîtes plus grandes, un rayon qui rate une boîte n'a besoin de tester **aucun** de ses triangles. C'est une *Bounding Volume Hierarchy*, une BVH, et elle fait passer le coût par rayon de $O(n)$ à environ $O(\log n)$.

### La boîte : AABB

On utilise des boîtes alignées sur les axes (*Axis-Aligned Bounding Box*). Une AABB, c'est deux coins : `min` et `max`. Pas de rotation. Ça a l'air limitant, mais c'est ce qui rend le test d'intersection ridiculement rapide.

L'astuce s'appelle le **slab test**. Une AABB en 3D est l'intersection de trois **dalles** : la région entre deux plans parallèles en x, celle en y, celle en z. Le rayon traverse chaque dalle pendant un certain intervalle de $t$. Il traverse la boîte pendant l'intervalle où il est dans les trois dalles à la fois, donc l'**intersection** des trois intervalles.

::devlog-formula{label="Slab test, pour chaque axe a ∈ {x, y, z}"}
$$
t_0 = \frac{\text{min}_a - O_a}{D_a}, \qquad t_1 = \frac{\text{max}_a - O_a}{D_a} \qquad (D_a < 0 \Rightarrow \text{échanger } t_0, t_1)
$$

$$
t_{\text{entrée}} \leftarrow \max(t_{\text{entrée}}, t_0), \qquad t_{\text{sortie}} \leftarrow \min(t_{\text{sortie}}, t_1)
$$

$$
t_{\text{sortie}} \le t_{\text{entrée}} \Rightarrow \text{raté}
$$
::

On démarre avec $t_{\text{entrée}} = t_{\min}$ et $t_{\text{sortie}} = t_{\max}$ du rayon. Ainsi, une boîte entièrement derrière la caméra, ou plus loin que l'impact le plus proche déjà trouvé, est rejetée par le même test.

::devlog-figure{n="04" caption="En 2D, deux dalles suffisent. Trait plein : intervalle dans la dalle x ; pointillés : dalle y ; orange : leur chevauchement, la traversée de la boîte. Le rayon du bas sort de la dalle x avant d'entrer dans la dalle y : raté."}
  :::schema-slab
  :::
::

Si $D_a$ vaut zéro, la division flottante IEEE donne $\pm\infty$, ce qui fait exactement ce qu'il faut : le rayon est dans la dalle pour tout $t$, ou jamais. Sauf cas pathologique où l'origine est pile sur le plan ($0 \times \infty = \text{NaN}$) : `std::max(tEntrée, NaN)` renvoie alors $t_{\text{entrée}}$, la dalle est ignorée, et la boîte est considérée comme touchée. Un faux positif ne coûte qu'un test de plus, jamais une image fausse.

Pour boucler sur les axes, il faut lire la composante $x$, $y$ ou $z$ d'un vecteur à partir d'un numéro d'axe. Dans `src/math/vec3.h`, avec les autres fonctions libres :

::code-compare
#cpp
```cpp
inline double axisValue(const Vec3& v, int axis) {
    if (axis == 0) {
        return v.x;
    }
    if (axis == 1) {
        return v.y;
    }
    return v.z;
}
```

#ts
```ts
export function axisValue(v: Vec3, axis: number): number {
  if (axis === 0) {
    return v.x
  }
  if (axis === 1) {
    return v.y
  }
  return v.z
}
```
::

Fichier `src/math/aabb.h` :

::code-compare
#cpp
```cpp
#pragma once

#include "math/interval.h"
#include "math/ray.h"
#include "math/vec3.h"

namespace r3d {

class Aabb {
public:
    Aabb();
    Aabb(const Point3& a, const Point3& b);

    static Aabb surrounding(const Aabb& a, const Aabb& b);

    Point3 min() const { return min_; }
    Point3 max() const { return max_; }
    Point3 centroid() const { return 0.5 * (min_ + max_); }
    int longestAxis() const;

    bool hit(const Ray& ray, Interval rayT) const;

private:
    Point3 min_;
    Point3 max_;
};

}  // namespace r3d
```

#ts
```ts
// (pas d'équivalent : les modules ES)

import type { Interval } from './interval'
import type { Ray } from './ray'
import { add, scale, type Point3 } from './vec3'

// namespace r3d

export class Aabb {
  // public :
  constructor() // -> aabb.cc
  constructor(a: Point3, b: Point3) // -> aabb.cc

  static surrounding(a: Aabb, b: Aabb): Aabb // -> .cc

  min(): Point3 { return this.#min }
  max(): Point3 { return this.#max }
  centroid(): Point3 {
    return scale(0.5, add(this.#min, this.#max)) }
  longestAxis(): number // -> aabb.cc

  hit(ray: Ray, rayT: Interval): boolean // -> aabb.cc

  // private :
  #min: Point3
  #max: Point3
}

// fin du module
```
::

::devlog-note{kicker="C++ EN CLAIR"}
`static Aabb surrounding(...)` est une méthode statique : elle appartient à la classe, pas à une boîte en particulier, comme `static` dans une classe TS. On l'appelle `Aabb::surrounding(a, b)`, sans objet devant. Elle a quand même accès aux membres privés `min_` et `max_` des boîtes qu'elle reçoit, puisqu'elle fait partie de la classe.
::

La boîte par défaut est **vide** : `min` à $+\infty$, `max` à $-\infty$. C'est l'élément neutre de `surrounding` : englober une boîte vide et une boîte $B$ redonne $B$. On peut donc partir d'une `Aabb{}` et y ajouter les objets un par un, sans cas particulier pour le premier.

Fichier `src/math/aabb.cc` :

::code-compare
#cpp
```cpp
#include "math/aabb.h"

#include <algorithm>
#include <limits>
#include <utility>

namespace r3d {

namespace {

const double MIN_THICKNESS = 1e-4;

void padAxis(double& low, double& high) {
    if (high - low < MIN_THICKNESS) {
        low = low - MIN_THICKNESS / 2;
        high = high + MIN_THICKNESS / 2;
    }
}

}  // namespace

Aabb::Aabb() {
    // An empty box: surrounding(empty, b) gives back b, so
    // boxes can be grown from nothing.
    const double infinity =
        std::numeric_limits<double>::infinity();
    min_ = Point3{infinity, infinity, infinity};
    max_ = Point3{-infinity, -infinity, -infinity};
}

Aabb::Aabb(const Point3& a, const Point3& b) {
    min_ = Point3{std::min(a.x, b.x),
                  std::min(a.y, b.y),
                  std::min(a.z, b.z)};
    max_ = Point3{std::max(a.x, b.x),
                  std::max(a.y, b.y),
                  std::max(a.z, b.z)};
    padAxis(min_.x, max_.x);
    padAxis(min_.y, max_.y);
    padAxis(min_.z, max_.z);
}

Aabb Aabb::surrounding(const Aabb& a, const Aabb& b) {
    Aabb box;
    box.min_ = Point3{std::min(a.min_.x, b.min_.x),
                      std::min(a.min_.y, b.min_.y),
                      std::min(a.min_.z, b.min_.z)};
    box.max_ = Point3{std::max(a.max_.x, b.max_.x),
                      std::max(a.max_.y, b.max_.y),
                      std::max(a.max_.z, b.max_.z)};
    return box;
}

int Aabb::longestAxis() const {
    const Vec3 extent = max_ - min_;
    if (extent.x > extent.y && extent.x > extent.z) {
        return 0;
    }
    if (extent.y > extent.z) {
        return 1;
    }
    return 2;
}

bool Aabb::hit(const Ray& ray, Interval rayT) const {
    for (int axis = 0; axis < 3; ++axis) {
        const double origin = axisValue(ray.origin(), axis);
        const double inverseDirection =
            1.0 / axisValue(ray.direction(), axis);

        const double low = axisValue(min_, axis);
        const double high = axisValue(max_, axis);
        double t0 = (low - origin) * inverseDirection;
        double t1 = (high - origin) * inverseDirection;
        if (inverseDirection < 0.0) {
            std::swap(t0, t1);
        }

        rayT.min = std::max(rayT.min, t0);
        rayT.max = std::min(rayT.max, t1);
        if (rayT.max <= rayT.min) {
            return false;
        }
    }
    return true;
}

}  // namespace r3d
```

#ts
```ts
// aabb.ts, suite (TS n'a qu'un corps de constructeur :
//   les deux versions C++ sont montrées séparément)
// <limits> : Infinity
// (std::swap : échange par déstructuration)

// namespace r3d

// namespace anonyme : non exporté

const MIN_THICKNESS = 1e-4

// pas de double& en TS : on renvoie la paire
function padAxis(low: number,
                 high: number): [number, number] {
  if (high - low < MIN_THICKNESS) {
    low = low - MIN_THICKNESS / 2
    high = high + MIN_THICKNESS / 2
  }
  return [low, high] }

//

constructor() { // boîte vide
  // An empty box: surrounding(empty, b) gives back b, so
  // boxes can be grown from nothing.
  const infinity =
    Infinity
  this.#min = new Vec3(infinity, infinity, infinity)
  this.#max = new Vec3(-infinity, -infinity, -infinity)
}

constructor(a: Point3, b: Point3) { // deux coins
  this.#min = new Vec3(Math.min(a.x, b.x),
                       Math.min(a.y, b.y),
                       Math.min(a.z, b.z))
  this.#max = new Vec3(Math.max(a.x, b.x),
                       Math.max(a.y, b.y),
                       Math.max(a.z, b.z))
  ;[this.#min.x, this.#max.x] =
    padAxis(this.#min.x, this.#max.x)
  ;[this.#min.y, this.#max.y] =
    padAxis(this.#min.y, this.#max.y)
  ;[this.#min.z, this.#max.z] =
    padAxis(this.#min.z, this.#max.z)
}

static surrounding(a: Aabb, b: Aabb): Aabb {
  const box = new Aabb()
  box.#min = new Vec3(Math.min(a.#min.x, b.#min.x),
                      Math.min(a.#min.y, b.#min.y),
                      Math.min(a.#min.z, b.#min.z))
  box.#max = new Vec3(Math.max(a.#max.x, b.#max.x),
                      Math.max(a.#max.y, b.#max.y),
                      Math.max(a.#max.z, b.#max.z))
  return box
}

longestAxis(): number {
  const extent = sub(this.#max, this.#min)
  if (extent.x > extent.y && extent.x > extent.z) {
    return 0
  }
  if (extent.y > extent.z) {
    return 1
  }
  return 2
}

hit(ray: Ray, rayT: Interval): boolean {
  rayT = new Interval(rayT.min, rayT.max) // copie, comme C++
  for (let axis = 0; axis < 3; ++axis) {
    const origin = axisValue(ray.origin(), axis)
    const inverseDirection =
      1.0 / axisValue(ray.direction(), axis)

    const low = axisValue(this.#min, axis)
    const high = axisValue(this.#max, axis)
    let t0 = (low - origin) * inverseDirection
    let t1 = (high - origin) * inverseDirection
    if (inverseDirection < 0.0) {
      ;[t0, t1] = [t1, t0]
    }

    rayT.min = Math.max(rayT.min, t0)
    rayT.max = Math.min(rayT.max, t1)
    if (rayT.max <= rayT.min) {
      return false
    }
  }
  return true
}

// fin du module
```
::

`rayT` est reçu **par valeur** : on le rétrécit librement, l'appelant ne voit rien. `std::swap(t0, t1)` échange les deux variables, le `[t0, t1] = [t1, t0]` de JS. `padAxis` prend ses deux paramètres par référence (`double&`) : elle modifie directement `min_.x` et `max_.x` de la boîte. Le constructeur à deux points accepte les coins dans n'importe quel ordre, et c'est lui qui gère **la boîte plate** : un triangle parfaitement aligné sur un axe (un sol, un mur) a une boîte d'épaisseur nulle, sur laquelle le slab test est numériquement fragile. `padAxis` lui donne une épaisseur minimale de `1e-4`.

On pourrait précalculer $1 / \mathbf{D}$ une fois par rayon, dans `Ray`, plutôt qu'à chaque boîte. C'est une optimisation classique, mais elle change `Ray` pour tout le monde : on la garde pour le jour où le profiler la réclame.

Les tests du slab test : traversée, rayon à côté, boîte derrière, boîte au-delà de $t_{\max}$, direction avec une composante nulle, boîte plate, et l'axe le plus long.

Fichier `tests/aabb_test.cc` :

::code-compare{right="JS (Vitest)"}
#cpp
```cpp
#include <catch2/catch_test_macros.hpp>

#include <limits>

#include "math/aabb.h"

using r3d::Point3;
using r3d::Ray;
using r3d::Vec3;

namespace {

const double INFINITE_DISTANCE =
    std::numeric_limits<double>::infinity();
const r3d::Interval ANY_FORWARD{0.001, INFINITE_DISTANCE};
const r3d::Aabb UNIT_BOX(Point3{-1, -1, -1}, Point3{1, 1, 1});
const Vec3 DOWN_Z{0, 0, -1};

}  // namespace

TEST_CASE("a ray through the box hits it", "[aabb]") {
    const Ray ray{Point3{0, 0, 5}, DOWN_Z};
    REQUIRE(UNIT_BOX.hit(ray, ANY_FORWARD));
}

TEST_CASE("a ray beside the box misses it", "[aabb]") {
    const Ray ray{Point3{3, 0, 5}, DOWN_Z};
    REQUIRE_FALSE(UNIT_BOX.hit(ray, ANY_FORWARD));
}

TEST_CASE("a box behind the ray is rejected", "[aabb]") {
    const Ray ray{Point3{0, 0, 5}, Vec3{0, 0, 1}};
    REQUIRE_FALSE(UNIT_BOX.hit(ray, ANY_FORWARD));
}

TEST_CASE("a box beyond tMax is rejected", "[aabb]") {
    const Ray ray{Point3{0, 0, 5}, DOWN_Z};
    const r3d::Interval tooShort{0.001, 3.0};
    REQUIRE_FALSE(UNIT_BOX.hit(ray, tooShort));
}

TEST_CASE("a zero direction component works", "[aabb]") {
    const Ray inside{Point3{0.5, 0.5, 5}, DOWN_Z};
    const Ray outside{Point3{1.5, 0.5, 5}, DOWN_Z};
    REQUIRE(UNIT_BOX.hit(inside, ANY_FORWARD));
    REQUIRE_FALSE(UNIT_BOX.hit(outside, ANY_FORWARD));
}

TEST_CASE("a flat box is padded and can be hit", "[aabb]") {
    const r3d::Aabb floor(Point3{-1, 0, -1}, Point3{1, 0, 1});
    const Ray ray{Point3{0, 1, 0}, Vec3{0, -1, 0}};
    REQUIRE(floor.max().y > floor.min().y);
    REQUIRE(floor.hit(ray, ANY_FORWARD));
}

TEST_CASE("longestAxis picks the widest extent", "[aabb]") {
    const r3d::Aabb tall(Point3{0, 0, 0}, Point3{1, 5, 2});
    const r3d::Aabb deep(Point3{0, 0, 0}, Point3{0, 0, 9});
    const r3d::Aabb both =
        r3d::Aabb::surrounding(UNIT_BOX, deep);
    REQUIRE(tall.longestAxis() == 1);
    REQUIRE(both.longestAxis() == 2);
}
```

#ts
```ts
import { expect, test } from 'vitest'

// <limits> : Infinity

import { Aabb } from '../src/math/aabb'

import { Ray } from '../src/math/ray'
import { Vec3 } from '../src/math/vec3' // Point3 = Vec3
//

// constantes locales au fichier

const INFINITE_DISTANCE =
  Infinity
const ANY_FORWARD = new Interval(0.001, INFINITE_DISTANCE)
const UNIT_BOX =
  new Aabb(new Vec3(-1, -1, -1), new Vec3(1, 1, 1))
const DOWN_Z = new Vec3(0, 0, -1)

//

test('a ray through the box hits it', () => {
  const ray = new Ray(new Vec3(0, 0, 5), DOWN_Z)
  expect(UNIT_BOX.hit(ray, ANY_FORWARD)).toBe(true)
})

test('a ray beside the box misses it', () => {
  const ray = new Ray(new Vec3(3, 0, 5), DOWN_Z)
  expect(UNIT_BOX.hit(ray, ANY_FORWARD)).toBe(false)
})

test('a box behind the ray is rejected', () => {
  const ray = new Ray(new Vec3(0, 0, 5), new Vec3(0, 0, 1))
  expect(UNIT_BOX.hit(ray, ANY_FORWARD)).toBe(false)
})

test('a box beyond tMax is rejected', () => {
  const ray = new Ray(new Vec3(0, 0, 5), DOWN_Z)
  const tooShort = new Interval(0.001, 3.0)
  expect(UNIT_BOX.hit(ray, tooShort)).toBe(false)
})

test('a zero direction component works', () => {
  const inside = new Ray(new Vec3(0.5, 0.5, 5), DOWN_Z)
  const outside = new Ray(new Vec3(1.5, 0.5, 5), DOWN_Z)
  expect(UNIT_BOX.hit(inside, ANY_FORWARD)).toBe(true)
  expect(UNIT_BOX.hit(outside, ANY_FORWARD)).toBe(false)
})

test('a flat box is padded and can be hit', () => {
  const floor =
    new Aabb(new Vec3(-1, 0, -1), new Vec3(1, 0, 1))
  const ray = new Ray(new Vec3(0, 1, 0), new Vec3(0, -1, 0))
  expect(floor.max().y).toBeGreaterThan(floor.min().y)
  expect(floor.hit(ray, ANY_FORWARD)).toBe(true)
})

test('longestAxis picks the widest extent', () => {
  const tall = new Aabb(new Vec3(0, 0, 0), new Vec3(1, 5, 2))
  const deep = new Aabb(new Vec3(0, 0, 0), new Vec3(0, 0, 9))
  const both =
    Aabb.surrounding(UNIT_BOX, deep)
  expect(tall.longestAxis()).toBe(1)
  expect(both.longestAxis()).toBe(2)
})
```
::

### Chaque objet connaît sa boîte

Pour qu'une sphère, un triangle ou un nœud de BVH puissent être rangés dans l'arbre, `Hittable` a besoin d'une méthode de plus. Dans `src/geometry/hittable.h`, on inclut `math/aabb.h` et l'interface devient :

::code-compare
#cpp
```cpp
class Hittable {
public:
    virtual ~Hittable() = default;
    virtual std::optional<HitRecord> hit(
            const Ray& ray,
            Interval rayT) const = 0;
    virtual Aabb boundingBox() const = 0;
};
```

#ts
```ts
export interface Hittable {
  // (destructeur virtuel : rien à écrire)
  // (= 0 : toute méthode d'interface est à implémenter)
  hit(
      ray: Ray,
      rayT: Interval): HitRecord | null
  boundingBox(): Aabb
}
```
::

Méthode pure : tant qu'une classe ne l'implémente pas, elle ne compile plus. C'est le compilateur qui donne la liste des endroits à modifier. Chaque objet calcule sa boîte **une fois**, à la construction, et la renvoie par copie (48 octets).

**La sphère.** Dans `src/geometry/sphere.h`, ajoute la méthode publique et le membre :

::code-compare
#cpp
```cpp
    Aabb boundingBox() const override { return box_; }

private:
    // ... membres existants
    Aabb box_;
```

#ts
```ts
  boundingBox(): Aabb { return this.#box }

  // private :
  // ... membres existants
  #box: Aabb
```
::

Et dans `src/geometry/sphere.cc`, le constructeur la calcule. C'est ici que le rayon ramené à zéro du jour 2 prend tout son sens : avec un rayon négatif, la boîte serait retournée.

::code-compare
#cpp
```cpp
Sphere::Sphere(
        const Point3& center,
        double radius,
        const std::shared_ptr<const Material>& material)
    : center_(center), radius_(radius), material_(material) {
    if (radius_ < 0.0) {
        radius_ = 0.0;
    }
    const Vec3 extent{radius_, radius_, radius_};
    box_ = Aabb(center_ - extent, center_ + extent);
}
```

#ts
```ts
constructor(
    center: Point3,
    radius: number,
    material: Readonly<Material>) {
  this.#center = center; this.#radius = radius
  this.#material = material
  if (this.#radius < 0.0) {
    this.#radius = 0.0
  }
  const r = this.#radius
  const extent = new Vec3(r, r, r)
  this.#box = new Aabb(sub(this.#center, extent),
                       add(this.#center, extent))
}
```
::

**Le triangle.** Même ajout dans `src/geometry/triangle.h` (méthode `boundingBox()` et membre `Aabb box_;` après `material_`), et une ligne à la fin du corps des deux constructeurs de `src/geometry/triangle.cc` :

::code-compare
#cpp
```cpp
    box_ = Aabb::surrounding(Aabb(a, b), Aabb(c, c));
```

#ts
```ts
  this.#box = Aabb.surrounding(new Aabb(a, b), new Aabb(c, c))
```
::

`Aabb(c, c)` est une boîte réduite à un point (puis épaissie par `padAxis`) : la façon la plus simple d'ajouter un troisième sommet.

**La liste.** Dans `src/geometry/hittable_list.h`, même méthode, même membre. La boîte grossit à chaque `add`, dans `src/geometry/hittable_list.cc` :

::code-compare
#cpp
```cpp
void HittableList::add(
        const std::shared_ptr<Hittable>& object) {
    box_ = Aabb::surrounding(box_, object->boundingBox());
    objects_.push_back(object);
}
```

#ts
```ts
add(
    object: Hittable): void {
  this.#box =
    Aabb.surrounding(this.#box, object.boundingBox())
  this.#objects.push(object)
}
```
::

### Construire l'arbre

La construction la plus simple, celle de [Ray Tracing: The Next Week](https://raytracing.github.io/books/RayTracingTheNextWeek.html), est récursive :

1. Calculer la boîte qui englobe toutes les primitives du nœud.
2. S'il reste une ou deux primitives : c'est une feuille, on s'arrête.
3. Sinon, choisir l'**axe le plus long** de la boîte (là où les objets sont le plus étalés).
4. Trier les primitives selon le centre de leur boîte sur cet axe, couper à la **médiane**.
5. Recommencer sur chaque moitié.

Coupe à la médiane : les deux enfants ont le même nombre de primitives, donc l'arbre est équilibré et sa profondeur vaut $\log_2 n$. 15 744 triangles, 14 niveaux.

::devlog-figure{n="05" caption="Monte la profondeur : chaque niveau coupe les boîtes en deux selon leur axe le plus long. Déplace le rayon et compare les segments testés avec et sans BVH."}
  :::demo-bvh
  :::
::

### Parcourir l'arbre

À l'intersection, on part de la racine :

- le rayon rate la boîte du nœud : on saute tout le sous-arbre ;
- sinon : on interroge les deux enfants (qui sont soit des nœuds, soit directement des primitives).

Le gain supplémentaire vient de l'**ordre**. Si le premier enfant contient un impact à $t = 4$, on interroge le second avec $t_{\max} = 4$. Sa boîte commence peut-être à $t = 6$ : rejetée sans regarder dedans. C'est l'intervalle qui rétrécit du jour 2, appliqué à des boîtes. La démo va plus loin en visitant d'abord l'enfant le plus proche selon le signe de la direction sur l'axe de coupe ; la version ci-dessous garde l'ordre gauche puis droite, plus simple, et déjà très efficace.

Fichier `src/geometry/bvh.h` :

::code-compare
#cpp
```cpp
#pragma once

#include <memory>
#include <vector>

#include "geometry/hittable.h"

namespace r3d {

class BvhNode final : public Hittable {
public:
    explicit BvhNode(
        std::vector<std::shared_ptr<Hittable>> objects);

    std::optional<HitRecord> hit(
            const Ray& ray,
            Interval rayT) const override;
    Aabb boundingBox() const override { return box_; }

private:
    std::shared_ptr<Hittable> left_;
    std::shared_ptr<Hittable> right_;
    Aabb box_;
};

}  // namespace r3d
```

#ts
```ts
// (pas d'équivalent : les modules ES)

// <memory> : pas de shared_ptr
// <vector> : tableaux natifs

import type { Hittable } from './hittable'

// namespace r3d

export class BvhNode implements Hittable {
  // public :
  constructor(
    objects: Hittable[]) // -> bvh.cc

  hit(
      ray: Ray,
      rayT: Interval): HitRecord | null // -> bvh.cc
  boundingBox(): Aabb { return this.#box }

  // private :
  #left: Hittable
  #right: Hittable
  #box = new Aabb()
}

// fin du module
```
::

Fichier `src/geometry/bvh.cc` :

::code-compare
#cpp
```cpp
#include "geometry/bvh.h"

#include <algorithm>
#include <cstddef>
#include <stdexcept>

namespace r3d {

namespace {

double centroidOnAxis(const std::shared_ptr<Hittable>& object,
                      int axis) {
    return axisValue(object->boundingBox().centroid(), axis);
}

bool comesFirstOnX(const std::shared_ptr<Hittable>& a,
                   const std::shared_ptr<Hittable>& b) {
    return centroidOnAxis(a, 0) < centroidOnAxis(b, 0);
}

bool comesFirstOnY(const std::shared_ptr<Hittable>& a,
                   const std::shared_ptr<Hittable>& b) {
    return centroidOnAxis(a, 1) < centroidOnAxis(b, 1);
}

bool comesFirstOnZ(const std::shared_ptr<Hittable>& a,
                   const std::shared_ptr<Hittable>& b) {
    return centroidOnAxis(a, 2) < centroidOnAxis(b, 2);
}

void sortAlongAxis(
        std::vector<std::shared_ptr<Hittable>>& objects,
        int axis) {
    if (axis == 0) {
        std::sort(
            objects.begin(), objects.end(), comesFirstOnX);
    } else if (axis == 1) {
        std::sort(
            objects.begin(), objects.end(), comesFirstOnY);
    } else {
        std::sort(
            objects.begin(), objects.end(), comesFirstOnZ);
    }
}

}  // namespace

BvhNode::BvhNode(
        std::vector<std::shared_ptr<Hittable>> objects) {
    if (objects.empty()) {
        throw std::invalid_argument(
            "BvhNode: no object to store");
    }

    for (const std::shared_ptr<Hittable>& object : objects) {
        box_ = Aabb::surrounding(box_, object->boundingBox());
    }

    if (objects.size() == 1) {
        left_ = objects[0];
        right_ = objects[0];
        return;
    }
    if (objects.size() == 2) {
        left_ = objects[0];
        right_ = objects[1];
        return;
    }

    sortAlongAxis(objects, box_.longestAxis());

    // Splitting by count, not by position, always shrinks
    // both halves: no infinite recursion.
    const std::size_t middle = objects.size() / 2;
    std::vector<std::shared_ptr<Hittable>> leftHalf;
    std::vector<std::shared_ptr<Hittable>> rightHalf;
    for (std::size_t i = 0; i < objects.size(); ++i) {
        if (i < middle) {
            leftHalf.push_back(objects[i]);
        } else {
            rightHalf.push_back(objects[i]);
        }
    }

    left_ = std::make_shared<BvhNode>(leftHalf);
    right_ = std::make_shared<BvhNode>(rightHalf);
}

std::optional<HitRecord> BvhNode::hit(const Ray& ray,
                                      Interval rayT) const {
    if (!box_.hit(ray, rayT)) {
        return std::nullopt;
    }

    const std::optional<HitRecord> leftHit =
        left_->hit(ray, rayT);

    double rightLimit = rayT.max;
    if (leftHit.has_value()) {
        rightLimit = leftHit->t;
    }
    const std::optional<HitRecord> rightHit =
        right_->hit(ray, Interval{rayT.min, rightLimit});

    if (rightHit.has_value()) {
        return rightHit;
    }
    return leftHit;
}

}  // namespace r3d
```

#ts
```ts
// bvh.ts, suite : les corps des méthodes

// <algorithm> : Array.prototype.sort
// <cstddef> : size_t -> number
// <stdexcept> : Error est global

// namespace r3d

// namespace anonyme : non exporté

function centroidOnAxis(object: Hittable,
                        axis: number): number {
  return axisValue(object.boundingBox().centroid(), axis)
}

// sort de JS attend un nombre, pas un booléen
function comesFirstOnX(a: Hittable,
                       b: Hittable): number {
  return centroidOnAxis(a, 0) - centroidOnAxis(b, 0)
}

function comesFirstOnY(a: Hittable,
                       b: Hittable): number {
  return centroidOnAxis(a, 1) - centroidOnAxis(b, 1)
}

function comesFirstOnZ(a: Hittable,
                       b: Hittable): number {
  return centroidOnAxis(a, 2) - centroidOnAxis(b, 2)
}

function sortAlongAxis(
    objects: Hittable[],
    axis: number): void {
  if (axis === 0) {
    objects.sort(
      comesFirstOnX)
  } else if (axis === 1) {
    objects.sort(
      comesFirstOnY)
  } else {
    objects.sort(
      comesFirstOnZ)
  }
}

//

constructor(
    objects: Hittable[]) {
  if (objects.length === 0) {
    throw new Error(
      'BvhNode: no object to store')
  }
  objects = [...objects] // le C++ reçoit une copie

  for (const object of objects) {
    this.#box =
      Aabb.surrounding(this.#box, object.boundingBox())
  }

  if (objects.length === 1) {
    this.#left = objects[0]
    this.#right = objects[0]
    return
  }
  if (objects.length === 2) {
    this.#left = objects[0]
    this.#right = objects[1]
    return
  }

  sortAlongAxis(objects, this.#box.longestAxis())

  // Splitting by count, not by position, always shrinks
  // both halves: no infinite recursion.
  const middle = Math.floor(objects.length / 2)
  const leftHalf: Hittable[] = []
  const rightHalf: Hittable[] = []
  for (let i = 0; i < objects.length; ++i) {
    if (i < middle) {
      leftHalf.push(objects[i])
    } else {
      rightHalf.push(objects[i])
    }
  }

  this.#left = new BvhNode(leftHalf)
  this.#right = new BvhNode(rightHalf)
}

hit(ray: Ray,
    rayT: Interval): HitRecord | null {
  if (!this.#box.hit(ray, rayT)) {
    return null
  }

  const leftHit =
    this.#left.hit(ray, rayT)

  let rightLimit = rayT.max
  if (leftHit !== null) {
    rightLimit = leftHit.t
  }
  const rightHit =
    this.#right.hit(ray, new Interval(rayT.min, rightLimit))

  if (rightHit !== null) {
    return rightHit
  }
  return leftHit
}

// fin du module
```
::

::devlog-note{kicker="C++ EN CLAIR"}
`std::sort(objects.begin(), objects.end(), comesFirstOnX)` trie le vecteur sur place, comme `objects.sort(compare)` en JS. Deux différences : on passe le début et la fin de la plage à trier (`begin()` et `end()`, des *itérateurs*, des curseurs sur le tableau), et la fonction de comparaison renvoie un `bool` (« `a` passe avant `b` ? ») au lieu d'un nombre négatif, nul ou positif. `std::size_t` est le type entier non signé des tailles, celui que renvoie `objects.size()`.
::

Les choix de cette implémentation :

- **Une fonction de comparaison par axe.** `comesFirstOnX`, `comesFirstOnY`, `comesFirstOnZ` sont trois fonctions nommées, et `sortAlongAxis` choisit la bonne. On pourrait écrire une seule lambda qui capture l'axe, mais trois fonctions de deux lignes se lisent sans rien savoir des lambdas.
- **Le constructeur prend le vecteur par valeur** : il reçoit sa propre copie, qu'il peut trier sans toucher à celui de l'appelant. Chaque moitié est recopiée dans `leftHalf` et `rightHalf`, puis passée à un nouveau `BvhNode`. Ce sont des copies de pointeurs, pas des objets : quelques mégaoctets au total pour Suzanne, et la construction prend quelques millisecondes.
- **Une feuille à un objet** pointe deux fois vers lui (`left_` et `right_`). L'objet est testé deux fois, mais `hit` n'a aucun cas particulier.
- **`std::shared_ptr` partout**, comme le livre. Un nœud de BVH est un `Hittable` comme un autre : on peut emboîter des arbres, ou mettre un arbre dans une liste. C'est ce qui justifiait les `shared_ptr` du jour 2.

Le tri complet est en $O(n \log n)$ à chaque niveau. On pourrait faire mieux : `std::nth_element` place la médiane à sa place et partitionne autour en $O(n)$, sans trier le reste, et on éviterait les copies en travaillant sur des plages d'un seul vecteur. Le rendu sortirait identique. Ce serait une optimisation de la **construction**, qui ne pèse ici presque rien face au rendu : on ne la fait pas.

### Les pièges

- **La boîte doit contenir la primitive entière.** On coupe selon les **centres**, mais la boîte d'un nœud englobe les **boîtes**. Les boîtes des deux enfants se chevauchent souvent, c'est normal : une BVH partitionne les objets, pas l'espace.
- **Les centres identiques.** Une construction qui coupe au **milieu géométrique** de la boîte peut partir en récursion infinie si toutes les primitives ont le même centre : aucune ne passe de l'autre côté. Couper par **nombre** (la médiane) garantit que chaque moitié rétrécit, quelles que soient les positions. Le second test ci-dessous le vérifie.
- **La boîte plate**, déjà réglée par `padAxis`.

Le test principal compare la BVH à la liste sur 2 000 rayons aléatoires, au milieu de 200 sphères aléatoires : mêmes impacts, mêmes $t$. C'est le test qui donne le droit d'optimiser : tant qu'il passe, la BVH ne change pas l'image.

Fichier `tests/bvh_test.cc` :

::code-compare{right="JS (Vitest)"}
#cpp
```cpp
#include <catch2/catch_test_macros.hpp>
#include <catch2/matchers/catch_matchers_floating_point.hpp>

#include <limits>
#include <memory>
#include <optional>
#include <vector>

#include "geometry/bvh.h"
#include "geometry/hittable_list.h"
#include "geometry/sphere.h"
#include "math/rng.h"

using Catch::Matchers::WithinAbs;

TEST_CASE(
    "the BVH finds the same closest "
    "hit as the list", "[bvh]") {
    r3d::Rng rng(11);
    std::vector<std::shared_ptr<r3d::Hittable>> objects;
    r3d::HittableList list;
    for (int i = 0; i < 200; ++i) {
        const double x = rng.uniformBetween(-10, 10);
        const double y = rng.uniformBetween(-10, 10);
        const double z = rng.uniformBetween(-10, 10);
        const double radius = rng.uniformBetween(0.1, 1.0);
        const r3d::Point3 center{x, y, z};
        const auto sphere = std::make_shared<r3d::Sphere>(
            center, radius, nullptr);
        objects.push_back(sphere);
        list.add(sphere);
    }
    const r3d::BvhNode bvh(objects);
    const r3d::Interval anyForward{
        0.001, std::numeric_limits<double>::infinity()};

    for (int i = 0; i < 2000; ++i) {
        const r3d::Ray ray{
            r3d::Point3{0, 0, 0}, r3d::randomUnitVector(rng)};
        const std::optional<r3d::HitRecord> expected =
            list.hit(ray, anyForward);
        const std::optional<r3d::HitRecord> actual =
            bvh.hit(ray, anyForward);

        REQUIRE(expected.has_value() == actual.has_value());
        if (expected.has_value()) {
            REQUIRE_THAT(
                actual->t, WithinAbs(expected->t, 1e-12));
        }
    }
}

TEST_CASE(
    "objects sharing the same centre do not break the build",
    "[bvh]") {
    std::vector<std::shared_ptr<r3d::Hittable>> objects;
    for (int i = 0; i < 9; ++i) {
        objects.push_back(std::make_shared<r3d::Sphere>(
            r3d::Point3{0, 0, -5}, 1.0 + i, nullptr));
    }
    const r3d::BvhNode bvh(objects);
    const r3d::Ray ray{
        r3d::Point3{0, 0, 0}, r3d::Vec3{0, 0, -1}};
    const r3d::Interval anyForward{
        0.001, std::numeric_limits<double>::infinity()};
    const std::optional<r3d::HitRecord> hit =
        bvh.hit(ray, anyForward);
    REQUIRE(hit.has_value());
}
```

#ts
```ts
import { expect, test } from 'vitest'
// WithinAbs ≈ toBeCloseTo

// <limits> : Infinity
// <memory> : pas de shared_ptr
// <optional> : HitRecord | null
// <vector> : natif

import { BvhNode } from '../src/geometry/bvh'
import { HittableList } from '../src/geometry/hittable_list'
import { Sphere } from '../src/geometry/sphere'
import { randomUnitVector, Rng } from '../src/math/rng'

// (toBeCloseTo est déjà une méthode d'expect)

test(
  'the BVH finds the same closest '
  + 'hit as the list', () => {
  const rng = new Rng(11n)
  const objects: Hittable[] = []
  const list = new HittableList()
  for (let i = 0; i < 200; ++i) {
    const x = rng.uniformBetween(-10, 10)
    const y = rng.uniformBetween(-10, 10)
    const z = rng.uniformBetween(-10, 10)
    const radius = rng.uniformBetween(0.1, 1.0)
    const center = new Vec3(x, y, z)
    const sphere = new Sphere(
      center, radius, null)
    objects.push(sphere)
    list.add(sphere)
  }
  const bvh = new BvhNode(objects)
  const anyForward = new Interval(
    0.001, Infinity)

  for (let i = 0; i < 2000; ++i) {
    const ray = new Ray(
      new Vec3(0, 0, 0), randomUnitVector(rng))
    const expected =
      list.hit(ray, anyForward)
    const actual =
      bvh.hit(ray, anyForward)

    expect(expected !== null).toBe(actual !== null)
    if (expected !== null) {
      expect(
        actual!.t).toBeCloseTo(expected.t, 12)
    }
  }
})

test(
  'objects sharing the same centre do not break the build',
  () => {
  const objects: Hittable[] = []
  for (let i = 0; i < 9; ++i) {
    objects.push(new Sphere(
      new Vec3(0, 0, -5), 1.0 + i, null))
  }
  const bvh = new BvhNode(objects)
  const ray = new Ray(
    new Vec3(0, 0, 0), new Vec3(0, 0, -1))
  const anyForward = new Interval(
    0.001, Infinity)
  const hit =
    bvh.hit(ray, anyForward)
  expect(hit).not.toBeNull()
})
```
::

### Brancher la BVH

Dans `main.cc`, on garde la liste derrière une option `--no-bvh`, pour pouvoir mesurer l'écart. Trois ajouts : l'include, le champ d'option, et la fin de `buildScene`.

::code-compare
#cpp
```cpp
#include "geometry/bvh.h"

struct Options {
    // ... champs existants
    bool useBvh = true;
};

// dans parseOptions, en tête de la chaîne de if :
        if (arg == "--no-bvh") {
            options.useBvh = false;
        } else if (arg == "--threads" && hasValue) {

// à la fin de buildScene, avant la liste :
    if (options.useBvh) {
        const auto bvh =
            std::make_shared<r3d::BvhNode>(objects);
        return Scene{bvh, triangleCount};
    }
```

#ts
```ts
import { BvhNode } from './geometry/bvh'

class Options {
  // ... champs existants
  useBvh = true
}

// dans parseOptions, en tête de la chaîne de if :
    if (arg === '--no-bvh') {
      options.useBvh = false
    } else if (arg === '--threads' && hasValue) {

// à la fin de buildScene, avant la liste :
  if (options.useBvh) {
    const bvh =
      new BvhNode(objects)
    return new Scene(bvh, triangleCount)
  }
```
::

Et la ligne de statistiques dit dans quel mode on est :

::code-compare
#cpp
```cpp
        std::clog << scene.triangleCount
            << " triangles, BVH ";
        if (options.useBvh) {
            std::clog << "oui\n";
        } else {
            std::clog << "non\n";
        }
        std::clog << seconds << " s, " << megaRaysPerSecond
            << " Mrays/s\n";
```

#ts
```ts
    process.stderr.write(scene.triangleCount
      + ' triangles, BVH ')
    if (options.useBvh) {
      process.stderr.write('oui\n')
    } else {
      process.stderr.write('non\n')
    }
    process.stderr.write(seconds + ' s, ' + megaRaysPerSecond
      + ' Mrays/s\n')
```
::

Le sol et les deux sphères entrent dans l'arbre avec les triangles. La sphère du sol a une boîte énorme (2 000 unités de côté) : elle se retrouve seule dans sa branche dès le premier niveau, et ne gêne pas le reste.

```bash
cmake --build build-release
ctest --test-dir build --output-on-failure
./build-release/r3d --width 200 --spp 4 --threads 1 > /dev/null
./build-release/r3d --width 200 --spp 4 --threads 1 --no-bvh > /dev/null
./build-release/r3d > suzanne.ppm
```

**Avant / après.** Sur le banc d'essai (200 × 112, 4 échantillons, un thread, Release, médiane de trois) : **9,37 s** sans BVH, **0,081 s** avec. ×116, et l'image est identique au bit près : le test le garantit, la comparaison des fichiers le confirme. Aucune des optimisations précédentes n'approchait cet ordre de grandeur, parce qu'aucune ne changeait le nombre de tests par rayon.

### Pour aller plus loin

La coupe à la médiane est simple, mais pas optimale : elle ignore la taille des boîtes produites. La référence, c'est la *Surface Area Heuristic* (SAH) : on choisit la coupe qui minimise le coût attendu, proportionnel à la surface des boîtes enfants fois le nombre de primitives dedans. Le [chapitre BVH de Physically Based Rendering](https://pbr-book.org/4ed/Primitives_and_Intersection_Acceleration/Bounding_Volume_Hierarchies) la détaille, ainsi que l'aplatissement de l'arbre en tableau contigu pour être gentil avec le cache. La série [How to build a BVH](https://jacco.ompf2.com/2022/04/13/how-to-build-a-bvh-part-1-basics/) de Jacco Bikker est l'introduction la plus pratique que je connaisse.

Pointeurs partagés ou tableau plat ? Les `shared_ptr` sont simples et suffisent pour démarrer. Un tableau de nœuds contigus avec des index est plus rapide (moins de sauts en mémoire, pas d'appel virtuel par nœud), mais plus dur à déboguer. Commence simple, mesure, et décide avec un chiffre.

::devlog-section{num="07" kicker="RÉCAP" title="Ce qu'on a construit, et en combien de temps."}
::

### Les chiffres

Même scène, même résolution, même nombre d'échantillons, médiane de trois mesures. Suzanne subdivisée, 15 744 triangles, 200 × 112, 4 échantillons, profondeur 10, environ 188 000 rayons. Apple M1 Max.

| Build | Threads | BVH | Temps | Mrays/s | Gain cumulé |
|---|---|---|---|---|---|
| Debug | 1 | non | 126,9 s | 0,0015 | ×1 |
| Release | 1 | non | 9,37 s | 0,020 | ×13,5 |
| Release | 10 | non | 1,47 s | 0,128 | ×86 |
| Release | 1 | oui | 0,081 s | 2,33 | ×1 570 |
| Release | 10 | oui | 0,015 s | 12,5 | ×8 400 |
| Debug | 10 | oui | 0,12 s | 1,56 | ×1 060 |

Ce que ça dit :

- **La BVH est de loin le plus gros gain** : ×116 à un thread. Le multithreading et le Release sont des multiplicateurs constants ; la BVH change la **complexité**.
- **Les gains se multiplient.** Release × threads × BVH : plus de huit mille fois plus rapide que la première version, sans changer un pixel. Les tests du renderer et de la BVH le garantissent.
- **Avec BVH, même le Debug multithread bat le Release monothread sans BVH** d'un facteur 80. Un bon algorithme dans un build lent bat un mauvais algorithme dans un build rapide.
- **À 10 threads avec BVH, le gain des threads n'est que ×5,4** : l'image est si petite (28 tuiles) que la fin du rendu laisse des cœurs sans travail. Sur une vraie image, ça remonte.

Le rendu final, 600 × 337, 64 échantillons, environ 27 millions de rayons : **1,3 seconde**, à 20 Mrays/s. Sans BVH ni threads, en Debug, la même image aurait pris environ cinq heures.

::devlog-your-render{src="/renders/r3d/jour-3.png" alt="Suzanne subdivisée en terre cuite, entre une sphère de verre et une sphère de métal, sur un sol gris" caption="Rendu de référence · 15 744 triangles · 600 × 337, 64 échantillons, profondeur 10 · BVH, 10 threads · 1,3 s"}
::

### Le dépôt

```
CMakeLists.txt               + Threads::Threads, 11 sources, 10 fichiers de test
assets/suzanne.obj           exporté depuis Blender
src/
├── main.cc                  options, chrono, scène OBJ, BVH ou liste
├── math/
│   ├── vec3.h               + axisValue
│   ├── ray.h, interval.h, rng.h
│   └── aabb.h, aabb.cc      slab test, boîte vide neutre, padding
├── image/image.h, image.cc
├── io/
│   ├── ppm.h, ppm.cc
│   └── obj.h, obj.cc        parseObj (indices), makeTriangles
├── geometry/
│   ├── hittable.h           + boundingBox()
│   ├── sphere.*, hittable_list.*
│   ├── triangle.h, .cc      Möller–Trumbore, normales lissées
│   └── bvh.h, bvh.cc        médiane sur l'axe le plus long
├── material/material.h, .cc
└── render/
    ├── camera.h, camera.cc
    └── renderer.h, .cc      tuiles, compteur atomique, Rng par tuile
tests/                       45 tests
```

Ce que la journée a confirmé sur l'architecture :

- **Les décisions du jour 2 ont payé.** Le `Rng` passé en paramètre a rendu le multithread trivial et l'image déterministe. Les méthodes `const` ont rendu le partage de la scène entre threads sûr sans verrou. L'intervalle qui rétrécit a donné le parcours de la BVH gratuitement.
- **L'interface `Hittable` a absorbé le triangle et le nœud de BVH** sans que `rayColor` change d'une ligne : c'est le principe ouvert / fermé du jour 1. Et parce que tous respectent le même contrat (Liskov), un nœud de BVH contient indifféremment des sphères, des triangles ou d'autres nœuds.
- **Le parser ne connaît pas la géométrie** (responsabilité unique) : `parseObj` se teste avec des chaînes de caractères, `makeTriangles` fait le pont.
- **On a mesuré avant d'optimiser, et après.** Chaque ligne du tableau correspond à une option de la ligne de commande : n'importe qui peut refaire la mesure.
