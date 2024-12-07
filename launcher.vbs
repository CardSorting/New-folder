Set WshShell = CreateObject("WScript.Shell")

' Kill any existing Node processes silently
WshShell.Run "taskkill /F /IM node.exe", 0, True

' Wait a moment for cleanup
WScript.Sleep 1000

' Start the app with hidden console
WshShell.CurrentDirectory = "c:\Users\b\Desktop\New folder"
WshShell.Run "npm start", 0, False
