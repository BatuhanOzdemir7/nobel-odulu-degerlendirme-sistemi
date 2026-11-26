package tr.edu.nobel.dto.response;

public record YeniHesapResponse(String kullaniciAdi, String geciciSifre) {
    @Override
    public String toString() {
        return "YeniHesapResponse[kullaniciAdi=" + kullaniciAdi + "]";
    }
}
