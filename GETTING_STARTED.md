# Getting Started (for beginners)

This is a plain-English walkthrough for anyone trying this tool for the first time — including if you've never used the Salesforce CLI before. If you're already comfortable with `sf` commands, the [README](README.md) Quick Start is faster.

---

## What this tool actually does

Normally, when you ask an AI coding assistant to build something in Salesforce ("add a custom object," "write a trigger"), it has no idea how *your* org does things — what naming style you use, whether you use trigger handlers, what your fields look like. So it guesses, and the guess is usually generic and wrong for your codebase.

This tool fixes that in two steps:

1. **"Forge" step** — it reads your actual Salesforce metadata (your real objects, Apex classes, flows, etc.) and writes up a set of "cheat sheets" that teach Claude your org's real patterns — naming conventions, what a trigger handler looks like here, how your flows are structured.
2. **"Create" step** — once those cheat sheets exist, you just ask Claude in plain English for what you want, and it builds it *matching your org's actual style* instead of textbook defaults.

There's also a third piece: a live connection to your org (via MCP) so Claude can double-check current org state, not just what was true the last time you ran the forge step.

---

## Step 1: Check you have the basics

You need either Node.js or Python installed (either works, you don't need both). Check in a terminal:
```bash
node --version
```
If that gives you a version number, you're set. If not, grab Node from [nodejs.org](https://nodejs.org) — it's the easier of the two options for this tool.

You do **not** need the Salesforce CLI yet. That only matters once you connect a real org (Step 3 below).

---

## Step 2: Try it with the demo — no Salesforce account needed

This is the best way to understand what the tool does before touching anything real. In the cloned repo folder:
```bash
node forge.js --demo
```
This uses sample metadata that's bundled in the repo (a pretend "Project" object, some Apex classes, a flow) instead of a real org. It'll create a `.claude/skills/` folder with a handful of `SKILL.md` files inside.

Now open Claude Code in this folder and try asking something like:
> "Create a trigger on the Contact object that follows our existing Apex patterns"

Claude will read those skill files and generate code matching the *sample* org's style. This step proves the tool works end-to-end before you invest any time learning Salesforce CLI.

---

## Step 3: When you're ready to connect your real Salesforce org

This is where "sf CLI" comes in. Quick plain-English primer:

- **Salesforce CLI (`sf`)** is a command-line tool Salesforce provides for talking to your org — logging in, pulling down metadata, deploying changes.
- An **"org"** just means a specific Salesforce environment (your company's, a free Developer Edition, a sandbox, etc.).
- An **"alias"** is just a short nickname you give that org so you don't have to type its full URL every time.

Steps:

1. **Install the CLI** (one-time):
   ```bash
   npm install --global @salesforce/cli
   ```
2. **Log in to your org** — this opens a browser window for you to authenticate:
   ```bash
   sf org login web --alias my-org
   ```
   ("my-org" is just a name you're picking for yourself — call it whatever you want.)
3. **Pull your org's metadata down** into this project's `src/` folder:
   ```bash
   sf project retrieve start --target-org my-org --output-dir src/
   ```
   This copies your real objects, Apex classes, flows, etc. onto your machine as files.
4. **Run the forge for real** (no `--demo` flag this time):
   ```bash
   node forge.js
   ```
   Now `.claude/skills/` gets rebuilt from *your actual org's* patterns instead of the sample data.
5. Go back to Claude Code and ask for what you need — it now mirrors your real org.

---

## Step 4 (optional, for later): live org access

There's a `.mcp.json` file in the repo that lets Claude query your live org directly (not just what was last pulled into `src/`) — useful for things like "does this field already exist?" without re-running the forge. To use it, update the org alias inside that file to match whatever alias you picked in Step 3 above.

---

## Recap

| Step | What it gives you | Salesforce knowledge needed |
|---|---|---|
| `node forge.js --demo` | Skills built from bundled sample data | None |
| Ask Claude to build something | See the tool work end-to-end | None |
| Install `sf` CLI + log in | Access to your real org | Basic |
| `sf project retrieve` + `node forge.js` | Skills built from *your* org's real patterns | Basic |
| `.mcp.json` | Claude can check live org state directly | Basic |

**Don't skip the demo.** It costs two minutes and means you'll understand what's happening before you deal with logging into a real org.
