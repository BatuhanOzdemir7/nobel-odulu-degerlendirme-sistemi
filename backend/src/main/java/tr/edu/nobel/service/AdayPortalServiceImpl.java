package tr.edu.nobel.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tr.edu.nobel.dto.response.AdayOzetResponse;
import tr.edu.nobel.dto.response.DegerlendirmeResponse;
import tr.edu.nobel.entity.PrivacyMode;
import tr.edu.nobel.exception.ResourceNotFoundException;
import tr.edu.nobel.mapper.PortalMapper;
import tr.edu.nobel.repository.AdayGostermeRepository;
import tr.edu.nobel.repository.AdayRepository;
import tr.edu.nobel.repository.DegerlendirmeRepository;
import tr.edu.nobel.security.CurrentUserPrincipal;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdayPortalServiceImpl implements AdayPortalService {
    private final AdayRepository candidates;
    private final AdayGostermeRepository nominations;
    private final DegerlendirmeRepository evaluations;
    private final PrivacyModeService privacy;
    private final AdayViewMasker masker;

    @Override
    public AdayOzetResponse summary(CurrentUserPrincipal principal) {
        Long adayId = principal.adayId();
        if (adayId == null) throw new AccessDeniedException("Aday hesabı gerekli.");
        var candidate = candidates.findById(adayId).orElseThrow(() -> new ResourceNotFoundException("Aday bulunamadı."));
        var mode = privacy.currentMode();
        var rows = nominations.findDetailsByAdayId(adayId).stream().map(PortalMapper::nomination).toList();
        List<DegerlendirmeResponse> decisions = mode == PrivacyMode.SEFFAF ? evaluations.findPortalResults(adayId) : List.of();
        return masker.mask(new AdayOzetResponse(PortalMapper.candidate(candidate), rows, decisions, mode));
    }
}
