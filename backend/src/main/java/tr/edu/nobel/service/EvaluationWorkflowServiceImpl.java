package tr.edu.nobel.service;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tr.edu.nobel.config.EvaluationProperties;
import tr.edu.nobel.dto.request.KararKesinlestirRequest;
import tr.edu.nobel.dto.request.OyRequest;
import tr.edu.nobel.dto.response.*;
import tr.edu.nobel.entity.*;
import tr.edu.nobel.event.*;
import tr.edu.nobel.exception.*;
import tr.edu.nobel.mapper.DecisionValueMapper;
import tr.edu.nobel.mapper.PortalMapper;
import tr.edu.nobel.repository.*;
import tr.edu.nobel.security.CurrentUserPrincipal;

import java.time.Clock;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@EnableConfigurationProperties(EvaluationProperties.class)
@Transactional(readOnly = true)
public class EvaluationWorkflowServiceImpl implements EvaluationWorkflowService {
    private static final List<String> CRITERIA = List.of("Bilimsel Katkı", "Özgünlük", "Toplumsal Fayda", "Etki Düzeyi");
    private static final String ALREADY_VOTED = "Bu aday için bu komitede daha önce oy kullandınız.";
    private static final String NOT_MEMBER = "Bu komitenin üyesi değilsiniz.";

    private final DegerlendirmeKomitesiRepository committees;
    private final KomiteUyesiRepository members;
    private final KategoriRepository categories;
    private final AdayRepository candidates;
    private final AdayGostermeRepository nominations;
    private final DegerlendirmeRepository evaluations;
    private final UzmanOyuRepository votes;
    private final EvaluationProperties properties;
    private final ApplicationEventPublisher events;
    private final Clock clock;
    private final DecisionPolicy policy = new DecisionPolicy();

    @Override
    public List<UzmanKomiteResponse> committees(CurrentUserPrincipal principal) {
        return committees.findByUzmanId(expertId(principal)).stream().map(committee -> {
            Long id = committee.getKomiteId();
            var roster = members.findMembers(id).stream()
                    .map(member -> new KomiteUyesiResponse(member.uzmanId(), member.label())).toList();
            return new UzmanKomiteResponse(id, committee.getKomiteAdi(), committee.getKategoriId(),
                    categoryLabel(committee), roster, candidates.countPendingForCommittee(committee.getKategoriId(), id));
        }).toList();
    }

    @Override
    public List<KomiteAdayResponse> candidates(CurrentUserPrincipal principal, Long komiteId) {
        Long expertId = expertId(principal);
        CommitteeContext context = committee(komiteId, expertId, false);
        Map<Long, List<OyResponse>> votesByCandidate = votes.findByKomiteIdOrderByOyId(komiteId).stream()
                .map(vote -> PortalMapper.vote(vote, context.labels().get(vote.getUzmanId())))
                .collect(Collectors.groupingBy(OyResponse::adayId));
        Map<Long, Degerlendirme> decisions = evaluations.findByKomiteIdAndKesinlesmisTrueOrderByTarihDescDegerlendirmeIdDesc(komiteId)
                .stream().collect(Collectors.toMap(Degerlendirme::getAdayId, Function.identity(), (newest, older) -> newest));

        return candidates.findNominatedInCategory(context.committee().getKategoriId()).stream().map(candidate -> {
            Long adayId = candidate.getAdayId();
            List<OyResponse> candidateVotes = votesByCandidate.getOrDefault(adayId, List.of());
            OyResponse myVote = candidateVotes.stream().filter(vote -> vote.uzmanId().equals(expertId))
                    .findFirst().orElse(null);
            Degerlendirme result = decisions.get(adayId);
            return new KomiteAdayResponse(adayId, PortalMapper.displayName(candidate), candidate.getCalismaAlani(),
                    candidateVotes.size(), properties.quorum(), context.roster().size(), myVote, candidateVotes,
                    result != null, result == null ? null : PortalMapper.evaluation(result, context.committee().getKomiteAdi()));
        }).toList();
    }

    @Override
    public List<String> criteria() {
        return CRITERIA;
    }

