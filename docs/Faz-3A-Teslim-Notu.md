# Faz 3A — Canlı olay akışı

## Keşif notu

- V1’de `aday_gosterme` kuruluş, aday ve ödüle, `odul` kategoriye, `degerlendirme_komitesi` kategoriye, `degerlendirme` komite ve adaya, `komite_uyesi` komite ve uzmana bağlıdır. İstenen 11 düğüm ve 11 kenar bu ilişkileri karşılar.
- `RegistryController` kaynakları `kategoriler → kategori`, `oduller → odul`, `kuruluslar → kurulus`, `adaylar → aday`, `uzmanlar → uzman`, `aday-gostermeler → aday_gosterme` ve `degerlendirmeler → degerlendirme` şeklinde eşlenir. Mutasyonlar `RegistryService.create/delete` ve `CommitteeService.create/delete/addMember/removeMember` metotlarıdır. Kayıt güncelleme mutasyonu mevcut API’de yoktur.
- V1’de ertelenen `komite_uyesi_delete_minimum_uyesi` trigger’ı commit sırasında PostgreSQL `23514`, `komite_en_az_uc_uzman` ve `Komite en az 3 uzman üyeye sahip olmalıdır (komite_id=…; mevcut üye=…).` döndürür. Tam üç üyeyken `CommitteeService.removeMember` önce iş kuralı 409’u verir. Eşzamanlı silme testinde Spring MVC, gerçek commit hatasını `DataIntegrityViolationException` olarak `GlobalExceptionHandler.integrity` metodunda çözdü. Metot, `TransactionSystemException` için de SQL nedenini okuyup 409 üretir.
- JWT tabanlı `SecurityConfig` ile admin ve portal yetkileri mevcut. Angular, `app.config.ts` içinde router ve HTTP interceptor’ını kuruyor. Yeni sayfa rotası public, iki shell mevcut rotalarını koruyarak dock barındırıyor. Global temada koyu yeşil `#103c39` ve altın `#f3d99b` kullanılıyor.

## Değişen ve eklenen dosyalar

| Konum | Dosyalar |
| --- | --- |
| Backend yapılandırması | `pom.xml`, `application.yml`, `config/SecurityConfig.java`, `config/EventsProperties.java`, `config/AdminActivityAspect.java` |
| Backend olaylar ve DTO’lar | `event/{AdminMutationEvent,CommitteeChangeEvent,ConstraintViolationEvent}.java`, `dto/response/activity/{ActivityEventDto,ErHighlightDto,StageCueDto}.java` |
| Backend akış ve bağlam | `controller/ActivityStreamController.java`, `service/{ActivityActor,ActivityEventBuffer,CommitteeActivityContext,DomainEventPublisher,SseBroadcaster}.java` |
| Backend kısıt bildirimi | `exception/{GlobalExceptionHandler,ConstraintActivityReporter,ConstraintViolationClassifier}.java` |
| Backend eşleyicileri | `mapper/activity/{ActivityEventFactory,ActivityEventMapper,AdminMutationActivityMapper,CommitteeChangeActivityMapper,ConstraintViolationActivityMapper,DecisionActivityMapper,ErHighlightCatalog,ExpertVoteActivityMapper,NominationActivityMapper,RegistryActivityResource,SqlSummaryFormatter,StageCueMapper}.java` |
| Backend doğrulaması | `ActivityStreamIT`, `ActivityEventFactoryTest`, `ErHighlightCatalogTest`, `ConstraintViolationClassifierTest`, `SseBroadcasterTest` ve `src/test/resources/activity` altındaki iki JSON fixture |
| Angular veri katmanı | `core/events/{activity-event.model,activity-stream.service,er-presenter.service,demo-fixtures}.ts` ve servislerin iki Vitest dosyası |
| Angular sahne | `features/live-stage` altında sayfa ve dock’un TS/HTML/CSS dosyaları, `sql-ribbon.component.ts`, `er/` altında topoloji, SVG bileşeni ve testleri, `stage/` altında sözleşme, Noop adaptör, taşıyıcı bileşen ve testi |
| Angular entegrasyonu | `app.routes.ts`, `AdminShellComponent` ve `PortalShellComponent` için TS/HTML dosyaları |

## Uygulama kararları

