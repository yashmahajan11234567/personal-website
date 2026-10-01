# Project: Pixel Portfolio Game

## Overview
A personal portfolio website that behaves like a 2D pixel-art game. Visitors navigate through an interactive experience that showcases skills and projects through gameplay mechanics rather than conventional web pages.

## Core Concept
- **Hero**: Cinematic entry with "PERSONAL / PORTFOLIO" typography and pixel character
- **Transition**: Scroll-driven typography swap to "DATA ANALYST / DATA ENGINEER" (left) and "CLOUD / DEVOPS" (right)
- **Path Selection**: Choose between Data path (blue accent) or Cloud/DevOps path (orange accent)
- **Gameplay**: 2D pixel-art platformer using Phaser 3, with React for UI and GSAP for transitions
- **Data Path**: Industrial/data aesthetic → Skills stations → Pipe transition → Projects world
- **Cloud Path**: Floating clouds platformer → Skills clouds → Cloud travel → Projects world
- **Post-Game**: Shared Experience → Certifications → Contact sections

## Technology Stack
- **React + TypeScript** — Website shell, UI, content management
- **Phaser 3** — 2D game engine for playable worlds
- **GSAP** — Cinematic transitions, scroll animations, UI motion
- **Vite** — Build tool

## Architecture Principles
- Clean separation: React (website/UI) ↔ Phaser (gameplay) ↔ GSAP (cinematic)
- Single pixel character asset used throughout
- Monochrome base with restrained accent colors
- No 3D, no unnecessary libraries

## Locked Decisions
- Hero transition MUST match reference video exactly
- Typography style, spacing, proportions preserved
- Character and background stay fixed during transition
- Up Arrow and Space both jump
- Down Arrow / S enters pipes
- Data path built first as complete vertical slice
- Cloud path not implemented until Data path validated