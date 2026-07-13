import os

def open_app(app_name: str) -> str:
    app_name = app_name.lower().strip()
    apps = {
        "chrome": "chrome.exe",
        "edge": "msedge.exe",
        "vs code": "code",
        "vscode": "code",
        "notepad": "notepad.exe",
        "calculator": "calc.exe",
        "file explorer": "explorer.exe",
        "spotify": "spotify.exe",
        "whatsapp": "whatsapp.exe",
        "telegram": "telegram.exe",
        "steam": "steam.exe"
    }
    
    cmd = apps.get(app_name, app_name)
    try:
        os.system(f"start {cmd}")
        return f"Opened {app_name}."
    except Exception as e:
        return f"Failed to open {app_name}: {str(e)}"

def close_app(app_name: str) -> str:
    app_name = app_name.lower().strip()
    apps = {
        "chrome": "chrome.exe",
        "edge": "msedge.exe",
        "vs code": "Code.exe",
        "vscode": "Code.exe",
        "notepad": "notepad.exe",
        "calculator": "CalculatorApp.exe",
        "spotify": "Spotify.exe",
        "whatsapp": "WhatsApp.exe",
        "telegram": "Telegram.exe",
        "steam": "steam.exe"
    }
    
    exe_name = apps.get(app_name, f"{app_name}.exe")
    try:
        os.system(f"taskkill /f /im {exe_name} /t")
        return f"Closed {app_name}."
    except Exception as e:
        return f"Failed to close {app_name}: {str(e)}"
