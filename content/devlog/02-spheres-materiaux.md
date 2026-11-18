---
num: "04"
slug: "02-spheres-materiaux"
series: "R3D"
title: "Des sphères, de la lumière, des matériaux."
lede: "Hier, un dégradé de ciel. Aujourd'hui, une équation du second degré, une interface C++, des rayons qui rebondissent au hasard et un morceau de verre. Quatre modules de plus, tout le code, et à la fin une image qui ressemble enfin à quelque chose."
publishDate: 2026-11-19
readingTime: 34
tags:
  - "C++"
  - "Raytracing"
  - "Maths"
  - "Matériaux"
sections:
  - num: "01"
    kicker: "ARCHITECTURE"
  - num: "02"
    kicker: "LA SPHÈRE"
  - num: "03"
    kicker: "LES NORMALES"
  - num: "04"
    kicker: "PLUSIEURS OBJETS"
  - num: "05"
    kicker: "ANTIALIASING"
  - num: "06"
    kicker: "LE DIFFUS"
  - num: "07"
    kicker: "MÉTAL ET VERRE"
  - num: "08"
    kicker: "RÉCAP"
nextSlug: "03-triangles-obj-performance"
closing: "Un matériau n'est qu'une règle qui dit où repart un rayon et combien de lumière il perd en route : tout le reste, c'est de la récursion et de la patience."
---

Jour 1, on avait un rayon par pixel et un ciel. Jour 2, il faut que ce rayon **touche** quelque chose. Ce billet suit les chapitres 5 à 11 de [*Ray Tracing in One Weekend*](https://raytracing.github.io/books/RayTracingInOneWeekend.html) de Peter Shirley, Trevor David Black et Steve Hollasch, dans l'architecture posée hier. Comme pour le jour 1, tout le code est là, fichier par fichier, et chaque étape compile.

Fil rouge de la journée : **chaque étape remplace une couleur inventée par une couleur calculée.** D'abord rouge si touché. Puis la normale en couleur. Puis la lumière qui rebondit. Puis la matière.

::devlog-section{num="01" kicker="ARCHITECTURE" title="Deux modules de plus, et une déclaration anticipée."}
::

Aujourd'hui, on remplit `geometry/` et `material/`, on ajoute deux outils dans `math/`, et la boucle de rendu quitte `main.cc` pour `render/`.

```
src/
├── main.cc                  la scène finale du livre
├── math/
│   ├── vec3.h               + nearZero, reflect, refract
│   ├── ray.h
│   ├── interval.h           NOUVEAU  un intervalle [min, max] de t
│   └── rng.h                NOUVEAU  générateur aléatoire explicite
├── image/
│   └── image.h / image.cc
├── io/
│   └── ppm.h / ppm.cc       + correction gamma
├── geometry/                NOUVEAU
│   ├── hittable.h           HitRecord + interface Hittable
│   ├── sphere.h / .cc
│   └── hittable_list.h/.cc
├── material/                NOUVEAU
│   └── material.h / .cc     Lambertian, Metal, Dielectric
└── render/
    ├── camera.h / .cc       + réglages, échantillonnage, visée
    └── renderer.h / .cc     NOUVEAU  rayColor récursif + boucle
tests/
├── vec3_test.cc
├── image_test.cc            gamma
├── camera_test.cc           nouvelle API
├── sphere_test.cc           NOUVEAU
└── material_test.cc         NOUVEAU
```

Le point délicat est entre `geometry/` et `material/`. Un impact doit dire **quel matériau** a été touché, donc `HitRecord` doit connaître `Material`. Et un matériau doit lire l'impact pour décider où repart le rayon, donc `Material` doit connaître `HitRecord`. Si les deux headers s'incluent mutuellement, ça ne compile plus.

La règle du jour 1 tranche : `material` est au-dessus de `geometry`. `material.h` inclut `hittable.h`. Dans l'autre sens, `hittable.h` se contente d'une **déclaration anticipée** : `class Material;`. Elle dit au compilateur « ce type existe, tu verras sa définition plus tard ». C'est suffisant pour déclarer un pointeur vers lui, pas pour l'utiliser. Seul `render/renderer.cc`, tout en haut, inclut les deux et appelle vraiment `material->scatter(...)`.

```
render ──▶ material ──▶ geometry ──▶ math
                          │
                          └── class Material;   (nom seulement, pas d'include)
```

Côté CMake, chaque nouveau `.cc` rejoint `r3d_core`, chaque nouveau test rejoint `r3d_tests`. Les deux blocs en fin de journée :

::code-compare{right="CMake ≈ package.json"}
#cpp
```cmake
add_library(r3d_core STATIC
  src/geometry/hittable_list.cc
  src/geometry/sphere.cc
  src/image/image.cc
  src/io/ppm.cc
  src/material/material.cc
  src/render/camera.cc
  src/render/renderer.cc
)
```

#ts
```ts
// packages/r3d-core : la liste de ses fichiers
//   geometry/hittable_list.ts
//   geometry/sphere.ts
//   image/image.ts
//   io/ppm.ts
//   material/material.ts
//   render/camera.ts
//   render/renderer.ts
// )
```
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
)
```

#ts
```ts
// les fichiers de test, listés à la main
//   tests/vec3.test.ts
//   tests/image.test.ts
//   tests/camera.test.ts
//   tests/sphere.test.ts
//   tests/material.test.ts
// )
```
::

Ajoute-les au fur et à mesure : un fichier listé mais pas encore écrit fait échouer la configuration.

::devlog-section{num="02" kicker="LA SPHÈRE" title="Rayon contre sphère, une équation du second degré."}
::

Pourquoi une sphère d'abord ? Parce que c'est l'objet le plus simple à intersecter. Pas de sommets, pas de faces. Une sphère, c'est un centre $C$ et un rayon $r$. Un point $P$ est sur la surface si sa distance à $C$ vaut $r$.

En vecteurs, sans racine carrée :

::devlog-formula{label="Surface de la sphère"}
$$
(P - C) \cdot (P - C) = r^2
$$
::

Le produit scalaire d'un vecteur avec lui-même, c'est sa longueur au carré. Si tu as déjà écrit `length(p - c) < r` dans un fragment shader pour dessiner un disque, c'est exactement ça, en 3D.

Maintenant, la question : *existe-t-il un $t$ tel que le point du rayon $P(t) = O + t\mathbf{D}$ soit sur la sphère ?* On remplace $P$ par l'équation du rayon :

::devlog-formula{label="Substitution"}
$$
(O + t\mathbf{D} - C) \cdot (O + t\mathbf{D} - C) = r^2
$$

On pose $\mathbf{oc} = C - O$ (du rayon vers le centre) :

$$
(t\mathbf{D} - \mathbf{oc}) \cdot (t\mathbf{D} - \mathbf{oc}) = r^2
$$

On développe, le produit scalaire est distributif :

$$
t^2 (\mathbf{D} \cdot \mathbf{D}) - 2t (\mathbf{D} \cdot \mathbf{oc}) + (\mathbf{oc} \cdot \mathbf{oc} - r^2) = 0
$$
::

C'est un polynôme du second degré en $t$. Les seules inconnues sont des nombres : $\mathbf{D} \cdot \mathbf{D}$, $\mathbf{D} \cdot \mathbf{oc}$, $\mathbf{oc} \cdot \mathbf{oc} - r^2$ se calculent avant de résoudre. Formule du lycée, $a t^2 + b t + c = 0$, avec :

::devlog-formula{label="Coefficients"}
$$
a = \mathbf{D} \cdot \mathbf{D} \qquad b = -2 (\mathbf{D} \cdot \mathbf{oc}) \qquad c = \mathbf{oc} \cdot \mathbf{oc} - r^2
$$

$$
\Delta = b^2 - 4ac \qquad t = \frac{-b \pm \sqrt{\Delta}}{2a}
$$
::

Le discriminant raconte la géométrie :

- **$\Delta < 0$** : pas de racine réelle. Le rayon passe à côté.
- **$\Delta = 0$** : une racine double. Le rayon frôle la sphère, tangent.
- **$\Delta > 0$** : deux racines. Le rayon entre en $t_1$ et ressort en $t_2$.

### La simplification h = b/2

$b$ contient un facteur $-2$. Pose $b = -2h$, donc $h = \mathbf{D} \cdot \mathbf{oc}$. La formule devient :

::devlog-formula{label="Forme réduite"}
$$
h = \mathbf{D} \cdot \mathbf{oc} \qquad \Delta' = h^2 - ac \qquad t = \frac{h \pm \sqrt{\Delta'}}{a}
$$
::

Même résultat, deux multiplications de moins, et une formule plus lisible. Le signe de $\Delta'$ est celui de $\Delta$ (on a juste divisé par 4). Autre petit gain : si $\mathbf{D}$ est normalisé, $a = 1$ et la division disparaît. On ne l'impose pas : un rayon avec une direction non normalisée reste valide, et ne pas normaliser évite une racine carrée par rayon.

::devlog-figure{n="01" caption="Le discriminant décide : zéro, une ou deux intersections. La normale part du point le plus proche"}
  :::demo-sphere-hit
  :::
::

### Garder le bon t

Deux racines, mais une seule nous intéresse : **la plus petite positive**. La plus petite parce que c'est la face qu'on voit en premier. Positive parce qu'un $t$ négatif est *derrière* l'origine du rayon. Fais le test dans la démo : place O derrière la sphère et vise à l'opposé. Les deux racines existent mathématiquement, mais elles sont toutes les deux négatives. Ça ne doit rien afficher.

Cas particulier : O dans la sphère. Alors $c < 0$, $t_1 < 0 < t_2$, et c'est $t_2$ qu'on garde. La première version ci-dessous l'ignore, la vraie classe `Sphere` de la section 04 le gère. Ça deviendra crucial pour le verre.

### Premier rendu : un disque rouge

On commence dans `main.cc`, en jetable. `hitSphere` renvoie un `std::optional<double>` : soit un $t$, soit rien. C'est plus honnête qu'un `double` avec une valeur magique `-1.0` pour « raté ».

::devlog-note{kicker="C++ EN CLAIR"}
`std::optional<double>` est le `number | undefined` de TypeScript, vérifié par le compilateur. `return std::nullopt;` renvoie « rien », `return t;` renvoie une valeur. Côté appelant, `t.has_value()` teste la présence, `t.value()` lit la valeur. Quand la valeur est un objet, `hit->normal` lit un champ directement, comme `hit?.normal` mais sans filet : on vérifie `has_value()` avant.
::

Fichier `src/main.cc`, version de l'étape :

::code-compare
#cpp
```cpp
#include <cmath>
#include <iostream>
#include <optional>

#include "image/image.h"
#include "io/ppm.h"
#include "math/ray.h"
#include "math/vec3.h"
#include "render/camera.h"

namespace {

std::optional<double> hitSphere(const r3d::Point3& center,
                                double radius,
                                const r3d::Ray& ray) {
    const r3d::Vec3 oc = center - ray.origin();
    const double a = ray.direction().lengthSquared();
    const double h = r3d::dot(ray.direction(), oc);
    const double c = oc.lengthSquared() - radius * radius;

    const double discriminant = h * h - a * c;
    if (discriminant < 0.0) {
        return std::nullopt;
    }
    const double t = (h - std::sqrt(discriminant)) / a;
    if (t <= 0.0) {
        return std::nullopt;
    }
    return t;
}

r3d::Color skyColor(const r3d::Ray& ray) {
    const r3d::Vec3 direction =
        r3d::unitVector(ray.direction());
    const double a = 0.5 * (direction.y + 1.0);
    const r3d::Color white{1.0, 1.0, 1.0};
    const r3d::Color blue{0.5, 0.7, 1.0};
    return (1.0 - a) * white + a * blue;
}

r3d::Color rayColor(const r3d::Ray& ray) {
    const std::optional<double> t =
        hitSphere(r3d::Point3{0, 0, -1}, 0.5, ray);
    if (t.has_value()) {
        return r3d::Color{1, 0, 0};
    }
    return skyColor(ray);
}

}  // namespace

int main() {
    const r3d::Camera camera(400, 16.0 / 9.0);
    r3d::Image image(camera.imageWidth(),
                     camera.imageHeight());

    for (int j = 0; j < image.height(); ++j) {
        for (int i = 0; i < image.width(); ++i) {
            const r3d::Ray ray = camera.rayForPixel(i, j);
            image.setPixel(i, j, rayColor(ray));
        }
    }

    r3d::writePpm(std::cout, image);
    return 0;
}
```

#ts
```ts
// <cmath> et <iostream> : Math et process sont globaux
//
// <optional> : number | null suffit en TS

import { Image } from './image/image'
import { writePpm } from './io/ppm'
import type { Ray } from './math/ray'
import { add, dot, scale, sub, unitVector,
         Vec3 } from './math/vec3'
import { Camera } from './render/camera'

// namespace anonyme : non exporté

function hitSphere(center: Point3,
                   radius: number,
                   ray: Ray): number | null {
  const oc = sub(center, ray.origin())
  const a = ray.direction().lengthSquared()
  const h = dot(ray.direction(), oc)
  const c = oc.lengthSquared() - radius * radius

  const discriminant = h * h - a * c
  if (discriminant < 0.0) {
    return null
  }
  const t = (h - Math.sqrt(discriminant)) / a
  if (t <= 0.0) {
    return null
  }
  return t
}

function skyColor(ray: Ray): Color {
  const direction =
    unitVector(ray.direction())
  const a = 0.5 * (direction.y + 1.0)
  const white = new Vec3(1.0, 1.0, 1.0)
  const blue = new Vec3(0.5, 0.7, 1.0)
  return add(scale(1.0 - a, white), scale(a, blue))
}

function rayColor(ray: Ray): Color {
  const t =
    hitSphere(new Vec3(0, 0, -1), 0.5, ray)
  if (t !== null) {
    return new Vec3(1, 0, 0)
  }
  return skyColor(ray)
}

//

