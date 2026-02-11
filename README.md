# Velyx CLI

Velyx CLI is a command-line tool for adding UI components to Laravel projects.

It delivers composable UI components built with **Blade**, **Alpine.js**, and **Tailwind CSS v4**.
Inspired by shadcn, Velyx gives you the code, not a dependency.

---

## What Velyx is

- A **code delivery tool** for Laravel UI components
- A way to **copy components into your project**
- A workflow that keeps **you in control of your code**

## What Velyx is not

- Not a UI framework
- Not a runtime dependency
- Not an auto-updating system
- Not magic

Once components are added, they belong to your project.

---

## Requirements

Velyx assumes a modern Laravel setup:

- Laravel
- Blade
- Alpine.js
- Tailwind CSS **v4 or higher**

Tailwind v3 is not supported.

---

## Usage

Velyx can be executed without installation.

### Initialize Velyx in a project

```bash
npx velyx init
```

This command:

- checks your environment
- prepares the UI components directory

---

### Add a component

```bash
npx velyx add button
```

Velyx will:

- fetch the component from the registry
- resolve its dependencies
- copy the files into your project

By default, components are placed in:

```bash
resources/views/components/ui
```

---

### List available components

```bash
npx velyx list
```

---

## How updates work

Velyx does **not** update your code automatically.

If a component changes in the registry and you want the new version:

- run `velyx add <component>` again
- review the changes
- decide what to keep

This is intentional.

---

## Philosophy

Velyx follows a simple principle:

> You own your UI code.

There are no hidden abstractions and no vendor lock-in.
Velyx exists to help you move faster, not to take control away from you.

---

## Documentation

Full documentation lives in the `docs` repository:

- Introduction
- Getting started
- Component reference
- Project philosophy

---

## License

MIT
