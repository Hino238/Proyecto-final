from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from werkzeug.security import check_password_hash
import socket

APP_USER = "cesar" 
APP_PW_HASH = "scrypt:32768:8:1$UaCu1keXD85tqtWd$61e6563a1051cb2ee343519fa34637af918b4f23614fae4eb569c9d187541b1fc88596e7515b782d44d586f9465044f5ae81d95f4b0aef994868de6dbe1dd9ba"      
SECRET_KEY = "REDES" 

TCP_HOST = "127.0.0.1"
TCP_PORT = 5001

app = Flask(__name__)
app.secret_key = SECRET_KEY

def is_logged_in():
    return session.get("logged_in") is True

def send_cmd(cmd: str) -> str:
    try:
        with socket.create_connection((TCP_HOST, TCP_PORT), timeout=3) as s:
            s.sendall((cmd + "\n").encode("utf-8"))
            return s.recv(1024).decode("utf-8", errors="ignore").strip()
    except Exception as e:
        return f"ERR:SOCKET_{e}"

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        user = request.form.get("username", "").strip()
        pw = request.form.get("password", "")
        if user == APP_USER and check_password_hash(APP_PW_HASH, pw):
            session["logged_in"] = True
            return redirect(url_for("index"))
        return render_template("login.html", error="Usuario o contraseña incorrectos")
    return render_template("login.html", error=None)

@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))

@app.route("/")
def index():
    if not is_logged_in():
        return redirect(url_for("login"))
    return render_template("index.html")

@app.post("/set_servos")
def set_servos():
    if not is_logged_in():
        return jsonify({"ok": False, "error": "No autorizado"}), 401

    data = request.get_json(silent=True) or {}
    
    try:
        
        default_angles = [90, 45, 180, 0, 135, 90]
        servos = [int(data.get(f"s{i}", default_angles[i-1])) for i in range(1, 7)]
        
        
        if not all(0 <= s <= 180 for s in servos):
            raise ValueError
    except:
        return jsonify({"ok": False, "error": "Ángulos inválidos (0-180)"}), 400

    # Trama
    cmd = f"S:{servos[0]},{servos[1]},{servos[2]},{servos[3]},{servos[4]},{servos[5]}"
    resp = send_cmd(cmd)
    
    return jsonify({"ok": not resp.startswith("ERR"), "cmd": cmd, "resp": resp})

@app.get("/get_data")
def get_data():
    if not is_logged_in():
        return jsonify({"ok": False, "error": "No autorizado"}), 401

    resp = send_cmd("GET_SENSORS")
    return jsonify({"ok": not resp.startswith("ERR"), "data": resp})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
