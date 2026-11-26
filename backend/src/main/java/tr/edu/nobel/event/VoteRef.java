package tr.edu.nobel.event;

import tr.edu.nobel.entity.OyKarari;

public record VoteRef(Long uzmanId, OyKarari karar) { }
