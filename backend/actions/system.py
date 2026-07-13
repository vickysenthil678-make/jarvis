import os
import subprocess
try:
    from pycaw.pycaw import AudioUtilities, IAudioEndpointVolume
    from ctypes import cast, POINTER
    from comtypes import CLSCTX_ALL
except ImportError:
    pass # In case not installed yet

def get_volume_interface():
    devices = AudioUtilities.GetSpeakers()
    interface = devices.Activate(IAudioEndpointVolume._iid_, CLSCTX_ALL, None)
    return cast(interface, POINTER(IAudioEndpointVolume))

def system_control(action: str) -> str:
    action = action.lower()
    try:
        if action == "volume_up":
            volume = get_volume_interface()
            current = volume.GetMasterVolumeLevelScalar()
            volume.SetMasterVolumeLevelScalar(min(1.0, current + 0.1), None)
            return "Volume increased."
        elif action == "volume_down":
            volume = get_volume_interface()
            current = volume.GetMasterVolumeLevelScalar()
            volume.SetMasterVolumeLevelScalar(max(0.0, current - 0.1), None)
            return "Volume decreased."
        elif action == "mute":
            volume = get_volume_interface()
            volume.SetMute(1, None)
            return "System muted."
        elif action == "unmute":
            volume = get_volume_interface()
            volume.SetMute(0, None)
            return "System unmuted."
        elif action == "shutdown":
            os.system("shutdown /s /t 5")
            return "Shutting down the system in 5 seconds."
        elif action == "restart":
            os.system("shutdown /r /t 5")
            return "Restarting the system in 5 seconds."
        elif action == "sleep":
            os.system("rundll32.exe powrprof.dll,SetSuspendState 0,1,0")
            return "System is going to sleep."
        elif action == "lock":
            os.system("rundll32.exe user32.dll,LockWorkStation")
            return "System locked."
        else:
            return f"Unknown system action: {action}"
    except Exception as e:
        return f"Failed to perform system action: {str(e)}"
