package tr.edu.nobel.dto.response;

import tr.edu.nobel.entity.Rol;

public record AuthUserResponse(Long kullaniciId, String kullaniciAdi, Rol rol, Long kurulusNo,
                               Long adayId, Long uzmanId, String displayName) { }
