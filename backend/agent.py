import os
import json
import re
from datetime import datetime
import google.generativeai as genai
from dotenv import load_dotenv

from actions.system import system_control
from actions.apps import open_app, close_app
from actions.files import manage_file
from actions.web import open_website, search_web

load_dotenv()

model = None

# ── Initialise Gemini ─────────────────────────────────────────
def init_model():
    global model
    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key or api_key == "YOUR_GEMINI_API_KEY_HERE":
        print("[JARVIS] WARNING: No Gemini API key set — running in offline mode.")
        return

    try:
        genai.configure(api_key=api_key)
        # gemini-pro is compatible with google-generativeai 0.3.x
        model = genai.GenerativeModel(model_name="gemini-pro")
        print("[JARVIS] Gemini model initialised ✓")
    except Exception as e:
        print(f"[JARVIS] Failed to init Gemini: {e}")
        model = None


# ── Intent Classification via LLM ────────────────────────────
INTENT_PROMPT = """You are the backend brain of JARVIS, an AI voice assistant.
A user issued this voice command: "{command}"

Classify the intent and extract arguments. Reply with a SINGLE JSON object, no markdown, no explanation.

Valid intents and their args:
  "open_app"      -> {{ "intent": "open_app",      "app": "<name>" }}
  "close_app"     -> {{ "intent": "close_app",     "app": "<name>" }}
  "open_website"  -> {{ "intent": "open_website",  "site": "<name or url>" }}
  "web_search"    -> {{ "intent": "web_search",    "query": "<search query>" }}
  "system"        -> {{ "intent": "system",        "action": "volume_up|volume_down|mute|unmute|shutdown|restart|sleep|lock" }}
  "create_folder" -> {{ "intent": "create_folder", "name": "<folder name>" }}
  "create_file"   -> {{ "intent": "create_file",   "name": "<file name>" }}
  "delete_file"   -> {{ "intent": "delete_file",   "path": "<file path>" }}
  "time"          -> {{ "intent": "time" }}
  "date"          -> {{ "intent": "date" }}
  "chat"          -> {{ "intent": "chat",           "message": "<full message>" }}

Examples:
  "open chrome"        -> {{"intent":"open_app","app":"chrome"}}
  "search quantum AI"  -> {{"intent":"web_search","query":"quantum AI"}}
  "what time is it"    -> {{"intent":"time"}}
  "tell me about Elon" -> {{"intent":"web_search","query":"Elon Musk"}}
  "volume up"          -> {{"intent":"system","action":"volume_up"}}

JSON only:"""


async def process_command(text: str) -> str:
    global model
    if model is None:
        init_model()

    # ── Offline fallback ───────────────────────────────────────
    if model is None:
        return _offline_handler(text)

    # ── Ask LLM to classify intent ─────────────────────────────
    try:
        prompt = INTENT_PROMPT.format(command=text)
        response = model.generate_content(prompt)
        raw = response.text.strip()

        # Strip any accidental markdown fences
        raw = re.sub(r"^```[a-z]*\n?", "", raw).strip().rstrip("```").strip()

        intent_data = json.loads(raw)
        return await _dispatch(intent_data, text)

    except json.JSONDecodeError as e:
        print(f"[JARVIS] JSON parse error: {e} | raw: {raw}")
        # Fall through to general chat
        return await _chat_response(text)
    except Exception as e:
        print(f"[JARVIS] LLM error: {e}")
        return f"I encountered an error, sir: {str(e)}"


# ── Dispatch intent to action ─────────────────────────────────
async def _dispatch(data: dict, original: str) -> str:
    intent = data.get("intent", "chat")

    if intent == "open_app":
        return open_app(data.get("app", ""))

    elif intent == "close_app":
        return close_app(data.get("app", ""))

    elif intent == "open_website":
        return open_website(data.get("site", "google"))

    elif intent == "web_search":
        query = data.get("query", original)
        results = search_web(query, num_results=4)
        # Ask LLM to summarise the search results
        return await _summarise(query, results)

    elif intent == "system":
        action = data.get("action", "")
        if action in ("shutdown", "restart"):
            return f"Confirmation required. Say 'Jarvis, confirm {action}' to proceed."
        return system_control(action)

    elif intent == "create_folder":
        import os
        folder_name = data.get("name", "NewFolder")
        path = os.path.join(os.path.expanduser("~"), "Desktop", folder_name)
        return manage_file("create_folder", path)

    elif intent == "create_file":
        import os
        file_name = data.get("name", "new_file.txt")
        path = os.path.join(os.path.expanduser("~"), "Desktop", file_name)
        return manage_file("create_file", path)

    elif intent == "delete_file":
        path = data.get("path", "")
        return manage_file("delete_file", path)

    elif intent == "time":
        now = datetime.now()
        return f"The current time is {now.strftime('%I:%M %p')}, sir."

    elif intent == "date":
        now = datetime.now()
        return f"Today is {now.strftime('%A, %B %d, %Y')}, sir."

    elif intent == "chat":
        return await _chat_response(data.get("message", original))

    else:
        return await _chat_response(original)


# ── General LLM Chat ──────────────────────────────────────────
async def _chat_response(message: str) -> str:
    try:
        prompt = (
            "You are JARVIS, an intelligent AI assistant inspired by Iron Man. "
            "Reply in 1-3 sentences, no markdown, no bullet points. Be concise, witty, and professional.\n\n"
            f"User: {message}\nJARVIS:"
        )
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        return f"I could not process that, sir: {str(e)}"


# ── Summarise web search results ──────────────────────────────
async def _summarise(query: str, results: str) -> str:
    try:
        prompt = (
            f"You are JARVIS. Summarise the following web search results for the query '{query}' "
            f"in 2-4 sentences, spoken naturally. No markdown, no bullet points.\n\n"
            f"Search Results:\n{results}\n\nJARVIS summary:"
        )
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        # Return raw results if summarisation fails
        return results[:500]


# ── Offline handler ───────────────────────────────────────────
def _offline_handler(text: str) -> str:
    lower = text.lower()

    if "time" in lower:
        return f"The time is {datetime.now().strftime('%I:%M %p')}, sir."
    if "date" in lower:
        return f"Today is {datetime.now().strftime('%A, %B %d, %Y')}, sir."
    if "open" in lower and "chrome" in lower:
        open_app("chrome")
        return "Opening Chrome, sir."
    if "open" in lower and "notepad" in lower:
        open_app("notepad")
        return "Opening Notepad, sir."
    if "volume up" in lower:
        return system_control("volume_up")
    if "volume down" in lower:
        return system_control("volume_down")
    if "mute" in lower:
        return system_control("mute")

    return (
        "I am operating in offline mode, sir. "
        "Please add your Gemini API key in the backend .env file for full functionality."
    )
