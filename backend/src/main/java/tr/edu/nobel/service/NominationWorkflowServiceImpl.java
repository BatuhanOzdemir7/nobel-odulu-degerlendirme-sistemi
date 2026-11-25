package tr.edu.nobel.service;

import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tr.edu.nobel.dto.request.AdayGostermeRequest;
import tr.edu.nobel.dto.response.*;
import tr.edu.nobel.entity.*;
import tr.edu.nobel.event.NominationRecorded;
import tr.edu.nobel.exception.*;
import tr.edu.nobel.mapper.PortalMapper;
import tr.edu.nobel.repository.*;
import tr.edu.nobel.security.CurrentUserPrincipal;

import java.time.Clock;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NominationWorkflowServiceImpl implements NominationWorkflowService {
    private static final String DUPLICATE = "Bu aday, kuruluşunuz tarafından aynı ödüle zaten aday gösterildi.";

    private final KurulusRepository organizations;
    private final AdayRepository candidates;
    private final OdulRepository awards;
    private final KategoriRepository categories;
    private final AdayGostermeRepository nominations;
    private final CandidateAccountProvisioner accounts;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    @Override
    public List<OdulSecenekResponse> awards() {
        return awards.findPortalOptions();
    }

    @Override
    public List<AdayAramaResponse> search(String query) {
        String normalized = query.strip().toLowerCase(Locale.ROOT).replace("i\u0307", "i")
                .replace('ı', 'i').replace('ç', 'c').replace('ğ', 'g')
                .replace('ö', 'o').replace('ş', 's').replace('ü', 'u');
        if (normalized.codePointCount(0, normalized.length()) < 2) {
            throw new IllegalArgumentException("Arama için en az 2 karakter girin.");
        }
        return candidates.searchPortal(normalized).stream().map(PortalMapper::searchResult).toList();
    }

    @Override
    @Transactional
    public KurulusAdayGostermeResponse nominate(CurrentUserPrincipal principal, AdayGostermeRequest request) {
        Long organizationId = organizationId(principal);
        // V1 includes the timestamp in its uniqueness rule. Serialize portal writes for the same organization.
        Kurulus organization = organizations.findByIdForUpdate(organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Kuruluş bulunamadı."));
        Odul award = awards.findById(request.odulId()).orElseThrow(() -> new ResourceNotFoundException("Ödül bulunamadı."));
        Kategori category = categories.findById(award.getKategoriId()).orElseThrow();
        ZonedDateTime now = ZonedDateTime.now(clock);

        Aday candidate;
        YeniHesapResponse account = null;
        if (request.yeniAday() != null) {
            if (!request.yeniAday().dogumTarihi().isBefore(now.toLocalDate())) {
                throw new IllegalArgumentException("Doğum tarihi geçmiş bir gün olmalıdır.");
            }
            candidate = candidates.save(PortalMapper.newCandidate(request.yeniAday()));
            account = accounts.create(candidate.getAdayId());
        } else {
            candidate = candidates.findById(request.mevcutAdayId())
                    .orElseThrow(() -> new ResourceNotFoundException("Aday bulunamadı."));
            if (nominations.existsByKurulusNoAndAdayIdAndOdulNo(organizationId, candidate.getAdayId(), award.getOdulNo())) {
                throw new BusinessRuleException(DUPLICATE);
            }
        }

        AdayGosterme nomination = new AdayGosterme();
        nomination.setKurulusNo(organizationId);
        nomination.setAdayId(candidate.getAdayId());
        nomination.setOdulNo(award.getOdulNo());
        nomination.setTarih(now.toLocalDate());
        nomination.setSaat(now.toLocalTime());
        try {
            nominations.saveAndFlush(nomination);
        } catch (DataIntegrityViolationException failure) {
            if (ConstraintViolationLookup.hasSqlState(failure, "23505")) throw new BusinessRuleException(DUPLICATE);
            throw failure;
        }

        var view = PortalMapper.nomination(nominations.findDetailsById(nomination.getAdayGostermeId()).orElseThrow());
        events.publishEvent(new NominationRecorded(organizationId, organization.getAd(), candidate.getAdayId(),
                PortalMapper.displayName(candidate), award.getOdulNo(), award.getAciklayiciAd(), category.getKategoriId(),
                category.getKategoriAdi(), account != null, now.toInstant()));
        return new KurulusAdayGostermeResponse(view, account);
    }

    @Override
    public List<AdayGostermeGorunumResponse> nominations(CurrentUserPrincipal principal) {
        return nominations.findDetailsByKurulusNo(organizationId(principal)).stream()
                .map(PortalMapper::nomination).toList();
    }

    private Long organizationId(CurrentUserPrincipal principal) {
        if (principal.kurulusNo() == null) throw new AccessDeniedException("Kuruluş hesabı gerekli.");
        return principal.kurulusNo();
    }
}
