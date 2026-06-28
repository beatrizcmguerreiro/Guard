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




def calculate_trust_score(td):
    # This just returns the stateful scores now. The logic is handled per-event.
    r = td.get("current_research_score", 50)
    d = td.get("current_depth_score", 50)
    return r, d

def should_intervene(td, settings):
    strictness = settings.get("strictness", 50) if settings else 50
    # Map strictness [20, 90] to thresholds
    # If 50: r < 35. If 90: r < 63. If 20: r < 14
    threshold_r = (strictness / 100.0) * 70
    threshold_d = (strictness / 100.0) * 50
    interval = max(3, 12 - int(strictness / 10)) # if 50 -> 7, 90 -> 3, 20 -> 10

    r, d = calculate_trust_score(td)
    if r < threshold_r or d < threshold_d:
        return True
    if td["total_messages"] > 0 and td["total_messages"] % interval == 0:
        return True
    return False

def get_intervention_message(td, settings):
    strictness = settings.get("strictness", 50) if settings else 50
    threshold_r = (strictness / 100.0) * 70
    threshold_d = (strictness / 100.0) * 50

    r, d = calculate_trust_score(td)
    if r < threshold_r:
        return "You haven't asked follow-up questions recently so consider verifying this with another source."
    if d < threshold_d:
        return "Try asking a more specific or detailed question to get a deeper and better answer."
    return "Remember: AI can be wrong. Consider double-checking key facts before acting on them."

def get_sources_suggestion(user_message):
    msg = user_message.lower()
    if any(w in msg for w in ["health", "medical", "symptom", "disease", "drug"]):
        return ["<a href='https://www.who.int' target='_blank' onclick='trackLinkClick()'>WHO</a>", "<a href='https://pubmed.ncbi.nlm.nih.gov' target='_blank' onclick='trackLinkClick()'>PubMed</a>", "<a href='https://www.mayoclinic.org' target='_blank' onclick='trackLinkClick()'>Mayo Clinic</a>"]
    elif any(w in msg for w in ["news", "politic", "election", "government", "war"]):
        return ["<a href='https://www.reuters.com' target='_blank' onclick='trackLinkClick()'>Reuters</a>", "<a href='https://apnews.com' target='_blank' onclick='trackLinkClick()'>Associated Press</a>", "<a href='https://www.bbc.com' target='_blank' onclick='trackLinkClick()'>BBC</a>"]
    elif any(w in msg for w in ["science", "research", "study", "data", "climate"]):
        return ["<a href='https://scholar.google.com' target='_blank' onclick='trackLinkClick()'>Google Scholar</a>", "<a href='https://www.nature.com' target='_blank' onclick='trackLinkClick()'>Nature</a>", "<a href='https://arxiv.org' target='_blank' onclick='trackLinkClick()'>arXiv</a>"]
    elif any(w in msg for w in ["law", "legal", "rights", "court", "regulation"]):
        return ["Official legislation portals", "Legal aid organizations", "Bar association resources"]
    else:
        return ["<a href='https://en.wikipedia.org' target='_blank' onclick='trackLinkClick()'>Wikipedia</a>", "<a href='https://scholar.google.com' target='_blank' onclick='trackLinkClick()'>Google Scholar</a>"]

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat():
    data = request.json
    td = data.get("trust_data")
    if not td:
        td = {
            "last_message_time": None,
            "fast_actions": 0,
            "no_followup_streak": 0,
            "prompt_variety": [],
            "total_messages": 0,
            "links_clicked": 0,
            "blind_commands": 0,
            "current_research_score": 50,
            "current_depth_score": 50,
        }

    data = request.json
    user_message = data.get("message", "").strip()
    chat_history = data.get("history", [])

    if not user_message:
        return jsonify({"error": "Empty message"}), 400

    now = time.time()
    td["prompt_variety"].append(len(user_message.split()))
    td["total_messages"] += 1

    delta_r = 0
    if td["last_message_time"]:
        time_taken = now - td["last_message_time"]
        
        if time_taken < 4:
            delta_r -= 10
            
        if chat_history and chat_history[-1].get("role") == "assistant":
            last_ai_msg = chat_history[-1].get("content", "")
            word_count = len(last_ai_msg.split())
            expected_read_time = word_count / 4.0
            
            if time_taken < max(3, expected_read_time * 0.3):
                delta_r -= 15
            elif time_taken >= expected_read_time * 0.8 and time_taken < expected_read_time * 5:
                delta_r += 5

    blind_phrases = ["just do it", "do this", "no explanation", "without explanation", "only the answer", "don't explain"]
    if any(p in user_message.lower() for p in blind_phrases):
        delta_r -= 20

    question_words = ["what", "why", "how", "when", "who", "where", "?", "can you", "could you", "is it", "are there"]
    if any(w in user_message.lower() for w in question_words):
        td["no_followup_streak"] = 0
        delta_r += 5
    else:
        td["no_followup_streak"] += 1
        delta_r -= 5

    td["current_research_score"] = max(10, min(100, td.get("current_research_score", 50) + delta_r))

    recent_prompts = td["prompt_variety"][-4:] if td["prompt_variety"] else []
    if recent_prompts:
        avg_words = sum(recent_prompts) / len(recent_prompts)
        target_depth = min(100, int((avg_words / 20.0) * 100))
        if len(set(recent_prompts)) == 1 and avg_words < 5:
            target_depth -= 30
        target_depth = max(10, min(100, target_depth))
        # Move smoothly towards target
        td["current_depth_score"] = int(td.get("current_depth_score", 50) * 0.7 + target_depth * 0.3)

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

    settings = data.get("settings", {"strictness": 50})
    td["last_message_time"] = time.time()
    research_score, depth_score = calculate_trust_score(td)
    intervene = should_intervene(td, settings)
    intervention_msg = get_intervention_message(td, settings) if intervene else None
    sources = get_sources_suggestion(user_message) if intervene or research_score < 50 else []

    is_locked = False
    if (research_score + depth_score) / 2 < 20:
        is_locked = True

    return jsonify({
        "response": ai_response,
        "trust": {
            "research_score": research_score,
            "depth_score": depth_score,
            "intervene": intervene,
            "intervention_message": intervention_msg,
            "sources": sources,
            "keep_researching": research_score < 60,
            "locked": is_locked
        },
        "trust_data": td
    })

@app.route("/update_trust", methods=["POST"])
def update_trust():
    data = request.json
    td = data.get("trust_data")
    if not td:
        return jsonify({"error": "No trust data"}), 400
    
    settings = data.get("settings", {"strictness": 50})
    td["links_clicked"] = td.get("links_clicked", 0) + 1
    td["current_research_score"] = max(10, min(100, td.get("current_research_score", 50) + 20))
    research_score, depth_score = calculate_trust_score(td)
    intervene = should_intervene(td, settings)
    intervention_msg = get_intervention_message(td, settings) if intervene else None
    
    is_locked = False
    if (research_score + depth_score) / 2 < 20:
        is_locked = True
        
    return jsonify({
        "trust": {
            "research_score": research_score,
            "depth_score": depth_score,
            "intervene": intervene,
            "intervention_message": intervention_msg,
            "locked": is_locked
        },
        "trust_data": td
    })

@app.route("/reset", methods=["POST"])
def reset():
    session.clear()
    return jsonify({"ok": True})

if __name__ == "__main__":
    app.run(debug=True, port=5000)
