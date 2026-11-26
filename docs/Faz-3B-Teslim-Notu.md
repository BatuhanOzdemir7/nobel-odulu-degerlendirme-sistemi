# Faz 3B — Portfolyo karakter sahnesi

## Keşif ve dosyalar

- `BatuhanOzdemir7/character-rig` reposunun `7cf6af6` commit’i, Angular standalone rig’i, 616 × 476 tasarım uzayını, katman manifestini ve programatik animasyona temel olan reducer, controller ve kinematik kodunu içeriyor. [Karakter rig’i](https://github.com/BatuhanOzdemir7/character-rig/tree/7cf6af6)
- Rig’in on kaynak dosyası `frontend/src/app/features/live-stage/engine/character-rig/` altına kopyalandı. Bunlar `caret-tracker.util.ts`, `character-assets.config.ts`, `character-interaction.controller.ts`, `character-kinematics.math.ts`, `character-rig.component.{ts,html,css}`, `character-state.machine.ts`, `character.types.ts` ve `index.ts`.
- Rig yaması altı dosyada. `character.types.ts` yeni ifade ve aktivite tiplerini, `character-state.machine.ts` ifade önceliğini ve irkilme olayını, `character-assets.config.ts` dört ifade preset’ini tanımlıyor. `character-interaction.controller.ts` zamanlı ifade, irkilme ve bakış metotlarını, `character-rig.component.ts` bunların sahne girdilerini, `character-rig.component.css` kol pozlarını ve ifade animasyonlarını ekliyor.
- `engine/stage/` altında `stage.models.ts`, `stage.layout.ts`, `stage.accessories.ts`, `stage.timeline.ts`, `stage.director.ts`, `stage.demo.ts`, `nobel-stage.component.{ts,html,css}`, `nobel-character.adapter.ts` ve `nobel-stage.providers.ts` eklendi. `app.config.ts`, sahne fabrikasını `provideNobelCharacterStage()` ile kaydediyor. Kuyruk, sahne zaman çizelgesi ve Angular görünümü ayrı bileşenlerde tutuluyor.
- Dokuz Vitest dosyası rig reducer’ını, controller’ı ve bileşen girdilerini, aksesuarları, koltukları, zaman çizelgesini, yönetmeni, sahne DOM’unu ve adaptör yaşam döngüsünü doğruluyor.
- Kaynak repodaki 31 PNG’den, hariç tutulan üç görsel çıkarıldığında 28 katman dosyası kalıyor. Belirtilen dosya listesi ve rig manifesti 28 dosyayla eşleşti. Dosyalar `frontend/public/assets/characters/` altında ve kaynak SHA-256 değerleriyle birebir aynı. `angular.json` içindeki statik varlık kuralı bunları `assets/characters/` yolundan sunuyor.

## Görsel ve davranış ayarları

- Komite adayının ayak noktası yatay %24, düşey %89. Öne gelen uzman yatay en az %54’e ilerliyor. Üyelerin arka sıra yüksekliği %66, ön sıra yüksekliği %88. Bekçi sağdan yürüyüp en fazla yatay %86’ya kadar geliyor. Böylece bekçi ve kalkan kompakt sahnenin içinde kalıyor.
- Oy kartının simgesi prop kutusuna sığıyor. Kalkanın `≥3` işareti ortalanıyor. Tokmak ve sağ kol üç vuruşta aynı süreyi ve zaman ölçeğini kullanıyor. Masadaki sayaç önceki oyları gösteriyor ve güncel kart bırakıldığında ilerliyor. Koltuğa dönen uzman, hareket tamamlanana kadar masanın önündeki katmanda kalıyor.
- Sonuç bandı dekor alanının altında. Komite üyesi etiketleri otururken baş üstünde, sahne önündeyken ayak altında görünüyor. Göz hedefleri pencere ve çekmece kaydırmasında, yeniden boyutlandırmada ve aktör hareketi tamamlandığında ölçülüyor.
- Faz 3B’ye ait geliştirme kontrolleri `/live-stage?demo=1` altında ikinci ve üçüncü oy ile Red ve İncelemede kararlarını mevcut olay akışına gönderiyor. Faz 3A’nın demo paneli ve sahne sözleşmesi önceki dosyalarıyla kullanılıyor.

## Doğrulama

| Komut veya senaryo | Sonuç |
| --- | --- |
| `npm run build` | Angular üretim derlemesi tamamlandı. |
| `npm test` | 21 dosyada 49 test geçti. |
| `git diff --check` | Boşluk hatası bulunmadı. Faz 3A commit’i `8026f58` ile karşılaştırılan 192 backend, olay akışı, ER, adaptör sözleşmesi ve bağımlılık dosyası eşleşti. |
| İki başsız Chrome sekmesinde demo | Adaylık, 1/3 → 2/3 → 3/3 oy, üç karar sonucu, üç eşzamanlı kol ve tokmak vuruşu, kalkan, kırmızı flaş ve yeniden oturma doğrulandı. 28/28 PNG HTTP 200 döndü. |
| Kuyruk ve yaşam döngüsü | Altı hızlı olayda çalışan sahne ve son dört bekleyen sahne sırayla oynadı. Admin ve uzman portalının dock’u kompakt sahneyi açtı ve kapanınca bileşeni kaldırdı. |
| Hareket ve bakış | Azaltılmış harekette süreler %15’e indi, zıplama ve konfeti görünmedi. Kaydırma ve yeniden boyutlandırma bakış hedefini güncelledi. |
| Gerçek SSE | Mevcut backend JAR’ı ve geçici yerel PostgreSQL örneğiyle üç uzman portalından oy verildi. Projeksiyon tüm oyları sırayla ve üçüncü oydan sonra kesin kararı gösterdi. |
| PostgreSQL trigger | Tam üç üyeyle yapılan doğrudan deneme mevcut 409 iş kuralı yanıtını verdi. Eşzamanlı silme, commit aşamasında gerçek `23514` ve HTTP 409 üretti. Canlı sahnede bekçi, kalkan ve hata bandı, ER diyagramında kırmızı vurgu görüldü. |

Gerçek SSE doğrulaması, Docker kapalıyken ayrı portlarda çalışan Java 21 ve yerel PostgreSQL 18.4 test örneğiyle yapıldı. Tarayıcı, sadece doğrulama sırasında API isteklerini bu geçici backend’e yönlendirdi. Uygulama konsolu ve karakter dosyaları kontrolü başarılıydı.

## Ekran görüntüleri

1. Üniformalı kurye, zarf ve yeni hesap balonu. [Adaylık](faz-3b-gorseller/01-adaylik.png)
2. Masadaki yeşil ve kırmızı kartlar, 2/3 sayaç. [Komite oylaması](faz-3b-gorseller/02-oylama-2-3.png)
3. Madalya, konfeti ve KABUL sonuç bandı. [Kesin karar](faz-3b-gorseller/03-karar-kabul.png)
4. PostgreSQL bekçisi, `≥3` kalkanı, kırmızı flaş ve hata bandı. [Kısıt ihlali](faz-3b-gorseller/04-trigger-hatasi.png)