- `REGISTRY_UPDATED` JSON sözleşmesinde, eşleyicide ve demoda tanımlı. Mevcut kayıt API’si oluşturma ve silme olayları üretir.
- Üç üye varken tek silme isteği önceki 409 iş kuralını döndürür. İki eşzamanlı silme işlemiyle servis önkoşulu geçildiğinde ertelenmiş PostgreSQL denetimi commit aşamasında reddeder. İstemcideki HTTP 409 ile birlikte `CONSTRAINT_VIOLATION` yayınlanır. Sahneye eklenen üye sayısı, geri alma sonrası okunabilen geçerli komiteyi gösterir.
- Doğrudan JPA `flush()` işlemi, kategori benzersizlik ihlali gibi durumlarda çevrilmemiş Hibernate `JDBCException` üretebilir. Handler SQLState ile olayı bildirir ve istisnayı tekrar fırlatır. Kategori örneği mevcut HTTP 500 yanıtıyla birlikte `23505` ve `KATEGORI` vurgusu üretir.
- Tek SSE dağıtım yürütücüsü olay, replay ve heartbeat sırasını korur. Her bağlantı sınırlı kuyruğunu kendi sanal iş parçacığında boşaltır. Böylece yavaş bir soketin yazma süresi diğer istemcileri ve commit iş parçacığını etkilemez.
- Olay zamanı, proje saat diliminde ISO yerel tarih-saat olarak serileştirilir. Olay kimlikleri ve replay tamponu backend sürecinin ömrüyle sınırlıdır.

## Faz 3B sözleşmesi

`GET /api/events/stream` olayları `event: activity` olarak, `GET /api/events/recent?limit=3` aynı JSON nesnelerini eski → yeni sırasıyla döndürür. `recent` şeridi doldurur. Sahne, canlı ya da SSE replay olarak gelen komutları oynatır.

```json
{
  "eventId": "evt-9042",
  "timestamp": "2026-11-21T14:32:10",
  "action": "EXPERT_VOTED",
  "actorRole": "UZMAN",
  "actorLabel": "Prof. Dr. İlker Kaya",
  "sqlSummary": "INSERT INTO uzman_oyu (komite_id=1, uzman_id=2, aday_id=4, karar='KABUL')",
  "erHighlight": {
    "nodes": ["UZMAN", "uyesidir", "DEGERLENDIRME_KOMITESI", "degerlendirir", "ADAY"],
    "edges": ["UZMAN-uyesidir", "uyesidir-DEGERLENDIRME_KOMITESI", "DEGERLENDIRME_KOMITESI-degerlendirir", "degerlendirir-ADAY"],
    "severity": "success"
  },
  "stageCue": {
    "scene": "COMMITTEE_VOTE",
    "committeeId": 1,
    "committeeLabel": "Fizik Komitesi",
    "expertId": 2,
    "expertLabel": "Prof. Dr. İlker Kaya",
    "candidateName": "Dr. Selin Arslan",
    "vote": "KABUL",
    "votesCast": 1,
    "votesRequired": 3,
    "members": [{"expertId": 2, "label": "Prof. Dr. İlker Kaya"}],
    "votes": [{"expertId": 2, "vote": "KABUL"}]
  }
}
```

| `stageCue.scene` | Yük |
| --- | --- |
| `NOMINATION` | `organizationLabel`, `candidateName`, `awardLabel`, `categoryLabel`, `newAccount` |
| `COMMITTEE_VOTE` | `committeeId`, `committeeLabel`, `expertId`, `expertLabel`, `candidateName`, `vote`, `votesCast`, `votesRequired`, `members[]`, `votes[]` |
| `DECISION_FINALIZED` | `committeeId`, `committeeLabel`, `candidateName`, `result`, `tally {kabul, red, incelemede}`, `members[]` |
| `CONSTRAINT_ERROR` | `message` ile varsa `committeeId`, `committeeLabel`, `memberCount`, `expertLabel`, `members[]` |

`StageMember` alanları `expertId` ve `label`, `StageVote` alanları `expertId` ve `vote` şeklindedir. `VoteValue` değerleri `KABUL | RED | INCELEMEDE`. `stageCue` sahnesiz olayların JSON’unda atlanır. `IDLE` Angular’ın varsayılan sahnesidir. Backend eşleyicilerinin 11 olay için altın JSON karşılaştırması `backend/src/test/resources/activity/event-golden.json` dosyasındadır.

`action` değerleri `NOMINATION_CREATED`, `EXPERT_VOTED`, `DECISION_FINALIZED`, `REGISTRY_CREATED`, `REGISTRY_UPDATED`, `REGISTRY_DELETED`, `COMMITTEE_CREATED`, `COMMITTEE_DELETED`, `COMMITTEE_MEMBER_ADDED`, `COMMITTEE_MEMBER_REMOVED`, `CONSTRAINT_VIOLATION`. `actorRole` değerleri `ADMIN | KURULUS | ADAY | UZMAN | SYSTEM`. `erHighlight.severity` değerleri `success | info | error`.

