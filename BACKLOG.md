# Backlog Backend

Stack : NestJS, Prisma, PostgreSQL.

**Rappels cahier des charges :**
- Schéma d’architecture (services, flux, modèle de données) avant le développement**.
- Les **rôles** doivent exister en BDD pour l’auth et pour « rôles requis par transition » (seed ou API de gestion).

---

1. **Modéliser le schéma** — Prisma : User, Role, Ticket (titre, description, priorité, tags), Workflow, State, Transition, Event (event sourcing), assignation.
2. **PostgreSQL + Prisma** — Connexion, migrations, lancer la BDD.
3. **Auth JWT + rôles** — Login, tokens, garde rôles. S’assurer que des rôles existent en BDD (seed ou API).
4. **CRUD tickets (service métier)** — Création, édition, suppression dans un service domaine (pas dans le controller).
5. **Configuration des workflows** — API pour créer/éditer workflows, états et transitions (rôles requis par transition). Pour la démo : « on configure un workflow ».
6. **Assignation** — Assigner / réassigner un ticket à un utilisateur.
7. **Moteur de workflow générique** — Appliquer une transition (état + rôles) ; pas de workflow codé en dur.
8. **Event sourcing** — Chaque modification = événement persisté ; état courant reconstitué ; store d’événements séparé de la lecture.
9. **Historique ticket** — API pour l’historique immuable d’un ticket (liste d’événements).
10. **API REST** — CRUD tickets + transitions de workflow ; contrôleurs qui délèguent au service métier.
11. **Swagger / OpenAPI** — Documenter l’API.
12. **Docker Compose** — Lancer app + PostgreSQL.
13. **Features avancées (≥ 2)**métriques, CLI.
