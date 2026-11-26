package tr.edu.nobel.mapper;

import tr.edu.nobel.dto.request.YeniAdayRequest;
import tr.edu.nobel.dto.response.*;
import tr.edu.nobel.entity.Aday;
import tr.edu.nobel.entity.Degerlendirme;
import tr.edu.nobel.entity.UzmanOyu;
import tr.edu.nobel.repository.AdayGostermeRepository;
import tr.edu.nobel.repository.AdayRepository;

public final class PortalMapper {
    private PortalMapper() { }

    public static Aday newCandidate(YeniAdayRequest input) {
        Aday aday = new Aday();
        aday.setAd(input.ad().strip());
        aday.setSoyad(input.soyad().strip());
        aday.setCinsiyet(input.cinsiyet().strip());
        aday.setDogumTarihi(input.dogumTarihi());
        aday.setUyruk(input.uyruk().strip());
        aday.setCalismaAlani(input.calismaAlani().strip());
        return aday;
    }

    public static String displayName(Aday aday) {
        return aday.getAd() + " " + aday.getSoyad();
    }

    public static AdayAramaResponse searchResult(AdayRepository.SearchResult row) {
        return new AdayAramaResponse(row.getAdayId(), row.getGorunenAd(), row.getCalismaAlani(), row.getHesapVar());
    }

    public static AdayBilgiResponse candidate(Aday aday) {
        return new AdayBilgiResponse(aday.getAdayId(), aday.getAd(), aday.getSoyad(), aday.getCinsiyet(),
                aday.getDogumTarihi(), aday.getUyruk(), aday.getCalismaAlani());
    }

    public static AdayGostermeGorunumResponse nomination(AdayGostermeRepository.Details row) {
        AdaylikAsamasi stage = AdaylikAsamasi.ADAYLIK_ALINDI;
        if (row.getSonuc() != null) stage = AdaylikAsamasi.KARAR_VERILDI;
        else if (row.getInceleniyor()) stage = AdaylikAsamasi.KOMITE_INCELEMESINDE;
        return new AdayGostermeGorunumResponse(row.getAdayGostermeId(), row.getAdayId(), row.getAdayAdi(),
                row.getOdulId(), row.getOdulAdi(), row.getKategoriAdi(), row.getKurulusAdi(),
                row.getTarih(), row.getSaat(), stage, row.getSonuc());
    }

    public static DegerlendirmeResponse evaluation(Degerlendirme row, String komiteAdi) {
        return new DegerlendirmeResponse(row.getDegerlendirmeId(), row.getKomiteId(), komiteAdi, row.getAdayId(),
                row.getTarih(), row.getSonuc(), row.getOlcut());
    }

    public static OyResponse vote(UzmanOyu row, String uzmanAdi) {
        return new OyResponse(row.getOyId(), row.getKomiteId(), row.getAdayId(), row.getUzmanId(), uzmanAdi,
                row.getOlcut(), row.getKarar(), row.getOyZamani());
    }
}
