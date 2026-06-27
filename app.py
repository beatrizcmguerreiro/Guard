import os
import time
from flask import Flask, render_template, request, jsonify, session
from groq import Groq

app = Flask(__name__)
app.secret_key = "guard-secret-key-change-in-production"

#api's
import os
client = Groq(api_key=os.getenv("GROQ_API_KEY"))
MODEL = "llama-3.3-70b-versatile"  # ha outros tho

SYSTEM_PROMPT = """You are GUARD, an AI assistant designed to promote critical thinking 
and healthy skepticism. When answering:
1. Be helpful and informative, but acknowledge uncertainty when it exists.
2. When appropriate, suggest that the user verify important information.
3. Mention if information might be outdated or if sources would be helpful.
4. Encourage the user to think critically rather than blindly accepting your answer.
5. At the end of your response, ALWAYS include a "**Confidence Score: X%**" stating how confident you are in your answer, and a "**Recommended Verification Sources:**" section with 2-3 specific queries or links they can use to fact-check you.
Keep responses concise and conversational.""" # deviamos acrescentar que queremos algo em que o user use ai para ajudar e nao para fazer e tudo o que for parecido a fazer apenas deves er negado


def init_session():
    if "trust_data" not in session:
        session["trust_data"] = {
            "last_message_time": None,
            "fast_actions": 0,
            "no_followup_streak": 0,
            "prompt_variety": [],
            "total_messages": 0,
        }

def calculate_trust_score(td):
    total = td["total_messages"]
    if total == 0:
        return 50, 50

    research = 100
    if total > 0:
        fast_ratio = td["fast_actions"] / total
        research -= int(fast_ratio * 40)
    streak_penalty = min(td["no_followup_streak"] * 5, 60)
    research -= streak_penalty
    research = max(10, min(100, research))

    recent_prompts = td["prompt_variety"][-4:] if td["prompt_variety"] else []
    if recent_prompts:
        avg_words = sum(recent_prompts) / len(recent_prompts)
        depth = min(100, int((avg_words / 20.0) * 100))
        if len(set(recent_prompts)) == 1 and avg_words < 5:
            depth -= 30
    else:
        depth = 50
    depth = max(10, min(100, depth))

    return research, depth

def should_intervene(td):
    r, d = calculate_trust_score(td)
    if r < 35 or d < 25:
        return True
    if td["total_messages"] > 0 and td["total_messages"] % 7 == 0:
        return True
    return False

def get_intervention_message(td):
    r, d = calculate_trust_score(td)
    if r < 35:
        return "You haven't asked follow-up questions recently so consider verifying this with another source."
    if d < 25:
        return "Try asking a more specific or detailed question to get a deeper and better answer."
    return "Remember: AI can be wrong. Consider double-checking key facts before acting on them."

def get_sources_suggestion(user_message): # acrescentar mais e tbm podemos usar a api que temos para sugerir coisas asw
    msg = user_message.lower()
    if any(w in msg for w in ["health", "medical", "symptom", "disease", "drug"]):
        return ["WHO (who.int)", "PubMed (pubmed.ncbi.nlm.nih.gov)", "Mayo Clinic (mayoclinic.org)"]
    elif any(w in msg for w in ["news", "politic", "election", "government", "war"]):
        return ["Reuters (reuters.com)", "Associated Press (apnews.com)", "BBC (bbc.com)"]
    elif any(w in msg for w in ["science", "research", "study", "data", "climate"]):
        return ["Google Scholar (scholar.google.com)", "Nature (nature.com)", "arXiv (arxiv.org)"]
    elif any(w in msg for w in ["law", "legal", "rights", "court", "regulation"]):
        return ["Official legislation portals", "Legal aid organizations", "Bar association resources"]
    else:
        return ["Wikipedia (en.wikipedia.org)", "Google Scholar (scholar.google.com)", "Specific domain experts"]

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat():
    init_session()
    td = session["trust_data"]

    data = request.json
    user_message = data.get("message", "").strip()
    chat_history = data.get("history", [])

    if not user_message:
        return jsonify({"error": "Empty message"}), 400

    now = time.time()
    td["prompt_variety"].append(len(user_message.split()))
    td["total_messages"] += 1

    if td["last_message_time"] and (now - td["last_message_time"]) < 4:
        td["fast_actions"] += 1 # resposta demasiado rapida

    question_words = ["what", "why", "how", "when", "who", "where", "?", "can you", "could you", "is it", "are there"]
    if any(w in user_message.lower() for w in question_words):
        td["no_followup_streak"] = 0 # porque estao a fazer perguntas e interessados(confirmar redundancia com o what e outros casos)
    else:
        td["no_followup_streak"] += 1

    td["last_message_time"] = now

# call api definida em cima
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for msg in chat_history[-10:]:
        messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": user_message})

    try:
        completion = client.chat.completions.create(
            model=MODEL,
            messages=messages,
            max_tokens=1024,
            temperature=0.7, # podemos ajustar a temperatura o 0.7 e o default que o chatgpt usa por exemplo, podemos ter + halicinacoes e inventar com temp mais baixa e vice versa, so ns se compensa aumentar mais
        )
        ai_response = completion.choices[0].message.content
    except Exception as e:
        ai_response = f"Sorry, I encountered an error: {str(e)}. Please check your API key."

    research_score, depth_score = calculate_trust_score(td)
    intervene = should_intervene(td)
    intervention_msg = get_intervention_message(td) if intervene else None
    sources = get_sources_suggestion(user_message) if intervene or research_score < 50 else []

    session["trust_data"] = td
    session.modified = True

    return jsonify({ # para podermos apresentar neste formato
        "response": ai_response,
        "trust": {
            "research_score": research_score,
            "depth_score": depth_score,
            "intervene": intervene,
            "intervention_message": intervention_msg,
            "sources": sources,
            "keep_researching": research_score < 60,
        }
    })

@app.route("/reset", methods=["POST"])
def reset():
    session.clear()
    return jsonify({"ok": True})

if __name__ == "__main__":
    app.run(debug=True, port=5000)