function main(): number {
  const camera = new Camera(400, 16.0 / 9.0)
  const image = new Image(camera.imageWidth(),
                          camera.imageHeight())

  for (let j = 0; j < image.height(); ++j) {
    for (let i = 0; i < image.width(); ++i) {
      const ray = camera.rayForPixel(i, j)
      image.setPixel(i, j, rayColor(ray))
    }
  }

  writePpm(process.stdout, image)
  return 0
}
```
::

Le ciel du jour 1 devient une fonction à part, `skyColor` : `rayColor` se lit maintenant comme la phrase « si on touche la sphère, rouge, sinon le ciel ». Un disque rouge plat, au centre, sur le ciel. Pas impressionnant, mais c'est la preuve que la chaîne caméra → rayon → intersection fonctionne.

::devlog-note{kicker="PIÈGE"}
Le livre commence par une version qui renvoie un simple booléen. Elle ignore le signe de t. Résultat : une sphère placée derrière la caméra apparaît quand même à l'écran. C'est le premier bug qu'on attrape quand on déplace la caméra. Le `if (t <= 0.0)` ci-dessus est là pour ça.
::

::devlog-section{num="03" kicker="LES NORMALES" title="Une flèche perpendiculaire à la surface."}
::

Pour éclairer une surface, il faut savoir **dans quelle direction elle regarde**. C'est la normale : le vecteur unitaire perpendiculaire à la surface au point touché. Toute l'optique de la suite (diffus, reflets, réfraction) part de là.

Sur une sphère, c'est gratuit. La normale sortante pointe du centre vers le point. Sa longueur vaut $r$, donc on divise par $r$ pour la normaliser :

::devlog-formula{label="Normale sortante"}
$$
\mathbf{n} = \frac{P - C}{r}
$$
::

Diviser par $r$ au lieu d'appeler `unitVector()` économise une racine carrée. Mais ça suppose que $P$ est exactement sur la sphère. En flottant, il l'est à $10^{-7}$ près, ce qui suffit.

### Voir les normales

Le réflexe shader s'applique tel quel : une normale a des composantes dans $[-1, 1]$, une couleur dans $[0, 1]$. On remappe :

::devlog-formula{label="Normale vers couleur"}
$$
\text{couleur} = \tfrac{1}{2} (\mathbf{n} + 1)
$$
::

Dans `rayColor`, on remplace le bloc rouge. `t.value()` lit le $t$ de l'impact, `ray.at(...)` donne le point, et la normale suit la formule.

Fichier `src/main.cc`, la fonction `rayColor` :

::code-compare
#cpp
```cpp
r3d::Color rayColor(const r3d::Ray& ray) {
    const r3d::Point3 center{0, 0, -1};
    const std::optional<double> t =
        hitSphere(center, 0.5, ray);
    if (t.has_value()) {
        const r3d::Point3 hitPoint = ray.at(t.value());
        const r3d::Vec3 normal = (hitPoint - center) / 0.5;
        return 0.5 * (normal + r3d::Color{1, 1, 1});
    }
    return skyColor(ray);
}
```

#ts
```ts
function rayColor(ray: Ray): Color {
  const center = new Vec3(0, 0, -1)
  const t =
    hitSphere(center, 0.5, ray)
  if (t !== null) {
    const hitPoint = ray.at(t)
    const normal = div(sub(hitPoint, center), 0.5)
    return scale(0.5, add(normal, new Vec3(1, 1, 1)))
  }
  return skyColor(ray)
}
```
::

La sphère devient un dégradé bleu-vert-rose : rouge vers +x, vert vers le haut, bleu vers la caméra. C'est **l'outil de debug le plus utile de la journée**. Si une normale est fausse, ça se voit tout de suite : faces inversées, taches, discontinuités.

::devlog-your-render{src="/renders/r3d/jour-2-normales.png" alt="Une sphère colorée par ses normales sur un ciel dégradé" caption="Rendu de référence · normales en couleur, un rayon par pixel"}
::

::devlog-note{kicker="PIÈGE"}
Une normale non normalisée ne casse pas l'image en vue normales : elle la sature. Le jour où tu branches l'éclairage, tout devient trop clair ou trop sombre selon la taille de la sphère. Règle : une normale sort de la géométrie déjà unitaire, toujours.
::

### Dedans ou dehors

La normale géométrique pointe toujours vers l'extérieur. Mais un rayon peut toucher la surface **depuis l'intérieur** (le verre, encore lui). Deux conventions possibles :

1. La normale pointe toujours dehors. Le matériau calcule lui-même de quel côté vient le rayon.
2. La normale pointe toujours **contre le rayon**. On stocke à part un booléen `frontFace`.

Le livre choisit la 2, et c'est ce qu'on fait. Le test est un produit scalaire : si $\mathbf{D} \cdot \mathbf{n}_{\text{sortante}} < 0$, le rayon arrive de l'extérieur. Sinon il vient de l'intérieur, et on retourne la normale.

::devlog-formula{label="frontFace"}
$$
\text{frontFace} = \mathbf{D} \cdot \mathbf{n}_{\text{sortante}} < 0
$$

$$
\mathbf{n} = \begin{cases} \mathbf{n}_{\text{sortante}} & \text{si frontFace} \\ -\mathbf{n}_{\text{sortante}} & \text{sinon} \end{cases}
$$
::

Le compromis : la géométrie fait un peu de travail en plus à chaque hit, mais les matériaux n'ont plus à se poser la question. Comme on aura une seule forme de géométrie aujourd'hui et trois matériaux, c'est le bon côté pour payer. Ce calcul vivra dans `HitRecord::setFaceNormal`, juste en dessous.

::devlog-section{num="04" kicker="PLUSIEURS OBJETS" title="Une interface, une liste, le plus proche gagne."}
::

Une sphère ne fait pas une scène. Il faut pouvoir écrire « ce rayon touche-t-il *quelque chose* ? » sans savoir ce qu'est ce quelque chose. C'est le moment où le C++ demande d'être explicite là où JS laissait tranquille.

### L'intervalle

D'abord un petit type. Une intersection n'est valide que si $t$ est dans une plage : au-delà de la caméra, en deçà de l'objet le plus proche déjà trouvé. Passer deux `double` côte à côte, c'est une inversion qui attend son heure. On les groupe.

Fichier `src/math/interval.h` :

::code-compare
#cpp
```cpp
#pragma once

namespace r3d {

struct Interval {
    double min;
    double max;

    bool contains(double x) const {
        return min <= x && x <= max;
    }
    bool surrounds(double x) const {
        return min < x && x < max;
    }
};

}  // namespace r3d
```

#ts
```ts
// (pas d'équivalent : les modules ES)

// namespace r3d

export class Interval {
  constructor(public min: number,
              public max: number) {}

  contains(x: number): boolean {
    return this.min <= x && x <= this.max
  }
  surrounds(x: number): boolean {
    return this.min < x && x < this.max
  }
}

// fin du module
```
::

`surrounds` exclut les bornes : un impact pile à $t_{\min}$ est rejeté. C'est ce qu'on veut pour la sphère.

### Une interface abstraite

En JS, on passerait une liste d'objets qui ont tous une méthode `hit()`. Duck typing : si ça a `hit`, ça marche. En C++, le compilateur doit **savoir** que la méthode existe. On déclare donc une classe abstraite.

Fichier `src/geometry/hittable.h` :

::code-compare
#cpp
```cpp
#pragma once

#include <optional>

#include "math/interval.h"
#include "math/ray.h"
#include "math/vec3.h"

namespace r3d {

struct HitRecord {
    Point3 point;
    Vec3 normal;
    double t = 0.0;
    bool frontFace = false;

    void setFaceNormal(const Ray& ray,
                       const Vec3& outwardNormal) {
        frontFace = dot(ray.direction(), outwardNormal) < 0.0;
        if (frontFace) {
            normal = outwardNormal;
        } else {
            normal = -outwardNormal;
        }
    }
};

class Hittable {
public:
    virtual ~Hittable() = default;
    virtual std::optional<HitRecord> hit(
            const Ray& ray,
            Interval rayT) const = 0;
};

}  // namespace r3d
```

#ts
```ts
// (pas d'équivalent : les modules ES)

// <optional> : HitRecord | null

import type { Interval } from '../math/interval'
import type { Ray } from '../math/ray'
import { dot, negate, Vec3, type Point3 } from '../math/vec3'

// namespace r3d

export class HitRecord {
  point: Point3 = new Vec3()
  normal: Vec3 = new Vec3()
  t = 0.0
  frontFace = false

  setFaceNormal(ray: Ray,
                outwardNormal: Vec3): void {
    this.frontFace = dot(ray.direction(), outwardNormal) < 0.0
    if (this.frontFace) {
      this.normal = outwardNormal
    } else {
      this.normal = negate(outwardNormal)
    }
  }
}

export interface Hittable {
  // (destructeur virtuel : rien à écrire, le GC libère)
  hit(
      ray: Ray,
      rayT: Interval): HitRecord | null
}

// fin du module
```
::

::devlog-note{kicker="C++ EN CLAIR"}
Une classe dont toutes les méthodes sont `virtual ... = 0` est l'équivalent d'une `interface` TypeScript : un contrat, sans implémentation, qu'on ne peut pas instancier. `virtual` veut dire « l'appel est résolu à l'exécution, selon le vrai type de l'objet », comme la recherche d'une méthode sur le prototype en JS. `= 0` rend la méthode obligatoire pour qui implémente l'interface. Une classe l'implémente avec `class Sphere : public Hittable`, le `implements Hittable` de TS, et marque chaque méthode `override`.
::

::devlog-note{kicker="C++ EN CLAIR"}
`~Hittable()` est le destructeur : une méthode appelée automatiquement quand l'objet disparaît (fin du bloc pour une variable locale, dernier propriétaire pour un pointeur partagé). C'est là qu'un objet rend ce qu'il possède : le `std::vector` de l'`Image` libère sa mémoire dans le sien. Ce principe s'appelle RAII, et c'est pour ça que R3D n'écrit jamais `new` ni `delete`. Pour une interface, le destructeur doit être `virtual`, sinon détruire une `Sphere` vue comme un `Hittable` oublierait la partie `Sphere`. `= default` demande au compilateur d'écrire la version standard.
::

Le dernier point de l'interface :

- `std::optional<HitRecord>` en retour. Le livre utilise un paramètre de sortie (`bool hit(..., hit_record& rec)`) pour réutiliser la même structure pendant toute la boucle. L'`optional` dit la même chose plus clairement : soit un impact, soit rien, sans état à moitié rempli. Le coût est nul en pratique : `HitRecord` fait une soixantaine d'octets, et le compilateur construit la valeur directement à sa destination (RVO).

### La sphère

`: public Hittable` déclare que `Sphere` implémente l'interface. `final` interdit d'hériter de `Sphere` : personne n'en a besoin. `override` fait échouer la compilation si la signature ne correspond pas exactement à celle de `Hittable`, au lieu de créer en silence une méthode de plus. On le met partout.

Fichier `src/geometry/sphere.h` :

::code-compare
#cpp
```cpp
#pragma once

#include "geometry/hittable.h"

namespace r3d {

class Sphere final : public Hittable {
public:
    Sphere(const Point3& center, double radius);

    std::optional<HitRecord> hit(
            const Ray& ray,
            Interval rayT) const override;

private:
    Point3 center_;
    double radius_;
};

}  // namespace r3d
```

#ts
```ts
// (pas d'équivalent : les modules ES)

import type { Hittable } from './hittable'

// namespace r3d

export class Sphere implements Hittable { // final : rien
  // public :
  constructor(center: Point3, radius: number) // -> sphere.cc

  hit(
      ray: Ray,
      rayT: Interval): HitRecord | null // -> sphere.cc

  // private :
  readonly #center: Point3
  readonly #radius: number
}

// fin du module
```
::

Fichier `src/geometry/sphere.cc` :

::code-compare
#cpp
```cpp
#include "geometry/sphere.h"

#include <cmath>

namespace r3d {

Sphere::Sphere(const Point3& center, double radius)
    : center_(center), radius_(radius) {
    if (radius_ < 0.0) {
        radius_ = 0.0;
    }
}

std::optional<HitRecord> Sphere::hit(const Ray& ray,
                                     Interval rayT) const {
    const Vec3 oc = center_ - ray.origin();
    const double a = ray.direction().lengthSquared();
    const double h = dot(ray.direction(), oc);
    const double c = oc.lengthSquared() - radius_ * radius_;

    const double discriminant = h * h - a * c;
    if (discriminant < 0.0) {
        return std::nullopt;
    }

    const double sqrtDiscriminant = std::sqrt(discriminant);
    const double nearRoot = (h - sqrtDiscriminant) / a;
    const double farRoot = (h + sqrtDiscriminant) / a;

    double root = nearRoot;
    if (!rayT.surrounds(nearRoot)) {
        if (!rayT.surrounds(farRoot)) {
            return std::nullopt;
        }
        root = farRoot;
    }

    HitRecord rec;
    rec.t = root;
    rec.point = ray.at(root);
    const Vec3 outwardNormal =
        (rec.point - center_) / radius_;
    rec.setFaceNormal(ray, outwardNormal);
    return rec;
}

}  // namespace r3d
```

#ts
```ts
// sphere.ts, suite : les corps des méthodes

// <cmath> : Math est global

// namespace r3d

constructor(center: Point3, radius: number) {
  this.#center = center; this.#radius = radius
  if (this.#radius < 0.0) {
    this.#radius = 0.0
  }
}

