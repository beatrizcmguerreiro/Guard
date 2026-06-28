import os
from groq import Groq

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

user_message = "can you give me more sources"

completion = client.chat.completions.create(
    model="llama3-8b-8192",
    messages=[
        {"role": "system", "content": "You are an intent classifier. Categorize the user's message into EXACTLY ONE of the following categories:\n1. BLIND_COMMAND: The user is asking for an answer or action without wanting explanations (e.g. 'just do it', 'only the code', 'no explanation').\n2. VERIFICATION_REQUEST: The user is asking for sources, proof, references, or fact-checking the AI.\n3. FOLLOW_UP_QUESTION: The user is asking a genuine question to learn more (e.g. 'how does that work?', 'why?', 'can you explain?').\n4. STATEMENT: The user is just making a statement, providing context, or issuing a normal instruction that doesn't fit the above.\n\nReply ONLY with the exact category name."},
        {"role": "user", "content": user_message}
    ],
    max_tokens=10,
    temperature=0,
)
intent = completion.choices[0].message.content.strip().upper()
print(f"INTENT: {intent}")
