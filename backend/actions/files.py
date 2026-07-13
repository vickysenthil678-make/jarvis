import os
import shutil

USER_DIR = os.path.expanduser("~")
DEFAULT_DIR = os.path.join(USER_DIR, "Desktop")

def manage_file(action: str, path: str, new_path: str = None) -> str:
    action = action.lower()
    
    if not os.path.isabs(path):
        path = os.path.join(DEFAULT_DIR, path)
        
    if new_path and not os.path.isabs(new_path):
        new_path = os.path.join(DEFAULT_DIR, new_path)

    try:
        if action == "create_folder":
            os.makedirs(path, exist_ok=True)
            return f"Created folder {os.path.basename(path)}."
        elif action == "create_file":
            with open(path, "w") as f:
                f.write("")
            return f"Created file {os.path.basename(path)}."
        elif action == "rename":
            if not new_path:
                return "New name is required."
            os.rename(path, new_path)
            return f"Renamed to {os.path.basename(new_path)}."
        elif action == "move":
            if not new_path:
                return "Destination is required."
            shutil.move(path, new_path)
            return f"Moved to {os.path.basename(new_path)}."
        elif action == "delete_folder":
            shutil.rmtree(path)
            return f"Deleted folder {os.path.basename(path)}."
        elif action == "delete_file":
            os.remove(path)
            return f"Deleted file {os.path.basename(path)}."
        else:
            return f"Unknown action: {action}"
    except Exception as e:
        return f"File operation failed: {str(e)}"
