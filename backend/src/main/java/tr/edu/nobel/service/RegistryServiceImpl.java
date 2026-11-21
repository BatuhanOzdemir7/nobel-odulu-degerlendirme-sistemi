package tr.edu.nobel.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tr.edu.nobel.dto.request.ApiRequest;
import tr.edu.nobel.dto.response.ApiResponse;
import tr.edu.nobel.entity.*;
import tr.edu.nobel.exception.ResourceNotFoundException;
import tr.edu.nobel.mapper.EntityDtoMapper;

import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
@Transactional
public class RegistryServiceImpl implements RegistryService {
    private static final Map<String, Class<?>> RESOURCES = Map.of(
            "kategoriler", Kategori.class,
            "oduller", Odul.class,
            "kuruluslar", Kurulus.class,
            "adaylar", Aday.class,
            "uzmanlar", Uzman.class,
            "aday-gostermeler", AdayGosterme.class,
            "degerlendirmeler", Degerlendirme.class
    );
    private static final Map<String, String> ID_FIELDS = Map.of(
            "kategoriler", "kategoriId", "oduller", "odulNo", "kuruluslar", "kurulusNo",
            "adaylar", "adayId", "uzmanlar", "uzmanId", "aday-gostermeler", "adayGostermeId",
            "degerlendirmeler", "degerlendirmeId"
    );

    @PersistenceContext
    private EntityManager entityManager;
    private final EntityDtoMapper mapper;

    public RegistryServiceImpl(EntityDtoMapper mapper) {
        this.mapper = mapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ApiResponse> list(String resource) {
        Class<?> entityType = typeFor(resource);
        return entityManager.createQuery("select e from " + entityType.getSimpleName() + " e", entityType)
                .getResultList().stream().map(entity -> new ApiResponse(mapper.toResponse(entity))).toList();
    }

    @Override
    public ApiResponse create(String resource, ApiRequest request) {
        Class<?> entityType = typeFor(resource);
        Map<String, Object> values = new LinkedHashMap<>(request.values());
        values.remove(ID_FIELDS.get(resource));
        Object entity = mapper.toEntity(values, entityType);
        entityManager.persist(entity);
        entityManager.flush();
        return new ApiResponse(mapper.toResponse(entity));
    }

    @Override
    public void delete(String resource, Long id) {
        Class<?> entityType = typeFor(resource);
        Object entity = entityManager.find(entityType, id);
        if (entity == null) throw new ResourceNotFoundException("Kayıt bulunamadı: " + resource + "/" + id);
        entityManager.remove(entity);
        entityManager.flush();
    }

    private Class<?> typeFor(String resource) {
        Class<?> type = RESOURCES.get(resource);
        if (type == null) throw new ResourceNotFoundException("Bilinmeyen kaynak: " + resource);
        return type;
    }
}
