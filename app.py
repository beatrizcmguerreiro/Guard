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

def ensure_trust_lists(td):
    td.setdefault("last_message_time", None)
    td.setdefault("fast_actions", 0)
    td.setdefault("no_followup_streak", 0)
    td.setdefault("prompt_variety", [])
    td.setdefault("total_messages", 0)
    td.setdefault("score_reasons", [])
    td.setdefault("intervention_history", [])
    td.setdefault("intervention_types", [])
    td.setdefault("score_timeline", [])
    td.setdefault("user_corrections", [])
    td.setdefault("links_clicked", 0)
    td.setdefault("blind_commands", 0)
    td.setdefault("current_research_score", 50)
    td.setdefault("current_depth_score", 50)

def remember_score_reason(td, reason):
    ensure_trust_lists(td)
    if reason and reason not in td["score_reasons"]:
        td["score_reasons"].append(reason)
    td["score_reasons"] = td["score_reasons"][-5:]

def remember_intervention(td, label, kind=None):
    ensure_trust_lists(td)
    if label:
        td["intervention_history"].append(label)
    td["intervention_history"] = td["intervention_history"][-5:]
    if kind:
        td["intervention_types"].append(kind)
    td["intervention_types"] = td["intervention_types"][-8:]

def remember_timeline_point(td):
    ensure_trust_lists(td)
    research_score, depth_score = calculate_trust_score(td)
    td["score_timeline"].append({
        "message": td.get("total_messages", 0),
        "research": research_score,
        "depth": depth_score,
    })
    td["score_timeline"] = td["score_timeline"][-12:]

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
    ensure_trust_lists(td)

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
            remember_score_reason(td, "Reply sent very quickly")
            
        if chat_history and chat_history[-1].get("role") == "assistant":
            last_ai_msg = chat_history[-1].get("content", "")
            word_count = len(last_ai_msg.split())
            expected_read_time = word_count / 4.0
            
            if time_taken < max(3, expected_read_time * 0.3):
                delta_r -= 15
                remember_score_reason(td, "Little time spent reviewing the previous answer")
            elif time_taken >= expected_read_time * 0.8 and time_taken < expected_read_time * 5:
                delta_r += 5
                remember_score_reason(td, "User spent time reviewing the previous answer")

    blind_phrases = ["just do it", "do this", "no explanation", "without explanation", "only the answer", "don't explain"]
    if any(p in user_message.lower() for p in blind_phrases):
        delta_r -= 20
        td["blind_commands"] = td.get("blind_commands", 0) + 1
        remember_score_reason(td, "Blind-compliance phrase detected")

    question_words = ["what", "why", "how", "when", "who", "where", "?", "can you", "could you", "is it", "are there"]
    if any(w in user_message.lower() for w in question_words):
        td["no_followup_streak"] = 0
        delta_r += 5
        remember_score_reason(td, "Follow-up question detected")
    else:
        td["no_followup_streak"] += 1
        delta_r -= 5
        remember_score_reason(td, "No follow-up question detected")

    td["current_research_score"] = max(10, min(100, td.get("current_research_score", 50) + delta_r))

    recent_prompts = td["prompt_variety"][-4:] if td["prompt_variety"] else []
    if recent_prompts:
        avg_words = sum(recent_prompts) / len(recent_prompts)
        target_depth = min(100, int((avg_words / 20.0) * 100))
        if len(set(recent_prompts)) == 1 and avg_words < 5:
            target_depth -= 30
            remember_score_reason(td, "Repeated very short prompts")
        elif len(user_message.split()) < 5:
            remember_score_reason(td, "Prompt was very short")
        elif avg_words >= 12:
            remember_score_reason(td, "Prompt included useful context")
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
    if intervene:
        if intervention_msg and "specific" in intervention_msg:
            remember_intervention(td, "Suggested a deeper prompt", "reflection nudge")
        elif intervention_msg and "verifying" in intervention_msg:
            remember_intervention(td, "Asked user to verify", "verification nudge")
        else:
            remember_intervention(td, "Recommended checking key facts", "slow-down nudge")
    if sources:
        remember_intervention(td, "Recommended sources", "source nudge")

    is_locked = False
    if (research_score + depth_score) / 2 < 20:
        is_locked = True
    remember_timeline_point(td)

    return jsonify({
        "response": ai_response,
        "trust": {
            "research_score": research_score,
            "depth_score": depth_score,
            "intervene": intervene,
            "intervention_message": intervention_msg,
            "sources": sources,
            "keep_researching": research_score < 60,
            "locked": is_locked,
            "score_reasons": td.get("score_reasons", []),
            "intervention_history": td.get("intervention_history", []),
            "intervention_types": td.get("intervention_types", []),
            "score_timeline": td.get("score_timeline", []),
            "verification_actions": td.get("links_clicked", 0),
        },
        "trust_data": td
    })

