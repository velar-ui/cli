# Velar CLI

Velar CLI is a command-line tool for adding UI components to Laravel projects.

It delivers composable UI components built with **Blade**, **Alpine.js**, and **Tailwind CSS v4**.
Inspired by shadcn, Velar gives you the code, not a dependency.

---

## What Velar is

- A **code delivery tool** for Laravel UI components
- A way to **copy components into your project**
- A workflow that keeps **you in control of your code**

## What Velar is not

- Not a UI framework
- Not a runtime dependency
- Not an auto-updating system
- Not magic

Once components are added, they belong to your project.

---

## Requirements

Velar assumes a modern Laravel setup:

- Laravel
- Blade
- Alpine.js
- Tailwind CSS **v4 or higher**

Tailwind v3 is not supported.

---

## Usage

Velar can be executed without installation.

### Initialize Velar in a project

```bash
npx velar init
```

This command:

- checks your environment
- prepares the UI components directory

---

### Add a component

```bash
npx velar add button
```

Velar will:

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
npx velar list
```

---

## How updates work

Velar does **not** update your code automatically.

If a component changes in the registry and you want the new version:

- run `velar add <component>` again
- review the changes
- decide what to keep

This is intentional.

---

## Philosophy

Velar follows a simple principle:

> You own your UI code.

There are no hidden abstractions and no vendor lock-in.
Velar exists to help you move faster, not to take control away from you.

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
