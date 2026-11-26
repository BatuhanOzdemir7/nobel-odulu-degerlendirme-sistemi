package tr.edu.nobel;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import tr.edu.nobel.dto.request.*;
import tr.edu.nobel.dto.response.YeniHesapResponse;
import tr.edu.nobel.entity.*;
import tr.edu.nobel.event.NominationRecorded;
import tr.edu.nobel.repository.*;
import tr.edu.nobel.security.CurrentUserPrincipal;
import tr.edu.nobel.service.*;

import java.time.*;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NominationWorkflowServiceTest {
    @Mock KurulusRepository organizations;
    @Mock AdayRepository candidates;
    @Mock OdulRepository awards;
    @Mock KategoriRepository categories;
    @Mock AdayGostermeRepository nominations;
    @Mock CandidateAccountProvisioner accounts;
    @Mock ApplicationEventPublisher events;

    private final Clock clock = Clock.fixed(Instant.parse("2026-09-30T22:30:00Z"), ZoneId.of("Europe/Istanbul"));
    private final CurrentUserPrincipal principal = new CurrentUserPrincipal(9L, "kurulus", Rol.KURULUS, 11L, null, null);
    private NominationWorkflowService service;

    @BeforeEach
    void setup() {
        service = new NominationWorkflowServiceImpl(organizations, candidates, awards, categories, nominations,
                accounts, events, clock);
        var organization = new Kurulus();
        organization.setAd("Bilim Akademisi");
        var award = new Odul();
        award.setOdulNo(7L);
        award.setKategoriId(3L);
        var category = new Kategori();
        when(organizations.findByIdForUpdate(11L)).thenReturn(Optional.of(organization));
        when(awards.findById(7L)).thenReturn(Optional.of(award));
        when(categories.findById(3L)).thenReturn(Optional.of(category));
        when(nominations.findDetailsById(any())).thenReturn(Optional.of(mock(AdayGostermeRepository.Details.class)));
        when(nominations.saveAndFlush(any(AdayGosterme.class))).thenAnswer(call -> {
            AdayGosterme row = call.getArgument(0);
            row.setAdayGostermeId(50L);
            return row;
        });
    }

    @Test
    void reusesExistingCandidateAndStampsDateTimeAndOrganization() {
        var candidate = new Aday();
        candidate.setAdayId(4L);
        when(candidates.findById(4L)).thenReturn(Optional.of(candidate));
        assertThat(service.nominate(principal, new AdayGostermeRequest(4L, null, 7L)).yeniHesap()).isNull();
        verifyNoInteractions(accounts);
        var row = ArgumentCaptor.forClass(AdayGosterme.class);
        verify(nominations).saveAndFlush(row.capture());
        assertThat(row.getValue().getKurulusNo()).isEqualTo(11L);
        assertThat(row.getValue().getTarih()).isEqualTo(LocalDate.of(2026, 10, 1));
        assertThat(row.getValue().getSaat()).isEqualTo(LocalTime.of(1, 30));
    }

    @Test
    void createsCandidateAccountThenNomination() {
        when(candidates.save(any(Aday.class))).thenAnswer(call -> {
            Aday candidate = call.getArgument(0);
            candidate.setAdayId(20L);
            return candidate;
        });
        when(accounts.create(20L)).thenReturn(new YeniHesapResponse("aday_20", "test-value"));
        var request = new YeniAdayRequest("Ece", "Demir", "Kadın", LocalDate.of(1990, 1, 1), "Türkiye", "Fizik");
        var response = service.nominate(principal, new AdayGostermeRequest(null, request, 7L));

        assertThat(response.yeniHesap().kullaniciAdi()).isEqualTo("aday_20");
        var order = inOrder(candidates, accounts, nominations);
        order.verify(candidates).save(any(Aday.class));
        order.verify(accounts).create(20L);
        order.verify(nominations).saveAndFlush(any(AdayGosterme.class));
        var event = ArgumentCaptor.forClass(NominationRecorded.class);
        verify(events).publishEvent(event.capture());
        assertThat(event.getValue().yeniAdayHesabiAcildi()).isTrue();
        assertThat(event.getValue().occurredAt()).isEqualTo(clock.instant());
    }
}
