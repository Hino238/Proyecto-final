import socket
import serial
import time
import re

SERIAL_PORT = "/dev/ttyACM0"
BAUDRATE    = 9600
HOST = "0.0.0.0"
PORT = 5001

def es_comando_valido(cmd):
    if cmd == "GET_SENSORS": 
        return True
    
    
    if re.match(r"^S:(\d{1,3},){5}\d{1,3}$", cmd):
        try:
            valores = [int(x) for x in cmd.split(":")[1].split(",")]
           
            return all(0 <= val <= 180 for val in valores)
        except ValueError:
            return False
    return False

def main():
    try:
        ser = serial.Serial(SERIAL_PORT, BAUDRATE, timeout=1)
        print(f"Conectado a Arduino en {SERIAL_PORT}")
        time.sleep(2) 
    except Exception as e:
        print(f"Error abriendo Serial: {e}")
        return

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        s.bind((HOST, PORT))
        s.listen(1)
        print(f"Servidor TCP de 6 DOF escuchando en {HOST}:{PORT}...")

        while True:
            conn, addr = s.accept()
            with conn:
                data = conn.recv(1024)
                if not data: continue

                cmd = data.decode("utf-8", errors="ignore").strip().upper()
                if not es_comando_valido(cmd):
                    conn.sendall(b"ERR:CMD_INVALIDO\n")
                    continue

                
                ser.write((cmd + "\n").encode("utf-8"))
                ser.flush()

                
                resp = ser.readline().decode("utf-8", errors="ignore").strip()
                if not resp: 
                    resp = "ERR:TIMEOUT"

                conn.sendall((resp + "\n").encode("utf-8"))

if __name__ == "__main__":
    main()