@app.route("/update_trust", methods=["POST"])
def update_trust():
    data = request.json
    td = data.get("trust_data")
    if not td:
        return jsonify({"error": "No trust data"}), 400
    ensure_trust_lists(td)
    
    settings = data.get("settings", {"strictness": 50})
    td["links_clicked"] = td.get("links_clicked", 0) + 1
    td["current_research_score"] = max(10, min(100, td.get("current_research_score", 50) + 20))
    remember_score_reason(td, "User clicked a source")
    remember_intervention(td, "User followed a verification link", "verification nudge")
    research_score, depth_score = calculate_trust_score(td)
    intervene = should_intervene(td, settings)
    intervention_msg = get_intervention_message(td, settings) if intervene else None
    
    is_locked = False
    if (research_score + depth_score) / 2 < 20:
        is_locked = True
    remember_timeline_point(td)
        
    return jsonify({
        "trust": {
            "research_score": research_score,
            "depth_score": depth_score,
            "intervene": intervene,
            "intervention_message": intervention_msg,
            "locked": is_locked,
            "score_reasons": td.get("score_reasons", []),
            "intervention_history": td.get("intervention_history", []),
            "intervention_types": td.get("intervention_types", []),
            "score_timeline": td.get("score_timeline", []),
            "verification_actions": td.get("links_clicked", 0),
        },
        "trust_data": td
    })

@app.route("/correct_trust", methods=["POST"])
def correct_trust():
    data = request.json
    td = data.get("trust_data")
    if not td:
        return jsonify({"error": "No trust data"}), 400
    ensure_trust_lists(td)

    correction = data.get("correction", "User corrected the score")
    settings = data.get("settings", {"strictness": 50})
    td["current_research_score"] = max(10, min(100, td.get("current_research_score", 50) + 15))
    td["current_depth_score"] = max(10, min(100, td.get("current_depth_score", 50) + 5))
    td["user_corrections"].append({
        "message": td.get("total_messages", 0),
        "correction": correction,
    })
    td["user_corrections"] = td["user_corrections"][-5:]
    remember_score_reason(td, correction)
    remember_intervention(td, "User corrected GUARD's interpretation", "user correction")

    research_score, depth_score = calculate_trust_score(td)
    intervene = should_intervene(td, settings)
    intervention_msg = get_intervention_message(td, settings) if intervene else None
    is_locked = (research_score + depth_score) / 2 < 20
    remember_timeline_point(td)

    return jsonify({
        "trust": {
            "research_score": research_score,
            "depth_score": depth_score,
            "intervene": intervene,
            "intervention_message": intervention_msg,
            "locked": is_locked,
            "score_reasons": td.get("score_reasons", []),
            "intervention_history": td.get("intervention_history", []),
            "intervention_types": td.get("intervention_types", []),
            "score_timeline": td.get("score_timeline", []),
            "verification_actions": td.get("links_clicked", 0),
        },
        "trust_data": td
    })

@app.route("/reset", methods=["POST"])
def reset():
    session.clear()
    return jsonify({"ok": True})

if __name__ == "__main__":
    app.run(debug=True, port=5000)