hit(ray: Ray,
    rayT: Interval): HitRecord | null {
  const oc = sub(this.#center, ray.origin())
  const a = ray.direction().lengthSquared()
  const h = dot(ray.direction(), oc)
  const c = oc.lengthSquared() - this.#radius * this.#radius

  const discriminant = h * h - a * c
  if (discriminant < 0.0) {
    return null
  }

  const sqrtDiscriminant = Math.sqrt(discriminant)
  const nearRoot = (h - sqrtDiscriminant) / a
  const farRoot = (h + sqrtDiscriminant) / a

  let root = nearRoot
  if (!rayT.surrounds(nearRoot)) {
    if (!rayT.surrounds(farRoot)) {
      return null
    }
    root = farRoot
  }

  const rec = new HitRecord()
  rec.t = root
  rec.point = ray.at(root)
  const outwardNormal =
    div(sub(rec.point, this.#center), this.#radius)
  rec.setFaceNormal(ray, outwardNormal)
  return rec
}

// fin du module
```
::

C'est `hitSphere` de la section 02, plus deux choses : la racine lointaine quand la proche est hors de l'intervalle (le cas « O dans la sphère »), et un `HitRecord` complet avec sa normale orientée. `HitRecord rec;` crée une structure avec ses valeurs par défaut, qu'on remplit champ par champ. Le constructeur ramène un rayon négatif à 0 : on y revient à la fin de la section 07.

### Une liste, et la question de la propriété

La liste d'objets est elle-même un `Hittable` : elle teste chaque enfant. Ça permettra au jour 3 de ranger des objets dans des boîtes emboîtées.

Fichier `src/geometry/hittable_list.h` :

::code-compare
#cpp
```cpp
#pragma once

#include <memory>
#include <vector>

#include "geometry/hittable.h"

namespace r3d {

class HittableList final : public Hittable {
public:
    void add(const std::shared_ptr<Hittable>& object);

    std::optional<HitRecord> hit(
            const Ray& ray,
            Interval rayT) const override;

private:
    std::vector<std::shared_ptr<Hittable>> objects_;
};

}  // namespace r3d
```

#ts
```ts
// (pas d'équivalent : les modules ES)

// <memory> : pas de shared_ptr, le GC gère
// <vector> : les tableaux sont natifs

import type { Hittable } from './hittable'

// namespace r3d

export class HittableList implements Hittable {
  // public :
  add(object: Hittable): void // -> hittable_list.cc

  hit(
      ray: Ray,
      rayT: Interval): HitRecord | null // -> .cc

  // private :
  readonly #objects: Hittable[] = []
}

// fin du module
```
::

Pourquoi des pointeurs ? Parce qu'un `std::vector<Hittable>` est impossible : la taille d'un `Hittable` n'est pas connue (une sphère et un futur triangle n'ont pas les mêmes champs). Il faut stocker des **pointeurs**. Et en C++, un pointeur pose une question que JS règle avec son ramasse-miettes : *qui libère la mémoire, et quand ?*

`std::shared_ptr`, c'est un compteur de références. Chaque copie incrémente, chaque destruction décrémente, et l'objet meurt quand le compteur tombe à zéro. C'est le modèle mental le plus proche de JS. Le coût : un compteur atomique, et une indirection à chaque appel. `std::unique_ptr` serait plus léger, mais il interdit le partage, et au jour 3 la même sphère sera référencée à la fois par la liste de la scène et par l'arbre d'accélération.

::devlog-note{kicker="C++ EN CLAIR"}
`std::shared_ptr<Sphere>` se comporte comme une variable JS qui pointe vers un objet : plusieurs peuvent désigner le même, et il est libéré quand plus personne ne le désigne. `std::make_shared<Sphere>(centre, rayon)` est le `new Sphere(centre, rayon)` de JS : il construit l'objet et renvoie le pointeur partagé. Un `shared_ptr<Sphere>` se range sans conversion dans un `shared_ptr<Hittable>`, puisqu'une sphère est un `Hittable`. On appelle une méthode à travers un pointeur avec `->` : `object->hit(...)`.
::

`add` prend une référence constante et copie le pointeur dans le vecteur : une incrémentation du compteur par objet, à la construction de la scène, jamais pendant le rendu.

### Le plus proche gagne

La liste teste chaque objet, mais un rayon peut en traverser plusieurs. On veut le **premier** touché. L'astuce : l'intervalle $[t_{\min}, t_{\max}]$ **rétrécit** à chaque hit. Après avoir touché A en $t = 4$, plus besoin de chercher au-delà de 4. B, derrière, est rejeté sans calcul supplémentaire.

::devlog-formula{label="Closest hit"}
$$
t_{\text{proche}} \leftarrow t_{\max}
$$

$$
\forall\ \text{objet} : \quad \text{si l'objet est touché dans } \left]t_{\min},\ t_{\text{proche}}\right[ \text{ en } t, \text{ alors } t_{\text{proche}} \leftarrow t
$$
::

::devlog-figure{n="02" caption="Ordre A, B, C. Chaque hit raccourcit l'intervalle : C est rejetée sans changer le résultat"}
  :::schema-closest-hit
  :::
::

L'ordre de la liste n'a rien à voir avec la distance. A, testée en premier, ramène l'intervalle à $[0.001,\ 7.53]$. B, plus proche, est encore dedans et le réduit à $2.96$. Les deux racines de C tombent au-delà : rejetée. Le résultat ne dépend pas de l'ordre, seul le nombre de tests inutiles en dépend.

Fichier `src/geometry/hittable_list.cc` :

::code-compare
#cpp
```cpp
#include "geometry/hittable_list.h"

namespace r3d {

void HittableList::add(
        const std::shared_ptr<Hittable>& object) {
    objects_.push_back(object);
}

std::optional<HitRecord> HittableList::hit(
        const Ray& ray,
        Interval rayT) const {
    std::optional<HitRecord> closestHit;
    double closestT = rayT.max;

    for (const std::shared_ptr<Hittable>& object : objects_) {
        const Interval searchRange{rayT.min, closestT};
        const std::optional<HitRecord> hit =
            object->hit(ray, searchRange);
        if (hit.has_value()) {
            closestHit = hit;
            closestT = hit->t;
        }
    }
    return closestHit;
}

}  // namespace r3d
```

#ts
```ts
// hittable_list.ts, suite

// namespace r3d

add(
    object: Hittable): void {
  this.#objects.push(object)
}

hit(
    ray: Ray,
    rayT: Interval): HitRecord | null {
  let closestHit: HitRecord | null = null
  let closestT = rayT.max

  for (const object of this.#objects) {
    const searchRange = new Interval(rayT.min, closestT)
    const hit =
      object.hit(ray, searchRange)
    if (hit !== null) {
      closestHit = hit
      closestT = hit.t
    }
  }
  return closestHit
}

// fin du module
```
::

`for (const std::shared_ptr<Hittable>& object : objects_)` est le `for (const object of objects)` de JS ; le `&` évite de copier chaque pointeur. `closestT` est exactement le $t_{\text{proche}}$ de la formule : il démarre à $t_{\max}$ et ne fait que diminuer. `std::optional<HitRecord> closestHit;` démarre vide, et se remplit au premier impact.

### Brancher la liste

Dans `main.cc`, `hitSphere` disparaît. La scène devient une liste : la petite sphère, et une sphère énorme (rayon 100) en dessous, qui fait office de sol. `rayColor` reçoit le monde en paramètre, par référence constante sur l'interface : elle ne sait pas que c'est une liste. C'est l'inversion de dépendance des conventions du jour 1, et c'est elle qui permettra de remplacer la liste par un arbre au jour 3.

Fichier `src/main.cc`, version de l'étape :

::code-compare
#cpp
```cpp
#include <iostream>
#include <limits>
#include <memory>
#include <optional>

#include "geometry/hittable_list.h"
#include "geometry/sphere.h"
#include "image/image.h"
#include "io/ppm.h"
#include "render/camera.h"

namespace {

const double INFINITE_DISTANCE =
    std::numeric_limits<double>::infinity();

r3d::Color skyColor(const r3d::Ray& ray) {
    const r3d::Vec3 direction =
        r3d::unitVector(ray.direction());
    const double a = 0.5 * (direction.y + 1.0);
    const r3d::Color white{1.0, 1.0, 1.0};
    const r3d::Color blue{0.5, 0.7, 1.0};
    return (1.0 - a) * white + a * blue;
}

r3d::Color rayColor(const r3d::Ray& ray,
                    const r3d::Hittable& world) {
    const std::optional<r3d::HitRecord> hit =
        world.hit(ray, r3d::Interval{0.0, INFINITE_DISTANCE});
    if (hit.has_value()) {
        return 0.5 * (hit->normal + r3d::Color{1, 1, 1});
    }
    return skyColor(ray);
}

}  // namespace

int main() {
    r3d::HittableList world;
    world.add(std::make_shared<r3d::Sphere>(
        r3d::Point3{0, 0, -1}, 0.5));
    world.add(std::make_shared<r3d::Sphere>(
        r3d::Point3{0, -100.5, -1}, 100));

    const r3d::Camera camera(400, 16.0 / 9.0);
    r3d::Image image(camera.imageWidth(),
                     camera.imageHeight());

    for (int j = 0; j < image.height(); ++j) {
        for (int i = 0; i < image.width(); ++i) {
            const r3d::Ray ray = camera.rayForPixel(i, j);
            image.setPixel(i, j, rayColor(ray, world));
        }
    }

    r3d::writePpm(std::cout, image);
    return 0;
}
```

#ts
```ts
// <iostream> : process est global
// <limits> : Infinity est global
// <memory> : pas de shared_ptr, le GC gère
// <optional> : HitRecord | null

import { HittableList } from './geometry/hittable_list'
import { Sphere } from './geometry/sphere'
import { Image } from './image/image'
import { writePpm } from './io/ppm'
import { Camera } from './render/camera'

// namespace anonyme : non exporté

const INFINITE_DISTANCE =
  Infinity

function skyColor(ray: Ray): Color {
  const direction =
    unitVector(ray.direction())
  const a = 0.5 * (direction.y + 1.0)
  const white = new Vec3(1.0, 1.0, 1.0)
  const blue = new Vec3(0.5, 0.7, 1.0)
  return add(scale(1.0 - a, white), scale(a, blue))
}

function rayColor(ray: Ray,
                  world: Hittable): Color {
  const hit =
    world.hit(ray, new Interval(0.0, INFINITE_DISTANCE))
  if (hit !== null) {
    return scale(0.5, add(hit.normal, new Vec3(1, 1, 1)))
  }
  return skyColor(ray)
}

//

function main(): number {
  const world = new HittableList()
  world.add(new Sphere(
    new Vec3(0, 0, -1), 0.5))
  world.add(new Sphere(
    new Vec3(0, -100.5, -1), 100))

  const camera = new Camera(400, 16.0 / 9.0)
  const image = new Image(camera.imageWidth(),
                          camera.imageHeight())

  for (let j = 0; j < image.height(); ++j) {
    for (let i = 0; i < image.width(); ++i) {
      const ray = camera.rayForPixel(i, j)
      image.setPixel(i, j, rayColor(ray, world))
    }
  }

  writePpm(process.stdout, image)
  return 0
}
```
::

`std::numeric_limits<double>::infinity()` est l'`Infinity` de JS ; on lui donne un nom une fois pour toutes. Le sol vert (sa normale pointe vers le haut, donc $y \approx 1$) et la sphère au-dessus. Ajoute `src/geometry/hittable_list.cc` et `src/geometry/sphere.cc` à `r3d_core`.

### Les tests de la géométrie

Les quatre cas de la sphère (touchée, ratée, derrière, de l'intérieur) et la propriété « le plus proche gagne, quel que soit l'ordre ». La constante `ANY_FORWARD` est l'intervalle qu'utilisera le rendu.

Fichier `tests/sphere_test.cc` :

::code-compare{right="JS (Vitest)"}
#cpp
```cpp
#include <catch2/catch_test_macros.hpp>
#include <catch2/matchers/catch_matchers_floating_point.hpp>

#include <limits>
#include <memory>
#include <optional>

#include "geometry/hittable_list.h"
#include "geometry/sphere.h"

using Catch::Matchers::WithinAbs;

namespace {

const double INFINITE_DISTANCE =
    std::numeric_limits<double>::infinity();
const r3d::Interval ANY_FORWARD{0.001, INFINITE_DISTANCE};

}  // namespace

TEST_CASE(
    "a ray aimed at a sphere hits "
    "its front face", "[sphere]") {
    const r3d::Sphere sphere(r3d::Point3{0, 0, -5}, 1.0);
    const r3d::Ray ray{
        r3d::Point3{0, 0, 0}, r3d::Vec3{0, 0, -1}};
    const std::optional<r3d::HitRecord> hit =
        sphere.hit(ray, ANY_FORWARD);

    REQUIRE(hit.has_value());
    REQUIRE_THAT(hit->t, WithinAbs(4.0, 1e-12));
    REQUIRE(hit->frontFace);
    REQUIRE_THAT(hit->normal.z, WithinAbs(1.0, 1e-12));
}

TEST_CASE("a ray that misses returns nothing", "[sphere]") {
    const r3d::Sphere sphere(r3d::Point3{0, 0, -5}, 1.0);
    const r3d::Ray ray{
        r3d::Point3{0, 0, 0}, r3d::Vec3{0, 1, 0}};
    REQUIRE_FALSE(sphere.hit(ray, ANY_FORWARD).has_value());
}

TEST_CASE("a sphere behind the ray is not hit", "[sphere]") {
    const r3d::Sphere sphere(r3d::Point3{0, 0, 5}, 1.0);
    const r3d::Ray ray{
        r3d::Point3{0, 0, 0}, r3d::Vec3{0, 0, -1}};
    REQUIRE_FALSE(sphere.hit(ray, ANY_FORWARD).has_value());
}

TEST_CASE(
    "from inside, the far root is kept and "
    "the normal faces the ray",
    "[sphere]") {
    const r3d::Sphere sphere(r3d::Point3{0, 0, 0}, 2.0);
    const r3d::Ray ray{
        r3d::Point3{0, 0, 0}, r3d::Vec3{1, 0, 0}};
    const std::optional<r3d::HitRecord> hit =
        sphere.hit(ray, ANY_FORWARD);

    REQUIRE(hit.has_value());
    REQUIRE_THAT(hit->t, WithinAbs(2.0, 1e-12));
    REQUIRE_FALSE(hit->frontFace);
    REQUIRE_THAT(hit->normal.x, WithinAbs(-1.0, 1e-12));
}

TEST_CASE(
    "the list returns the closest hit, whatever the order",
    "[hittable_list]") {
    r3d::HittableList world;
    world.add(std::make_shared<r3d::Sphere>(
        r3d::Point3{0, 0, -10}, 1.0));
    world.add(std::make_shared<r3d::Sphere>(
        r3d::Point3{0, 0, -4}, 1.0));
    world.add(std::make_shared<r3d::Sphere>(
        r3d::Point3{0, 0, -20}, 1.0));

    const r3d::Ray ray{
        r3d::Point3{0, 0, 0}, r3d::Vec3{0, 0, -1}};
    const std::optional<r3d::HitRecord> hit =
        world.hit(ray, ANY_FORWARD);
    REQUIRE(hit.has_value());
    REQUIRE_THAT(hit->t, WithinAbs(3.0, 1e-12));
}
```

#ts
```ts
import { expect, test } from 'vitest'
// WithinAbs ≈ toBeCloseTo

// <limits> : Infinity est global
// <memory> : pas de shared_ptr
// <optional> : HitRecord | null

import { HittableList } from '../src/geometry/hittable_list'
import { Sphere } from '../src/geometry/sphere'

// (toBeCloseTo est déjà une méthode d'expect)

// constantes locales au fichier

const INFINITE_DISTANCE =
  Infinity
const ANY_FORWARD = new Interval(0.001, INFINITE_DISTANCE)

//

test(
  'a ray aimed at a sphere hits '
  + 'its front face', () => {
  const sphere = new Sphere(new Vec3(0, 0, -5), 1.0)
  const ray = new Ray(
    new Vec3(0, 0, 0), new Vec3(0, 0, -1))
  const hit =
    sphere.hit(ray, ANY_FORWARD)

  expect(hit).not.toBeNull()
  expect(hit!.t).toBeCloseTo(4.0, 12)
  expect(hit!.frontFace).toBe(true)
  expect(hit!.normal.z).toBeCloseTo(1.0, 12)
})

test('a ray that misses returns nothing', () => {
  const sphere = new Sphere(new Vec3(0, 0, -5), 1.0)
  const ray = new Ray(
    new Vec3(0, 0, 0), new Vec3(0, 1, 0))
  expect(sphere.hit(ray, ANY_FORWARD)).toBeNull()
})

test('a sphere behind the ray is not hit', () => {
  const sphere = new Sphere(new Vec3(0, 0, 5), 1.0)
  const ray = new Ray(
    new Vec3(0, 0, 0), new Vec3(0, 0, -1))
  expect(sphere.hit(ray, ANY_FORWARD)).toBeNull()
})

test(
  'from inside, the far root is kept and '
  + 'the normal faces the ray',
  () => {
  const sphere = new Sphere(new Vec3(0, 0, 0), 2.0)
  const ray = new Ray(
    new Vec3(0, 0, 0), new Vec3(1, 0, 0))
  const hit =
    sphere.hit(ray, ANY_FORWARD)

  expect(hit).not.toBeNull()
  expect(hit!.t).toBeCloseTo(2.0, 12)
  expect(hit!.frontFace).toBe(false)
  expect(hit!.normal.x).toBeCloseTo(-1.0, 12)
})

test(
  'the list returns the closest hit, whatever the order',
  () => {
  const world = new HittableList()
  world.add(new Sphere(
    new Vec3(0, 0, -10), 1.0))
  world.add(new Sphere(
    new Vec3(0, 0, -4), 1.0))
  world.add(new Sphere(
    new Vec3(0, 0, -20), 1.0))

  const ray = new Ray(
    new Vec3(0, 0, 0), new Vec3(0, 0, -1))
  const hit =
    world.hit(ray, ANY_FORWARD)
  expect(hit).not.toBeNull()
  expect(hit!.t).toBeCloseTo(3.0, 12)
})
```
::

Chaque test nomme son rayon et écrit `r3d::Point3{...}` ou `r3d::Vec3{...}` en toutes lettres. C++ accepterait `{0, 0, -5}` tout court, en devinant le type, mais on lit mieux ce qui est un point et ce qui est une direction.

### L'acné et le 0.001

Pourquoi `ANY_FORWARD` commence à 0.001 et pas à 0 ? Ça ne se voit pas encore, mais ça arrivera dès que les rayons rebondiront (section 06). Un rayon qui repart d'une surface part de $P$, calculé en flottant. $P$ est très légèrement *sous* la surface une fois sur deux. Le rayon suivant retouche alors la même surface en $t = 10^{-7}$. Il se croit dans l'ombre de lui-même.

Visuellement : des petits points noirs partout, comme une peau mal nettoyée. On appelle ça **shadow acne**. Le remède standard : ignorer les hits trop proches, $t_{\min} = 0.001$. C'est un epsilon qui dépend de l'échelle de la scène. Pour des sphères de taille 1, c'est parfait. Pour une scène en millimètres, il faudrait l'ajuster.

::devlog-note{kicker="PIÈGE" tone="accent"}
Si ton rendu diffus est nettement plus sombre que celui du livre, avec une texture granuleuse, vérifie d'abord ce t_min. C'est le bug le plus fréquent de ce chapitre, et il ne produit aucune erreur.
::

::devlog-section{num="05" kicker="ANTIALIASING" title="Plusieurs rayons par pixel, une moyenne."}
::

Zoome sur le bord d'une sphère du rendu actuel : un escalier. Chaque pixel envoie un seul rayon, par son centre. Le pixel est soit entièrement sphère, soit entièrement ciel. Or un vrai pixel de capteur reçoit la lumière de **toute sa surface**. Si le bord coupe le pixel en deux, il devrait être à moitié gris.

On ne peut pas intégrer exactement sur la surface du pixel. On fait mieux : on **échantillonne**. On tire plusieurs rayons à des positions aléatoires dans le carré du pixel, et on moyenne les couleurs. C'est la première apparition de Monte-Carlo dans le projet : remplacer une intégrale impossible par une moyenne de tirages aléatoires. Elle reviendra dans la section suivante, en bien plus important.

::devlog-formula{label="Échantillonnage d'un pixel"}
$$
\text{couleur}(i, j) = \frac{1}{N} \sum_{k=1}^{N} \text{rayColor}\big(\text{rayon par } (i + \delta x_k,\ j + \delta y_k)\big), \qquad \delta x_k, \delta y_k \in [-0.5,\ 0.5[
$$
::

::devlog-figure{n="03" caption="Avec 1 échantillon, un pixel est noir ou blanc. Avec N, il a N+1 gris possibles, mais coûte N fois plus"}
  :::demo-antialias
  :::
::

Ce que montre la démo :

- **1 échantillon** : centré, pas de hasard. L'escalier exact du rendu précédent.
- **4 à 16** : le bord se lisse, mais le bruit est visible. Deux pixels voisins couverts à 50 % peuvent sortir à 25 % et 75 %.
- **64** : les gris convergent vers la vraie couverture. Le bruit baisse en $1/\sqrt{N}$ : quatre fois plus de rayons pour diviser l'erreur par deux.

C'est **le** compromis du raytracing, et il ne fera que s'aggraver : chaque rayon primaire va bientôt engendrer jusqu'à 50 rebonds. Pour itérer, reste à 10-20 échantillons. Monte à 100+ seulement pour le rendu final.

### Un générateur explicite

Il faut des nombres aléatoires. Le livre commence avec `std::rand()`, puis propose un générateur `<random>` caché dans une fonction `static`. On fait un pas de plus : une petite classe `Rng`, **passée explicitement** à qui en a besoin. Deux raisons :

- **Reproductible.** Même graine, même image, au bit près. Un bug qui apparaît une fois réapparaît à chaque fois.
- **Prêt pour le multithread.** Un générateur global partagé entre threads est une data race. Au jour 3, chaque morceau d'image aura le sien, et il suffira de le passer en paramètre : rien d'autre ne changera.

Fichier `src/math/rng.h` :

::code-compare
#cpp
```cpp
#pragma once

#include <cstdint>
#include <random>

namespace r3d {

class Rng {
public:
    explicit Rng(std::uint64_t seed) : engine_(seed) {}

    double uniform() { return distribution_(engine_); }
    double uniformBetween(double min, double max) {
        return min + (max - min) * uniform();
    }

private:
    std::mt19937_64 engine_;
    std::uniform_real_distribution<double> distribution_{
        0.0, 1.0};
};

}  // namespace r3d
```

#ts
```ts
// (pas d'équivalent : les modules ES)

// <cstdint> : uint64_t, ici bigint
// <random> : Math.random n'a pas de graine, d'où un PRNG

// namespace r3d

export class Rng {
  // public :
  constructor(seed: bigint) { this.#engine = new Mt64(seed) }

  uniform(): number { return this.#engine.nextDouble() }
  uniformBetween(min: number, max: number): number {
    return min + (max - min) * this.uniform()
  }

  // private :
  readonly #engine: Mt64 // Mersenne Twister 64 bits
  // (la distribution [0, 1[ est dans nextDouble)
  //
}

// fin du module
```
::

`std::mt19937_64` est un Mersenne Twister : rapide, de bonne qualité statistique, et déterministe pour une graine donnée. `uniform()` renvoie un `double` dans $[0, 1[$, comme `Math.random()`, `uniformBetween(min, max)` dans $[\text{min}, \text{max}[$. `std::uint64_t` est un entier non signé de 64 bits. `distribution_{0.0, 1.0}` donne au membre sa valeur initiale directement dans la déclaration.

::devlog-note{kicker="C++ EN CLAIR"}
`explicit` devant un constructeur à un seul paramètre interdit la conversion automatique : sans lui, `Rng rng = 42;` compilerait et fabriquerait un générateur à partir d'un entier sans qu'on l'ait demandé. Avec, il faut écrire `Rng rng(42);`. `uniform()` n'est pas `const` : tirer un nombre fait avancer l'état du générateur, c'est une modification.
::

### La caméra prend des réglages

Deux changements dans la caméra. Elle apprend à tirer un rayon **au hasard dans le pixel** (`sampleRay`), et elle devient positionnable. Le second n'est pas nécessaire pour l'antialiasing, mais la scène finale en a besoin, et on préfère réécrire le constructeur une seule fois.

Les paramètres deviennent un `struct` de réglages avec des valeurs par défaut. Six arguments positionnels de types proches, c'est un appel illisible et une inversion garantie. Avec un `struct`, chaque valeur est nommée là où on la règle : c'est l'objet d'options `{ imageWidth: 400, verticalFov: 90 }` qu'on passerait en JS, avec ses valeurs par défaut écrites dans le type.

Le repère de la caméra se construit avec deux produits vectoriels, ce qu'annonçait le jour 1 :

::devlog-formula{label="Repère de la caméra"}
$$
\mathbf{w} = \frac{\text{lookFrom} - \text{lookAt}}{\lVert \text{lookFrom} - \text{lookAt} \rVert} \quad \text{(vers l'arrière)}
$$

$$
\mathbf{u} = \frac{\mathbf{up} \times \mathbf{w}}{\lVert \mathbf{up} \times \mathbf{w} \rVert} \quad \text{(vers la droite)} \qquad \mathbf{v} = \mathbf{w} \times \mathbf{u} \quad \text{(vers le haut)}
$$

$$
h_{\text{viewport}} = 2 \tan\!\left(\frac{\text{FOV}}{2}\right) \cdot \lVert \text{lookFrom} - \text{lookAt} \rVert
$$
::

La focale vaut la distance de l'œil au point visé : le viewport passe par `lookAt`. Et la formule de la hauteur est l'inverse exact de celle du jour 1. Avec les réglages par défaut (90°, œil à l'origine, visée vers $-z$), on retombe sur le viewport de 2 de haut à 1 de distance, et un test le vérifie.

Fichier `src/render/camera.h` :

::code-compare
#cpp
```cpp
#pragma once

#include "math/ray.h"
#include "math/rng.h"
#include "math/vec3.h"

namespace r3d {

struct CameraSettings {
    int imageWidth = 400;
    double aspectRatio = 16.0 / 9.0;
    double verticalFov = 90.0;
    Point3 lookFrom{0.0, 0.0, 0.0};
    Point3 lookAt{0.0, 0.0, -1.0};
    Vec3 up{0.0, 1.0, 0.0};
};

class Camera {
public:
    explicit Camera(const CameraSettings& settings);

    int imageWidth() const { return imageWidth_; }
    int imageHeight() const { return imageHeight_; }

    Ray rayForPixel(int i, int j) const;
    Ray sampleRay(int i, int j, Rng& rng) const;

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
import type { Rng } from '../math/rng'
import { Vec3, type Point3 } from '../math/vec3'

// namespace r3d

export class CameraSettings {
  imageWidth = 400
  aspectRatio = 16.0 / 9.0
  verticalFov = 90.0
  lookFrom: Point3 = new Vec3(0.0, 0.0, 0.0)
  lookAt: Point3 = new Vec3(0.0, 0.0, -1.0)
  up: Vec3 = new Vec3(0.0, 1.0, 0.0)
}

export class Camera {
  // public :
  constructor(settings: Readonly<CameraSettings>) // -> .cc

  imageWidth(): number { return this.#imageWidth }
  imageHeight(): number { return this.#imageHeight }

  rayForPixel(i: number, j: number): Ray // -> camera.cc
  sampleRay(i: number, j: number, rng: Rng): Ray // -> .cc

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

#include <cmath>
#include <numbers>

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

Camera::Camera(const CameraSettings& settings)
    : imageWidth_(settings.imageWidth),
      imageHeight_(computeImageHeight(settings.imageWidth,
                                      settings.aspectRatio)) {
    center_ = settings.lookFrom;

    const double fovRadians =
        settings.verticalFov * std::numbers::pi / 180.0;
    const double focalLength =
        (settings.lookFrom - settings.lookAt).length();
    const double viewportHeight =
        2.0 * std::tan(fovRadians / 2.0) * focalLength;
    const double pixelRatio =
        static_cast<double>(imageWidth_)
            / static_cast<double>(imageHeight_);
    const double viewportWidth = viewportHeight * pixelRatio;

    const Vec3 w =
        unitVector(settings.lookFrom - settings.lookAt);
    const Vec3 u = unitVector(cross(settings.up, w));
    const Vec3 v = cross(w, u);

    const Vec3 viewportU = viewportWidth * u;
    const Vec3 down = -v;
    const Vec3 viewportV = viewportHeight * down;

    pixelDeltaU_ = viewportU / imageWidth_;
    pixelDeltaV_ = viewportV / imageHeight_;

    const Point3 viewportCenter = center_ - focalLength * w;
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

Ray Camera::sampleRay(int i, int j, Rng& rng) const {
    const double offsetX = rng.uniform() - 0.5;
    const double offsetY = rng.uniform() - 0.5;
    const double sampleX = i + offsetX;
    const double sampleY = j + offsetY;
    const Point3 pixelSample =
        pixel00_ + sampleX * pixelDeltaU_
            + sampleY * pixelDeltaV_;
    const Vec3 direction = pixelSample - center_;
    return Ray{center_, direction};
}

}  // namespace r3d
```

#ts
```ts
// camera.ts, suite : les corps des méthodes

// <cmath> : Math est global
// <numbers> : Math.PI

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

constructor(settings: Readonly<CameraSettings>) {
  this.#imageWidth = settings.imageWidth
  this.#imageHeight = computeImageHeight(settings.imageWidth,
                                         settings.aspectRatio)
  this.#center = settings.lookFrom

  const fovRadians =
    settings.verticalFov * Math.PI / 180.0
  const focalLength =
    sub(settings.lookFrom, settings.lookAt).length()
  const viewportHeight =
    2.0 * Math.tan(fovRadians / 2.0) * focalLength
  const pixelRatio =
    this.#imageWidth
      / this.#imageHeight
  const viewportWidth = viewportHeight * pixelRatio

  const w =
    unitVector(sub(settings.lookFrom, settings.lookAt))
  const u = unitVector(cross(settings.up, w))
  const v = cross(w, u)

  const viewportU = scale(viewportWidth, u)
  const down = negate(v)
  const viewportV = scale(viewportHeight, down)

  this.#pixelDeltaU = div(viewportU, this.#imageWidth)
  this.#pixelDeltaV = div(viewportV, this.#imageHeight)

  const viewportCenter =
    sub(this.#center, scale(focalLength, w))
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

sampleRay(i: number, j: number, rng: Rng): Ray {
  const offsetX = rng.uniform() - 0.5
  const offsetY = rng.uniform() - 0.5
  const sampleX = i + offsetX
  const sampleY = j + offsetY
  const pixelSample = add(add(this.#pixel00,
    scale(sampleX, this.#pixelDeltaU)),
    scale(sampleY, this.#pixelDeltaV))
  const direction = sub(pixelSample, this.#center)
  return new Ray(this.#center, direction)
}

// fin du module
```
::

`std::numbers::pi` est le `Math.PI` du C++20, dans `<numbers>`. Fini les `#define PI` et les `M_PI` qui n'existent pas sous Windows. `viewportV` pointe vers `down`, $-\mathbf{v}$ : c'est le même signe moins que le jour 1, celui qui met l'image à l'endroit. `rayForPixel` reste : elle sert aux tests, et elle donne le rayon central exact. Le constructeur prend un `const CameraSettings&` : une référence en lecture, pas de copie des réglages.

`sampleRay` prend le générateur par référence non constante (`Rng& rng`) : tirer un nombre modifie le générateur de l'appelant. La caméra, elle, reste `const`.

Le test de caméra du jour 1 est adapté à la nouvelle API, et gagne trois cas : les réglages par défaut reproduisent le jour 1, le rayon central vise bien `lookAt`, et un rayon échantillonné ne sort jamais de son pixel.

Fichier `tests/camera_test.cc` :

::code-compare{right="JS (Vitest)"}
#cpp
```cpp
#include <catch2/catch_test_macros.hpp>
#include <catch2/matchers/catch_matchers_floating_point.hpp>

#include "render/camera.h"

using Catch::Matchers::WithinAbs;

namespace {

r3d::CameraSettings settingsFor(int width,
                                double aspectRatio) {
    r3d::CameraSettings settings;
    settings.imageWidth = width;
    settings.aspectRatio = aspectRatio;
    return settings;
}

}  // namespace

TEST_CASE(
    "image height follows the aspect ratio", "[camera]") {
    const r3d::Camera camera(settingsFor(400, 16.0 / 9.0));
    REQUIRE(camera.imageHeight() == 225);
}

TEST_CASE("image height is at least one pixel", "[camera]") {
    const r3d::Camera camera(settingsFor(10, 100.0));
    REQUIRE(camera.imageHeight() == 1);
}

TEST_CASE(
    "default settings reproduce "
    "the day 1 camera", "[camera]") {
    const r3d::Camera camera(settingsFor(4, 2.0));
    const r3d::Point3 p = camera.rayForPixel(0, 0).at(1.0);
    REQUIRE_THAT(p.x, WithinAbs(-1.5, 1e-12));
    REQUIRE_THAT(p.y, WithinAbs(0.5, 1e-12));
    REQUIRE_THAT(p.z, WithinAbs(-1.0, 1e-12));
}

TEST_CASE("the central ray points at lookAt", "[camera]") {
    r3d::CameraSettings settings = settingsFor(101, 1.0);
    settings.lookFrom = r3d::Point3{13, 2, 3};
    settings.lookAt = r3d::Point3{0, 0, 0};
    const r3d::Camera camera(settings);

    const r3d::Ray centerRay = camera.rayForPixel(50, 50);
    const r3d::Vec3 direction =
        r3d::unitVector(centerRay.direction());
    const r3d::Vec3 expected =
        r3d::unitVector(settings.lookAt - settings.lookFrom);
    REQUIRE_THAT(
        r3d::dot(direction, expected), WithinAbs(1.0, 1e-9));
}

TEST_CASE(
    "sampled rays stay inside their pixel", "[camera]") {
    const r3d::Camera camera(settingsFor(4, 2.0));
    r3d::Rng rng(1);
    for (int s = 0; s < 100; ++s) {
        const r3d::Point3 p =
            camera.sampleRay(0, 0, rng).at(1.0);
        REQUIRE(p.x >= -2.0);
        REQUIRE(p.x <= -1.0);
        REQUIRE(p.y >= 0.0);
        REQUIRE(p.y <= 1.0);
    }
}
```

#ts
```ts
import { expect, test } from 'vitest'
// WithinAbs ≈ toBeCloseTo

import { Camera, CameraSettings } from '../src/render/camera'

// (toBeCloseTo est déjà une méthode d'expect)

// fonction locale au fichier

function settingsFor(width: number,
                     aspectRatio: number): CameraSettings {
  const settings = new CameraSettings()
  settings.imageWidth = width
  settings.aspectRatio = aspectRatio
  return settings
}

//

test(
  'image height follows the aspect ratio', () => {
  const camera = new Camera(settingsFor(400, 16.0 / 9.0))
  expect(camera.imageHeight()).toBe(225)
})

test('image height is at least one pixel', () => {
  const camera = new Camera(settingsFor(10, 100.0))
  expect(camera.imageHeight()).toBe(1)
})

test(
  'default settings reproduce '
  + 'the day 1 camera', () => {
  const camera = new Camera(settingsFor(4, 2.0))
  const p = camera.rayForPixel(0, 0).at(1.0)
  expect(p.x).toBeCloseTo(-1.5, 12)
  expect(p.y).toBeCloseTo(0.5, 12)
  expect(p.z).toBeCloseTo(-1.0, 12)
})

test('the central ray points at lookAt', () => {
  const settings = settingsFor(101, 1.0)
  settings.lookFrom = new Vec3(13, 2, 3)
  settings.lookAt = new Vec3(0, 0, 0)
  const camera = new Camera(settings)

  const centerRay = camera.rayForPixel(50, 50)
  const direction =
    unitVector(centerRay.direction())
  const expected =
    unitVector(sub(settings.lookAt, settings.lookFrom))
  expect(
    dot(direction, expected)).toBeCloseTo(1.0, 9)
})

test(
  'sampled rays stay inside their pixel', () => {
  const camera = new Camera(settingsFor(4, 2.0))
  const rng = new Rng(1n)
  for (let s = 0; s < 100; ++s) {
    const p =
      camera.sampleRay(0, 0, rng).at(1.0)
    expect(p.x).toBeGreaterThanOrEqual(-2.0)
    expect(p.x).toBeLessThanOrEqual(-1.0)
    expect(p.y).toBeGreaterThanOrEqual(0.0)
    expect(p.y).toBeLessThanOrEqual(1.0)
  }
})
```
::

### La boucle quitte main

Le livre profite de ce chapitre pour sortir la logique de rendu de `main`, dans sa classe `camera`. On la sort aussi, mais dans un module à part : la caméra répond à « quel rayon pour ce pixel », le **renderer** parcourt l'image, échantillonne et calcule les couleurs. La scène est de la donnée, la caméra est un objectif, le renderer est le moteur.

Les réglages du rendu suivent le même principe que ceux de la caméra : un `struct` avec des valeurs par défaut.

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
  seed = 42n
}

export function render(camera: Camera,
                       world: Hittable,
                       settings: RenderSettings): Image

// fin du module
```
::

Fichier `src/render/renderer.cc`, première version (normales en couleur) :

::code-compare
#cpp
```cpp
#include "render/renderer.h"

#include <iostream>
#include <limits>
#include <optional>

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

Color rayColor(const Ray& ray, const Hittable& world) {
    const std::optional<HitRecord> hit =
        world.hit(ray, Interval{0.0, INFINITE_DISTANCE});
    if (hit.has_value()) {
        return 0.5 * (hit->normal + Color{1, 1, 1});
    }
    return skyColor(ray);
}

}  // namespace

Image render(const Camera& camera,
             const Hittable& world,
             const RenderSettings& settings) {
    Image image(camera.imageWidth(), camera.imageHeight());
    Rng rng(settings.seed);
    const int samples = settings.samplesPerPixel;
    const double sampleScale = 1.0 / samples;

    for (int j = 0; j < image.height(); ++j) {
        std::clog << "\rLignes restantes : "
            << (image.height() - j) << ' ' << std::flush;
        for (int i = 0; i < image.width(); ++i) {
            Color sum{0.0, 0.0, 0.0};
            for (int s = 0; s < samples; ++s) {
                const Ray ray = camera.sampleRay(i, j, rng);
                sum = sum + rayColor(ray, world);
            }
            image.setPixel(i, j, sampleScale * sum);
        }
    }
    std::clog << "\rTerminé.                 \n";
    return image;
}

}  // namespace r3d
```

#ts
```ts
import { Image } from '../image/image'

// <iostream> : process.stderr
// <limits> : Infinity
// <optional> : HitRecord | null

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

function rayColor(ray: Ray, world: Hittable): Color {
  const hit =
    world.hit(ray, new Interval(0.0, INFINITE_DISTANCE))
  if (hit !== null) {
    return scale(0.5, add(hit.normal, new Vec3(1, 1, 1)))
  }
  return skyColor(ray)
}

//

export function render(camera: Camera,
                       world: Hittable,
                       settings: RenderSettings): Image {
  const image =
    new Image(camera.imageWidth(), camera.imageHeight())
  const rng = new Rng(settings.seed)
  const samples = settings.samplesPerPixel
  const sampleScale = 1.0 / samples

  for (let j = 0; j < image.height(); ++j) {
    process.stderr.write('\rLignes restantes : '
      + (image.height() - j) + ' ')
    for (let i = 0; i < image.width(); ++i) {
      let sum = new Vec3(0.0, 0.0, 0.0)
      for (let s = 0; s < samples; ++s) {
        const ray = camera.sampleRay(i, j, rng)
        sum = add(sum, rayColor(ray, world))
      }
      image.setPixel(i, j, scale(sampleScale, sum))
    }
  }
  process.stderr.write('\rTerminé.                 \n')
  return image
}

// fin du module
```
::

On **additionne** les échantillons, et on divise une seule fois à la fin (multiplier par `sampleScale`, c'est diviser par le nombre d'échantillons). C'est pour ça que les couleurs sont en `double` depuis le jour 1. `render` renvoie l'`Image` par valeur : le compilateur la construit directement chez l'appelant, sans recopier les pixels.

`main.cc` ne fait plus que composer. `r3d::Camera camera(r3d::CameraSettings{})` utilise tous les réglages par défaut.

Fichier `src/main.cc`, version de l'étape :

::code-compare
#cpp
```cpp
#include <iostream>
#include <memory>

#include "geometry/hittable_list.h"
#include "geometry/sphere.h"
#include "io/ppm.h"
#include "render/camera.h"
#include "render/renderer.h"

int main() {
    r3d::HittableList world;
    world.add(std::make_shared<r3d::Sphere>(
        r3d::Point3{0, 0, -1}, 0.5));
    world.add(std::make_shared<r3d::Sphere>(
        r3d::Point3{0, -100.5, -1}, 100));

    const r3d::Camera camera(r3d::CameraSettings{});

    r3d::RenderSettings settings;
    settings.samplesPerPixel = 100;

    const r3d::Image image =
        r3d::render(camera, world, settings);
    r3d::writePpm(std::cout, image);
    return 0;
}
```

#ts
```ts
// <iostream> : process.stdout
// <memory> : pas de shared_ptr

import { HittableList } from './geometry/hittable_list'
import { Sphere } from './geometry/sphere'
import { writePpm } from './io/ppm'
import { Camera, CameraSettings } from './render/camera'
import { render, RenderSettings } from './render/renderer'

function main(): number {
  const world = new HittableList()
  world.add(new Sphere(
    new Vec3(0, 0, -1), 0.5))
  world.add(new Sphere(
    new Vec3(0, -100.5, -1), 100))

  const camera = new Camera(new CameraSettings())

  const settings = new RenderSettings()
  settings.samplesPerPixel = 100

  const image =
    render(camera, world, settings)
  writePpm(process.stdout, image)
  return 0
}
```
::

Ajoute `src/render/renderer.cc` à `r3d_core`, recompile : même image qu'avant, bords lisses.

::devlog-section{num="06" kicker="LE DIFFUS" title="La lumière rebondit au hasard."}
::

Jusqu'ici, la couleur d'une sphère est inventée : rouge, ou normale en couleur. Maintenant, on **simule** la lumière.

Une surface mate (plâtre, papier, tissu) renvoie la lumière dans toutes les directions. C'est pour ça qu'elle a la même apparence quel que soit l'angle d'où on la regarde. Le modèle : quand un rayon touche une surface diffuse, il repart dans une **direction aléatoire**, et la couleur vue est une fraction de ce que voit ce nouveau rayon.

C'est récursif. `rayColor(rayon)` appelle `rayColor(rayon_rebondi)`, qui appelle `rayColor(...)`, jusqu'à ce qu'un rayon s'échappe vers le ciel. Le ciel est la seule source de lumière de la scène.

### Quelle direction aléatoire ?

Première tentative du livre : une direction uniforme dans l'hémisphère au-dessus de la surface. Ça marche, mais c'est physiquement faux. Une vraie surface mate suit la **loi de Lambert** : elle renvoie plus de lumière autour de la normale, et de moins en moins vers l'horizon, proportionnellement à $\cos\theta$.

L'astuce élégante pour obtenir cette distribution sans aucune trigonométrie :

::devlog-formula{label="Diffus lambertien"}
$$
\text{direction} = \mathbf{n} + \text{vecteurUnitaireAléatoire}()
$$
::

Géométriquement : on pose une sphère unité tangente à la surface, centrée en $P + \mathbf{n}$. On tire un point au hasard **sur** cette sphère, et on vise ce point. Les directions proches de la normale sont plus probables, et la densité donne exactement du $\cos\theta$. La démo de la section suivante (onglet Lambert) montre ce cercle en pointillés et les rayons tirés.

Comment tirer un vecteur unitaire uniforme en 3D ? La méthode du livre : **rejet**. Tirer $x, y, z$ dans $[-1, 1]$, recommencer tant que le point est hors de la sphère unité, puis normaliser. Simple, et sans biais. Normaliser directement un point du cube donnerait trop de directions vers les coins.

La fonction rejoint `rng.h`, sous la classe. Elle ne sert que le hasard géométrique, et `math/` a le droit d'inclure `math/`.

Fichier `src/math/rng.h`, version complète :

::code-compare
#cpp
```cpp
#pragma once

#include <cmath>
#include <cstdint>
#include <random>

#include "math/vec3.h"

namespace r3d {

class Rng {
public:
    explicit Rng(std::uint64_t seed) : engine_(seed) {}

    double uniform() { return distribution_(engine_); }
    double uniformBetween(double min, double max) {
        return min + (max - min) * uniform();
    }

private:
    std::mt19937_64 engine_;
    std::uniform_real_distribution<double> distribution_{
        0.0, 1.0};
};

inline Vec3 randomUnitVector(Rng& rng) {
    // Below 1e-160 the square root underflows and normalising
    // yields infinities.
    const double TOO_SMALL = 1e-160;
    while (true) {
        const double x = rng.uniformBetween(-1.0, 1.0);
        const double y = rng.uniformBetween(-1.0, 1.0);
        const double z = rng.uniformBetween(-1.0, 1.0);
        const Vec3 candidate{x, y, z};

        const double lengthSquared =
            candidate.lengthSquared();
        const bool insideUnitSphere = lengthSquared <= 1.0;
        if (insideUnitSphere && lengthSquared > TOO_SMALL) {
            return candidate / std::sqrt(lengthSquared);
        }
    }
}

}  // namespace r3d
```

#ts
```ts
// (pas d'équivalent : les modules ES)

// <cmath> : Math est global
// <cstdint> : uint64_t -> bigint
// <random> : PRNG à graine, Math.random n'en a pas

import { div, Vec3 } from './vec3'

// namespace r3d

export class Rng {
  // public :
  constructor(seed: bigint) { this.#engine = new Mt64(seed) }

  uniform(): number { return this.#engine.nextDouble() }
  uniformBetween(min: number, max: number): number {
    return min + (max - min) * this.uniform()
  }

  // private :
  readonly #engine: Mt64 // Mersenne Twister 64 bits
  // (la distribution [0, 1[ est dans nextDouble)
  //
}

export function randomUnitVector(rng: Rng): Vec3 {
  // Below 1e-160 the square root underflows and normalising
  // yields infinities.
  const TOO_SMALL = 1e-160
  while (true) {
    const x = rng.uniformBetween(-1.0, 1.0)
    const y = rng.uniformBetween(-1.0, 1.0)
    const z = rng.uniformBetween(-1.0, 1.0)
    const candidate = new Vec3(x, y, z)

    const lengthSquared =
      candidate.lengthSquared()
    const insideUnitSphere = lengthSquared <= 1.0
    if (insideUnitSphere && lengthSquared > TOO_SMALL) {
      return div(candidate, Math.sqrt(lengthSquared))
    }
  }
}

// fin du module
```
::

Un détail invisible mais important : les trois tirages sont sur trois lignes, donc faits dans l'ordre $x$, $y$, $z$. Dans une seule expression comme `f(rng.uniform(), rng.uniform())`, C++ ne garantit pas toujours l'ordre d'évaluation, et la même graine pourrait donner des images différentes selon le compilateur. Une ligne par tirage règle la question.

::devlog-note{kicker="PIÈGE"}
Deux cas limites. Un point tiré presque au centre a une longueur proche de 0 : la normalisation explose en infinis, d'où le test 1e-160. Et si le vecteur aléatoire tombe pile à l'opposé de n, la direction vaut zéro. On le traitera dans le matériau, à la section suivante.
::

### La récursion doit s'arrêter

Un rayon entre deux sphères proches peut rebondir des dizaines de fois. Sans limite, la pile d'appels explose. On passe une **profondeur maximale** (`maxDepth = 50` chez le livre) et on la décrémente à chaque rebond.

Quand elle atteint zéro, on renvoie **noir**. Pourquoi noir et pas le ciel ? Parce qu'un rayon qui n'a toujours rien trouvé après 50 rebonds est piégé dans un recoin. Statistiquement, presque toute sa lumière a déjà été absorbée. Noir est la meilleure estimation, et ce n'est pas un hack : c'est ce qui crée les ombres de contact sous les sphères.

### L'atténuation, une multiplication

À chaque rebond, la surface absorbe une partie de la lumière. Une surface qui renvoie 50 % : on multiplie par $0.5$. En couleur, on multiplie composante par composante par l'**albédo**, la couleur de la surface :

::devlog-formula{label="Récursion"}
$$
\text{rayColor}(r, p) = \begin{cases} \text{noir} & \text{si } p \le 0 \\ \text{albédo} \times \text{rayColor}(\text{rebond},\ p - 1) & \text{si on touche un objet} \\ \text{ciel}(r) & \text{sinon} \end{cases}
$$
::

Après 3 rebonds sur des surfaces à 50 %, il reste 12,5 % de la lumière. Une sphère rouge $(0.8, 0.1, 0.1)$ sous une sphère bleue va teinter le dessous de la bleue en rose : c'est l'**illumination globale**, gratuite, sans une ligne de code spécifique. C'est souvent là qu'on comprend pourquoi les gens aiment le raytracing.

Dans `src/render/renderer.h`, `RenderSettings` gagne la profondeur :

::code-compare
#cpp
```cpp
struct RenderSettings {
    int samplesPerPixel = 10;
    int maxDepth = 10;
    std::uint64_t seed = 42;
};
```

#ts
```ts
export class RenderSettings {
  samplesPerPixel = 10
  maxDepth = 10
  seed = 42n
}
```
::

Dans `src/render/renderer.cc`, `rayColor` devient récursive et prend le générateur. Le $t_{\min}$ passe à `0.001` : c'est maintenant que l'acné apparaîtrait.

::code-compare
#cpp
```cpp
Color rayColor(const Ray& ray,
               const Hittable& world,
               int depth,
               Rng& rng) {
    if (depth <= 0) {
        return Color{0.0, 0.0, 0.0};
    }
    const std::optional<HitRecord> hit =
        world.hit(ray, Interval{0.001, INFINITE_DISTANCE});
    if (hit.has_value()) {
        const Vec3 direction =
            hit->normal + randomUnitVector(rng);
        const Ray bounced{hit->point, direction};
        return 0.5 * rayColor(bounced, world, depth - 1, rng);
    }
    return skyColor(ray);
}
```

#ts
```ts
function rayColor(ray: Ray,
                  world: Hittable,
                  depth: number,
                  rng: Rng): Color {
  if (depth <= 0) {
    return new Vec3(0.0, 0.0, 0.0)
  }
  const hit =
    world.hit(ray, new Interval(0.001, INFINITE_DISTANCE))
  if (hit !== null) {
    const direction =
      add(hit.normal, randomUnitVector(rng))
    const bounced = new Ray(hit.point, direction)
    return scale(0.5,
                 rayColor(bounced, world, depth - 1, rng))
  }
  return skyColor(ray)
}
```
::

Et l'appel dans la boucle de `render` suit :

::code-compare
#cpp
```cpp
sum = sum + rayColor(ray, world, settings.maxDepth, rng);
```

#ts
```ts
sum = add(sum, rayColor(ray, world, settings.maxDepth, rng))
```
::

Dans `main.cc`, ajoute `settings.maxDepth = 50;` sous `samplesPerPixel`.

### Pourquoi l'image était trop sombre

Premier rendu diffus avec des sphères à 50 % de réflectance : l'image sort **beaucoup** trop sombre. Ce n'est pas un bug de rebond. C'est un bug d'encodage.

Nos calculs produisent de la lumière **linéaire** : 0.5, c'est physiquement la moitié des photons de 1.0. Mais les fichiers image (et l'écran) attendent des valeurs **encodées en gamma**. L'écran applique grosso modo une puissance 2.2 : il affiche $\text{valeur}^{2.2}$. Si on écrit 0.5 tel quel, il affiche $0.5^{2.2} \approx 0.22$. Le gris à 50 % sort à 22 %.

La correction : appliquer l'inverse avant d'écrire. Le livre approxime le gamma à 2, donc l'inverse est une racine carrée :

::devlog-formula{label="Linéaire vers gamma 2"}
$$
\text{octet} = \left\lfloor 256 \cdot \operatorname{clamp}\!\left(\sqrt{\text{linéaire}},\ 0,\ 0.999\right) \right\rfloor
$$
::

::devlog-figure{n="04" caption="La même lumière linéaire, écrite telle quelle ou passée par une racine carrée. L'écran fait le carré"}
  :::schema-gamma
  :::
::

Si tu viens du WebGL, tu connais déjà : c'est le `outputColorSpace = SRGBColorSpace` de Three.js, ou le `pow(color, vec3(1.0/2.2))` en fin de fragment shader. Deux règles qui valent pour toute la suite :

- **On calcule toujours en linéaire.** Moyenne des échantillons, multiplication par l'albédo, tout.
- **On convertit une seule fois, à l'écriture.** Corriger avant de moyenner les échantillons donne des bords d'antialiasing faux.

La conversion se fait donc dans `io/ppm.cc`, au seul endroit où les couleurs deviennent des octets. Le reste du moteur ne sait même pas que le gamma existe.

Fichier `src/io/ppm.cc`, le haut du fichier :

::code-compare
#cpp
```cpp
#include "io/ppm.h"

#include <algorithm>
#include <cmath>

namespace r3d {

namespace {

double linearToGamma(double linear) {
    if (linear <= 0.0) {
        return 0.0;
    }
    return std::sqrt(linear);
}

int toByte(double linear) {
    const double gamma = linearToGamma(linear);
    const double clamped = std::clamp(gamma, 0.0, 0.999);
    return static_cast<int>(256.0 * clamped);
}

}  // namespace
```

#ts
```ts
import type { Writable } from 'node:stream'

// <algorithm> : std::clamp écrit à la main
// <cmath> : Math est global

// namespace r3d

// namespace anonyme : non exporté

function linearToGamma(linear: number): number {
  if (linear <= 0.0) {
    return 0.0
  }
  return Math.sqrt(linear)
}

function toByte(linear: number): number {
  const gamma = linearToGamma(linear)
  const clamped = Math.min(Math.max(gamma, 0.0), 0.999)
  return Math.trunc(256.0 * clamped)
}

//
```
::

`writePpm`, en dessous, ne change pas.

Le test PPM du jour 1 doit suivre : $0.5$ linéaire ne donne plus 128. On prend $0.25$, dont la racine vaut exactement $0.5$. Dans `tests/image_test.cc` :

::code-compare{right="JS (Vitest)"}
#cpp
```cpp
TEST_CASE("channels are gamma-encoded and clamped", "[ppm]") {
    r3d::Image image(1, 1);
    image.setPixel(0, 0, r3d::Color{1.3, -0.2, 0.25});

    std::ostringstream out;
    r3d::writePpm(out, image);

    REQUIRE(out.str() == "P3\n1 1\n255\n255 0 128\n");
}
```

#ts
```ts
test('channels are gamma-encoded and clamped', () => {
  const image = new Image(1, 1)
  image.setPixel(0, 0, new Vec3(1.3, -0.2, 0.25))

  const out = { text: '', write(t: string) { out.text += t } }
  writePpm(out, image)

  expect(out.text).toBe('P3\n1 1\n255\n255 0 128\n')
})
```
::

La vraie courbe sRGB n'est pas une puissance pure (elle a un segment linéaire près du noir). Gamma 2 est une approximation suffisante. La vraie conversion sRGB tiendrait dans `linearToGamma`, sans toucher au reste.

::devlog-your-render{src="/renders/r3d/jour-2-diffus.png" alt="Une sphère grise mate posée sur un sol gris, éclairée par le ciel" caption="Rendu de référence · diffus à 50 %, 100 échantillons, profondeur 50, gamma 2"}
::

::devlog-section{num="07" kicker="MÉTAL ET VERRE" title="Un matériau, c'est une règle de rebond."}
::

Jusqu'ici, « rebondir » voulait dire « diffus ». Pour avoir du métal et du verre, il faut que **chaque objet décide** comment il renvoie la lumière. Nouvelle abstraction : un matériau répond à une question, *un rayon arrive ici, que se passe-t-il ?* Soit le rayon est absorbé (rien), soit il repart, avec une direction et une atténuation.

`std::optional` encore : `std::optional<Scatter>`, où `Scatter` regroupe le rayon diffusé et la fraction de lumière conservée. Le livre utilise deux paramètres de sortie et un booléen. Ici, un rayon absorbé est un `optional` vide, et il n'y a aucun moyen de lire une atténuation qui n'a pas été écrite.

`rayColor` ne sait plus rien de Lambert : il demande au matériau. C'est le principe ouvert / fermé posé au jour 1 : un quatrième matériau s'ajoutera sans toucher au renderer.

### Le matériau voyage avec l'impact

Pour que `rayColor` trouve le matériau, `HitRecord` doit le porter. C'est ici que joue la déclaration anticipée de la section 01. Dans `src/geometry/hittable.h`, deux ajouts :

::code-compare
#cpp
```cpp
namespace r3d {

class Material;

struct HitRecord {
    Point3 point;
    Vec3 normal;
    double t = 0.0;
    bool frontFace = false;
    const Material* material = nullptr;

    // setFaceNormal inchangé
};
```

#ts
```ts
// namespace r3d

import type { Material } from '../material/material'

export class HitRecord {
  point: Point3 = new Vec3()
  normal: Vec3 = new Vec3()
  t = 0.0
  frontFace = false
  material: Material | null = null // non possédé

  // setFaceNormal inchangé
}
```
::

`const Material*` se lit « adresse d'un `Material` qu'on ne modifiera pas », et `= nullptr` lui donne `null` comme valeur par défaut. C'est un **pointeur brut** non propriétaire, pas un `shared_ptr`. La différence compte : un `HitRecord` est créé à chaque impact, des millions de fois par seconde. Copier un `shared_ptr`, c'est un incrément atomique et un décrément atomique. Le pointeur brut ne coûte rien, et il est sûr parce que le `HitRecord` vit moins longtemps que la scène : c'est la sphère qui possède son matériau, l'impact se contente de le désigner.

La sphère, elle, possède son matériau via un `shared_ptr<const Material>`, pour que dix sphères puissent partager le même matériau « sol ». `const` : un matériau ne change pas pendant le rendu.

Fichier `src/geometry/sphere.h`, version finale :

::code-compare
#cpp
```cpp
#pragma once

#include <memory>

#include "geometry/hittable.h"

namespace r3d {

class Sphere final : public Hittable {
public:
    Sphere(const Point3& center,
           double radius,
           const std::shared_ptr<const Material>& material);

    std::optional<HitRecord> hit(
            const Ray& ray,
            Interval rayT) const override;

private:
    Point3 center_;
    double radius_;
    std::shared_ptr<const Material> material_;
};

}  // namespace r3d
```

#ts
```ts
// (pas d'équivalent : les modules ES)

// <memory> : pas de shared_ptr, une référence suffit

import type { Hittable } from './hittable'

// namespace r3d

export class Sphere implements Hittable {
  // public :
  constructor(center: Point3,
              radius: number,
              material: Readonly<Material>) // -> .cc

  hit(
      ray: Ray,
      rayT: Interval): HitRecord | null // -> sphere.cc

  // private :
  readonly #center: Point3
  readonly #radius: number
  readonly #material: Readonly<Material>
}

// fin du module
```
::

Dans `src/geometry/sphere.cc`, le constructeur et la fin de `hit` :

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
}

    // ... fin de Sphere::hit
    const Vec3 outwardNormal =
        (rec.point - center_) / radius_;
    rec.setFaceNormal(ray, outwardNormal);
    rec.material = material_.get();
    return rec;
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
}

  // ... fin de hit()
  const outwardNormal =
    div(sub(rec.point, this.#center), this.#radius)
  rec.setFaceNormal(ray, outwardNormal)
  rec.material = this.#material
  return rec
```
::

`std::shared_ptr<Lambertian>` se convertit tout seul en `std::shared_ptr<const Material>` : à l'appel, on peut passer un `std::make_shared<Lambertian>(...)` directement. `material_.get()` donne le pointeur brut, sans toucher au compteur.

Dans `tests/sphere_test.cc`, ajoute `nullptr` comme troisième argument de chaque `Sphere` : une sphère sans matériau suffit pour tester la géométrie.

### Trois outils de plus dans Vec3

Les matériaux ont besoin de trois fonctions vectorielles. Elles rejoignent `src/math/vec3.h`, sous `unitVector` :

::code-compare
#cpp
```cpp
inline bool nearZero(const Vec3& v) {
    const double EPSILON = 1e-8;
    return std::fabs(v.x) < EPSILON
        && std::fabs(v.y) < EPSILON
        && std::fabs(v.z) < EPSILON;
}

inline Vec3 reflect(const Vec3& v, const Vec3& n) {
    const double alongNormal = dot(v, n);
    return v - 2.0 * alongNormal * n;
}

inline Vec3 refract(const Vec3& unitV,
                    const Vec3& n,
                    double etaRatio) {
    const double cosTheta = std::fmin(dot(-unitV, n), 1.0);
    const Vec3 perpendicular =
        etaRatio * (unitV + cosTheta * n);
    const double parallelSquared =
        1.0 - perpendicular.lengthSquared();
    const double parallelLength =
        std::sqrt(std::fabs(parallelSquared));
    const Vec3 parallel = -parallelLength * n;
    return perpendicular + parallel;
}
```

#ts
```ts
export function nearZero(v: Vec3): boolean {
  const EPSILON = 1e-8
  return Math.abs(v.x) < EPSILON
    && Math.abs(v.y) < EPSILON
    && Math.abs(v.z) < EPSILON
}

export function reflect(v: Vec3, n: Vec3): Vec3 {
  const alongNormal = dot(v, n)
  return sub(v, scale(2.0 * alongNormal, n))
}

export function refract(unitV: Vec3,
                        n: Vec3,
                        etaRatio: number): Vec3 {
  const cosTheta = Math.min(dot(negate(unitV), n), 1.0)
  const perpendicular =
    scale(etaRatio, add(unitV, scale(cosTheta, n)))
  const parallelSquared =
    1.0 - perpendicular.lengthSquared()
  const parallelLength =
    Math.sqrt(Math.abs(parallelSquared))
  const parallel = scale(-parallelLength, n)
  return add(perpendicular, parallel)
}
```
::

Les deux formules sont détaillées juste en dessous. `std::fabs` est `Math.abs`, `std::fmin` est `Math.min` : `std::fmin(..., 1.0)` protège d'un cosinus à $1.0000000001$ qui ferait sortir une racine négative.

::devlog-figure{n="05" caption="Coupe 2D. Lambert disperse, le métal réfléchit (plus ou moins flou), le verre réfracte et réfléchit selon l'angle"}
  :::demo-scatter
  :::
::

### Le métal : réflexion

Un miroir renvoie le rayon symétriquement par rapport à la normale. Décompose $\mathbf{v}$ (incident) en une partie le long de $\mathbf{n}$ et une partie parallèle à la surface. La réflexion garde la partie parallèle et inverse la partie normale. La partie normale vaut $(\mathbf{v} \cdot \mathbf{n})\,\mathbf{n}$. On la retire deux fois :

::devlog-formula{label="Réflexion"}
$$
\mathbf{r} = \mathbf{v} - 2 (\mathbf{v} \cdot \mathbf{n})\, \mathbf{n}
$$
::

Comme $\mathbf{v}$ arrive *contre* la normale, $\mathbf{v} \cdot \mathbf{n}$ est négatif, et $-2(\mathbf{v} \cdot \mathbf{n})\,\mathbf{n}$ pousse bien vers l'extérieur. Si $\mathbf{n}$ n'est pas unitaire, la formule est fausse. Encore une raison de normaliser à la source.

**Le fuzz.** Un métal brossé n'est pas un miroir parfait. Le livre ajoute à la direction réfléchie (normalisée) un petit vecteur aléatoire, de rayon `fuzz` :

::devlog-formula{label="Métal flou"}
$$
\mathbf{r}_{\text{flou}} = \frac{\mathbf{r}}{\lVert \mathbf{r} \rVert} + \text{fuzz} \cdot \text{vecteurUnitaireAléatoire}()
$$
::

Plus `fuzz` est grand, plus la sphère de dispersion est large, plus le reflet est flou. À $\text{fuzz} = 1$, certains rayons replongent **sous** la surface. On les absorbe (`scatter` renvoie un `optional` vide, condition $\mathbf{r}_{\text{flou}} \cdot \mathbf{n} \le 0$). Dans la démo, monte le fuzz avec un rayon rasant : les rayons en pointillés sont perdus. Il faut normaliser $r$ avant d'ajouter le flou, sinon le fuzz dépend de la longueur du rayon incident.

### Le verre : réfraction

Un matériau transparent (verre, eau, diamant) laisse passer la lumière, mais la **dévie**. Plus le milieu est dense optiquement, plus la lumière y ralentit. Ça se mesure par l'**indice de réfraction** $\eta$ : 1 pour le vide et l'air, 1.33 pour l'eau, 1.5 pour le verre, 2.4 pour le diamant.

La loi de Snell-Descartes relie les angles de part et d'autre :

::devlog-formula{label="Snell-Descartes"}
$$
\eta \sin\theta = \eta' \sin\theta'
$$
::

Pour construire le vecteur réfracté sans calculer d'angle, on le découpe en deux. Une partie perpendiculaire à $\mathbf{n}$, une partie parallèle. Avec $\mathbf{v}$ unitaire et $\cos\theta = -\mathbf{v} \cdot \mathbf{n}$ :

::devlog-formula{label="Vecteur réfracté"}
$$
\mathbf{r}'_{\perp} = \frac{\eta}{\eta'} \left( \mathbf{v} + \cos\theta \, \mathbf{n} \right)
$$

$$
\mathbf{r}'_{\parallel} = -\sqrt{1 - \lVert \mathbf{r}'_{\perp} \rVert^2}\ \mathbf{n}
$$

$$
\mathbf{r}' = \mathbf{r}'_{\perp} + \mathbf{r}'_{\parallel}
$$
::

C'est exactement `refract` ci-dessus. Le seul paramètre est le **rapport** $\eta/\eta'$. Et c'est là que `frontFace` paie enfin :

- Le rayon **entre** dans le verre (`frontFace = true`) : il passe de l'air au verre, rapport $1/\eta$.
- Le rayon **sort** du verre (`frontFace = false`) : rapport $\eta/1$.

::devlog-note{kicker="PIÈGE" tone="accent"}
Inverser ce rapport ne produit aucune erreur : juste un verre qui a l'air faux, sans qu'on sache dire pourquoi. Vérifie dans la démo : la valeur « ratio $\eta$ » doit valoir environ $0.67$ quand $\mathbf{v}$ vient du dessus et $1.5$ quand il vient du dessous.
::

### Réflexion totale interne

Quand le rayon sort du verre avec un angle rasant, $(\eta/\eta') \sin\theta$ peut dépasser 1. Or un sinus ne dépasse jamais 1 : **il n'y a pas de solution**. Physiquement, la lumière ne sort pas, elle est entièrement réfléchie à l'intérieur. C'est ce qui fait briller les diamants et marcher la fibre optique.

Dans le code, on teste avant de réfracter : si $\text{rapport} \cdot \sin\theta > 1$, on réfléchit. Dans la démo, passe $\mathbf{v}$ sous la surface et incline-le : au-delà d'environ 42° pour $\eta = 1.5$, le rayon réfracté disparaît.

### Schlick : le verre est aussi un miroir

Regarde une vitre de face : elle est transparente. Regarde-la en rasant : elle reflète comme un miroir. La proportion de lumière réfléchie dépend de l'angle. Les équations de Fresnel complètes sont lourdes. Christophe Schlick a proposé en 1994 une approximation polynomiale que tout le monde utilise depuis :

::devlog-formula{label="Approximation de Schlick"}
$$
R_0 = \left( \frac{1 - \text{rapport}}{1 + \text{rapport}} \right)^2
$$

$$
R(\theta) = R_0 + (1 - R_0)(1 - \cos\theta)^5
$$
::

$R_0$ est la réflectance de face, 4 % pour du verre. Elle monte vers 100 % à l'incidence rasante. Mais un matériau ne renvoie qu'**un** rayon par appel à `scatter`. Comment faire 4 % de réflexion et 96 % de réfraction ? Monte-Carlo, encore : on tire un nombre aléatoire, et on réfléchit si ce nombre est inférieur à $R$. Moyenné sur des dizaines d'échantillons par pixel, ça converge vers le bon mélange. L'atténuation du verre vaut $(1, 1, 1)$ : il n'absorbe rien.

### Les trois matériaux

Fichier `src/material/material.h` :

::code-compare
#cpp
```cpp
#pragma once

#include <optional>

#include "geometry/hittable.h"
#include "math/ray.h"
#include "math/rng.h"
#include "math/vec3.h"

namespace r3d {

struct Scatter {
    Ray ray;
    Color attenuation;
};

class Material {
public:
    virtual ~Material() = default;
    virtual std::optional<Scatter> scatter(
            const Ray& in,
            const HitRecord& rec,
            Rng& rng) const = 0;
};

class Lambertian final : public Material {
public:
    explicit Lambertian(const Color& albedo)
        : albedo_(albedo) {}

    std::optional<Scatter> scatter(const Ray& in,
                                   const HitRecord& rec,
                                   Rng& rng) const override;

private:
    Color albedo_;
};

class Metal final : public Material {
public:
    Metal(const Color& albedo, double fuzz);

    std::optional<Scatter> scatter(const Ray& in,
                                   const HitRecord& rec,
                                   Rng& rng) const override;

private:
    Color albedo_;
    double fuzz_;
};

class Dielectric final : public Material {
public:
    explicit Dielectric(double refractionIndex)
        : refractionIndex_(refractionIndex) {}

    std::optional<Scatter> scatter(const Ray& in,
                                   const HitRecord& rec,
                                   Rng& rng) const override;

private:
    double refractionIndex_;
};

}  // namespace r3d
```

#ts
```ts
// (pas d'équivalent : les modules ES)

// <optional> : Scatter | null

import type { HitRecord } from '../geometry/hittable'
import { Ray } from '../math/ray'
import { randomUnitVector, type Rng } from '../math/rng'
import type { Color } from '../math/vec3'

// namespace r3d

export class Scatter {
  constructor(public ray: Ray,
              public attenuation: Color) {}
}

export interface Material {
  // (destructeur virtuel : rien à écrire)
  scatter(
      rayIn: Ray,
      rec: HitRecord,
      rng: Rng): Scatter | null
}

export class Lambertian implements Material {
  // public :
  constructor(albedo: Color) {
    this.#albedo = albedo }

  scatter(rayIn: Ray,
          rec: HitRecord,
          rng: Rng): Scatter | null // -> material.cc

  // private :
  readonly #albedo: Color
}

export class Metal implements Material {
  // public :
  constructor(albedo: Color, fuzz: number) // -> .cc

  scatter(rayIn: Ray,
          rec: HitRecord,
          rng: Rng): Scatter | null // -> material.cc

  // private :
  readonly #albedo: Color
  readonly #fuzz: number
}

export class Dielectric implements Material {
  // public :
  constructor(refractionIndex: number) {
    this.#refractionIndex = refractionIndex }

  scatter(rayIn: Ray,
          rec: HitRecord,
          rng: Rng): Scatter | null // -> material.cc

  // private :
  readonly #refractionIndex: number
}

// fin du module
```
::

Trois matériaux dans un seul fichier : ils partagent la même interface, ils sont courts, et on les lit ensemble. S'ils grossissaient (textures, émission), chacun aurait son fichier.

Fichier `src/material/material.cc` :

::code-compare
#cpp
```cpp
#include "material/material.h"

#include <cmath>

namespace r3d {

namespace {

double schlick(double cosine, double etaRatio) {
    const double ratio = (1.0 - etaRatio) / (1.0 + etaRatio);
    const double r0 = ratio * ratio;
    const double grazing = std::pow(1.0 - cosine, 5.0);
    return r0 + (1.0 - r0) * grazing;
}

}  // namespace

std::optional<Scatter> Lambertian::scatter(
        const Ray&,
        const HitRecord& rec,
        Rng& rng) const {
    Vec3 direction = rec.normal + randomUnitVector(rng);
    if (nearZero(direction)) {
        direction = rec.normal;
    }
    const Ray scattered{rec.point, direction};
    return Scatter{scattered, albedo_};
}

Metal::Metal(const Color& albedo, double fuzz)
    : albedo_(albedo), fuzz_(fuzz) {
    if (fuzz_ > 1.0) {
        fuzz_ = 1.0;
    }
}

std::optional<Scatter> Metal::scatter(const Ray& in,
                                      const HitRecord& rec,
                                      Rng& rng) const {
    const Vec3 reflected =
        reflect(in.direction(), rec.normal);
    const Vec3 fuzzOffset = fuzz_ * randomUnitVector(rng);
    const Vec3 direction = unitVector(reflected) + fuzzOffset;
    if (dot(direction, rec.normal) <= 0.0) {
        return std::nullopt;
    }
    const Ray scattered{rec.point, direction};
    return Scatter{scattered, albedo_};
}

std::optional<Scatter> Dielectric::scatter(
        const Ray& in,
        const HitRecord& rec,
        Rng& rng) const {
    double etaRatio = refractionIndex_;
    if (rec.frontFace) {
        etaRatio = 1.0 / refractionIndex_;
    }

    const Vec3 unitDirection = unitVector(in.direction());
    const double cosTheta =
        std::fmin(dot(-unitDirection, rec.normal), 1.0);
    const double sinTheta =
        std::sqrt(1.0 - cosTheta * cosTheta);

    const bool totalInternalReflection =
        etaRatio * sinTheta > 1.0;
    bool reflects = totalInternalReflection;
    if (!totalInternalReflection) {
        const double reflectance =
            schlick(cosTheta, etaRatio);
        reflects = reflectance > rng.uniform();
    }

    Vec3 direction;
    if (reflects) {
        direction = reflect(unitDirection, rec.normal);
    } else {
        direction =
            refract(unitDirection, rec.normal, etaRatio);
    }
    const Ray scattered{rec.point, direction};
    return Scatter{scattered, Color{1.0, 1.0, 1.0}};
}

}  // namespace r3d
```

#ts
```ts
// material.ts, suite : les corps des méthodes

// <cmath> : Math est global

// namespace r3d

// namespace anonyme : non exporté

function schlick(cosine: number, etaRatio: number): number {
  const ratio = (1.0 - etaRatio) / (1.0 + etaRatio)
  const r0 = ratio * ratio
  const grazing = Math.pow(1.0 - cosine, 5.0)
  return r0 + (1.0 - r0) * grazing
}

//

// Lambertian
scatter(
    _rayIn: Ray, // préfixe _ : paramètre inutilisé
    rec: HitRecord,
    rng: Rng): Scatter | null {
  let direction = add(rec.normal, randomUnitVector(rng))
  if (nearZero(direction)) {
    direction = rec.normal
  }
  const scattered = new Ray(rec.point, direction)
  return new Scatter(scattered, this.#albedo)
}

constructor(albedo: Color, fuzz: number) { // Metal
  this.#albedo = albedo; this.#fuzz = fuzz
  if (this.#fuzz > 1.0) {
    this.#fuzz = 1.0
  }
}

scatter(rayIn: Ray, // Metal
        rec: HitRecord,
        rng: Rng): Scatter | null {
  const reflected =
    reflect(rayIn.direction(), rec.normal)
  const fuzzOffset = scale(this.#fuzz, randomUnitVector(rng))
  const direction = add(unitVector(reflected), fuzzOffset)
  if (dot(direction, rec.normal) <= 0.0) {
    return null
  }
  const scattered = new Ray(rec.point, direction)
  return new Scatter(scattered, this.#albedo)
}

// Dielectric
scatter(
    rayIn: Ray,
    rec: HitRecord,
    rng: Rng): Scatter | null {
  let etaRatio = this.#refractionIndex
  if (rec.frontFace) {
    etaRatio = 1.0 / this.#refractionIndex
  }

  const unitDirection = unitVector(rayIn.direction())
  const cosTheta =
    Math.min(dot(negate(unitDirection), rec.normal), 1.0)
  const sinTheta =
    Math.sqrt(1.0 - cosTheta * cosTheta)

  const totalInternalReflection =
    etaRatio * sinTheta > 1.0
  let reflects = totalInternalReflection
  if (!totalInternalReflection) {
    const reflectance =
      schlick(cosTheta, etaRatio)
    reflects = reflectance > rng.uniform()
  }

  let direction: Vec3
  if (reflects) {
    direction = reflect(unitDirection, rec.normal)
  } else {
    direction =
      refract(unitDirection, rec.normal, etaRatio)
  }
  const scattered = new Ray(rec.point, direction)
  return new Scatter(scattered, new Vec3(1.0, 1.0, 1.0))
}

// fin du module
```
::

Ce qui mérite un mot :

- **`const Ray&` sans nom** dans `Lambertian::scatter` : le diffus ignore le rayon entrant. Ne pas nommer le paramètre évite le warning `-Wunused-parameter` (« paramètre jamais utilisé »), sans commentaire ni astuce.
- **`nearZero`** traite le cas « vecteur aléatoire opposé à la normale » annoncé à la section 06 : une direction nulle produirait des `NaN` au rebond suivant.
- **Le fuzz est plafonné à 1** dans le constructeur de `Metal`. Au-delà, la sphère de dispersion engloberait des directions entièrement sous la surface.
- **`Dielectric`** suit exactement le texte : réflexion totale interne d'abord ; sinon, tirage de Schlick ; s'il ne réfléchit pas, réfraction. Le nombre aléatoire n'est tiré que si la réflexion totale n'a pas déjà décidé.
- **`Scatter{scattered, albedo_}`** remplit les deux champs de la structure dans l'ordre, comme `Vec3{x, y, z}`.

### La version finale de rayColor

Dans `src/render/renderer.cc`, on inclut `material/material.h` (le renderer est au-dessus de tout le monde, il en a le droit) et `rayColor` délègue au matériau :

::code-compare
#cpp
```cpp
#include "material/material.h"

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
```

#ts
```ts
import type { Material } from '../material/material'

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
```
::

Le flux se lit de haut en bas : trop profond, noir. Rien touché, ciel. Absorbé, noir. Sinon, atténuation fois la lumière qu'apporte le rayon suivant (`incoming`). L'appel virtuel `hit->material->scatter(...)` est le seul endroit où la géométrie et la matière se rencontrent : `hit->material` est le pointeur vers le matériau, et le second `->` appelle sa méthode.

### La bulle : le rayon négatif

Une sphère de verre pleine agit comme une loupe et retourne l'image. Pour une **boule creuse** (une bulle de savon épaisse), on place une seconde sphère à l'intérieur. Deux méthodes :

- **L'ancienne astuce** (éditions précédentes du livre) : une sphère intérieure de **rayon négatif**. La surface est la même ($r^2$ ne change pas), mais la normale $(P - C)/r$ pointe vers l'intérieur. `frontFace` s'inverse, et la sphère se comporte comme une frontière verre → air.
- **La version actuelle** : une sphère intérieure normale, avec un matériau d'indice $1/1.5$. On modélise de l'air *dans* du verre : le rapport des indices fait le même travail, sans géométrie piégée.

On garde la seconde, et c'est pour ça que le constructeur de `Sphere` clampe le rayon à 0 : un rayon négatif est un mensonge dans la donnée, et le jour où un autre code calcule une aire ou une boîte englobante avec $r$ (le jour 3, précisément), il casse.

### Les tests des matériaux

On teste les formules, pas le hasard : `reflect` inverse bien la composante normale, `refract` ne dévie pas un rayon perpendiculaire et respecte Snell-Descartes, et le diffus ne renvoie jamais de rayon sous la surface, même sur mille tirages.

Fichier `tests/material_test.cc` :

::code-compare{right="JS (Vitest)"}
#cpp
```cpp
#include <catch2/catch_test_macros.hpp>
#include <catch2/matchers/catch_matchers_floating_point.hpp>

#include <cmath>
#include <optional>

#include "material/material.h"
#include "math/vec3.h"

using Catch::Matchers::WithinAbs;
using r3d::Vec3;

TEST_CASE(
    "reflect mirrors the normal component", "[material]") {
    const Vec3 r =
        r3d::reflect(Vec3{1, -1, 0}, Vec3{0, 1, 0});
    REQUIRE_THAT(r.x, WithinAbs(1.0, 1e-12));
    REQUIRE_THAT(r.y, WithinAbs(1.0, 1e-12));
}

TEST_CASE(
    "refract does not bend a ray at normal incidence",
    "[material]") {
    const Vec3 r = r3d::refract(
        Vec3{0, -1, 0}, Vec3{0, 1, 0}, 1.0 / 1.5);
    REQUIRE_THAT(r.x, WithinAbs(0.0, 1e-12));
    REQUIRE_THAT(r.y, WithinAbs(-1.0, 1e-12));
}

TEST_CASE("refract follows Snell's law", "[material]") {
    const double incidence = 0.5;
    const Vec3 v{
        std::sin(incidence), -std::cos(incidence), 0};
    const Vec3 r = r3d::refract(v, Vec3{0, 1, 0}, 1.0 / 1.5);
    REQUIRE_THAT(
        1.0 * std::sin(incidence),
        WithinAbs(1.5 * r.x / r.length(), 1e-12));
}

TEST_CASE(
    "a lambertian surface scatters above the surface",
    "[material]") {
    const r3d::Lambertian material(r3d::Color{0.5, 0.5, 0.5});
    r3d::HitRecord rec;
    rec.point = r3d::Point3{0, 0, 0};
    rec.normal = r3d::Vec3{0, 1, 0};
    const r3d::Ray incoming{
        r3d::Point3{0, 1, 0}, r3d::Vec3{0, -1, 0}};
    r3d::Rng rng(3);

    for (int i = 0; i < 1000; ++i) {
        const std::optional<r3d::Scatter> scattered =
            material.scatter(incoming, rec, rng);
        REQUIRE(scattered.has_value());
        REQUIRE(r3d::dot(
            scattered->ray.direction(), rec.normal) >= 0.0);
    }
}
```

#ts
```ts
import { expect, test } from 'vitest'
// WithinAbs ≈ toBeCloseTo

// <cmath> : Math est global
// <optional> : Scatter | null

import { Lambertian } from '../src/material/material'
import { reflect, refract, Vec3 } from '../src/math/vec3'

// (toBeCloseTo est déjà une méthode d'expect)
// (Vec3 importé ci-dessus)

test(
  'reflect mirrors the normal component', () => {
  const r =
    reflect(new Vec3(1, -1, 0), new Vec3(0, 1, 0))
  expect(r.x).toBeCloseTo(1.0, 12)
  expect(r.y).toBeCloseTo(1.0, 12)
})

test(
  'refract does not bend a ray at normal incidence',
  () => {
  const r = refract(
    new Vec3(0, -1, 0), new Vec3(0, 1, 0), 1.0 / 1.5)
  expect(r.x).toBeCloseTo(0.0, 12)
  expect(r.y).toBeCloseTo(-1.0, 12)
})

test("refract follows Snell's law", () => {
  const incidence = 0.5
  const v = new Vec3(
    Math.sin(incidence), -Math.cos(incidence), 0)
  const r = refract(v, new Vec3(0, 1, 0), 1.0 / 1.5)
  expect(
    1.0 * Math.sin(incidence),
  ).toBeCloseTo(1.5 * r.x / r.length(), 12)
})

test(
  'a lambertian surface scatters above the surface',
  () => {
  const material = new Lambertian(new Vec3(0.5, 0.5, 0.5))
  const rec = new HitRecord()
  rec.point = new Vec3(0, 0, 0)
  rec.normal = new Vec3(0, 1, 0)
  const incoming = new Ray(
    new Vec3(0, 1, 0), new Vec3(0, -1, 0))
  const rng = new Rng(3n)

  for (let i = 0; i < 1000; ++i) {
    const scattered =
      material.scatter(incoming, rec, rng)
    expect(scattered).not.toBeNull()
    expect(dot(
      scattered!.ray.direction(), rec.normal),
    ).toBeGreaterThanOrEqual(0.0)
  }
})
```
::

### La scène finale

Le livre termine par sa scène de couverture : un sol, une grille de 22 × 22 petites sphères aux matériaux tirés au sort, et trois grosses, une de chaque matériau. Avec la caméra positionnable, on se place en $(13, 2, 3)$, on vise l'origine, champ de vision serré à 20°. Le livre ajoute aussi un flou de profondeur (*defocus blur*) : un disque d'ouverture autour de l'œil, rien de neuf côté théorie. On le laisse de côté, la scène est lisible sans.

La scène a son propre générateur, avec sa propre graine : changer la graine du rendu ne déplace pas les sphères.

Fichier `src/main.cc`, version finale du jour :

::code-compare
#cpp
```cpp
#include <iostream>
#include <memory>

#include "geometry/hittable_list.h"
#include "geometry/sphere.h"
#include "io/ppm.h"
#include "material/material.h"
#include "math/rng.h"
#include "render/camera.h"
#include "render/renderer.h"

namespace {

r3d::Color randomColor(r3d::Rng& rng,
                       double min,
                       double max) {
    const double red = rng.uniformBetween(min, max);
    const double green = rng.uniformBetween(min, max);
    const double blue = rng.uniformBetween(min, max);
    return r3d::Color{red, green, blue};
}

std::shared_ptr<r3d::Material> randomMaterial(r3d::Rng& rng,
                                              double choice) {
    if (choice < 0.8) {
        const r3d::Color first = randomColor(rng, 0, 1);
        const r3d::Color second = randomColor(rng, 0, 1);
        const r3d::Color albedo = first * second;
        return std::make_shared<r3d::Lambertian>(albedo);
    }
    if (choice < 0.95) {
        const r3d::Color albedo = randomColor(rng, 0.5, 1);
        const double fuzz = rng.uniformBetween(0, 0.5);
        return std::make_shared<r3d::Metal>(albedo, fuzz);
    }
    return std::make_shared<r3d::Dielectric>(1.5);
}

r3d::HittableList buildFinalScene() {
    r3d::HittableList world;
    r3d::Rng rng(7);

    const auto ground = std::make_shared<r3d::Lambertian>(
        r3d::Color{0.5, 0.5, 0.5});
    world.add(std::make_shared<r3d::Sphere>(
        r3d::Point3{0, -1000, 0}, 1000, ground));

    for (int a = -11; a < 11; ++a) {
        for (int b = -11; b < 11; ++b) {
            const double choice = rng.uniform();
            const double x = a + 0.9 * rng.uniform();
            const double z = b + 0.9 * rng.uniform();
            const r3d::Point3 center{x, 0.2, z};

            const double distanceToBigSphere =
                (center - r3d::Point3{4, 0.2, 0}).length();
            if (distanceToBigSphere <= 0.9) {
                continue;
            }
            world.add(std::make_shared<r3d::Sphere>(
                center, 0.2, randomMaterial(rng, choice)));
        }
    }

    const auto glass = std::make_shared<r3d::Dielectric>(1.5);
    const auto brown = std::make_shared<r3d::Lambertian>(
        r3d::Color{0.4, 0.2, 0.1});
    const auto mirror = std::make_shared<r3d::Metal>(
        r3d::Color{0.7, 0.6, 0.5}, 0.0);
    world.add(std::make_shared<r3d::Sphere>(
        r3d::Point3{0, 1, 0}, 1.0, glass));
    world.add(std::make_shared<r3d::Sphere>(
        r3d::Point3{-4, 1, 0}, 1.0, brown));
    world.add(std::make_shared<r3d::Sphere>(
        r3d::Point3{4, 1, 0}, 1.0, mirror));
    return world;
}

}  // namespace

int main() {
    const r3d::HittableList world = buildFinalScene();

    r3d::CameraSettings cameraSettings;
    cameraSettings.imageWidth = 400;
    cameraSettings.verticalFov = 20.0;
    cameraSettings.lookFrom = r3d::Point3{13, 2, 3};
    cameraSettings.lookAt = r3d::Point3{0, 0, 0};
    const r3d::Camera camera(cameraSettings);

    r3d::RenderSettings renderSettings;
    renderSettings.samplesPerPixel = 50;
    renderSettings.maxDepth = 50;

    const r3d::Image image =
        r3d::render(camera, world, renderSettings);
    r3d::writePpm(std::cout, image);
    return 0;
}
```

#ts
```ts
// <iostream> : process.stdout
// <memory> : pas de shared_ptr

import { HittableList } from './geometry/hittable_list'
import { Sphere } from './geometry/sphere'
import { writePpm } from './io/ppm'
import { Dielectric, Lambertian,
         Metal } from './material/material'
import { Rng } from './math/rng'
import { Camera, CameraSettings } from './render/camera'
import { render, RenderSettings } from './render/renderer'

// namespace anonyme : non exporté

function randomColor(rng: Rng,
                     min: number,
                     max: number): Color {
  const red = rng.uniformBetween(min, max)
  const green = rng.uniformBetween(min, max)
  const blue = rng.uniformBetween(min, max)
  return new Vec3(red, green, blue)
}

function randomMaterial(rng: Rng,
                        choice: number): Material {
  if (choice < 0.8) {
    const first = randomColor(rng, 0, 1)
    const second = randomColor(rng, 0, 1)
    const albedo = mul(first, second)
    return new Lambertian(albedo)
  }
  if (choice < 0.95) {
    const albedo = randomColor(rng, 0.5, 1)
    const fuzz = rng.uniformBetween(0, 0.5)
    return new Metal(albedo, fuzz)
  }
  return new Dielectric(1.5)
}

function buildFinalScene(): HittableList {
  const world = new HittableList()
  const rng = new Rng(7n)

  const ground = new Lambertian(
    new Vec3(0.5, 0.5, 0.5))
  world.add(new Sphere(
    new Vec3(0, -1000, 0), 1000, ground))

  for (let a = -11; a < 11; ++a) {
    for (let b = -11; b < 11; ++b) {
      const choice = rng.uniform()
      const x = a + 0.9 * rng.uniform()
      const z = b + 0.9 * rng.uniform()
      const center = new Vec3(x, 0.2, z)

      const distanceToBigSphere =
        sub(center, new Vec3(4, 0.2, 0)).length()
      if (distanceToBigSphere <= 0.9) {
        continue
      }
      world.add(new Sphere(
        center, 0.2, randomMaterial(rng, choice)))
    }
  }

  const glass = new Dielectric(1.5)
  const brown = new Lambertian(
    new Vec3(0.4, 0.2, 0.1))
  const mirror = new Metal(
    new Vec3(0.7, 0.6, 0.5), 0.0)
  world.add(new Sphere(
    new Vec3(0, 1, 0), 1.0, glass))
  world.add(new Sphere(
    new Vec3(-4, 1, 0), 1.0, brown))
  world.add(new Sphere(
    new Vec3(4, 1, 0), 1.0, mirror))
  return world
}

//

function main(): number {
  const world = buildFinalScene()

  const cameraSettings = new CameraSettings()
  cameraSettings.imageWidth = 400
  cameraSettings.verticalFov = 20.0
  cameraSettings.lookFrom = new Vec3(13, 2, 3)
  cameraSettings.lookAt = new Vec3(0, 0, 0)
  const camera = new Camera(cameraSettings)

  const renderSettings = new RenderSettings()
  renderSettings.samplesPerPixel = 50
  renderSettings.maxDepth = 50

  const image =
    render(camera, world, renderSettings)
  writePpm(process.stdout, image)
  return 0
}
```
::

::devlog-note{kicker="C++ EN CLAIR"}
`const auto ground = std::make_shared<r3d::Lambertian>(...)` : `auto` laisse le compilateur déduire le type de la variable, comme un `const` sans annotation en TS. On ne s'en sert que quand le type est déjà écrit sur la même ligne, ici dans `make_shared<r3d::Lambertian>`. `continue` saute au tour de boucle suivant, comme en JS.
::

`first * second` : le produit de deux couleurs uniformes tire plus souvent des couleurs sombres et saturées, c'est ce qui donne la palette du livre. Les deux couleurs sont tirées sur deux lignes, pour la même raison d'ordre que `randomUnitVector`. La scène compte environ 480 sphères, et chaque rayon les teste **toutes**. On compile et on lance, en Release cette fois : en Debug, compte plusieurs minutes.

```bash
cmake -B build-release -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build-release
ctest --test-dir build --output-on-failure
time ./build-release/r3d > final.ppm
```

::devlog-your-render{src="/renders/r3d/jour-2.png" alt="Scène finale du premier livre : des centaines de petites sphères et trois grosses, une diffuse, une en verre, une en métal" caption="Rendu de référence · 400 × 225 · 50 échantillons, profondeur 50 · environ 12 s sur un cœur d'Apple M1 Max"}
::

::devlog-section{num="08" kicker="RÉCAP" title="Ce qu'on a construit, et ce que ça coûte."}
::

Fin du premier livre. Le dépôt en fin de journée :

```
src/
├── main.cc                     scène finale, réglages caméra et rendu
├── math/
│   ├── vec3.h                  + nearZero, reflect, refract
│   ├── ray.h
│   ├── interval.h              [min, max], contains, surrounds
│   └── rng.h                   Rng (mt19937_64) + randomUnitVector
├── image/image.h, image.cc
├── io/ppm.h, ppm.cc            + linearToGamma
├── geometry/
│   ├── hittable.h              HitRecord (+ Material*), Hittable
│   ├── sphere.h, sphere.cc     équation du second degré, frontFace
│   └── hittable_list.h, .cc    closest hit par intervalle qui rétrécit
├── material/material.h, .cc    Lambertian, Metal, Dielectric
└── render/
    ├── camera.h, camera.cc     CameraSettings, lookAt, sampleRay
    └── renderer.h, .cc         rayColor récursif, moyenne des échantillons
tests/                          23 tests : vec3, image, camera, sphere, material
```

Les décisions qui comptent pour la suite :

- **`std::optional` partout où le livre utilisait des paramètres de sortie** : `hit` et `scatter` renvoient soit une valeur complète, soit rien.
- **Propriété explicite** : les objets possèdent leur matériau (`shared_ptr<const Material>`), les impacts le désignent (`const Material*`). Pas de compteur atomique dans la boucle chaude.
- **Le générateur aléatoire est un paramètre**, jamais un global. Au jour 3, c'est ce qui rendra le multithread trivial et l'image déterministe.
- **Le gamma vit dans `io/`**, au seul endroit où les couleurs deviennent des octets.

Et le chiffre à battre : environ 12 secondes pour 400 × 225 à 50 échantillons, sur un seul cœur. Le livre rend la même scène en 1200 × 675 à 500 échantillons : quatre-vingt-dix fois plus de rayons, soit une vingtaine de minutes ici.

Demain : des triangles, des fichiers OBJ, et surtout la vitesse. Chaque rayon teste chaque objet, et un seul cœur travaille. Il va falloir arrêter les deux.
