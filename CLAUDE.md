# Claude Instructions — threeJsExploration

## What This Repository Is

A collection of independent, web-based Three.js animation subprojects. Each subproject lives in `projects/<name>/` and is self-contained (plain HTML + JS, no build tools, CDN imports). The goal is to explore Three.js capabilities through hands-on experimentation.

## Repository Structure

```
threeJsExploration/
├── CLAUDE.md                        ← you are here (root instructions)
├── .claude/
│   └── threejs-knowledge.md         ← compiled Three.js reference knowledge
├── projects/
│   ├── project-one/                 ← first experiment
│   └── <future-projects>/
└── README.md
```

## Instructions for Claude (Every Session)

1. **Read `.claude/threejs-knowledge.md`** at the start of any session before writing Three.js code. It is the authoritative reference for how to use the library in this repo.

2. **Keep the knowledge base current.** As you discover new Three.js patterns, APIs, or techniques while working on projects — add them to `.claude/threejs-knowledge.md`. Commit those updates alongside project work. The knowledge base should grow richer over time.

3. **Each project is independent.** No shared `node_modules`, no monorepo tooling. Each `projects/<name>/index.html` must be openable directly in a browser or via a simple static server.

4. **Use CDN imports** (importmap or direct `<script type="module">`) pointing to `https://cdn.jsdelivr.net/npm/three@<version>/...`. Pin a specific version per project so projects don't break over time.

5. **Development branch:** Work on `claude/learn-threejs-basics-2zNFz`, push there.

6. **Commit style:** Small, descriptive commits. Group project work and knowledge-base updates in the same commit when related.

## Adding a New Project

- Create `projects/<project-name>/index.html` and any accompanying `.js` files.
- Put a brief comment at the top of `index.html` describing what the project explores.
- Update this file's project list if it ever grows long enough to need one.

## Knowledge Base Source

Initial knowledge was sourced from [CloudAI-X/threejs-skills](https://github.com/CloudAI-X/threejs-skills) — 10 skill files covering fundamentals, geometry, materials, lighting, textures, animation, loaders, shaders, post-processing, and interaction.
