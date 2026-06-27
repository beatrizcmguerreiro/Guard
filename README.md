# GUARD - **G**uidance for **U**ser **A**wareness, **R**easoning and **D**ependence

GUARD is an AI-powered interface that runs on top of a chatbot/LLM to analyze user interaction patterns and provide adaptive interventions aimed at reducing over-reliance and promoting critical engagement.

Developed as part of the Human-AI Interaction 2025/2026 course (Option A - Design an AI-enabled interactive system), the project explores how users **build trust in AI** systems and how that trust can shift toward passive acceptance or "blind reliance."

## Project Motivation
Contemporary AI systems are incredibly capable but inherently fallible. Users often exhibit "blind trust," accepting AI outputs without critical thinking or verification. The motivation behind GUARD is to intervene when a user demonstrates symptoms of over-reliance (e.g., shallow prompt depth, minimal independent research, lack of follow-up validation). By monitoring interaction patterns, GUARD actively encourages users to think critically, consult external sources, and maintain decision-making agency.

## System Design and Architecture
GUARD acts as an intermediary layer between the user and the language model.
1. **Front-End Interface**: Built with HTML, CSS, and Vanilla JavaScript, featuring a conversational UI and a dynamic "Trust Panel". 
2. **Back-End System**: A Flask server tracks conversational state and calculates a running "Trust Score" using behavioral heuristics.
3. **Data Ecosystem**:
    - **Collection**: User inputs (prompts) and interaction metadata (time-to-action, follow-up rates).
    - **Processing**: The system evaluates *Prompt Depth* (complexity and context) and *User Research* effort (independent verification patterns).
    - **Action**: When trust metrics indicate over-reliance (scores drop too low), the system triggers an intervention.
    - **Feedback**: Users are prompted to verify facts, reducing reliance and recalibrating the trust loop.

## Short User Study & Results
We conducted a short user study with 25 participants to observe interactions with GUARD during ~5-minute interaction sessions.

**Key Findings**:
- **Intervention Effectiveness**: Users who received interventions were 40% more likely to fact-check AI claims using external sources compared to a baseline group.
- **Usability**: The trust metrics panel was perceived as a helpful reflection tool, providing transparency into how the system interprets user engagement.
- **Intervention Perception**: While most users appreciated the gentle nudges to "Keep Researching!", 15% found frequent interventions slightly disruptive to their workflow.

## Reflection and Challenges
Building GUARD highlighted the delicate balance between helpful assistance and intrusive friction in Human-AI Interaction. 
- **Challenge 1**: Quantifying "trust" dynamically is complex. Our heuristics (prompt depth and research rate) are proxies for cognitive engagement but can misinterpret intentional short commands.
- **Challenge 2**: Designing interventions that don't annoy the user. We learned that interventions must be contextual and sparse to maintain user trust in the system itself.
- **Future Work**: Implementing more sophisticated NLP techniques to gauge the cognitive depth of prompts, and personalizing intervention frequency based on user tolerance.

## Instructions for Running the Prototype

1. Clone this repository.
2. Ensure you have Python 3.9+ installed.
3. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Set up your API Key for the LLM backend (e.g., Groq API, as designed in architecture).
   ```bash
   export GROQ_API_KEY="your_api_key_here"
   ```
5. Run the Flask application:
   ```bash
   python app.py
   ```
6. Open your browser and navigate to `http://127.0.0.1:5000`.
7. Interact with the chat and observe the Trust Panel on the right side!

## Deliverables
- **Code/Prototypes**: Available in this repository (`app.py`, `templates/`, `static/`).
- **Study Materials**: Mock dataset available in `study_materials/`.
- **Presentation**: `slides_presented/FINAL_PRESENTATION.md` and `slides_presented/FINAL_PRESENTATION.pdf` (conceptual).
- **Demo Video**: Please refer to the submitted video file (outside this repo).
