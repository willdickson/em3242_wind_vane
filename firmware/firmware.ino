const uint16_t AinPin = A1;
const uint16_t AinReadResolution = 16;
const uint16_t AinMaxValue = uint16_t((uint32_t(1) << AinReadResolution) -1);
const uint32_t LoopDelayDt_ms = 50;



float ain_to_degree(uint16_t ain)
{
    float v0 = 0.1;
    float v1 = 0.9;
    float A = 360.0/(v1-v0);
    float B = -v0*A;
    return A*(float(ain)/float(AinMaxValue)) + B;
}


void setup() 
{
    Serial.begin(115200);
    analogReadResolution(16);
    analogReadAveraging(16);
}


void loop() 
{
    static bool sending = false;

    while (Serial.available() > 0)
    {
        uint8_t cmd = Serial.read();

        switch (cmd) 
        {
            case 'b':
                sending = true;
                break;

            case 'e':
                sending = false;
                break;
        }
    }

    uint16_t ain = analogRead(AinPin);
    float angle = ain_to_degree(ain);
    if (sending) 
    {
        Serial.println(angle);
    }
    delay(LoopDelayDt_ms);
}


