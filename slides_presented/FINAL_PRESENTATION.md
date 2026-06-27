---
marp: true
theme: default
class: lead
---

# GUARD
**G**uidance for **U**ser **A**wareness, **R**easoning and **D**ependence

Human-AI Interaction 2025/2026 - Final Project Presentation
Option A - Design an AI-enabled interactive system

---

## Project Motivation

- **The Problem:** AI systems are powerful but fallible. Users often slip into "blind trust," accepting AI outputs without verification or critical thinking.
- **The Concept:** GUARD acts as a cognitive speed bump. It monitors user behavior and triggers lightweight interventions to break the cycle of over-reliance.
- **The Goal:** Foster a healthy human-AI collaboration where users maintain agency and actively reason about the information provided.

---

## System Design and Architecture

- **Front-End:** A conversational UI with a dynamic "Trust Panel" that visualizes the user's current engagement metrics in real-time.
- **Back-End:** A Flask server analyzing prompt depth and conversational patterns to calculate a running trust score.
- **Data Ecosystem:** 
  - *Collection:* Prompts, timing, follow-ups.
  - *Processing:* Heuristics determine if the user is passively accepting answers.
  - *Output:* Contextual nudges (e.g., "Keep Researching! AI can be wrong.") are injected into the interface.

---

## Short User Study

**Methodology:**
- 25 participants, ~5-minute interaction sessions.
- Observed interactions with GUARD, evaluating usability and intervention perception.

**Results:**
- **Effectiveness:** 40% increase in independent fact-checking behavior when interventions were triggered.
- **Usability:** The Trust Panel was highly praised for transparency.
- **Feedback:** 85% found the nudges helpful; 15% felt frequent interventions were slightly disruptive to their workflow.

---

## Reflection and Challenges

- **Defining Trust:** Quantifying "trust" and "cognitive depth" via simple heuristics is challenging. Short prompts aren't always a sign of blind trust.
- **Friction vs. Flow:** Finding the right balance between being helpful and being annoying. Too much friction causes users to abandon the system.
- **Future Improvements:** Using LLMs to semantically evaluate prompt depth rather than relying solely on structural heuristics.

---

## Demonstration

*(Please refer to the submitted demo video showcasing the GUARD prototype, the Trust Panel dynamics, and the intervention triggers in action!)*

---

## Thank You!

**Questions?**
