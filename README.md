# Top Gato Liberty Hub

A lightweight full-stack prototype that powers an interactive dashboard for cataloguing political views in the spirit of Top Gato — the meme feline who lives for total economic freedom and fearless speech. The site lets visitors explore consensus trends, drill into specific subjects, and log their own stances.

## Features

- 🐾 **Interactive dashboard** with clickable tiles that keep the layout intact while surfacing deeper insight for any subject.
- 🗳️ **Consensus engine** that aggregates user submissions, highlighting leading stances and average confidence levels.
- 🧭 **Detail panel** that reveals recent contributions and stance breakdowns without losing track of the main grid.
- ✍️ **Submission form** so new perspectives immediately reshape the Top Gato consensus.
- 🗂️ **SQLite persistence** for subjects and views with automatic seeding of core freedom-focused topics.

## Getting started

```bash
npm install
npm start
```

The server boots on [http://localhost:3000](http://localhost:3000) and serves both the API and the web interface.

## Project structure

```
├── data/                # SQLite database file (created on demand)
├── public/              # Front-end assets (HTML, CSS, JS)
├── src/
│   ├── db.js            # Database helpers and aggregations
│   └── server.js        # Express server and API routes
├── package.json
└── README.md
```

## API overview

### `GET /api/subjects`
Returns the list of dashboard tiles with consensus information.

### `GET /api/subjects/:slug`
Retrieves detailed information and recent contributions for a subject.

### `POST /api/views`
Saves a new stance to the database. Body fields:

- `subjectSlug` – short slug used in the dashboard tile.
- `subjectTitle` – human-readable subject name.
- `subjectDescription` (optional) – context copy.
- `userHandle` – public alias for attribution.
- `stance` – description of the view.
- `confidence` – number between 0–100.

## Development notes

- The database lives in `data/topgato.db`. Remove the file to reset the hub.
- New subjects are created automatically when a unique slug is posted.
- The UI is intentionally lightweight — no build tooling, just vanilla JS talking to the API — so it can be hosted as-is.
