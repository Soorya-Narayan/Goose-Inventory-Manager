import sys
import base64
import subprocess
import os

def print_base64_image(b64_data, printer_name="YXWL_Y50_SEZNIK", copies=1):
    if "," in b64_data:
        b64_data = b64_data.split(",", 1)[1]
    
    img_bytes = base64.b64decode(b64_data)
    tmp_path = f"/tmp/label_print_{os.getpid()}.png"
    
    with open(tmp_path, "wb") as f:
        f.write(img_bytes)
        
    cmd = ["lp", "-d", printer_name, "-n", str(copies), tmp_path]
    res = subprocess.run(cmd, capture_output=True, text=True)
    
    try:
        os.remove(tmp_path)
    except:
        pass
        
    return res.returncode == 0, res.stdout + res.stderr

if __name__ == "__main__":
    if len(sys.argv) > 1:
        with open(sys.argv[1], "r") as f:
            b64 = f.read()
        ok, out = print_base64_image(b64)
        print("Success:", ok, "Output:", out)
