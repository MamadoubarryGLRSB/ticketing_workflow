# Backlog Backend

Stack : NestJS, Prisma, PostgreSQL.

---

1. **Modéliser le schéma** — Prisma : User, Role, Ticket (titre, description, priorité, tags), Workflow, State, Transition, Event (event sourcing), assignation.
2. **PostgreSQL + Prisma** — Connexion, migrations, lancer la BDD.
3. **Auth JWT + rôles** — Login, tokens, garde rôles (ex. Admin, User).
4. **CRUD tickets (service métier)** — Création, édition, suppression dans un service domaine (pas dans le controller).
5. **Assignation** — Assigner / réassigner un ticket à un utilisateur.
6. **Moteur de workflow générique** — États et transitions configurables (pas en dur), rôles requis par transition.
7. **Event sourcing** — Chaque modification = événement persisté ; état courant reconstitué ; store d’événements séparé de la lecture.
8. **Historique ticket** — API pour l’historique immuable d’un ticket (liste d’événements).
9. **API REST** — CRUD tickets + transition de workflow ; contrôleurs qui appellent le service métier.
10. **Swagger / OpenAPI** — Documenter l’API.
11. **Docker Compose** — Lancer app + PostgreSQL.
12. **Features avancées (2 min)** — Choisir 2 parmi : notifications (webhook/email), commentaires @mention, pièces jointes, filtres + full-text, métriques, API pour CLI.
