package tr.edu.nobel.service;

import tr.edu.nobel.entity.PrivacyMode;

public interface PrivacyModeService {
    PrivacyMode currentMode();
    PrivacyMode updateMode(PrivacyMode mode);
}
