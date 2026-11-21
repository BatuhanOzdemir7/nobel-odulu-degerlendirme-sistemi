package tr.edu.nobel.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tr.edu.nobel.dto.request.ApiRequest;
import tr.edu.nobel.dto.response.ApiResponse;
import tr.edu.nobel.entity.DegerlendirmeKomitesi;
import tr.edu.nobel.entity.KomiteUyesi;
import tr.edu.nobel.entity.KomiteUyesiId;
import tr.edu.nobel.entity.Uzman;
import tr.edu.nobel.exception.BusinessRuleException;
import tr.edu.nobel.exception.ResourceNotFoundException;
import tr.edu.nobel.mapper.EntityDtoMapper;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional
public class CommitteeServiceImpl implements CommitteeService {
    @PersistenceContext
    private EntityManager entityManager;
    private final EntityDtoMapper mapper;

    public CommitteeServiceImpl(EntityDtoMapper mapper) {
        this.mapper = mapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ApiResponse> list() {
        List<DegerlendirmeKomitesi> committees = entityManager
                .createQuery("select c from DegerlendirmeKomitesi c order by c.komiteId", DegerlendirmeKomitesi.class)
                .getResultList();
        List<ApiResponse> responses = new ArrayList<>();
        for (DegerlendirmeKomitesi committee : committees) {
            Map<String, Object> response = new LinkedHashMap<>(mapper.toResponse(committee));
            response.put("uzmanIdListesi", memberIds(committee.getKomiteId()));
            responses.add(new ApiResponse(response));
        }
        return responses;
    }

    @Override
    public ApiResponse create(ApiRequest request) {
        Map<String, Object> values = request.values();
        String name = values.get("komiteAdi") instanceof String value ? value.trim() : "";
        Long categoryId = asLong(values.get("kategoriId"), "kategoriId");
        List<Long> expertIds = readIds(values.get("uzmanIdListesi"));
        if (name.isBlank()) throw new BusinessRuleException("Komite adı zorunludur.");
        if (expertIds.stream().distinct().count() != expertIds.size()) {
            throw new BusinessRuleException("Aynı uzman komiteye birden fazla eklenemez.");
        }
        if (expertIds.size() < 3) {
            throw new BusinessRuleException("Bir komite oluşturmak için en az 3 farklı uzman seçilmelidir.");
        }
        if (entityManager.find(tr.edu.nobel.entity.Kategori.class, categoryId) == null) {
            throw new ResourceNotFoundException("Kategori bulunamadı: " + categoryId);
        }

        DegerlendirmeKomitesi committee = new DegerlendirmeKomitesi();
        committee.setKomiteAdi(name);
        committee.setKategoriId(categoryId);
        entityManager.persist(committee);
        for (Long expertId : expertIds) {
            if (entityManager.find(Uzman.class, expertId) == null) {
                throw new ResourceNotFoundException("Uzman bulunamadı: " + expertId);
            }
            KomiteUyesi member = new KomiteUyesi();
            member.setId(new KomiteUyesiId());
            member.getId().setKomiteId(committee.getKomiteId());
            member.getId().setUzmanId(expertId);
            entityManager.persist(member);
        }
        entityManager.flush();
        Map<String, Object> response = new LinkedHashMap<>(mapper.toResponse(committee));
        response.put("uzmanIdListesi", expertIds);
        return new ApiResponse(response);
    }

    @Override
    public void delete(Long committeeId) {
        DegerlendirmeKomitesi committee = requireCommittee(committeeId);
        entityManager.remove(committee);
        entityManager.flush();
    }

    @Override
    public void addMember(Long committeeId, Long expertId) {
        requireCommittee(committeeId);
        if (entityManager.find(Uzman.class, expertId) == null) {
            throw new ResourceNotFoundException("Uzman bulunamadı: " + expertId);
        }
        KomiteUyesi member = new KomiteUyesi();
        member.setId(new KomiteUyesiId());
        member.getId().setKomiteId(committeeId);
        member.getId().setUzmanId(expertId);
        entityManager.persist(member);
        entityManager.flush();
    }

    @Override
    public void removeMember(Long committeeId, Long expertId) {
        requireCommittee(committeeId);
        KomiteUyesiId id = new KomiteUyesiId();
        id.setKomiteId(committeeId);
        id.setUzmanId(expertId);
        KomiteUyesi member = entityManager.find(KomiteUyesi.class, id);
        if (member == null) throw new ResourceNotFoundException("Komite üyesi bulunamadı.");
        Long count = entityManager.createQuery(
                "select count(m) from KomiteUyesi m where m.id.komiteId = :committeeId", Long.class)
                .setParameter("committeeId", committeeId).getSingleResult();
        if (count <= 3) {
            throw new BusinessRuleException("Komitede en az 3 uzman üye kalmalıdır; bu üye çıkarılamaz.");
        }
        entityManager.remove(member);
        entityManager.flush();
    }

    private DegerlendirmeKomitesi requireCommittee(Long committeeId) {
        DegerlendirmeKomitesi committee = entityManager.find(DegerlendirmeKomitesi.class, committeeId);
        if (committee == null) throw new ResourceNotFoundException("Komite bulunamadı: " + committeeId);
        return committee;
    }

    private List<Long> memberIds(Long committeeId) {
        return entityManager.createQuery(
                "select m.id.uzmanId from KomiteUyesi m where m.id.komiteId = :committeeId order by m.id.uzmanId", Long.class)
                .setParameter("committeeId", committeeId).getResultList();
    }

    private List<Long> readIds(Object raw) {
        if (!(raw instanceof List<?> values)) throw new BusinessRuleException("uzmanIdListesi bir liste olmalıdır.");
        return values.stream().map(value -> asLong(value, "uzmanIdListesi")).toList();
    }

    private Long asLong(Object value, String field) {
        if (value instanceof Number number) return number.longValue();
        throw new BusinessRuleException(field + " sayısal olmalıdır.");
    }
}
