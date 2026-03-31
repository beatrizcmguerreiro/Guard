# GUARD - **G**uidance for **U**ser **A**wareness, **R**easoning and **D**ependence
GUARD is an AI-powered interface that runs on top of a chatbot/LLM to analyze user interaction patterns and provide adaptive interventions aimed at reducing over-reliance and promoting critical engagement.

Developed as part of the Human-AI Interaction course, the project explores how users **build trust in AI** systems and how that trust can shift toward passive acceptance or “blind reliance.”

It **monitors** behavioral signals during interaction, such as question patterns, follow-up structure, and time-to-action to infer an approximate trust state ranging from low trust to potential over-reliance. When risky patterns are detected, the system intervenes with lightweight prompts designed to **re-engage the user’s reasoning process**.

## Core Functionality

### Interaction Tracking
- Captures patterns such as frequency of queries, follow-ups, and response latency to understand user behavior over time.
- Approximates the user’s level of trust based on interaction signals.

### Adaptive Interventions
- Triggers context-aware prompts when risk patterns emerge, including requests for verification, suggestions to consult external sources and explanations that expose uncertainty or alternative perspectives.

### Reasoning Support
- Encourages users to reflect, question outputs, and maintain decision-making agency.