```ts
export type StageScene = 'IDLE' | 'NOMINATION' | 'COMMITTEE_VOTE' | 'DECISION_FINALIZED' | 'CONSTRAINT_ERROR';
export type VoteValue = 'KABUL' | 'RED' | 'INCELEMEDE';
export type StageCharacterCommand = StageCue & { readonly eventId: string; readonly severity: 'success' | 'info' | 'error' };
export interface PortfolioStageAdapter {
  mount(container: HTMLElement): void;
  play(command: StageCharacterCommand): void;
  destroy(): void;
}
export const STAGE_ADAPTER_FACTORY = new InjectionToken<() => PortfolioStageAdapter>('STAGE_ADAPTER_FACTORY', {
  providedIn: 'root',
  factory: () => () => new NoopStageAdapter(),
});
```

`CharacterStageComponent` görünüm kurulduğunda fabrikadan bir örnek alır ve `mount(container)` çağırır. Her tekilleştirilmiş, `stageCue` içeren olayda `play(command)` çağırır. Kapanırken akış aboneliğini bırakıp `destroy()` çağırır. Faz 3B’de `STAGE_ADAPTER_FACTORY` için yeni sağlayıcı bir adaptör fabrikası verir. Sayfa ve dock ayrı adaptör örnekleri edinir.

ER düğümleri `KURULUS`, `ADAY`, `ODUL`, `KATEGORI`, `DEGERLENDIRME_KOMITESI`, `UZMAN`, `aday_gosterir`, `kategorisine_aittir`, `olusturulur`, `degerlendirir`, `uyesidir`.

ER kenarları `KURULUS-aday_gosterir`, `aday_gosterir-ADAY`, `aday_gosterir-ODUL`, `ODUL-kategorisine_aittir`, `kategorisine_aittir-KATEGORI`, `KATEGORI-olusturulur`, `olusturulur-DEGERLENDIRME_KOMITESI`, `DEGERLENDIRME_KOMITESI-degerlendirir`, `degerlendirir-ADAY`, `UZMAN-uyesidir`, `uyesidir-DEGERLENDIRME_KOMITESI`.

## Doğrulama komutları

| Komut | Sonuç |
| --- | --- |
| `mvn -B verify` | Java 21.0.13.1 ve PostgreSQL 16.16 Testcontainers ile 27 Surefire ve 19 Failsafe testi geçti. Atlanan test olmadı. Java derlemesi uyarısız tamamlandı. |
| `mvn -B -Dit.test=ActivityStreamIT#emitsConstraintAfterCommitFailureButNotForThreeMemberBusinessRejection -Dlogging.level.org.springframework.web.servlet.mvc.method.annotation.ExceptionHandlerExceptionResolver=DEBUG failsafe:integration-test failsafe:verify` | Odaklı testte iş kuralı 409’unda `businessRule`, PostgreSQL commit 409’unda `integrity` handler’ı çalıştı. |
| `npm ci --no-audit --no-fund` | Kilit dosyasındaki bağımlılıklar yüklendi. |
| `npm test` | 12 Vitest dosyasında 29 test geçti. |
| `npm run build` | Angular üretim derlemesi uyarısız tamamlandı. |
| `git diff --check` | Boşluk hatası bulunmadı. V1–V5 dosyalarının SHA-256 değerleri de temiz Faz 2B kopyasıyla eşleşti. |

Tarayıcı doğrulaması, ayrılmış PostgreSQL 16 konteyneri, `mvn spring-boot:run` ve `ng serve --host localhost` ile çalışan yerel uygulamada başsız Chrome üzerinden yürütüldü. Admin komite tablosunun mevcut düz alanları, ilk HTTP yüklemesinden sonra bir form alanı etkileşimiyle çizildi. Yeni dock hem admin hem portal kabuğunda açıldı. Portalda dock’un diyagramı ve sahnesi aynı `stream` isteğini paylaştı.

- Oturumsuz `/live-stage` sekmesi, kuruluş portalında gönderilen adaylık için dört düğümü vurguladı. Uzman portalından verilen ilk oy beş düğümü ve dört akış kenarını yaktı, SQL şeridi ve Noop sahnesi yenilenmeden güncellendi.
- Yerel SSE soketi kesilince rozet `reconnecting` gösterdi. Bağlantı açıldığında tarayıcı `Last-Event-ID` gönderdi. Kaçırılan iki oy ve üçüncü oyun kesin kararı birer kez göründü.
- Admin ekranından yapılan ilk üç üyeli silme denemesi 409 iş kuralı yanıtı verdi. Eşzamanlı silmeyle commit aşamasına taşınan deneme, projeksiyonda üç kırmızı düğümü, hata SQL satırını ve `CONSTRAINT_ERROR` sahne komutunu oluşturdu.
- `/live-stage?demo=1` üzerinden 11 eylem denendi. Sahnesi bulunan eylemler Noop adaptöründe göründü. Hareket azaltma etkinleştirildiğinde kırmızı vurgu kaldı ve CSS animasyonları durdu.
- `curl -N localhost:8080/api/events/stream` açıkken `retry:3000`, `event:activity` ve `: heartbeat` satırları alındı. Heartbeat aralığı 15 saniye olarak yapılandırıldı.
