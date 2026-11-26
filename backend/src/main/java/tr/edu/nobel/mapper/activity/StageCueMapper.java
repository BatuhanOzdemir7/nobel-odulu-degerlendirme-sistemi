package tr.edu.nobel.mapper.activity;

import tr.edu.nobel.dto.response.activity.StageCueDto;
import tr.edu.nobel.dto.response.activity.StageCueDto.*;
import tr.edu.nobel.entity.OyKarari;
import tr.edu.nobel.event.*;
import java.util.List;

final class StageCueMapper {
    private StageCueMapper() { }

    static StageCueDto nomination(NominationRecorded e) {
        return new StageCueDto(Scene.NOMINATION, e.kurulusLabel(), e.adayLabel(), e.odulLabel(),
                e.kategoriLabel(), e.yeniAdayHesabiAcildi(), null, null, null, null, null, null, null,
                null, null, null, null, null, null);
    }

    static StageCueDto vote(ExpertVoted e) {
        var votes = e.votes().stream().map(item -> new Vote(item.uzmanId(), value(item.karar()))).toList();
        return new StageCueDto(Scene.COMMITTEE_VOTE, null, e.adayLabel(), null, null, null,
                e.komiteId(), e.komiteLabel(), e.uzmanId(), e.uzmanLabel(), value(e.karar()),
                e.votesCast(), e.votesRequired(), members(e.members()), votes, null, null, null, null);
    }

    static StageCueDto decision(DecisionFinalized e) {
        return new StageCueDto(Scene.DECISION_FINALIZED, null, e.adayLabel(), null, null, null,
                e.komiteId(), e.komiteLabel(), null, null, null, null, null, members(e.members()), null,
                value(e.karar()), new Tally(e.kabul(), e.red(), e.incelemede()), null, null);
    }

    static StageCueDto constraint(ConstraintViolationEvent e, String message) {
        var context = e.context();
        return new StageCueDto(Scene.CONSTRAINT_ERROR, null, null, null, null, null, e.komiteId(),
                context == null ? null : context.committeeLabel(), null,
                context == null ? null : context.expertLabel(), null, null, null,
                context == null ? null : members(context.members()), null, null, null, message,
                context == null ? null : context.members().size());
    }

    private static List<Member> members(List<MemberRef> refs) {
        return refs.stream().map(item -> new Member(item.uzmanId(), item.label())).toList();
    }

    private static VoteValue value(OyKarari karar) { return VoteValue.valueOf(karar.name()); }
}
