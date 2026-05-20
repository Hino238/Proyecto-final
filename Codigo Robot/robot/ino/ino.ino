#include <Servo.h>

Servo servos[6];
const int servoPins[6] = {3, 5, 6, 9, 10, 11}; 
const int currentPins[6] = {A0, A1, A2, A3, A4, A5}; 

// currentAngles
int currentAngles[6] = {90, 45, 180, 0, 135, 90};
// targetAngles
int targetAngles[6] = {90, 45, 180, 0, 135, 90};

unsigned long previousMillis = 0;
const long interval = 15;

void setup() {
  Serial.begin(9600);
  
  for (int i = 0; i < 6; i++) {
    servos[i].attach(servoPins[i]);
    if (i == 2) {
      servos[i].write(180 - currentAngles[i]); 
    } else {
      servos[i].write(currentAngles[i]);
    }
  }
}

void loop() {
  if (Serial.available() > 0) {
    String input = Serial.readStringUntil('\n');
    input.trim(); 

    if (input == "GET_SENSORS") {
      sendTelemetry();
    } else if (input.startsWith("S:")) {
      parseAndSetTargets(input);
    }
  }

  
  unsigned long currentMillis = millis();
  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;
    updateServosSuave();
  }
}

void parseAndSetTargets(String cmd) {
  cmd.remove(0, 2); 

  int startIdx = 0;
  for (int i = 0; i < 6; i++) {
    int commaIdx = cmd.indexOf(',', startIdx);
    String valStr = (commaIdx == -1) ? cmd.substring(startIdx) : cmd.substring(startIdx, commaIdx);
    
    int angle = valStr.toInt();
    
    if (angle >= 0 && angle <= 180) {
      targetAngles[i] = angle;
    }
    
    startIdx = commaIdx + 1;
    if (commaIdx == -1) break; 
  }
  
  Serial.println("OK:TARGETS_SET");
}

void updateServosSuave() {
  for (int i = 0; i < 6; i++) {
   
    if (currentAngles[i] < targetAngles[i]) {
      currentAngles[i]++;
    } else if (currentAngles[i] > targetAngles[i]) {
      currentAngles[i]--;
    } else {
      continue;
    }

    
    if (i == 2) {
      servos[i].write(180 - currentAngles[i]);
    } else {
      servos[i].write(currentAngles[i]);
    }
  }
}

void sendTelemetry() {
  String response = "";
  for (int i = 0; i < 6; i++) {
    int rawValue = analogRead(currentPins[i]);
    float voltage = (rawValue / 1023.0) * 5.0;
    float current = abs(voltage - 2.5) / 0.185; 

    
    response += "A" + String(i + 1) + ":" + String(currentAngles[i]) + "|C" + String(i + 1) + ":" + String(current, 2);
    
    if (i < 5) response += "|";
  }
  Serial.println(response);
}
