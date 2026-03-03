# Ticketing Workflow — Backend

API NestJS + Prisma + PostgreSQL pour la gestion de tickets et workflows.

## Démarrage (3 étapes)

**1. Cloner et installer les dépendances**

```bash
git clone <url-du-repo>
cd ticketing_workflow
npm i
```

**2. Lancer la base de données et le projet**

```bash
# Démarrer PostgreSQL (Docker)
docker compose up -d

# Fichier .env (copier l’exemple puis adapter si besoin)
cp .env.example .env

# Créer les tables (chaque dev initialise sa migration en local)
npm run prisma:migrate

# Lancer l’API
npm run start:dev
```

**3. Vérifier les tables (Prisma Studio)**

```bash
npm run prisma:studio
```

Ouvre l’interface sur `http://localhost:5555` pour voir et éditer les données.

---

## Scripts utiles

| Commande | Description |
|----------|-------------|
| `npm run start:dev` | Lancer l’API en mode watch |
| `npm run prisma:migrate` | Créer / appliquer les migrations |
| `npm run prisma:studio` | Ouvrir Prisma Studio (tables) |
| `npm run prisma:generate` | Régénérer le client Prisma |
