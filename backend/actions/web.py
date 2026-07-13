import webbrowser
from duckduckgo_search import DDGS

def open_website(url_or_name: str) -> str:
    domains = {
        "google": "https://www.google.com",
        "youtube": "https://www.youtube.com",
        "wikipedia": "https://www.wikipedia.org",
        "chatgpt": "https://chatgpt.com",
        "github": "https://github.com",
        "spotify": "https://open.spotify.com"
    }
    
    url_or_name = url_or_name.lower().strip()
    url = domains.get(url_or_name)
    
    if not url:
        if "." not in url_or_name:
            url = f"https://www.{url_or_name}.com"
        else:
            url = url_or_name if url_or_name.startswith("http") else f"https://{url_or_name}"
            
    webbrowser.open(url)
    return f"Opened {url_or_name}."

def search_web(query: str, num_results: int = 3) -> str:
    try:
        results = []
        with DDGS() as ddgs:
            for r in ddgs.text(query, max_results=num_results):
                results.append(f"Title: {r.get('title')}\nInfo: {r.get('body')}")
        
        if not results:
            return "No information found."
        
        return "\n\n".join(results)
    except Exception as e:
        return f"Web search failed: {str(e)}"
