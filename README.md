# **NEURA — Map-Centric Multi-Agent AI Platform**

NEURA is a **map-centric, multi-agent AI system** designed to understand real-world context and take meaningful actions through tool calls.  
Built for geospatial reasoning, dynamic map updates, and persistent long-term intelligence.

---

## 🚀 Overview

NEURA goes beyond traditional chat UIs by grounding AI in a custom **interactive map engine**.  
The system automatically adjusts the map, calculates routes, drops markers, retrieves coordinates, and performs geospatial tasks in real time — all powered by a multi-agent decision pipeline.

---

## 🧠 Core Concepts

### **Map-Centric Intelligence**

NEURA’s AI interacts directly with the map:

- Auto-adjusts viewports
- Plots markers & routes
- Performs geocoding & reverse geocoding

### **Multi-Agent Decision Pipeline**

A planner → reasoner → executor flow enabling:

- Flow planning (Orchestrator agent)
- Intent interpretation (Context agent)
- Tool selection & data fetch (Data agent)
- Complex spatial reasoning (Reasoning agent)
- Deterministic geospatial actions (Action agent)

### **Tool Calling System**

NEURA executes real backend tools:

- `geocoding`
- `reverseGeocoding`
- `routing`
- `trafficFetch`
- `updateMarkers`
- `setMapView`
- `updateRoutes`

All actions instantly update the live map UI.

---

## 🏗️ Tech Stack

- **Next.js (App Router)** — full-stack runtime
- **OpenAI Supermemory** — long-term user context
- **Clerk** — authentication & user identity
- **Svix** — secure verified webhooks
- **Neon DB** — serverless Postgres
- **Prisma** — typed ORM & schema management
- **React Leaflet** — interactive mapping

---

## 🧩 Architecture (Conceptual)

```text
User → Orchestrator → Context → Data → Reasoning → Action → UI
                                 ↓
                         Supermemory / Database

```

## 🌍 Why NEURA?

- Geospatially aware AI
- Zero-hallucination, tool-driven actions
- Persistent memory across sessions
- Real-time map interaction
- Modular multi-agent pipeline
- Production-grade security & infra

---

## Setup

1.  **Clone the repo**

    ```bash
    git clone https://github.com/DarrylMathias/neura.git
    cd neura
    ```

2.  Install dependencies

    ```bash
    pnpm install
    ```

3.  Generate Prisma Client

    ```bash
    pnpx prisma generate
    ```

4. Run script

    ```bash
    pnpm dev
    ```
