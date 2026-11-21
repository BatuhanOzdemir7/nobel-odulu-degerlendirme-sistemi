export interface Kategori { kategoriId: number; kategoriAdi: string; }
export interface Odul { odulNo: number; aciklayiciAd: string; kategoriId: number; }
export interface Kurulus { kurulusNo: number; ad: string; konum: string; iletisimBilgisi: string; }
export interface Aday {
  adayId: number; ad: string; soyad: string; cinsiyet: string; dogumTarihi: string;
  uyruk: string; calismaAlani: string;
}
export interface Uzman { uzmanId: number; ad: string; adres: string; yas: number; cinsiyet: string; uzmanlikAlani: string; }
export interface Komite { komiteId: number; komiteAdi: string; kategoriId: number; uzmanIdListesi: number[]; }
export interface AdayGosterme {
  adayGostermeId: number; kurulusNo: number; adayId: number; odulNo: number; tarih: string; saat: string;
}
export interface Degerlendirme {
  degerlendirmeId: number; adayId: number; komiteId: number; tarih: string; sonuc: string; olcut: string;
}
export interface ApiError {
  timestamp: string; status: number; error: string; message: string; path: string;
  fieldErrors: Record<string, string>;
}
