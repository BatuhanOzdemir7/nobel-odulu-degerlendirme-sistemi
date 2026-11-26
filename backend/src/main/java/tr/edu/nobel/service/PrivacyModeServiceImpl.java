package tr.edu.nobel.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tr.edu.nobel.entity.PrivacyMode;
import tr.edu.nobel.entity.SistemAyari;
import tr.edu.nobel.repository.SistemAyariRepository;
import java.time.Clock;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PrivacyModeServiceImpl implements PrivacyModeService {
    private static final String KEY = "GIZLILIK_MODU";
    private final SistemAyariRepository settings;
    private final Clock clock;

    @Override
    public PrivacyMode currentMode() {
        return PrivacyMode.valueOf(setting().getDeger());
    }

    @Override
    @Transactional
    public PrivacyMode updateMode(PrivacyMode mode) {
        setting().guncelle(mode.name(), LocalDateTime.now(clock));
        return mode;
    }

    private SistemAyari setting() {
        return settings.findById(KEY).orElseThrow(() -> new IllegalStateException("Gizlilik ayarı bulunamadı."));
    }
}