    @Override
    @Transactional
    public OyKararResponse vote(CurrentUserPrincipal principal, OyRequest request) {
        Long expertId = expertId(principal);
        Long komiteId = request.komiteId();
        CommitteeContext context = committee(komiteId, expertId, true);
        Aday candidate = eligibleCandidate(context, request.adayId());
        if (votes.existsByKomiteIdAndUzmanIdAndAdayId(komiteId, expertId, candidate.getAdayId())) {
            throw new BusinessRuleException(ALREADY_VOTED);
        }

        String criterion = request.olcut().strip();
        if (!CRITERIA.contains(criterion)) throw new IllegalArgumentException("Geçerli bir değerlendirme ölçütü seçin.");
        ZonedDateTime now = ZonedDateTime.now(clock);
        UzmanOyu vote = new UzmanOyu(komiteId, expertId, candidate.getAdayId(), criterion,
                request.karar(), now.toLocalDateTime());
        try {
            votes.saveAndFlush(vote);
        } catch (DataIntegrityViolationException failure) {
            if (ConstraintViolationLookup.hasConstraint(failure, "fk_uzman_oyu_komite_uyesi")) {
                throw new AccessDeniedException(NOT_MEMBER);
            }
            if (ConstraintViolationLookup.hasConstraint(failure, "uq_uzman_oyu")) {
                throw new BusinessRuleException(ALREADY_VOTED);
            }
            throw failure;
        }

        List<UzmanOyu> allVotes = votes.findByKomiteIdAndAdayIdOrderByOyId(komiteId, candidate.getAdayId());
        int count = allVotes.size();
        String expertLabel = context.labels().get(expertId);
        events.publishEvent(new ExpertVoted(komiteId, context.committee().getKomiteAdi(),
                categoryLabel(context.committee()), expertId, expertLabel, candidate.getAdayId(),
                PortalMapper.displayName(candidate), vote.getKarar(), criterion, count, properties.quorum(),
                context.roster().size(), context.roster(),
                allVotes.stream().map(v -> new VoteRef(v.getUzmanId(), v.getKarar())).toList(), now.toInstant()));

        DegerlendirmeResponse decision = count == context.roster().size()
                ? recordDecision(context, candidate, allVotes, now, true) : null;
        return new OyKararResponse(PortalMapper.vote(vote, expertLabel), count, properties.quorum(),
                context.roster().size(), decision != null, decision);
    }

    @Override
    @Transactional
    public DegerlendirmeResponse finalizeDecision(CurrentUserPrincipal principal, KararKesinlestirRequest request) {
        CommitteeContext context = committee(request.komiteId(), expertId(principal), true);
        Aday candidate = eligibleCandidate(context, request.adayId());
        List<UzmanOyu> allVotes = votes.findByKomiteIdAndAdayIdOrderByOyId(request.komiteId(), candidate.getAdayId());
        if (allVotes.size() < properties.quorum()) {
            throw new BusinessRuleException("Kararı kesinleştirmek için en az %d oy gerekir.".formatted(properties.quorum()));
        }
        return recordDecision(context, candidate, allVotes, ZonedDateTime.now(clock), false);
    }

    private CommitteeContext committee(Long komiteId, Long expertId, boolean forUpdate) {
        var committee = (forUpdate ? committees.findByIdForUpdate(komiteId) : committees.findById(komiteId))
                .orElseThrow(() -> new ResourceNotFoundException("Komite bulunamadı."));
        // Admin membership deletions can cascade votes. Hold the roster stable until the decision commits.
        if (forUpdate) members.lockMembers(komiteId);
        List<MemberRef> roster = members.findMembers(komiteId);
        Map<Long, String> labels = roster.stream().collect(Collectors.toMap(MemberRef::uzmanId, MemberRef::label));
        if (!labels.containsKey(expertId)) throw new AccessDeniedException(NOT_MEMBER);
        return new CommitteeContext(committee, roster, labels);
    }

    private Aday eligibleCandidate(CommitteeContext context, Long adayId) {
        Aday candidate = candidates.findById(adayId).orElseThrow(() -> new ResourceNotFoundException("Aday bulunamadı."));
        if (!nominations.existsInCategory(adayId, context.committee().getKategoriId())) throw new CategoryMismatchException();
        if (evaluations.existsByKomiteIdAndAdayIdAndKesinlesmisTrue(context.committee().getKomiteId(), adayId)) {
            throw new BusinessRuleException("Bu aday için komite kararı kesinleşti.");
        }
        return candidate;
    }

    private DegerlendirmeResponse recordDecision(CommitteeContext context, Aday candidate, List<UzmanOyu> allVotes,
                                                 ZonedDateTime now, boolean automatic) {
        var result = policy.decide(allVotes);
        Degerlendirme row = new Degerlendirme();
        row.setKomiteId(context.committee().getKomiteId());
        row.setAdayId(candidate.getAdayId());
        row.setTarih(now.toLocalDate());
        row.setSonuc(DecisionValueMapper.toSonuc(result.karar()));
        row.setOlcut(result.olcut());
        evaluations.saveAndFlush(row);

        events.publishEvent(new DecisionFinalized(row.getKomiteId(), context.committee().getKomiteAdi(), row.getAdayId(),
                PortalMapper.displayName(candidate), result.karar(), result.kabul(), result.red(), result.incelemede(),
                automatic, context.roster(), now.toInstant()));
        return PortalMapper.evaluation(row, context.committee().getKomiteAdi());
    }

    private String categoryLabel(DegerlendirmeKomitesi committee) {
        return categories.findById(committee.getKategoriId()).orElseThrow().getKategoriAdi();
    }

    private Long expertId(CurrentUserPrincipal principal) {
        if (principal.uzmanId() == null) throw new AccessDeniedException(NOT_MEMBER);
        return principal.uzmanId();
    }

    private record CommitteeContext(DegerlendirmeKomitesi committee, List<MemberRef> roster, Map<Long, String> labels) { }
}
